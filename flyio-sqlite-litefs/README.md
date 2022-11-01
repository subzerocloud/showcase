# Northwind Traders (by subZero)
## Running on Fly.io + SQLite (LiteFS)
This is a demo of [subZero library](https://www.npmjs.com/package/subzerocloud) capabilities, leveraged in a NextJS app, to automatically expose a PostgREST compatible backend on top of the underlying database. 

See the live version at [northwind-sqlite.fly.dev](https://northwind-sqlite.fly.dev) and [source code](https://github.com/subzerocloud/showcase/tree/main/flyio-sqlite-litefs) on GitHub.

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
- Everything is deployed to [Fly.io](https://fly.io/) as a single app
- Data is stored in a SQLite database that is replicated to all nodes using [LiteFS](https://fly.io/blog/introducing-litefs/). See aditional documentation about scaling and configuration of [LiteFS](https://fly.io/docs/litefs/getting-started/)
- The backend runs in a single [serverless function](https://github.com/subzerocloud/showcase/blob/main/flyio-sqlite-litefs/pages/api/%5B...path%5D.ts). 
    Most of the code deals with the configuration of the backend, and 99% of the functionality is within these lines:
    ```typescript
    // parse the HTTP Request object into an internal AST representation
    let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, req)
    // .....
    // generate the SQL query from the AST representation
    const { query, parameters } = subzero.fmtMainQuery(subzeroRequest, queryEnv)
    // .....
    // execute the query
    const result = await db.get(query, parameters)
    // .....
    // return the result to the client
    res.send(result.body)
    ```
- There is some code specific to a LiteFS setup that periodically checks is the current node is the primary node and if not, it will redirect the request to the primary node.

## Running locally
- Clone the repo
    ```bash
    git clone https://github.com/subzerocloud/showcase.git
    ```
 - cd to the example directory
    ```bash
    cd showcase/flyio-sqlite-litefs
    ```
- Install dependencies (you will need to have SQLite installed on your machine)
    ```bash
    yarn install
    ```
- Populate the database
    ```bash
    yarn seed
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
- Create the `fly.toml` file
    ```bash
    cp fly.toml.example fly.toml
    ```
- Launch the app
    ```bash
    fly launch
    ```
    Note: select `Yes` for `Would you like to copy its configuration to the new app?`

## Credits
- This dataset was sourced from [northwind-SQLite3](https://github.com/jpwhite3/northwind-SQLite3)
- Inspired by [Cloudflare D1 Demo](https://northwind.d1sql.com/)



