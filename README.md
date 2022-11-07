## What is this?

**subZero** is a library implemented in Rust with JS/TypeScript [bindings](https://www.npmjs.com/package/subzerocloud) that allows you to expose a PostgREST compatible backend on top of any database. It's functionality can also be used through the [Docker image](https://hub.docker.com/r/subzerocloud/subzero) that is a drop-in replacement for PostgREST.

This repository is a showcases the functionality and versatility of the new Rust codebase.

## Explore examples

- [cloudflare-pages-d1](cloudflare-pages-D1) - A example of a cloudflare pages deployment with data stored in D1 (Cloudflare's SQLite compatible edge databse).
- [flyio-sqlite-litefs](flyio-sqlite-litefs) - A example of a Fly.io deployment with data stored in a SQLite database that is replicated between nodes using LiteFS.
- [flyio-postgresql](flyio-postgresql) - A example of a Fly.io deployment with data stored in a PostgreSql database (also hosted on fly.io).
- [vercel-postgresql-neon](vercel-postgresql-neon) - A example of a Vercel deployment with data stored in a PostgreSql database hosted by Neon.
- [netlify-postgresql-neon](netlify-postgresql-neon) - A example of a Netlify deployment with data stored in a PostgreSql database hosted by Neon.
- [deno-postgresql-neon](deno-postgresql-neon) - A example of a Deno deployment with data stored in a PostgreSql database hosted by Neon.
- [node-postgrest](node-postgrest) - This is a TypeScript implementation that can be used as an (extensible) drop-in replacement for PostgREST. Use it as a starting point and extend with custom routes and business logic.


## Strengths

- ### Complete CRUD out of the box
    Just by defining your tables and views in your database you get a powerful CRUD api out of the box that will cover 90%+ of your needs. Throw in some database grands and constraints and you've got yourself an authentication/authorization functionality also.
- ### Extensible (use it as a library)
    The majority of the alternatives are available only as standalone services and to add custom functionality and business logic, you have to use a combination between a proxy, messaging server and lambda functions (in addition to your database). This, as you imagine, massively complicates your production infrastructure and deployment procedure and of course you need extensive devops knowledge and resources. By using subzero as a library, you side step all that needles complication and deploy your custom application on any Platform as a single service and codebase.
- ### Rust codebase and JavaScript/TypeScript bindings (using WASM)
    Rust is consistently voted [the most loved language](https://insights.stackoverflow.com/survey/2021#section-most-loved-dreaded-and-wanted-programming-scripting-and-markup-languages) by developers and in heavy use at AWS, Google, Microsoft. This ensures that besides it's raw speed you also get a big pool of highly competent developers that are ready (and will enjoy) work on the codebase.
- ### Multiple database support
    subZero supports multiple databases and is currently in the process of adding more. This means that you can use the same codebase to deploy your application on multiple databases and platforms. This is especially useful if you are using a cloud provider that offers multiple databases (like AWS, Azure, Google Cloud, Cloudflare, Digital Ocean, Heroku, etc).
- ### Advanced analitical capabilities
    The api exposed by subZero has analitical query support through aggregate and window functions. This means that you can use the api to perform complex queries and aggregations on your data and get the results in a single request. This is especially useful for dashboards and other analitical applications.

## Roadmap
- [x] Core functions/types
- [x] PostgreSQL backend (including YugabyteDB, CockroachDB, TimescaleDB, etc)
- [x] SQLite backend (including Cloudflare D1)
- [x] ClickHouse backend
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

