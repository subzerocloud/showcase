# Northwind Traders (by subZero)
## Running on Cloudflare&apos;s Pages + D1
This is a demo of [subZero library](https://www.npmjs.com/package/subzerocloud) capabilities, leveraged in a NextJS app, to automatically expose a PostgREST compatible backend on top of the underlying database. 

See the [source code](https://github.com/subzerocloud/showcase/tree/main/cloudflare-pages-D1) on GitHub.



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
- Everything is deployed to [Cloudflare Pages](https://pages.cloudflare.com/)
- Data is stored in [D1](https://blog.cloudflare.com/introducing-d1) Cloudflare's SQLite compatible edge database
 
- The backend runs in a single [serverless function](https://github.com/subzerocloud/showcase/blob/main/cloudflare-pages-D1/functions/api/%5B%5Bpath%5D%5D.ts) (see [Cloudflare Functions](https://developers.cloudflare.com/pages/platform/functions/) for details). 
    Most of the code deals with the configuration of the backend, and 99% of the functionality is within these lines:
    ```typescript
    // parse the HTTP Request object into an internal AST representation
    let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, req)
    // .....
    // generate the SQL query from the AST representation
    const { query, parameters } = subzero.fmtMainQuery(subzeroRequest, queryEnv)
    // .....
    // prepare the statement
    const statement = env.DB.prepare(query).bind(...parameters)
    // execute the query
    const result = await statement.first()
    ```

## Running locally
- Clone the repo
    ```bash
    git clone https://github.com/subzerocloud/showcase.git
    ```
 - cd to the example directory
    ```bash
    cd showcase/cloudflare-pages-D1
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


## Credits
- This dataset was sourced from [northwind-SQLite3](https://github.com/jpwhite3/northwind-SQLite3)
- Inspired by [Cloudflare D1 Demo](https://northwind.d1sql.com/)
