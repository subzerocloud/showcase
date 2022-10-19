// this is a catch-all function that is called for every request to the api
import * as sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import type { NextApiRequest, NextApiResponse } from 'next'
import { Subzero, SubzeroError, get_introspection_query, Env as QueryEnv } from 'subzerocloud'
import { convertRequest, content_range_header } from '../../utils/utils'
import { existsSync, readFileSync } from 'fs'
import { dirname } from 'path';
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'


const argv = yargs(hideBin(process.argv)).options({
    db: { type: 'string', default: 'db.sqlite' },
    schema: { type: 'string', default: 'northwindtraders.sql' },
}).parseSync()


const urlPrefix = '/api'
const publicSchema = 'public'
const dbType = 'sqlite'
const dbFile = argv.db
const schemaFile = argv.schema

let subzero: Subzero
let db: Database<sqlite3.Database>

// allowed select functions can be defined here
// they can be used in the select parameter
const allowed_select_functions = ['substr', 'printf']

// Internal permissions can be defined here.
// They are usefull when the underlying database does not have that capability or when the database is not under your control to define api specific roles.
// Permission system is modeled after PostgreSql GRANT + RLS functionality.
// If the permissions array is empty, the internal permission system is disabled and assumes that the underlying database has the
// necessary permissions configured.

const permissions:any = [
    // allow select on all tables used in the UI for the public role
    { "table_schema": "public", "table_name": "Customers", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Suppliers", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Products", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Orders", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Employees", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Customer", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Order Details", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },

    // allow select and insert (on specific columns) for the Categories table
    // try inserting a new category with the following curl command:
    // curl -X POST -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"CategoryName":"Ice Cream"}' "http://localhost:3000/api/Categories?select=CategoryID,CategoryName"
    { "table_schema": "public", "table_name": "Categories", "role": "public", "grant": ["select"] },
    { "table_schema": "public", "table_name": "Categories", "role": "public", "grant": ["insert"], "columns": ["CategoryName", "Description"] },
    {
        "table_schema": "public", "table_name": "Categories", "role": "public",
        "policy_for": ["all"],
        // can see all categories
        "using": [{ "sql": "true" }],
        // can insert only a "Ice Cream" as a new category
        "check": [{"column":"CategoryName","op":"=","val":"Ice Cream"}]
    },
]

// While the introspection query can detect most relations automaticlly based on foreign keys,
// in situations where they are not detected (ex: views in sqlite).
// Custom relations can be defined here
const custom_relations:any = [
    // {
    //     "constraint_name": "tasks_project_id_fkey",
    //     "table_schema": "public",
    //     "table_name": "tasks",
    //     "columns": ["project_id"],
    //     "foreign_table_schema": "public",
    //     "foreign_table_name": "projects",
    //     "foreign_columns": ["id"]
    // }
]


// Stup a mechanism to detect if this node is the primary node
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
    
    const { query /*, parameters*/ } = get_introspection_query(
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

// This function will expose a PostgREST compatible api to the underlying SQLite database
// This is where the magic happens
async function api(request:Request, offset?: string): Promise<Response> {
    let parse_start=0, parse_end=0, query_start=0, query_end=0, format_start=0, format_end=0;
    // initialize the subzero instance if it is not initialized yet
    if (!subzero) {
        await init_subzero()
    }

    const method = request.method
    if (! ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        throw new SubzeroError(`Method ${method} not allowed`, 400)
    }

    // the role that is currently making the request
    // usually this would come from the JWT token payload
    // this role is used for the permissions check 
    const role = 'anonymous'

    // pass env values that should be available in the query context
    let queryEnv: QueryEnv = [
        ['request.jwt.claims', JSON.stringify({ role })],
    ]

    
    parse_start = performance.now()
    // parse the Request object into and internal AST representation
    let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, request)
    parse_end = performance.now()

    // in case of SQLite, we need to handle mutate request in two steps since SQLite does not support RETURNING inside a CTE
    // for other databses, only the code in the GET block is needed
    let result = null
    if (method == 'GET') {
        
        format_start = performance.now()
        // generate the SQL query from the AST representation
        const { query, parameters } = subzero.fmt_main_query(subzeroRequest, queryEnv)
        format_end = performance.now()
        query_start = performance.now()
        // execute the query
        result = await db.get(query, parameters)
        query_end = performance.now()
    }
    else {
        try {
            db.run('BEGIN')
            const { query: mutate_query, parameters: mutate_parameters } = subzero.fmt_sqlite_mutate_query(subzeroRequest, queryEnv)
            const r = await db.all(mutate_query, mutate_parameters)
            const ids = r.map((r) => r[Object.keys(r)[0]].toString())
            const isDelete = method == 'DELETE'
            const constraints_satisfied = isDelete ? true : r.every((r) => r['_subzero_check__constraint'] == 1)
            if (constraints_satisfied) {
                const { query: select_query, parameters: select_parameters } = subzero.fmt_sqlite_second_stage_select(subzeroRequest, ids, queryEnv)
                result = await db.get(select_query, select_parameters)
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

    const body = result.body // this is a json string
    const status = Number(result.status) || 200
    const pageTotal = Number(result.page_total) || 0
    const totalResultSet = Number(result.total_result_set) || undefined
    
    const offsetInt = Number(offset) || 0
    return new Response(body, {
        status,
        headers: {
            'range-unit': 'items',
            'content-range': content_range_header(offsetInt, offsetInt + pageTotal - 1, totalResultSet),
            'content-type': 'application/json',
            'x-parse-time': `${(parse_end - parse_start).toFixed(2)}ms`,
            'x-query-time': `${(query_end - query_start).toFixed(2)}ms`,
            'x-format-time': `${(format_end - format_start).toFixed(2)}ms`,
        }
    })
}



export const config = {
    api: {
        // disable nextjs body parsing, we need it as a string
        bodyParser: false,
    },
}

// This is the entry point 
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method !== 'GET' && !isPrimary) {
            // replay the request to the primary instance
            res.setHeader('fly-replay', `instance=${primaryNode}`)
            res.status(307).send('')
            return
        }

        let { query } = req
        let { offset } = query
        let response = await api(await convertRequest(req), offset as string)
        response.headers.forEach((value, key) => res.setHeader(key, value))
        res.status(response.status).send(await response.text())
    } catch (e: any) {
        // handle errors thrown by the route handlers
        if (e instanceof SubzeroError) {
            console.log('Error:', e)
            res.setHeader('content-type', 'application/json')
            res.status(e.status).send(e.toJSONString())
        }
        else {
            console.log('Error:', e)
            res.status(500).json({ message: e.toString() })
        }
    }
}