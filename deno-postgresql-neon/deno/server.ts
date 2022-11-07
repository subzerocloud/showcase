// this is a catch-all function that is called for every request to the api
import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.159.0/http/file_server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
// @deno-types="../node_modules/subzerocloud/dist/index.d.ts"
import { Subzero, SubzeroError, getIntrospectionQuery, Env, fmtContentRangeHeader, /*fmtPostgreSqlEnv*/ } from '../node_modules/subzerocloud/dist/index.js'
// @deno-types="../node_modules/itty-router/dist/itty-router.d.ts"
import { Router } from '../node_modules/itty-router/dist/itty-router.min.mjs'
import permissions from '../permissions.js'
import custom_relations from '../relations.js'


const urlPrefix = '/api'
const publicSchema = 'public'
const dbType = 'postgresql'
const connectionString = Deno.env.get('DATABASE_URL')
const dbPool = new Pool(connectionString, 20, true)

// allowed select functions can be defined here
// they can be used in the select parameter
const allowed_select_functions = ['substr', 'concat']


// we'll use this array to store queries executed by the worker and make them available in the /api/stats endpoint
const query_log: { time: number, query: string, parameters: any[] }[] = []
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
    const result = await db.queryObject<any>(query, parameters)
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
router.get('/', () => {
    const response = { message: 'Hello World!' }
    return new Response(JSON.stringify(response), {
        status: 200,
        headers: {'content-type': 'application/json'}
    })
})

// route to return the query log (displayed on Dahsboard)
router.get('/stats', () => {
    return new Response(JSON.stringify(query_log), {
        status: 200,
        headers: {'content-type': 'application/json'}
    })
})

// This function will expose a PostgREST compatible api to the underlying database
// This is where the magic happens
router.all('/:table', async (req: Request) => {
    let parse_start = 0, parse_end = 0, query_start = 0, query_end = 0, format_start = 0, format_end = 0; // used for performance measurements
    const url = new URL(req.url)
    const offset = url.searchParams.get('offset')
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
    const queryEnv: Env = [
        ['role', role],
        ['request.method', method],
        ['request.headers', JSON.stringify(req.headers)],
        ['request.get', JSON.stringify(url.searchParams)],
        ['request.jwt.claims', JSON.stringify({ role })],
    ]

    parse_start = performance.now()
    // parse the Request object into and internal AST representation
    const subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, req)
    parse_end = performance.now()

    format_start = performance.now()
    // const { query: envQuery, parameters: envParameters } = fmtPostgreSqlEnv(queryEnv) // uncomment if you rely on pg permissions
    // generate the SQL query from the AST representation
    const { query, parameters } = subzero.fmtMainQuery(subzeroRequest, queryEnv)
    format_end = performance.now()

    let result
    const db = await dbPool.connect()
    query_start = performance.now()
    const read_only = method === 'GET' ? true : false
    const transaction = db.createTransaction("transaction_x", {isolation_level: 'read_committed',read_only})
    try {
        await transaction.begin()
        //await db.queryObject(envQuery, envParameters) // uncomment if you rely on pg permissions
        result = (await transaction.queryObject<any>(query, parameters)).rows[0]
        if (!result.constraints_satisfied) {
            throw new SubzeroError('Permission denied', 403, 'check constraint of an insert/update permission has failed')
        }
        await transaction.commit()
    } catch (e) {
        await transaction.rollback()
        throw e
    }
    finally {
        db.release()
    }
    query_end = performance.now()
    log_query(query, parameters)
    

    const body = result.body
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

    return new Response(body, {status,headers})
})

// catch all handler (404)
// this should be the last handler defined
router.all('*', () => {
    return new Response(JSON.stringify({message: 'not found'}), {
        status: 404,
        headers: {'content-type': 'application/json'}
    })

})
// This is the entry point 

serve( async (req) => {
    try {
        const pathname = new URL(req.url).pathname;
        if (pathname.startsWith(urlPrefix)) { 
            return await router.handle(req)
        }
        else {
            return serveDir(req, {fsRoot: "out",});
        }
    } catch (e: any) {
        // handle errors thrown by the route handlers
        if (e instanceof SubzeroError) {
            console.log('SubzeroError:', e)
            return new Response(e.toJSONString(), {
                status: e.statusCode(),
                headers: {
                    'content-type': 'application/json'
                }
            })
        }
        else {
            console.log('Error:', e)
            return new Response(JSON.stringify({ message: e.toString() }), {
                status: 500,
                headers: {
                    'content-type': 'application/json'
                }
            })
        }
    }
})