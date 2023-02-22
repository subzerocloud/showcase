import {createServer, IncomingMessage, ServerResponse} from 'http'
import mysql from 'mariadb'
import Subzero, { SubzeroError, getIntrospectionQuery, Env as QueryEnv, fmtContentRangeHeader, Statement } from '@subzerocloud/nodejs'

import { Router } from 'itty-router'
import jsonwebtoken from 'jsonwebtoken'
const { verify } = jsonwebtoken;
import jp from 'jsonpath'
import morgan from 'morgan'
import finalhandler from 'finalhandler'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const logger = morgan('combined')

// read the configuration parameters from env variables
const env = (name: string, defaultValue?: any) => process.env[`MYREST_${name.toUpperCase().replace(/-/g,'_')}`] || defaultValue
//admin-server-port
//app.settings.*
const dbAnonRole = env('db-anon-role', 'anonymous')
// const dbChannel = env('db-channel', 'pgrst')
// const dbChannelEnabled = env('db-channel-enabled', true)
// db-config=true
// const dbExtraSearchPath = env('db-extra-search-path', 'public')
const dbMaxRows = env('db-max-rows')
// db-plan-enabled=false
const dbPoolMax = env('db-pool', 10)
const dbPoolTimeout = env('db-pool-timeout', 3600)
// db-pre-request
// db-prepared-statements=true
const dbSchemas = env('db-schemas', '').split(',')
// db-tx-end=commit

const dbUri = env('db-uri', 'mysql://')
// db-use-legacy-gucs=false
const jwtAud = env('jwt-aud')
const jwtRoleClaimKey = env('jwt-role-claim-key', '.role')
const jwtSecretIsBase64 = env('jwt-secret-is-base64', false)
const jwtSecret = jwtSecretIsBase64 ? Buffer.from(env('jwt-secret'), 'base64'):env('jwt-secret')
// log-level=error
// openapi-mode=follow-privileges
// openapi-security-active=false
// openapi-server-proxy-uri=
// raw-media-types=
const serverHost = env('server-host', 'localhost')
const serverPort = env('server-port', 3000)
// server-unix-socket=
// server-unix-socket-mode=660

// env vars in adition to the ones from postgrest
const apiPrefix = env('api-prefix', '')
// allowed select functions can be defined here
// they can be used in the select parameter, ex:
// select=id,sku:$concat('#',id),name
const defaultSelectFunctions = [
    "avg", "count", "every", "max", "min", "sum",
    "array_agg", "json_agg", "jsonb_agg", "json_object_agg", "jsonb_object_agg", "string_agg",
    "corr", "covar_pop", "covar_samp", "regr_avgx",
    "regr_avgy", "regr_count", "regr_intercept", "regr_r2", "regr_slope", "regr_sxx", "regr_sxy", "regr_syy",
    "mode", "percentile_cont", "percentile_cont", "percentile_disc", "percentile_disc",
    "row_number", "rank", "dense_rank", "cume_dist", "percent_rank", "first_value", "last_value", "nth_value",
    "lower", "trim", "upper", "concat", "concat_ws", "format", "substr", "ceil", "truncate",
    "date_diff", "toHour", "dictGet", "dictHas", "dictGetOrDefault", "toUInt64"
]
const allowedSelectFunctions = env('allowed-select-functions', defaultSelectFunctions.join(',')).split(',')
const dbConnectionTimeout = env('db-connection-timeout', 10)
const dbMaxConnectionRetries = env('db-max-connection-retries', 0)
const dbMaxConnectionRetryInterval = env('db-max-connection-retry-interval', 10)
const introspectDbUri = env('introspect-db-uri')
const schemaFile = env('schema-file', resolve(__dirname, 'schema.json'))
const permissionsFile = env('permissions-file', resolve(__dirname, 'permissions.json'))
const relationsFile = env('relations-file', resolve(__dirname, 'relations.json'))
// you can use internal permissions that can be either hardcoded here or loaded from a file
// see other examples for more details
//import permissions from 'permissions.js'
let permissions:any = []
if (existsSync(permissionsFile)) {
    permissions = JSON.parse(readFileSync(permissionsFile, 'utf8'))
}

//import custom_relations from 'relations.js'
let custom_relations: any = []
if (existsSync(relationsFile)) {
    custom_relations = JSON.parse(readFileSync(relationsFile, 'utf8'))
}

let fileSchema:any = undefined
if (existsSync(schemaFile)) {
    fileSchema = JSON.parse(readFileSync(schemaFile, 'utf8'))
}

