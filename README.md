## What is this?

**subZero** is a library implemented in Rust with JS/TypeScript [bindings](https://www.npmjs.com/package/@subzerocloud/nodejs) that allows developers to implement their own customizable backend APIs on top of any database. The resulting REST API is PostgREST compatible. Currently PostgreSQL, SQLite, MySQL and ClickHouse are supported as target databases.

This repository is a showcases of the functionality and versatility of the new codebase.

Since the core library is written in Rust, it's possible to leverage the capabilities in other settings besides JavaScript runtimes (see [pg-extension](pg-extension) example)



## Strengths

- ### Complete CRUD out of the box
    Just by defining your tables and views in your database you get a powerful CRUD api out of the box that will cover 90%+ of your needs. Throw in some database grands and constraints (or specify them in a json file) and you've got yourself an authentication/authorization functionality also.
- ### Extensible (use it as a library)
    The majority of the alternatives are available only as standalone services and to add custom functionality and business logic, you have to use a combination between a proxy, messaging server and lambda functions (in addition to your database). This, as you imagine, massively complicates your production infrastructure and deployment procedure or locks you in a SaaS that provides those components. By using subzero as a library, you side step all that needles complication and deploy your custom application on any Platform as a single service and codebase.

- ### Multiple database support
    subZero supports multiple databases and is currently in the process of adding more. This means that you can use the same frontend facing API to access data that might be stored in different types of databases (think combining PostgreSQL and ClickHouse). Another benefit is that you can start with a simple database (like SQLite) and scale up to a more complex one (like PostgreSQL) without having to change your code.
- ### Advanced analytical capabilities
    The api exposed by subZero has analytical query support through aggregate and window functions. This means that you can use the api to perform complex queries and aggregations on your data and get the results in a single request. This is especially useful for dashboards and other analytical applications (see [clickhouse](clickhouse) example).
- ### Complete Signup & Authentication flow
    subZero provides a complete signup and authentication flow out of the box. You can use it as is or extend it to your liking.

## How to use it

### Install the project generator
```bash
npm install -g yo @subzerocloud/generator-yo
```

### Generate a new project
```bash
yo @subzerocloud/yo
```

The generator will create a new project in the current directory. It will contain a sample db schema and a sample frontend application but the  important part is the code generated for the backend. The entrypoint file will contain an express server that you can customize to your liking. The magic happens in two subzero modules (auth & rest) that expose route handlers for the authentication and REST api respectively.

### Auth

``` typescript
// ...
import auth, { init as authInit, isAuthenticated } from './auth';
// ...
// The auth module provides a GoTrue compatible API for authentication and authorization
// For more information, see:
// https://github.com/supabase/gotrue
// https://supabase.com/docs/reference/javascript/auth-api

// Mount the auth router
router.use('/auth/v1', auth);
```

### REST

``` typescript
// ...
import { init as restInit, rest } from './rest';
// ...
// The rest module provides a PostgREST-compatible API for accessing the database
// For more information, see:
// https://postgrest.org
// https://supabase.com/docs/reference/javascript/select

// Mount the rest router
router.use('/rest/v1', isAuthenticated, rest(['public']));
```

### Using the generated API from the frontend

For the capabilities and exposed routes of the Auth module, you can consult [GoTrue](https://github.com/supabase/gotrue) & [Auth-Api](https://supabase.com/docs/reference/javascript/auth-api) documentation.

For the capabilities and exposed routes of the REST module, you can consult [PostgREST](https://postgrest.org) & [Supabase](https://supabase.com/docs/reference/javascript/select) documentation.

### Advanced usage

While in most cases you will be using subzero through the exposed route handlers, you can also use it as a library and create your own custom handlers. For any technical details you can reach us on [discord](https://discord.gg/haRDFncx).

## Explore examples
- [node-postgrest](node-postgrest) - This is a TypeScript implementation that can be used as an (extensible) drop-in replacement for PostgREST. Use it as a starting point and extend with custom routes and business logic.

- [clickhouse](clickhouse) - A Typescript server that automatically expose a PostgREST compatible API on top of the underlying [ClickHouse](https://clickhouse.com/) database with built in Authorization capabilities. The example is based on the [ClickHouse tutorial](https://clickhouse.com/docs/en/tutorial/) and shows how to use the REST API to execute complex analytical queries.

- [node-myrest](node-myrest) - This is a TypeScript server that provides a PostgREST compatible REST API for a MySQL database.

- [pg-extension](pg-extension) - This is an example of subZero packaged and running as a PostgreSQL extension. There are no other services to manage besides your database, just install the extension rpm/deb/apk package and it's ready to go, you can access your PostgreSQL sever through PostgREST compatible API over HTTP.

- [subzero-query](subzero-query) - An example of how our library can be used to create a ETL pipeline for a data warehouse to be leveraged directly from Excel.

- Demos of subZero library capabilities, leveraged in a NextJS app, to automatically expose a PostgREST compatible backend on top of the underlying database. Note that the frontend code (nextjs app) is almost exactly the same for all the examples but we are able to use different underlying databases and deploy the app on different platforms. Most of the code in the examples are for the frontend part and the entire backend is just a few lines of code in a single file that you can extend to your liking.

    - [cloudflare-pages-d1](cloudflare-pages-D1) - A example of a cloudflare pages deployment with data stored in D1 (Cloudflare's SQLite compatible edge database).
    - [cloudflare-postgresql-neon](cloudflare-postgresql-neon) - A example of a cloudflare pages deployment with data stored in a PostgreSql database hosted by Neon.
    - [flyio-sqlite-litefs](flyio-sqlite-litefs) - A example of a Fly.io deployment with data stored in a SQLite database that is replicated between nodes using LiteFS.
    - [flyio-postgresql](flyio-postgresql) - A example of a Fly.io deployment with data stored in a PostgreSql database (also hosted on fly.io).
    - [vercel-postgresql-neon](vercel-postgresql-neon) - A example of a Vercel deployment with data stored in a PostgreSql database hosted by Neon.
    - [netlify-postgresql-neon](netlify-postgresql-neon) - A example of a Netlify deployment with data stored in a PostgreSql database hosted by Neon.
    - [deno-postgresql-neon](deno-postgresql-neon) - A example of a Deno deployment with data stored in a PostgreSql database hosted by Neon.



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



## Support
For any questions you can reach out to us on [Discord](https://discord.gg/haRDFncx).


## License

The compiled library is licensed under [LGPLv3](http://www.gnu.org/licenses/lgpl-3.0.html) 

Commercial-friendly license available at [subzero.cloud](https://subzero.cloud) soon.

For licensing questions, you can reach us on [Discord](https://discord.gg/haRDFncx) or [email](mailto:hello@subzero.cloud).