// this is a catch-all function that is called for every request to the api
import * as sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import type { NextApiRequest, NextApiResponse } from 'next'
import { Subzero, SubzeroError, getIntrospectionQuery, Env as QueryEnv, fmtContentRangeHeader } from 'subzerocloud'
import { existsSync, readFileSync } from 'fs'
import { dirname } from 'path';
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { Router } from 'itty-router'
import permissions from '../../permissions.js'
import custom_relations from '../../relations.js'

const argv = yargs(hideBin(process.argv)).options({
    db: { type: 'string', default: 'db.sqlite' },
    schema: { type: 'string', default: 'northwindtraders-sqlite.sql' },
}).parseSync()

const urlPrefix = '/api'
const publicSchema = 'public'
const dbType = 'sqlite'
const dbFile = argv.db
const schemaFile = argv.schema

// allowed select functions can be defined here
// they can be used in the select parameter
const allowed_select_functions = ['substr', 'printf']

// we'll use this array to store queries executed by the worker and make them available in the /api/stats endpoint
let query_log: { time: number, query: string, parameters: any[] }[] = []
const max_log_size = 100

// add event to the query log
function log_query(query: string, parameters: any[]) {
    query_log.unshift({ time: Date.now(), query, parameters })
    if (query_log.length > max_log_size) {
        query_log.pop()
    }
}

// Setup a mechanism to detect if this node is the primary node
// This code is specific to a LiteFS setup
const dbFolder = dirname(dbFile)
const liteFSprimaryFile = `${dbFolder}/.primary`
let isPrimary = false
let primaryNode = ''
function updatePrimaryStatus() {
    if (existsSync(liteFSprimaryFile)) {
        primaryNode = readFileSync(liteFSprimaryFile, 'utf8')
        isPrimary = primaryNode == '' ? true : false
    }
    else {
        // this is probably running without LiteFS so we assume this is the primary node
        isPrimary = true
    }
}
updatePrimaryStatus()
setTimeout(updatePrimaryStatus, 1000)

// this function initializes the subzero instance that is responsible for parsing and formatting the queries
let subzero: Subzero
let db: Database<sqlite3.Database>
async function init_subzero() {
    console.log('init_subzero')
    // check if db file exists
    const dbExists = existsSync(dbFile)
    db = await open({ filename: dbFile, driver: sqlite3.Database })
    // seed the database if it does not exist
    if (!dbExists && isPrimary) {
        console.log('Seeding database')
        const schema_sql = readFileSync(schemaFile, 'utf8')
        await db.exec(schema_sql)
    }
    
    const { query /*, parameters*/ } = getIntrospectionQuery(
        dbType, // database type
        publicSchema, // the schema name that is exposed to the HTTP api (ex: public, api), though in case of sqlite this is ignored
        // the introspection query has two 'placeholders' in order to be able adapt to different configurations
        new Map([
            ['relations.json', custom_relations],
            ['permissions.json', permissions],
        ])
    )
    // although we have parameters, they are not used in the introspection query in sqlite
    // because the parameters refer to the "db schema" concept which missing in sqlite
    const result = await db.get(query)
    // the result of the introspection query is a json string representation of the database schema/structure
    // this schema object is used to generate the queries and check the permissions
    // to make the function startup faster, one can cache the schema object in a KV store
    const schema = JSON.parse(result.json_schema)
    subzero = new Subzero(dbType, schema, allowed_select_functions)
}

// setup the router that is used to route the requests to the correct handler
const router = Router({ base: urlPrefix })

// define a custom handler for / route
router.get('/', async (_, res) => {
    res.status(200).json({ message: 'Hello World!' })
    return res
})

// route to return the query log (displayed on Dahsboard)
router.get('/stats', async (_, res) => {
    res.status(200).json(query_log)
    return res
})