const { hostname, port, username, password, pathname } = new URL(dbUri)
const mysqlPort = parseInt(port) || 3306
const dbType = 'mysql'
const connectionParams = {
    host: hostname,
    user: username,
    port: mysqlPort,
    password,
    connectionLimit: dbPoolMax,
    connectTimeout: dbConnectionTimeout * 1000,
    insertIdAsNumber: true,
    bigIntAsNumber: true,
    //rowsAsArray: true,
    allowPublicKeyRetrieval: true,
    trace: true,
}

// WARNING! do not use this connection pool in other routes since the connections hold special user defined variables
// that might interfere with other queries
const subzeroDbPool = mysql.createPool(connectionParams)

async function introspectDatabaseSchema() {
    const { hostname, port, username, password } = new URL(introspectDbUri || dbUri)
    const mysqlPort = parseInt(port) || 3306
    const connectionParams = {
        host: hostname,
        user: username,
        port: mysqlPort,
        password,
        connectTimeout: dbConnectionTimeout * 1000,
        allowPublicKeyRetrieval: true,
        trace: true,
    }
    const { query, parameters} = getIntrospectionQuery(
        dbType, // database type
        dbSchemas, // the schema name (databases) that is exposed to the HTTP api (ex: public, api)
        // the introspection query has two 'placeholders' in order to be able adapt to different configurations
        new Map([
            ['relations.json', custom_relations],
            ['permissions.json', permissions],
        ])
    )
    const db = await mysql.createConnection(connectionParams)
    const result = await db.query(query, [JSON.stringify(parameters[0])])
    const schema = result[0].json_schema
    return schema
}

// this function initializes the subzero instance that is responsible for parsing and formatting the queries
let subzero: Subzero
let initializing = false
async function initSubzero() {
    if (initializing) { return } // prevent multiple calls
    initializing = true
    
    let wait = 0.5
    let retries = 0
    while (!subzero) {
        let schema
        try {
            schema = fileSchema || await introspectDatabaseSchema()
            console.log('Database schema loaded')
        } catch (e) {
            const message = e instanceof Error ? e.message : e
            retries++
            if (dbMaxConnectionRetries > 0 && retries > dbMaxConnectionRetries) {
                throw e
            }
            wait = Math.min(dbMaxConnectionRetryInterval, wait * 2)
            console.error(`Failed to connect to database (${message}), retrying in ${wait} seconds...`)
            await new Promise(resolve => setTimeout(resolve, wait * 1000))
        }
        try {
            subzero = new Subzero(dbType, schema, allowedSelectFunctions)
        }
        catch (e) {
            console.error('Failed to initialize subzero, this usually means the json schema structure is not valid', e)
            process.exit(1)
        }
        
    }
    initializing = false
}

function fmtMySqlEnv(env: QueryEnv): Statement {
    let parameters:any[] = []
    let queryParts:string[] = []
    env.forEach(([key,value], _i) => {
        queryParts.push(`@${key} = ?`)
        parameters.push(value)
    })
    const query = `set ${queryParts.join(', ')}`
    return { query, parameters }
}

function statusFromMyErrorCode(code: number) : number {
    let responseCode
    switch (code) {
        // TODO: add more error codes
        // case 1000: responseCode = 503; break;
        default: responseCode = 400; break;
    }

    return responseCode
}

// setup the router that is used to route the requests to the correct handler
const router = Router()

// define a custom handler for / route
router.get('/', async (_, res) => {
    res.writeHead(200).end(JSON.stringify({ message: 'Hello World!' }))
    return res
})

