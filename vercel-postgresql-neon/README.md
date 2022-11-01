# Northwind Traders (by subZero)
## Running on Vercel + PostgreSQL (Neon)
This is a demo of [subZero library](https://www.npmjs.com/package/subzerocloud) capabilities, leveraged in a NextJS app, to automatically expose a PostgREST compatible backend on top of the underlying database. 

See the live version at [northwind-postgresql.vercel.app/](https://northwind-postgresql.vercel.app/) and [source code](https://github.com/subzerocloud/showcase/tree/main/vercel-postgresql-neon) on GitHub.

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
- Everything is deployed to [Vercel](https://vercel.com)
- Data is stored in a PostgreSQL database hosted on [Neon](https://neon.tech/)
- The backend runs in a single [serverless function](https://github.com/subzerocloud/showcase/blob/main/vercel-postgresql-neon/pages/api/%5B...path%5D.ts).
    Most of the code deals with the configuration of the backend, and 99% of the functionality is withing these lines:
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
    cd showcase/vercel-postgresql-neon
    ```
- Install dependencies (you will need to have SQLite installed on your machine)
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

## Deploying to Vercel
- Setup a PostgreSQL database on [Neon](https://neon.tech) and get a connection string
- Provision the database
  ```bash
  psql <db_connection_string> -f northwindtraders-postgresql.sql
  ```
- Link the current directory to a Vercel project
  ```bash
  vercel link
  ```
- Set the `DATABASE_URL` environment variable
  ```bash
    vercel env add DATABASE_URL <db_connection_string>
    ```
- Deploy the project
    ```bash
    vercel --prod
    ```

## Credits
- This dataset was sourced from [northwind-SQLite3](https://github.com/jpwhite3/northwind-SQLite3)
- Inspired by [Cloudflare D1 Demo](https://northwind.d1sql.com/)

