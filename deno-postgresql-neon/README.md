# Northwind Traders (by subZero)
## Running on Deno Deploy + PostgreSQL (Neon)
This is a demo of [subZero library](https://www.npmjs.com/package/subzerocloud) capabilities, leveraged in a NextJS app, to automatically expose a PostgREST compatible backend on top of the underlying database. 

See the live version at [northwind-postgresql.deno.app](https://northwind-postgresql.deno.app) and [source code](https://github.com/subzerocloud/showcase/tree/main/deno-postgresql-neon) on GitHub.

## Features / Advantages
- Integrates in your codebase as a library (no need to deploy a separate service) 
- Runs in any context (Docker, AWS Lambda, Vercel, Netlify, Fly.io, Cloudflare Pages, Deno, Node, etc)
- Implemented in Rust with JS/TypeScript bindings through WASM with no dependencies
- Multiple databases supported:
    - SQLite (including Cloudflare D1)
    - PostgreSQL (including YugabyteDB, CockroachDB, TimescaleDB, etc)
    - ClickHouse
- Supports advanced analitycal queries (window functions, aggregates, etc)

## Example details
- Frontend is implemented in NextJS
- Everything is deployed to [Deno Deploy](https://deno.com/deploy)
- Data is stored in a PostgreSQL database hosted on [Neon](https://neon.tech/)
- The backend is a [Deno server](https://github.com/subzerocloud/showcase/blob/main/deno-postgresql-neon/deno/server.ts) that serves both the static frontend files and the the api.
    Most of the code deals with the configuration of the backend, and 99% of the functionality is within these lines:
    ```typescript
    // parse the Request object into and internal AST representation
    let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, req)
    // .....
    // generate the SQL query from the AST representation
    const { query, parameters } = subzero.fmtMainQuery(subzeroRequest, queryEnv)
    // .....
    // execute the query
    result = (await db.queryObject(query, parameters)).rows[0]
    // .....
    // send the response back to the client
    const body = result.body
    const status = Number(result.status) || 200
    return new Response(body, {status,headers})
    ```

## Running locally
- Clone the repo
    ```bash
    git clone https://github.com/subzerocloud/showcase.git
    ```
 - cd to the example directory
    ```bash
    cd showcase/deno-postgresql-neon
    ```
- Install dependencies
    ```bash
    yarn install
    ```
- Copy .env.local file
    ```bash
    cp .env.example .env
    ```
- Run in dev mode
    ```bash
    yarn dev
    ```
- Open the app in your browser
    ```bash
    open http://localhost:3000
    ```


## Credits
- This dataset was sourced from [northwind-SQLite3](https://github.com/jpwhite3/northwind-SQLite3)
- Inspired by [Cloudflare D1 Demo](https://northwind.d1sql.com/)

