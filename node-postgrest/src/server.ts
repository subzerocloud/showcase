import {createServer, IncomingMessage, ServerResponse} from 'http'
import pg from 'pg'
const {Pool} = pg
import { Subzero, SubzeroError, getIntrospectionQuery, Env as QueryEnv, fmtContentRangeHeader, fmtPostgreSqlEnv, statusFromPgErrorCode } from 'subzerocloud'
import { Router } from 'itty-router'
import jsonwebtoken from 'jsonwebtoken'
const { verify } = jsonwebtoken;
import jp from 'jsonpath'

// read the configuration parameters from env variables
const env = (name: string, defaultValue?: any) => process.env[`PGRST_${name.toUpperCase().replace(/-/g,'_')}`] || defaultValue
//admin-server-port
//app.settings.*
const dbAnonRole = env('db-anon-role', 'anonymous')
const dbChannel = env('db-channel', 'pgrst')
const dbChannelEnabled = env('db-channel-enabled', true)
// db-config=true
const dbExtraSearchPath = env('db-extra-search-path', 'public')
const dbMaxRows = env('db-max-rows')
// db-plan-enabled=false
const dbPoolMax = env('db-pool', 10)
const dbPoolTimeout = env('db-pool-timeout', 3600)
// db-pre-request
// db-prepared-statements=true
const dbSchemas = env('db-schemas', 'public').split(',')
// db-tx-end=commit
const dbUri = env('db-uri', 'postgresql://')
// db-use-legacy-gucs=true
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
const allowedSelectFunctions = env('allowed-select-functions', '').split(',')
const dbConnectionTimeout = env('db-connection-timeout', 10)
const dbMaxConnectionRetries = env('db-max-connection-retries', 0)
const dbMaxConnectionRetryInterval = env('db-max-connection-retry-interval', 10)

// you can use internal permissions that can be either hardcoded here or loaded from a file
// see other examples for more details
//import permissions from 'permissions.js'
const permissions:any = []
//import custom_relations from 'relations.js'
const custom_relations: any = []

const dbPool = new Pool({
    connectionString: dbUri,
    max: dbPoolMax,
    idleTimeoutMillis: dbPoolTimeout * 1000,
    connectionTimeoutMillis: dbConnectionTimeout * 1000,
})

// this function initializes the subzero instance that is responsible for parsing and formatting the queries
const dbType = 'postgresql'
let subzero: Subzero
let initializing = false
async function initSubzero() {
    if (initializing) { return } // prevent multiple calls
    initializing = true
    const { query , parameters } = getIntrospectionQuery(
        dbType, // database type
        dbSchemas, // the schema name that is exposed to the HTTP api (ex: public, api)
        // the introspection query has two 'placeholders' in order to be able adapt to different configurations
        new Map([
            ['relations.json', custom_relations],
            ['permissions.json', permissions],
        ])
    )
    let wait = 0.5
    let retries = 0
    while (!subzero) {
        try {
            const result = await dbPool.query(query, parameters)
            // the result of the introspection query is a json string representation of the database schema/structure
            // this schema object is used to generate the queries and check the permissions
            const schema = JSON.parse(result.rows[0].json_schema)
            subzero = new Subzero(dbType, schema, allowedSelectFunctions)
            console.log('Database schema loaded')
        } catch (e) {
            retries++
            if (dbMaxConnectionRetries > 0 && retries > dbMaxConnectionRetries) {
                throw e
            }
            wait = Math.min(dbMaxConnectionRetryInterval, wait * 2)
            console.error(`Failed to connect to database, retrying in ${wait} seconds...`)
            await new Promise(resolve => setTimeout(resolve, wait * 1000))
        }
    }
    initializing = false
}

// function to monitor schema changes
let listening = false
async function monitorSchemaChanges() {
    if (!dbChannelEnabled || listening) { return }
    const client = await dbPool.connect()
    let wait = 0.5
    while (!listening) {
        try {
            console.log(`Connecting to database channel ${dbChannel}`)
            client.on('notification', async (msg) => {
                switch (msg.payload) {
                    case '':
                    case 'reload schema':
                        console.log('Reloading database schema')
                        await initSubzero()
                        break
                    default:break
                }
            })
            client.on('error', async (err) => {
                console.log(`Error on ${dbChannel} channel connection: ${err.message}`)
            })
            client.on('end', async () => {
                console.log(`Disconnected from database channel ${dbChannel}`)
                listening = false
                await monitorSchemaChanges()
            })
            await client.query(`LISTEN ${dbChannel}`)
            listening = true
        } catch (e) {
            wait = Math.min(dbMaxConnectionRetryInterval, wait * 2)
            console.error(`Failed to connect to database channel, retrying in ${wait} seconds...`)
            await new Promise(resolve => setTimeout(resolve, wait * 1000))
        }
    }
    console.log(`Listening for schema changes on ${dbChannel}`)
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
        ['search_path', dbExtraSearchPath],
        ['request.method', method],
        ['request.headers', JSON.stringify(req.headers)],
        ['request.get', JSON.stringify(url.searchParams)],
        ['request.jwt.claims', JSON.stringify(context.jwt_claims || {})],
    ]

    // parse the Request object into and internal AST representation
    const prefix = `${apiPrefix}/${url_schema ? url_schema + '/' : ''}`
    const subzeroRequest = await subzero.parse(schema, prefix, role, req, dbMaxRows)
    const { query: envQuery, parameters: envParameters } = fmtPostgreSqlEnv(queryEnv)
    // generate the SQL query from the AST representation
    const { query, parameters } = subzero.fmtMainQuery(subzeroRequest, queryEnv)

    let result
    const db = await dbPool.connect()
    try {
        const txMode = method === 'GET' ? 'READ ONLY' : 'READ WRITE'
        await db.query(`BEGIN ISOLATION LEVEL READ COMMITTED ${txMode}`)
        await db.query(envQuery, envParameters)
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
        console.error(e)
        if (e instanceof SubzeroError) {
            res.writeHead(e.status, {
                'content-type': 'application/json',
            }).end(e.toJSONString())
        }
        else if (e.severity && e.code) {
            // this is a Postgres error
            const status = statusFromPgErrorCode(e.code)
            res.writeHead(status, {
                'content-type': 'application/json',
            }).end(JSON.stringify({ message: e.message, detail: e.detail, hint: e.hint }))
        }
        else {
            res.writeHead(500, {
                'content-type': 'application/json',
            }).end(JSON.stringify({ message: e.message }))
        }
    }
})


server.listen(serverPort, serverHost, async () => {
    try {
        await initSubzero()
        await monitorSchemaChanges()
        console.log(`Server is running on http://${serverHost}:${serverPort}`);
    } catch (e) {
        console.error(`Failed to initialize: ${e}`)
    }
})