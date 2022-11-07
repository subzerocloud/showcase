// this is a catch-all function that is called for every request to the api
import { Pool } from 'pg'
import type { NextApiRequest, NextApiResponse } from 'next'
import { Subzero, SubzeroError, getIntrospectionQuery, Env as QueryEnv, fmtContentRangeHeader, /*fmtPostgreSqlEnv*/ } from 'subzerocloud'
import { Router } from 'itty-router'
import permissions from '../../permissions.js'
import custom_relations from '../../relations.js'


const urlPrefix = '/api'
const publicSchema = 'public'
const dbType = 'postgresql'
const connectionString = process.env.DATABASE_URL || process.env.DEV_DATABASE_URL
//console.log(connectionString)
const dbPool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
})

// allowed select functions can be defined here
// they can be used in the select parameter
const allowed_select_functions = ['substr', 'concat']


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


// this function initializes the subzero instance that is responsible for parsing and formatting the queries
let subzero: Subzero
async function initSubzero() {
    console.log('initSubzero')
    
    const { query , parameters } = getIntrospectionQuery(
        dbType, // database type
        publicSchema, // the schema name that is exposed to the HTTP api (ex: public, api)
        // the introspection query has two 'placeholders' in order to be able adapt to different configurations
        new Map([
            ['relations.json', custom_relations],
            ['permissions.json', permissions],
        ])
    )
    //console.log(query, parameters)
    const db = await dbPool.connect()
    const result = await db.query(query, parameters)
    db.release()

    // the result of the introspection query is a json string representation of the database schema/structure
    // this schema object is used to generate the queries and check the permissions
    // to make the function startup faster, one can cache the schema object
    const schema = JSON.parse(result.rows[0].json_schema)
    //console.log('schema', schema)
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

// This function will expose a PostgREST compatible api to the underlying database
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
        await initSubzero()
    }

    // pass env values that should be available in the query context
    // used on the query format stage
    let queryEnv: QueryEnv = [
        ['role', role],
        ['request.method', method],
        ['request.headers', JSON.stringify(req.headers)],
        ['request.jwt.claims', JSON.stringify({ role })],
    ]

    parse_start = performance.now()
    // parse the Request object into and internal AST representation
    let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, req)
    parse_end = performance.now()

    
    
    format_start = performance.now()
    //const { query: envQuery, parameters: envParameters } = fmtPostgreSqlEnv(queryEnv)
    // generate the SQL query from the AST representation
    const { query, parameters } = subzero.fmtMainQuery(subzeroRequest, queryEnv)
    format_end = performance.now()

    let result
    const db = await dbPool.connect()
    query_start = performance.now()
    try {
        const txMode = method === 'GET' ? 'READ ONLY' : 'READ WRITE'
        await db.query(`BEGIN ISOLATION LEVEL READ COMMITTED ${txMode}`)
        //await db.query(envQuery, envParameters)
        result = (await db.query(query, parameters)).rows[0]
        if (!result.constraints_satisfied) {
            throw new SubzeroError('Permission denied', 403, 'check constraint of an insert/update permission has failed')
        }
        await db.query('COMMIT')
    } catch (e) {
        await db.query('ROLLBACK')
        throw e
    }
    finally {
        db.release()
    }
    query_end = performance.now()
    log_query(query, parameters)
    

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

    try {
        // this line is needed to make the itty-router work NodeJS request objects
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