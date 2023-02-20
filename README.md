## What is this?

**subZero** is a library implemented in Rust with JS/TypeScript [bindings](https://www.npmjs.com/package/@subzerocloud/nodejs) that allows you to expose a PostgREST compatible backend on top of any database

This repository is a showcases the functionality and versatility of the new codebase.

## Explore examples
- [node-postgrest](node-postgrest) - This is a TypeScript implementation that can be used as an (extensible) drop-in replacement for PostgREST. Use it as a starting point and extend with custom routes and business logic.

- [clickhouse](clickhouse) - A Typescript server that automatically expose a PostgREST compatible API on top of the underlying [ClickHouse](https://clickhouse.com/) database with build in Authorization capabilities. The example is based on the [ClickHouse tutorial](https://clickhouse.com/docs/en/tutorial/) and shows how to use the REST API to execute complex analytical queries.

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
- [ ] GraphQL api




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

