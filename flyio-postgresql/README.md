# Northwind Traders (by subZero)
## Running on Fly.io + PostgreSQL
This is a demo of [subZero library](https://www.npmjs.com/package/subzerocloud) capabilities, leveraged in a NextJS app, to automatically expose a PostgREST compatible backend on top of the underlying database. 

See the live version at [northwind-postgresql.fly.dev](https://northwind-postgresql.fly.dev) and [source code](https://github.com/subzerocloud/showcase/tree/main/flyio-postgresql) on GitHub.

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
- Everything is deployed to [Fly.io](https://fly.io/)
- Data is stored in a PostgreSQL database Hosted on [Fly.io](https://fly.io/)
- The backend runs in a single [serverless function](https://github.com/subzerocloud/showcase/blob/main/flyio-postgresql/pages/api/%5B...path%5D.ts). 
    Most of the code deals with the configuration of the backend, and 99% of the functionality is within these lines:
    ```typescript
    // parse the HTTP Request object into an internal AST representation
    let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, req)
    // .....
    // generate the SQL query from the AST representation
    const { query, parameters } = subzero.fmtMainQuery(subzeroRequest, queryEnv)
    // .....
    // execute the query
    result = (await db.query(query, parameters)).rows[0]
    // .....
    // return the result to the client
    res.send(result.body)
    ```

## Running locally
- Clone the repo
    ```bash
    git clone https://github.com/subzerocloud/showcase.git
    ```
 - cd to the example directory
    ```bash
    cd showcase/flyio-postgresql
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

## Deploying to Fly.io
- Create the app on Fly.io
    ```bash
    flyctl launch --no-deploy
    ```

- Create a new database
    ```bash
    flyctl postgres create
    ```

- Attach the database to the app
    ```bash
    flyctl postgres attach --app <app-name> <postgres-app-name>
    ```
- Proxy the db so that we can access it locally
    ```bash
    flyctl proxy 5432 -a <postgres-app-name>
    ```

- Populate the database
    ```bash
    psql postgres://postgres@localhost:<app-name> -f northwindtraders.sql
    ```

- Deploy the app
    ```bash
    flyctl deploy
    ```

## Credits
- This dataset was sourced from [northwind-SQLite3](https://github.com/jpwhite3/northwind-SQLite3)
- Inspired by [Cloudflare D1 Demo](https://northwind.d1sql.com/)


