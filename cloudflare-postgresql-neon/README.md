# Northwind Traders (by subZero)
## Running on Cloudflare&apos;s Pages + PostgreSQL (Neon)
This is a demo of [subZero library](https://www.npmjs.com/package/subzerocloud) capabilities, leveraged in a NextJS app, to automatically expose a PostgREST compatible backend on top of the underlying database. 

See the [source code](https://github.com/subzerocloud/showcase/tree/main/cloudflare-postgresql-neon) on GitHub.



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
- Data is stored in a PostgreSQL database hosted on [Neon](https://neon.tech/)
 
- The backend runs in a single [serverless function](https://github.com/subzerocloud/showcase/blob/main/cloudflare-postgresql-neon/functions/api/%5B%5Bpath%5D%5D.ts) (see [Cloudflare Functions](https://developers.cloudflare.com/pages/platform/functions/) for details). 
    Most of the code deals with the configuration of the backend, and 99% of the functionality is within these lines:
    ```typescript
    // generate the SQL query from request object
    const { query, parameters } = await subzero.fmtStatement(publicSchema, `${urlPrefix}/`, role, req, queryEnv)
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
    cd showcase/cloudflare-postgresql-neon
    ```
- Install dependencies (you will need to have SQLite installed on your machine)
    ```bash
    yarn install
    ```
- Copy .dev.vars file and set the DATABASE_URL environment variable to your neon database connection string
    ```bash
    cp .dev.vars.example .dev.vars
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