## What is this?

**subZero** is a library implemented in Rust with JS/TypeScript [bindings](https://www.npmjs.com/package/@subzerocloud/nodejs) that allows developers to implement their own customizable backend APIs on top of any database. The resulting REST API is PostgREST compattible. Currently PostgreSQL, SQLite, MySQL and ClickHouse are supported as target databases.

This repository is a showcases the functionality and versatility of the new codebase.

Since the core library is written in Rust, it's possible to leverage the capabilities in other settings besides JavaScript runtimes (see [pg-extension](pg-extension) example)

## Explore examples
- [node-postgrest](node-postgrest) - This is a TypeScript implementation that can be used as an (extensible) drop-in replacement for PostgREST. Use it as a starting point and extend with custom routes and business logic.

- [clickhouse](clickhouse) - A Typescript server that automatically expose a PostgREST compatible API on top of the underlying [ClickHouse](https://clickhouse.com/) database with build in Authorization capabilities. The example is based on the [ClickHouse tutorial](https://clickhouse.com/docs/en/tutorial/) and shows how to use the REST API to execute complex analytical queries.

- [node-myrest](node-myrest) - This is a TypeScript server that provides a PostgREST compatible REST API for a MySQL database.

- [pg-extension](pg-extension) - This is an example of subZero packaged and running as a PostgreSQL extension. There are no othere services to manage besides your database, just install the extension rpm/deb/apk package and it's ready to go, you can access your PostgreSQL sever through PostgREST compatible API over HTTP.

- Demos of subZero library capabilities, leveraged in a NextJS app, to automatically expose a PostgREST compatible backend on top of the underlying database. Note that the frontend code (nextjs app) is almost exactly the same for all the examples but we are able to use different underlying databases and deploy the app on different platforms. Most of the code in the examples are for the frontend part and the entire backend is just a few lines of code in a single file that you can extend to your liking.

    - [cloudflare-pages-d1](cloudflare-pages-D1) - A example of a cloudflare pages deployment with data stored in D1 (Cloudflare's SQLite compatible edge databse).
    - [cloudflare-postgresql-neon](cloudflare-postgresql-neon) - A example of a cloudflare pages deployment with data stored in a PostgreSql database hosted by Neon.
    - [flyio-sqlite-litefs](flyio-sqlite-litefs) - A example of a Fly.io deployment with data stored in a SQLite database that is replicated between nodes using LiteFS.
    - [flyio-postgresql](flyio-postgresql) - A example of a Fly.io deployment with data stored in a PostgreSql database (also hosted on fly.io).
    - [vercel-postgresql-neon](vercel-postgresql-neon) - A example of a Vercel deployment with data stored in a PostgreSql database hosted by Neon.
    - [netlify-postgresql-neon](netlify-postgresql-neon) - A example of a Netlify deployment with data stored in a PostgreSql database hosted by Neon.
    - [deno-postgresql-neon](deno-postgresql-neon) - A example of a Deno deployment with data stored in a PostgreSql database hosted by Neon.




## Strengths

- ### Complete CRUD out of the box
    Just by defining your tables and views in your database you get a powerful CRUD api out of the box that will cover 90%+ of your needs. Throw in some database grands and constraints (or specify them in a json file) and you've got yourself an authentication/authorization functionality also.
- ### Extensible (use it as a library)
    The majority of the alternatives are available only as standalone services and to add custom functionality and business logic, you have to use a combination between a proxy, messaging server and lambda functions (in addition to your database). This, as you imagine, massively complicates your production infrastructure and deployment procedure or locks you in a SaaS that provides those components. By using subzero as a library, you side step all that needles complication and deploy your custom application on any Platform as a single service and codebase.

- ### Multiple database support
    subZero supports multiple databases and is currently in the process of adding more. This means that you can use the same frontend facing API to access data that might be storred in different types of databases (think combining PostgreSQL and ClickHouse). Another benefit is that you can start with a simple database (like SQLite) and scale up to a more complex one (like PostgreSQL) without having to change your code.
- ### Advanced analitical capabilities
    The api exposed by subZero has analitical query support through aggregate and window functions. This means that you can use the api to perform complex queries and aggregations on your data and get the results in a single request. This is especially useful for dashboards and other analitical applications (see [clickhouse](clickhouse) example).

## Roadmap
- [x] Core functions/types
- [x] PostgreSQL backend (including YugabyteDB, CockroachDB, TimescaleDB, etc)
- [x] SQLite backend (including Cloudflare D1)
- [x] MySQL backend (PlanetScaleDB upcoming)
- [x] ClickHouse backend (read only)
- [x] REST api (PostgREST compatible)
- [x] Production ready code
- [x] Stable library interface
- [x] PostgreSQL extension (expose an HTTP endpoint from within the database, experimental)
- [ ] GraphQL api (Hasura compatible)

## How to use

The folowing example is meant as a guide, we recommend picking one of the examples in the [examples](examples) folder and modifying it to your needs.

First decide the target platform where you want to deploy your code. JavaScript runtimes have slight differences so we provide different packages for each platform.

```javascript
import Subzero, { getIntrospectionQuery, Env } from '@subzerocloud/nodejs'

// other packages are
// @subzerocloud/deno
// @subzerocloud/web // mostly for cloudflare workers or edge environments
```

Upon initialization, subzero requires the database schema shape (which is basically a big json that can come from anywhere), that determines the structure, and in some cases permissions, of the exposed REST api. While it's possible to manually fill in the schema object, it's much easier to just intrtospect the database.

This code would be executed in an initialization function on server startup.

```javascript
const { query, parameters} = getIntrospectionQuery(
    
    // database type
    'postgresql',
    
    // the schema name that is exposed to the HTTP api (ex: public, api)
    'public',
    
    // the introspection queries have two 'placeholders' that allow you to specify
    // internal permissions and also custom foreign key relations between database entities
    new Map([
        // ['relations.json', custom_relations],
        // ['permissions.json', permissions],
    ])
)

// use your database client to execute the query and get the schema
// the following rows are slightly different depending on the database client library
const result = await db.query(query, parameters)
const schema = JSON.parse(result.rows[0].json_schema)
```

We can now initialize the global subzero instance that will parse the HTTP requests and generate the database queries for us.

```javascript
const subzero = new Subzero(
    // the database type
    'postgresql',
    
    // the schema object we got from the introspection query
    schema
)
```


Now we are ready to define our HTTP request handling function.
This is how that function might look for a express.js server. 

```javascript

// define a catch all route
app.get( '/:table', ( req, res ) => {
    // this is the role of the user making the request
    // usually you would get this from a JWT or from the session
    const role = 'anonymous'

    // we pass some environment to the database context
    let queryEnv: Env = [
        ['role', role],
        ['request.method', req.method],
    ]

    // generate the SQL query that sets the env variables for the current request
    // for simple usecases you might not need this, especcially if you rely on internal permissions
    const { query: envQuery, parameters: envParameters } = fmtPostgreSqlEnv(queryEnv)

    // generate the SQL query from request object
    const { query, parameters } = await subzero.fmtStatement(
        
        // the databse schema the current request is trying to access
        // this can come in as a header or as part of the url path
        'public',

        // url prefix (everything before the table name)
        // this is used to strip from the url path
        // the part that is not the table name
        '/'

        // the current role making the request
        // this can have meaning both in the context of internal permissions
        // and for the database roles
        role, 
        
        // the HTTP request object, it's type is raughly
        // type HttpRequest = Request | IncomingMessage | NextApiRequest | ExpressRequest | KoaRequest
        // so you can use any of those
        req,
        

        // some environment variables that are passed to the database context
        // usually they are leveraged by triggers or Row Level Security policies
        queryEnv,

        // the maximum number of rows to return
        // don't pass this if you want to return all rows
        1000

    )

    // now that we have the query, we just execute it
    // in the context of a transaction using our database client
    let result
    const db = await dbPool.connect()
    try {
        await db.query('BEGIN')

        // execute the query that sets the env variables and permissions
        // you can skip this if you are not using internal permissions
        await db.query(envQuery, envParameters)

        // execute the main query
        // the query always returns a single row with a column named 'body'
        // which contains the response body as a json string
        result = (await db.query(query, parameters)).rows[0]

       await db.query('COMMIT')
    } catch (e) {
        await db.query('ROLLBACK')
        throw e
    }
    finally {
        db.release()
    }

    // finally we construct the HTTP response
    res.status(200).json(result.body)
    
} );
```



## Support
For any questions you can reach out to us on [Discord](https://discord.gg/haRDFncx).


## License
A general overview of the standard commercial license is:
### You can
- Use the binary distribution for commercial or non-commercial purposes without charge 
- Use the source distribution to develop a SaaS product (subject to charges)
- Use the source distribution to develop software that is distributed to clients in binary form (subject to charges).
### You can not
- Distribute/publish the source code
- Develop services/software that directly competes with subzero
- Study the code to create competing products

