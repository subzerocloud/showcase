# Northwind Traders (by subZero)
## Running on Netlify + PostgreSQL (Neon)
This is a demo of [subZero library](https://www.npmjs.com/package/subzerocloud) capabilities, leveraged in a NextJS app, to automatically expose a PostgREST compatible backend on top of the underlying database. 

See the live version at [northwind-postgresql.netlify.app](https://northwind-postgresql.netlify.app) and [source code](https://github.com/subzerocloud/showcase/tree/main/netlify-postgresql-neon) on GitHub.

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
- Everything is deployed to [Netlify](https://www.netlify.com)
- Data is stored in a PostgreSQL database hosted on [Neon](https://neon.tech/)
- The backend runs in a single [serverless function](https://github.com/subzerocloud/showcase/blob/main/netlify-postgresql-neon/pages/api/%5B...path%5D.ts).
    Most of the code deals with the configuration of the backend, and 99% of the functionality is within these lines:
    ```typescript
    // parse the Request object into and internal AST representation
    let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, req)
    // .....
    // generate the SQL query from the AST representation
    const { query, parameters } = subzero.fmtMainQuery(subzeroRequest, queryEnv)
    // .....
    // execute the query
    result = (await db.query(query, parameters)).rows[0]
    // .....
    // send the response back to the client
    res.send(result.body)
    ```

## Running locally
- Clone the repo
    ```bash
    git clone https://github.com/subzerocloud/showcase.git
    ```
 - cd to the example directory
    ```bash
    cd showcase/netlify-postgresql-neon
    ```
- Install dependencies
    ```bash
    yarn install
    ```
- Copy .env.local file
    ```bash
    cp .env.local.example .env.local
    ```
- Run in dev mode
    ```bash
    yarn dev
    ```
- Open the app in your browser
    ```bash
    open http://localhost:3000
    ```

## Deploying to Netlify
- Setup a PostgreSQL database on [Neon](https://neon.tech) and get a connection string
- Provision the database
  ```bash
  psql <db_connection_string> -f northwindtraders-postgresql.sql
  ```

- Netlify init (we use --manual to avoid linking the Github repo to Netlify)
    ```bash
    netlify init --manual
    ```
- Add db env variable
    ```bash
    netlify env:set DATABASE_URL <db_connection_string>
    ```
- Deploy to Netlify (Due to NextJS plugin, build and deploy need to be done in one command when deploying manually)
    ```bash
    netlify deploy --build --prod
    ```

## Credits
- This dataset was sourced from [northwind-SQLite3](https://github.com/jpwhite3/northwind-SQLite3)
- Inspired by [Cloudflare D1 Demo](https://northwind.d1sql.com/)