// This function will expose a PostgREST compatible api to the underlying database
// This is where the magic happens
router.all(`${apiPrefix}/:url_schema?/:table`, async (req: IncomingMessage & { url: string }, res: ServerResponse, context) => {
    
    if (!subzero) {
        throw new SubzeroError('Temporary unavailable', 503)
    }

    const method = req.method || 'GET'
    const url = new URL(req.url)
    // the role that is currently making the request
    // this role is used for the permissions check 
    const role = context.role
    const header_schema = req.headers['accept-profile'] || req.headers['content-profile']
    //@ts-ignore
    let { url_schema } = req.params
    url_schema = url_schema === 'rpc' ? undefined : url_schema
    const schema = url_schema || header_schema || dbSchemas[0]
    if (!dbSchemas.includes(schema)) {
        throw new SubzeroError(`Schema '${schema}' not found`, 406, `The schema must be one of the following: ${dbSchemas.join(', ')}`)
    }

    if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) throw new SubzeroError(`Method ${method} not allowed`, 400)

    // pass env values that should be available in the query context
    // used on the query format stage
    let queryEnv: QueryEnv = [
        ['role', role],
        ['request.method', method],
        ['request.headers', JSON.stringify(req.headers)],
        ['request.get', JSON.stringify(Object.fromEntries(url.searchParams))],
        ['request.jwt.claims', JSON.stringify(context.jwt_claims || {})],
    ]

    const prefix = `${apiPrefix}/${url_schema ? url_schema + '/' : ''}`
    // generate the SQL query that sets the env variables for the current request
    const { query: envQuery, parameters: envParameters } = fmtMySqlEnv(queryEnv)
    

    let result
    const db = await subzeroDbPool.getConnection()
    try {
        if (method === 'GET') {
            //console.log('envQuery', envQuery, envParameters)
            // generate the SQL query from request object
            const { query, parameters } = await subzero.fmtStatement(schema, prefix, role, req, queryEnv, dbMaxRows)
            //console.log('query', query, parameters)
            await Promise.all([
                db.query('set role ?', [role]),
                db.query(envQuery, envParameters)
            ])
        
            result = (await db.query(query, parameters))[0]
        }
        else {
            throw new SubzeroError(`Mutate statements not implemented yet in TS bindings`, 400)
            // MySQL does not support "returning" in the same query as "insert/update/delete
            // so we need to execute two queries
            // try {
            //     const txMode = method === 'GET' ? 'READ ONLY' : 'READ WRITE'
            //     await db.query(`BEGIN ISOLATION LEVEL READ COMMITTED ${txMode}`)
            //     const statement = await subzero.fmtMysqlTwoStepStatement(schema, `${apiPrefix}/`, role, req, queryEnv)
            //     const { query: mutate_query, parameters: mutate_parameters } = statement.fmtMutateStatement()
            //     const mutate_result = await db.query(mutate_query, mutate_parameters)
            //     statement.setMutatedRows(mutate_result)
            //     const { query: select_query, parameters: select_parameters } = statement.fmtSelectStatement()
            //     result = await db.query(select_query, select_parameters)
            //     await db.query('COMMIT')
            // } catch (e) {
            //     await db.query('ROLLBACK')
            //     throw e
            // }
        }
    }
    catch (e) {
        throw e
    }
    finally {
        db.release()
    }
    //console.log('result', result)
    const status = Number(result.status) || 200
    const pageTotal = Number(result.page_total) || 0
    const totalResultSet = Number(result.total_result_set) || undefined
    const offset = Number(url.searchParams.get('offset') || '0') || 0
    let response_headers = result.response_headers?JSON.parse(result.response_headers):{}
    response_headers['content-length'] = Buffer.byteLength(result.body)
    response_headers['content-type'] = 'application/json'
    response_headers['range-unit'] = 'items'
    response_headers['content-range'] = fmtContentRangeHeader(offset, offset + pageTotal - 1, totalResultSet)
    res.writeHead(status, response_headers).end(result.body)
    return res
})

// catch all route
router.all('*', async (_, res) => {
    res.writeHead(404, {
        'content-type': 'application/json',
    }).end(JSON.stringify({ message: 'Not Found' }))
    return res
})

// create the server
const server = createServer(async (req, res) => {
    const done = finalhandler(req, res)
    logger(req, res, async function (err) {
        if (err) return done(err)
    
        // respond to request
        try {
            // this line is needed to make the itty-router work with NodeJS request objects
            if (req.url && req.url[0] === '/') req.url = `http://${req.headers.host}${req.url}`

            // create a context object
            // this object is passed to the handlers
            const context: any = {
                role: dbAnonRole
            }
            // the JWT token is passed in the Authorization header
            // the token is expected to be in the format: Bearer <token>
            const authHeader = req.headers.authorization
            if (authHeader) {
                const token = authHeader.split(' ')[1]
                if (token) {
                    // the token is expected to be a JWT token
                    // verify throws an error if the token is invalid
                    const decoded = verify(token, jwtSecret, { audience: jwtAud, })
                    const role = jp.query(decoded, '$'+jwtRoleClaimKey)[0] || dbAnonRole
                    context.role = role
                    context.jwt_claims = decoded
                }
            }

            //@ts-ignore
            await router.handle(req, res, context)
        
        } catch (e: any) {
            // handle errors thrown by the route handlers
            // console.error(e)
            if (e instanceof SubzeroError) {
                res.writeHead(e.status, {
                    'content-type': 'application/json',
                }).end(e.toJSONString())
            }
            else if (e.sqlState && e.code) {
                // this is a mysql error
                const status = statusFromMyErrorCode(e.code)
                res.writeHead(status, {
                    'content-type': 'application/json',
                }).end(JSON.stringify({ message: e.text }))
            }
            else {
                res.writeHead(500, {
                    'content-type': 'application/json',
                }).end(JSON.stringify({ message: e.message }))
            }
        }
    })
    
})

server.listen(serverPort, serverHost, async () => {
    try {
        await initSubzero()
        console.log(`Server is running on http://${serverHost}:${serverPort}`);
    } catch (e) {
        console.error(`Failed to initialize: ${e}`)
    }
})