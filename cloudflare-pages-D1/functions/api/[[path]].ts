// this is a catch-all function that is called for every request to the api

import { Router } from 'itty-router';
import { Subzero, SubzeroError, get_introspection_query, Env as QueryEnv } from 'subzerocloud';
const router = Router();

const urlPrefix = '/api';
const publicSchema = 'public';
const dbType = 'sqlite';
let subzero: Subzero;

// we'll use this array to store queries executed by the worker and make them available in the /api/stats endpoint
let query_log: { time: number, query: string, parameters: any[] }[] = [];
const max_log_size = 100;

// allowed select functions can be defined here
// they can be used in the select parameter
const allowed_select_functions = ['substr', 'printf']

// Internal permissions can be defined here.
// They are usefull when the underlying database does not have that capability or when the database is not under your control to define api specific roles.
// Permission system is modeled after PostgreSql GRANT + RLS functionality.
// If the permissions array is empty, the internal permission system is disabled and assumes that the underlying database has the
// necessary permissions configured.

const permissions = [
    // example permissions

    // {
    //     "name": "public can see rows marked as public",
    //     "table_schema": "public", "table_name": "permissions_check",
    //     "role": "public",
    //     "grant": ["select"], "columns": ["id", "value"],
    //     "policy_for": ["select"],
    //     "using": [{"column":"public","op":"=","val":"1"}]
    // },
    // {
    //     "name": "validation for hidden value",
    //     "table_schema": "public", "table_name": "permissions_check",
    //     "role": "public",
    //     "restrictive": true,
    //     "check": [{
    //         "tree":{
    //             "logic_op":"or",
    //             "conditions":[
    //                 {"column":"hidden","op":"=","val":"Hidden"},
    //                 {"column":"hidden","op":"=","val":"Hidden changed"}
    //             ]
    //         }
    //     }]
    // },
    // {
    //     "name": "admin allow all",
    //     "table_schema": "public", "table_name": "permissions_check",
    //     "role": "admin",
    //     "grant": ["select", "insert", "update", "delete"],
    //     "policy_for": ["select", "insert", "update", "delete"],
    //     "using": [{"sql":"true"}],
    //     "check": [{"sql":"true"}]
    // },
    // {
    //     "name": "alice allow owned",
    //     "table_schema": "public","table_name": "permissions_check",
    //     "role": "alice",
    //     "grant": ["all"],
    //     "policy_for": ["select", "insert", "update", "delete"],
    //     "using": [{"column":"role","op":"=","env":"request.jwt.claims","env_part":"role"}],
    //     "check": [{"column":"role","op":"=","env":"request.jwt.claims","env_part":"role"}]
    // },
    // {
    //     "name": "bob allow owned",
    //     "table_schema": "public","table_name": "permissions_check",
    //     "role": "bob",
    //     "grant": ["all"],
    //     "policy_for": ["all"],
    //     "using": [{"column":"role","op":"=","val":"bob"}],
    //     "check": [{"column":"role","op":"=","val":"bob"}]
    // },

    // { "table_schema": "public", "table_name": "tbl1", "role": "public", "grant": ["all"], "using": [{"sql":"true"}] },

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
];

// While the introspection query can detect most relations automaticlly based on foreign keys,
// in situations where they are not detected (ex: views in sqlite).
// Custom relations can be defined here
const custom_relations = [
    // {
    //     "constraint_name": "tasks_project_id_fkey",
    //     "table_schema": "public",
    //     "table_name": "tasks",
    //     "columns": ["project_id"],
    //     "foreign_table_schema": "public",
    //     "foreign_table_name": "projects",
    //     "foreign_columns": ["id"]
    // }
];


// add event to the query log
function log_query(query: string, parameters: any[]) {
    query_log.unshift({ time: Date.now(), query, parameters });
    if (query_log.length > max_log_size) {
        query_log.pop();
    }
}

// helper function to format the value of the content-range header (ex: 0-9/100)
function content_range_header(lower: number, upper: number, total?: number): string {
    const range_string = (total != 0 && lower <= upper) ? `${lower}-${upper}` : '*'
    return total ? `${range_string}/${total}` : `${range_string}/*`;
}

// this function initializes the subzero instance that is responsible for parsing and formatting the queries
async function init_subzero(env) {
    const { query /*, parameters*/ } = get_introspection_query(
        dbType, // database type
        publicSchema, // the schema name that is exposed to the HTTP api (ex: public, api), though in case of sqlite this is ignored

        // the introspection query has two 'placeholders' in order to be able adapt to different configurations
        new Map([
            ['relations.json', custom_relations],
            ['permissions.json', permissions],
        ])
    );
    // although we have parameters, they are not used in the introspection query in sqlite
    // because the parameters refer to the "db schema" concept which missing in sqlite
    const statement = env.DB.prepare(query);//.bind(...parameters);
    const result = await statement.first();
    // the result of the introspection query is a json string representation of the database schema/structure
    // this schema object is used to generate the queries and check the permissions
    // to make the function startup faster, one can cache the schema object in a KV store
    const schema = JSON.parse(result.json_schema);
    subzero = new Subzero(dbType, schema, allowed_select_functions);
}

// we use the itty-router library to define sparate route handlers
// this allows us to have the entire backend handled by a single function (CF Worker)
// alternatifely, one can use the routing logic from Cloudflare Pages 
// https://developers.cloudflare.com/pages/platform/functions/#functions-routing

