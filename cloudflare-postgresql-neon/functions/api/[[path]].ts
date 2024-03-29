// this is a catch-all function that is called for every request to the api
import { Client } from '@neondatabase/serverless'
import { Router } from 'itty-router'
import Subzero, { SubzeroError, getIntrospectionQuery, Env as QueryEnv, fmtContentRangeHeader } from '@subzerocloud/web'
import permissions from '../../permissions.js'
import custom_relations from '../../relations.js'

const urlPrefix = '/api'
const publicSchema = 'public'
const dbType = 'postgresql'

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
async function init_subzero(env) {
    const { query , parameters } = getIntrospectionQuery(
        dbType, // database type
        publicSchema, // the schema name that is exposed to the HTTP api (ex: public, api)
        // the introspection query has two 'placeholders' in order to be able adapt to different configurations
        new Map([
            ['relations.json', custom_relations],
            ['permissions.json', permissions],
        ])
    )
    if (env.DATABASE_URL === undefined) {
        throw new Error('DATABASE_URL is not defined')
    }
    const db = new Client(env.DATABASE_URL)
    await db.connect()
    const result = await db.query(query, parameters)

    // the result of the introspection query is a json string representation of the database schema/structure
    // this schema object is used to generate the queries and check the permissions
    // to make the function startup faster, one can cache the schema object in a KV store
    const schema = JSON.parse(result.rows[0].json_schema)
    subzero = new Subzero(dbType, schema, allowed_select_functions)
}

// we use the itty-router library to define separate route handlers
// this allows us to have the entire backend handled by a single function (CF Worker)
// alternatively, one can use the routing logic from Cloudflare Pages 
// https://developers.cloudflare.com/pages/platform/functions/#functions-routing

// setup the router that is used to route the requests to the correct handler
const router = Router({ base: urlPrefix })

// define a custom handler for / route
router.get('/', async () => {
    const response = { message: 'Hello World!' }
    return new Response(JSON.stringify(response), {
        status: 200,
        headers: {'content-type': 'application/json'}
    })
})

// route to return the query log (displayed on Dashboard)
router.get('/stats', async () => {
    return new Response(JSON.stringify(query_log), {
        status: 200,
        headers: {'content-type': 'application/json'}
    })
})

// This route will expose a PostgREST compatible api to the underlying D1 database
// This is where the magic happens
router.all('/:table', async (req, env) => {
    
    // the role that is currently making the request
    // usually this would come from the JWT token payload
    // this role is used for the permissions check
    const role = 'anonymous'

    const method = req.method
    if (! ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        throw new SubzeroError(`Method ${method} not allowed`, 400)
    }

    // initialize the subzero instance if it is not initialized yet
    if (!subzero) {
        await init_subzero(env)
    }

    // pass env values that should be available in the query context
    let queryEnv: QueryEnv = [
        ['request.jwt.claims', JSON.stringify({ role })],
    ]

    // const { query: envQuery, parameters: envParameters } = fmtPostgreSqlEnv(queryEnv)
    // generate the SQL query from request object
    const { query, parameters } = await subzero.fmtStatement(publicSchema, `${urlPrefix}/`, role, req, queryEnv)
    log_query(query, parameters)

    let result
    if (env.DATABASE_URL === undefined) {
        throw new Error('DATABASE_URL is not defined')
    }
    const db = new Client(env.DATABASE_URL)
    const query_start = Date.now()
    await db.connect()
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
    const query_end = Date.now()
    const body = result.body // this is a json string
    const status = Number(result.status) || 200
    const pageTotal = Number(result.page_total) || 0
    const totalResultSet = Number(result.total_result_set) || undefined

    // extract the offset parameter that is needed to calculate the content-range header
    const url = new URL(req.url)
    const offset = url.searchParams.get('offset')
    let offsetInt = Number(offset) || 0

    return new Response(body, {
        status,
        headers: {
            'range-unit': 'items',
            'content-range': fmtContentRangeHeader(offsetInt, offsetInt + pageTotal - 1, totalResultSet),
            'content-type': 'application/json',
            'x-query-time': `${(query_end - query_start).toFixed(2)}ms`,
        }
    })
})

// catch all route
router.all('*', async (_, res) => {
    res.writeHead(404, {
        'content-type': 'application/json',
    }).end(JSON.stringify({ message: 'Not Found' }))
    return res
})

async function handleRequest(request, env, context) {
    // handle errors thrown by the route handlers
    try {
        return await router.handle(request, env)
    } catch (e) {
        if (e instanceof SubzeroError) {
            return new Response(e.toJSONString(), {
                status: e.statusCode(),
                headers: {
                    'content-type': 'application/json'
                }
            })
        }
        else {
            return new Response(JSON.stringify({ message: e.toString() }), {
                status: 500,
                headers: {
                    'content-type': 'application/json'
                }
            })
        }
    }
}

// this is the entrypoint function of a Cloudflare Pages function
export async function onRequest(context) {
    // Contents of context object
    const {
        request, // same as existing Worker API
        env, // same as existing Worker API
        //params, // if filename includes [id] or [[path]]
        //waitUntil, // same as ctx.waitUntil in existing Worker API
        //next, // used for middleware or to fetch assets
        //data, // arbitrary space for passing data between middleware
    } = context

    return await handleRequest(request, env, context)
}

// this is the entrypoint function of a Cloudflare Worker
export default {
    async fetch(request, env, context) {
        return await handleRequest(request, env, context)
    },
};
