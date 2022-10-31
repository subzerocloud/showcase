# Northwind Traders (by subZero)
### Running on Vercel + PostgreSQL (Neon)
This is a demo of the Northwind dataset, see it live at [northwind-postgresql.vercel.app/](https://northwind-postgresql.vercel.app/).
- Frontend is implemented in NextJS
- Backend is implemented in Typescript and leverages subZero as a library to automatically expose a PostgREST compatible backend on top of the underlying database
- Data is stored in a PostgreSQL database hosted on [Neon](https://neon.tech/)
- Everything is deployed to [Vercel](https://vercel.com)

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

## Implementation details

Most of the files in this directory are your basic NextJS setup with some configuration for tailwindcss and typescript.
The interesting files are:

- The file implementing [the backend](https://github.com/subzerocloud/showcase/blob/main/vercel-postgresql-neon/pages/api/%5B...path%5D.ts)
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

### Credits

- This dataset was sourced from [northwind-SQLite3](https://github.com/jpwhite3/northwind-SQLite3)
- Inspired by [Cloudflare D1 Demo](https://northwind.d1sql.com/)