// This function will expose a PostgREST compatible api to the underlying SQLite database
// This is where the magic happens
router.all('/:table', async (req: NextApiRequest, res: NextApiResponse) => {
    let parse_start = 0, parse_end = 0, query_start = 0, query_end = 0, format_start = 0, format_end = 0; // used for performance measurements
    let { query:q } = req
    let { offset } = q
    const method = req.method || 'GET'
    // the role that is currently making the request
    // usually this would come from the JWT token payload
    // this role is used for the permissions check 
    const role = 'anonymous'
    
    if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) throw new SubzeroError(`Method ${method} not allowed`, 400)

    // initialize the subzero instance if it is not initialized yet
    if (!subzero) {
        await init_subzero()
    }

    // pass env values that should be available in the query context
    // used on the query format stage
    let queryEnv: QueryEnv = [
        ['request.jwt.claims', JSON.stringify({ role })],
    ]

    parse_start = performance.now()
    // parse the Request object into and internal AST representation
    let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, req)
    parse_end = performance.now()

    // in case of SQLite, we need to handle mutate request in two steps since SQLite does not support RETURNING inside a CTE
    // for other databses, only the code in the GET block is sufficient
    let result = null
    if (method == 'GET') {
    
        format_start = performance.now()
        // generate the SQL query from the AST representation
        const { query, parameters } = subzero.fmtMainQuery(subzeroRequest, queryEnv)
        format_end = performance.now()
        query_start = performance.now()
        // execute the query
        result = await db.get(query, parameters)
        query_end = performance.now()
        log_query(query, parameters)
    }
    else {
        try {
            db.run('BEGIN')
            const { query: mutate_query, parameters: mutate_parameters } = subzero.fmtSqliteMutateQuery(subzeroRequest, queryEnv)
            const r = await db.all(mutate_query, mutate_parameters)
            const ids = r.map((r) => r[Object.keys(r)[0]].toString())
            const isDelete = method == 'DELETE'
            const constraints_satisfied = isDelete ? true : r.every((r) => r['_subzero_check__constraint'] == 1)
            if (constraints_satisfied) {
                const { query: select_query, parameters: select_parameters } = subzero.fmtSqliteSecondStageSelect(subzeroRequest, ids, queryEnv)
                result = await db.get(select_query, select_parameters)

                log_query(mutate_query, mutate_parameters)
                log_query(select_query, select_parameters)
            }
            else {
                throw new SubzeroError('Permission denied', 403, 'check constraint of an insert/update permission has failed')
            }
            db.run('COMMIT')
        } catch (e) {
            db.run('ROLLBACK')
            throw e
        }
    }

    const status = Number(result.status) || 200
    const pageTotal = Number(result.page_total) || 0
    const totalResultSet = Number(result.total_result_set) || undefined

    const offsetInt = Number(offset) || 0
    const headers = {
        'range-unit': 'items',
        'content-range': fmtContentRangeHeader(offsetInt, offsetInt + pageTotal - 1, totalResultSet),
        'content-type': 'application/json',
        'x-parse-time': `${(parse_end - parse_start).toFixed(2)}ms`,
        'x-query-time': `${(query_end - query_start).toFixed(2)}ms`,
        'x-format-time': `${(format_end - format_start).toFixed(2)}ms`,
    }

    res.status(status)
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value))
    res.send(result.body)
    return res
})

// catch all handler (404)
// this should be the last handler defined
router.all('*', async (req, res) => {
    res.status(404).json({ message: 'Not found' })
    return res
})
// This is the entry point 
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // redirect non GET request to the instance designated as the primary by LiteFS
    if (req.method !== 'GET' && !isPrimary) {
        // replay the request to the primary instance
        res.setHeader('fly-replay', `instance=${primaryNode}`)
        res.status(307).send('')
        return
    }

    try {
        // this line is needed to make the itty-router work with NodeJS request objects
        if (req.url && req.url[0] === '/') req.url = `http://${req.headers.host}${req.url}`
        //@ts-ignore
        await router.handle(req, res)
    } catch (e: any) {
        // handle errors thrown by the route handlers
        if (e instanceof SubzeroError) {
            console.log('SubzeroError:', e)
            res.setHeader('content-type', 'application/json')
            res.status(e.status).send(e.toJSONString())
        }
        else {
            console.log('Error:', e)
            res.status(500).json({ message: e.toString() })
        }
    }
}