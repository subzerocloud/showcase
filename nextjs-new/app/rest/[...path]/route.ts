/* eslint-disable @typescript-eslint/no-explicit-any */
import { AutoRouter } from 'itty-router'
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import debug from 'debug';
import jwt from 'jsonwebtoken';
import { init as restInit, getRequestHandler as rest, SubzeroError, statusFromPgErrorCode } from '@subzerocloud/rest'
import pg from 'pg';
const { Pool } = pg;

// read env
const env = dotenv.config();
expand(env);

// read the env vars and set some defaults
const {
    DB_URI,
    JWT_SECRET = Math.random().toString(36).substring(2, 34), // random secret for JWT if not set
    DB_ANON_ROLE,
    DB_SCHEMAS,
    SUBZERO_LICENSE_KEY,
    DB_POOL_MAX,
} = process.env;
const dbAnonRole = DB_ANON_ROLE || 'anon';
const dbSchemas = DB_SCHEMAS ? DB_SCHEMAS.split(',') : ['public'];
const pathPrefix = '/rest';

// Create a database connection pool
const dbPool = new Pool({
    connectionString: DB_URI,
    max: DB_POOL_MAX ? parseInt(DB_POOL_MAX) : 10,
});

// create the router
// this is a lightweight alternative to express.js
// this is more suitable for a serverless environment
const router = AutoRouter({base: pathPrefix});


// middleware to check if the request has a valid JWT token and add the payload to the request object
// subzero rest expects the user object to be set to the jwt payload
const authenticateJWT = (req: any) => {
    const token = req.headers.get('authorization')?.split(' ')[1] || null;
    if (token) {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload) {
            req.user = payload;
        }
        else {
            return Response.json({ message: 'Unauthorized' }, { status: 401 });
        }
    }
}
router.all('*', authenticateJWT);


// the high level subzero functions expect a express runtime
// but that is not a hard dependency and we can mock it
// we only use express to persist a global subzero instance
const settings: { [key: string]: any } = {};
const app = {
    set: function (name: string, value: any) {
        settings[name] = value;
    },
    get: function(name: string) {
        return settings[name];
    },
    use: function (fn: any) {
        router.all('*', fn);
    },
}
const withExpressApp = (req: any) => {
    req.app = app
}
router.all('*', withExpressApp);


// middleware to convert the web api Request object (NextRequest) to the express like Request object
const withExpressRequest = (req: any) => {
    const url = new URL(req.url);
    req.get = (name: string) => {
        switch (name) {
            case 'host':
                return url.host;
            default:
                return req.headers.get(name);
        }
    };
    req.protocol = url.protocol.replace(':', '');
    req.originalUrl = url.pathname + url.search;
    // this is used by subzero rest to determine the path prefix
    // if you attach the rest handler something different, ex /v1/*
    // you need to adjust this also
    req.path_prefix = pathPrefix + '/';
}
router.all('*', withExpressRequest);

// middleware to initialize subzero rest module, this is called once and cached
let initialized = false;
let initializing = false;
const withSubzero = async () => {
    if (initializing) return; // prevent multiple calls
    if (initialized) return; // already initialized
    initializing = true;

    // Initialize the rest module
    await restInit(app as any, 'postgresql', dbPool, dbSchemas, {
        useInternalPermissionsCheck: false,
        debugFn: debug('subzero:rest'),
        licenseKey: SUBZERO_LICENSE_KEY,
    });

    initializing = false;
    initialized = true;
}
router.all('*', withSubzero);


// add custom endpoints here
// this needs to be before the catch-all rest handler
router.get('/check', () => {
    return new Response('ok');
});

// The rest module provides a PostgREST-compatible API for accessing the database
const restHandler = rest(dbSchemas, { debugFn: debug('subzero:rest'), dbAnonRole });
router.all('*', restHandler);

// we are done with defining our routes
// now we connect our router to the next.js request/response cycle

// this handler is mostly for converting Node.js Response expected by the rest module
// to the Web API Response expected by Next.js while leaving the other handlers intact
async function handler(req: Request): Promise<Response> {
    if (!initialized && initializing) {
        return new Response('Service Unavailable', { status: 503 });
    }
    return new Promise(async (resolve, reject) => {
        const res = {
            headers: new Headers(),
            statusCode: 200,
            writeHead(status: number, headers: Record<string, string>) {
                this.statusCode = status;
                for (const [key, value] of Object.entries(headers)) {
                    this.headers.set(key, value);
                }
                return this;
            },
            end(body: string | Buffer) {
                resolve(new Response(body, {
                    status: this.statusCode,
                    headers: this.headers,
                }));
            }
        };

        try {
            const result = await router.fetch(req, res, (result: any) => {
                if (result instanceof Response) {
                    return resolve(result);
                }
                if (result instanceof SubzeroError) {
                    const status = result.status;
                    const body = result.toJSONString();
                    return resolve(new Response(body, { status, headers: { 'Content-Type': 'application/json' } }));
                }

                // handle pg errors
                if (result.severity !== undefined) {
                    const status = statusFromPgErrorCode(result.code);
                    return resolve(
                        Response.json(
                            { message: result.message, detail: result.detail, hint: result.hint },
                            { status }
                        )
                    )
                }
                if (result instanceof Error) {
                    
                    return reject(result);
                }
                
                return result;
            });

            // Handle synchronous returns from router.fetch
            if (result instanceof Response) {
                resolve(result);
            }
        } catch (error) {
            reject(error);
        }
    });
}

// export the handler for each http method for next.js
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;