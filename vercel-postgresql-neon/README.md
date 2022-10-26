# Northwind Traders (by subZero)
### Running on Vercel + PostgreSQL (Neon)
This is a demo of the Northwind dataset, see it live at [northwind-postgresql.vercel.app/](https://northwind-postgresql.vercel.app/).
- Frontend is implemented in NextJS</li>
- Backend is implemented in Typescript and leverages subZero as a library to automatically expose a PostgREST compatible backend on top of the underlying database
- Data is stored in a PostgreSQL database
- Everything is deployed to [Vercel](https://vercel.com)

This dataset was sourced from [northwind-SQLite3](https://github.com/jpwhite3/northwind-SQLite3)

## Running locally
- Clone the repo
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
  psql <db_connection_string> -f northwindtraders.sql
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






## Implementation details

Most of the files in this directory are your basic NextJS setup with some configuration for tailwindcss and typescript.
The interesting files are:

- The file implementing [the backend](pages/api/[...path].ts)
    Most of the code deals with the configuration of the backend, and 99% of the functionality is withing these lines:
    ```typescript
    // parse the Request object into and internal AST representation
    let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, request)
    // .....
    // generate the SQL query from the AST representation
    const { query, parameters } = subzero.fmt_main_query(subzeroRequest, queryEnv)
    // .....
    // execute the query
    const r = await db.query(query, parameters)
    ```