// define a custom handler for / route
router.get(`${urlPrefix}/`, async () => {
    const response = { message: 'Hello World!' };
    return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
            'content-type': 'application/json'
        }
    })
});


// route to return the query log (displayed on Dahsboard)
router.get(`${urlPrefix}/stats`, async () => {
    return new Response(JSON.stringify(query_log), {
        status: 200,
        headers: {
            'content-type': 'application/json'
        }
    })
});

// This route will expose a PostgREST compatible api to the underlying D1 database
// This is where the magic happens
router.all(`${urlPrefix}/:table`, async (req, env, { request }) => {

    // initialize the subzero instance if it is not initialized yet
    if (!subzero) {
        await init_subzero(env);
    }

    const method = req.method;
    const allowd_methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    if (!allowd_methods.includes(method)) {
        throw new SubzeroError(`Method ${method} not allowed`, 400);
    }

    // the role that is currently making the request
    // usually this would come from the JWT token payload;
    // this role is used for the permissions check 
    const role = 'anonymous';

    // pass env values that should be available in the query context
    let queryEnv: QueryEnv = [
        ['request.jwt.claims', JSON.stringify({ role })],
    ];

    // parse the Request object into and internal AST representation
    // note `req` is a Request object from itty-router
    // that is why we need to use `request` from the destructuring which is the original Request object
    let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, request);

    // in case of SQLite, we need to handle mutate request in two steps since SQLite does not support RETURNING inside a CTE
    // for other databses, only the code in the GET block is needed
    let result = null;
    if (method == 'GET') {
        // generate the SQL query from the AST representation
        const { query, parameters } = subzero.fmt_main_query(subzeroRequest, queryEnv);
        log_query(query, parameters);

        // prepare the statement
        const statement = env.DB.prepare(query).bind(...parameters);

        // the generated query always returns one row
        result = await statement.first();
        
    }
    else {
        // these queries need to be executed in a transaction however wrangler/miniflare does not support transactions yet
        // as described here https://blog.cloudflare.com/whats-new-with-d1/
        // so for now, this code is very specific to this example.
        // We relie on the fact that we only allow insert (on one table) and to do a rollback we just delete the inserted rows

        const { query: mutate_query, parameters: mutate_parameters } = subzero.fmt_sqlite_mutate_query(subzeroRequest, queryEnv);
        log_query(mutate_query, mutate_parameters);
        const mutate_statement = env.DB.prepare(mutate_query).bind(...mutate_parameters);
        const r = await mutate_statement.all()
        console.log(r);
        const ids = r.results.map((r) => r[Object.keys(r)[0]].toString());
        const isDelete = method == 'DELETE';
        const constraints_satisfied = isDelete ? true : r.results.every((r) => r['_subzero_check__constraint'] == 1);
        if (constraints_satisfied) {
            const { query: select_query, parameters: select_parameters } = subzero.fmt_sqlite_second_stage_select(subzeroRequest, ids, queryEnv);
            log_query(select_query, select_parameters);
            const select_statement = env.DB.prepare(select_query).bind(...select_parameters);
            result = await select_statement.first();
        }
        else {
            const table = req.params.table;
            const rollback_statement = env.DB.prepare(`DELETE FROM ${table} WHERE rowid IN (${ids.join(',')})`);
            await rollback_statement.run();
            throw new SubzeroError('Permission denied', 403, 'check constraint of an insert/update permission has failed')
        }
    }

    const body = result.body; // this is a json string
    const status = Number(result.status) || 200;
    const pageTotal = Number(result.page_total) || 0;
    const totalResultSet = Number(result.total_result_set) || undefined;
    
    // in case of mutate requests for databases that support a single step (RETURNING inside a CTE)
    // the result will contain a 'constraint_satisfied' column that indicates if the permission check has passed for all rows
    // if not, we should rollback the transaction and throw an error
    // const constraintsSatisfied = Boolean(result.constraints_satisfied) || false;
    
    // extract the offset parameter that is needed to calculate the content-range header
    // note req is the itty-router request object
    let { query: http_query } = req;
    let { offset } = http_query;
    let offsetInt = Number(offset) || 0;

    return new Response(body, {
        status,
        headers: {
            'range-unit': 'items',
            'content-range': content_range_header(offsetInt, offsetInt + pageTotal - 1, totalResultSet),
            'content-type': 'application/json'
        }
    });
})

// this is the entrypoint function of a Cloudflare worker
export async function onRequest(context) {
    // Contents of context object
    const {
        request, // same as existing Worker API
        env, // same as existing Worker API
        //params, // if filename includes [id] or [[path]]
        //waitUntil, // same as ctx.waitUntil in existing Worker API
        //next, // used for middleware or to fetch assets
        //data, // arbitrary space for passing data between middlewares
    } = context;

    // handle errors thrown by the route handlers
    try {
        return await router.handle(request, env, context);
    } catch (e) {
        if (e instanceof SubzeroError) {
            console.log('SubzeroError:', e);
            return new Response(e.toJSONString(), {
                status: e.statusCode(),
                headers: {
                    'content-type': 'application/json'
                }
            });
        }
        else {
            console.log('Error:', e);
            return new Response(JSON.stringify({ message: e.toString() }), {
                status: 500,
                headers: {
                    'content-type': 'application/json'
                }
            });
        }
    }
}