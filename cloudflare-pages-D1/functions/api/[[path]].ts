// this is a catch-all function that is called for every request to the api

import { Router } from 'itty-router';
import { Subzero, SubzeroError,  get_introspection_query, Env as QueryEnv } from 'subzerocloud';
const router = Router();

const urlPrefix = '/api';
const publicSchema = 'public';
const dbType = 'sqlite';
let subzero: Subzero;

// we'll use this array to store queries executed by the worker and make them available in the /api/log endpoint
let query_log: { time: number, query: string, parameters: any[] }[] = [];
const max_log_size = 100;

// allowed select functions can be defined here
// they can be used in the select parameter
const allowed_select_functions = ['substr','printf']

// internal permissions can be defined here
// permission system is modeled after PostgreSql GRANT + RLS functionality
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

];

// custom relations can be defined here
// while the introspection query can detect most relations automaticlly based on foreign keys,
// in situations where they are not detected (ex: views in sqlite), they can be defined here
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
	//console.log('init_subzero');
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
	//console.log('schema parsed:', schema);
	// the first parameters is the underlying db type, which in this case is sqlite since D1 is sqlite compatible
	subzero = new Subzero(dbType, schema, allowed_select_functions);
}

// we use the itty-router library to define sparate route handlers

// define a custom handler for / route
router.get(`${urlPrefix}/`, async () => {
	const response = {message: 'Hello World!'};
	return new Response(JSON.stringify(response), {
		status: 200,
		headers: {
			'content-type': 'application/json'
		}
	})
});

router.get(`${urlPrefix}/stats`, async () => {
	return new Response(JSON.stringify(query_log), {
		status: 200,
		headers: {
			'content-type': 'application/json'
		}
	})
});

// this route will expose a PostgREST compatible api to the underlying D1 database
// this is where the magic happens
router.get(`${urlPrefix}/:table`, async (req, env, { request }) => {
	// note req is the itty-router request object
	let { query:http_query } = req;
	let { offset } = http_query;
	// cast offset to number
	let offsetInt = Number(offset) || 0;
	// initialize the subzero instance if it is not initialized yet
	if (!subzero) {
		await init_subzero(env);
	}

	// the role that is currently making the request
	// usually this would come from the JWT token payload;
	// this role is used for the permissions check 
	const role = 'anonymous';

	// pass env values that should be available in the query context
	let queryEnv: QueryEnv = [
		['request.jwt.claims', JSON.stringify({role})],
	];
	
	// parse the Request object into and internal AST representation
	// note `req` is a Request object from itty-router
	// that is why we need to use `request` from the destructuring which is the original Request object
	let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, request);

	// generate the SQL query from the AST representation
	const { query, parameters } = subzero.fmt_sqlite_mutate_query(subzeroRequest, queryEnv);
	// console.log('query:', query);
	// console.log('parameters:', parameters);

	// prepare the statement
	const statement = env.DB.prepare(query).bind(...parameters);

	// the generated query always returns one row
	const result = await statement.first();
	//console.log('result:', result);
	const body = result.body; // this is a json string
	const status = Number(result.status) || 200;
	const pageTotal = Number(result.page_total) || 0;
	const totalResultSet = Number(result.total_result_set) || undefined;

	log_query(query, parameters);

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
			return new Response(e.toString(), {
				status: 500,
				headers: {
					'content-type': 'text/plain'
				}
			});
		}
	}
}