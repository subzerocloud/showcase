# Northwind Traders (by subZero)
## Running on Fly.io + PostgreSQL
This is a demo of [subZero library](https://www.npmjs.com/package/@subzerocloud/nodejs) capabilities, leveraged in a NextJS app, to automatically expose a PostgREST compatible backend on top of the underlying database. 

See the live version at [northwind-postgresql.fly.dev](https://northwind-postgresql.fly.dev) and [source code](https://github.com/subzerocloud/showcase/tree/main/flyio-postgresql) on GitHub.

## Features / Advantages
- Integrates in your codebase as a library (no need to deploy a separate service) 
- Runs in any context (Docker, AWS Lambda, Vercel, Netlify, Fly.io, Cloudflare Pages, Deno, Node, etc)
- Implemented in Rust with JS/TypeScript bindings through WASM with no dependencies
- Multiple databases supported:
    - SQLite (including Cloudflare D1)
    - PostgreSQL (including YugabyteDB, CockroachDB, TimescaleDB, etc)
    - ClickHouse
    - MySQL (PlanetScaleDB upcoming)
- Supports advanced analytical queries (window functions, aggregates, etc)

## Example details
- Frontend is implemented in NextJS
- Everything is deployed to [Fly.io](https://fly.io/)
- Data is stored in a PostgreSQL database Hosted on [Fly.io](https://fly.io/)
- The backend runs in a single [serverless function](https://github.com/subzerocloud/showcase/blob/main/flyio-postgresql/pages/api/%5B...path%5D.ts). 
    Most of the code deals with the configuration of the backend, and 99% of the functionality is within these lines:
    ```typescript
    // .....
    // generate the SQL query from request object
    const { query, parameters } = await subzero.fmtStatement(publicSchema, `${urlPrefix}/`, role, req, queryEnv)
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

1. Create the app on Fly.io without deploying (we don't have a database yet)
    ```bash
    fly launch --no-deploy
    ```

2. Create a new database app (in fly, the database is just another app)
    ```bash
    fly postgres create
    ```

3. Attach the database to our app. Notice the `<app-name>` (our app) and `<db-app-name>` (the database app) parameters. Those are the names you chose when you created the apps on step 1 and 2. This step will create a new database in PostgreSQL (that is running in as the `<db-app-name>`) and the name of the database will be the same as the `<app-name>`.
    ```bash
    fly postgres attach --app <app-name> <db-app-name>
    ```
4. We can not directly connect to the new database (firewall) so we need to use the prxy command from fly. Open another terminal and run the command.
    ```bash
    fly proxy 5432 -a <db-app-name>
    ```

5. Return to the original terminal and run the command to populate the database. Notice the `<app-name>` part in the connection string. That is the name you chose when you created the app on step 1. When asked for the password, use the password that was generated on step 2. Takea break, this will take a while.
    ```bash
    psql postgres://postgres@localhost/<app-name> -f northwindtraders-postgres.sql
    ```

6. No that we have our database ready, we can deploy the app
    ```bash
    fly deploy
    ```

## Credits
- This dataset was sourced from [northwind-SQLite3](https://github.com/jpwhite3/northwind-SQLite3)
- Inspired by [Cloudflare D1 Demo](https://northwind.d1sql.com/)


