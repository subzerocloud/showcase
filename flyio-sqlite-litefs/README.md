# Northwind Traders (by subZero)
### Running on Fly.io + SQLite (LiteFS)
This is a demo of the Northwind dataset, see it live at [northwindtraders.fly.dev](https://northwindtraders.fly.dev).
- Frontend is implemented in NextJS</li>
- Backend is implemented in Typescript and leverages subZero as a library to automatically expose a PostgREST compatible backend on top of the underlying database
- Data is stored in SQLite database that is replicated to all node using [LiteFS](https://fly.io/blog/introducing-litefs/)
- Everything is deployed to [Fly.io](https://fly.io/)

This dataset was sourced from [northwind-SQLite3](https://github.com/jpwhite3/northwind-SQLite3)

## Running locally
- Clone the repo
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


See aditional documentation about scaling and cunfiguration of [LiteFS](https://fly.io/docs/litefs/getting-started/)

## Implementation details

Most of the files in this directory are your basic NextJS setup with some configuration for tailwindcss and typescript.
The interesting files are:
- Fly.io setup
    Usually fly.io will detect nextjs applications and deploy automatically, however in this case wee need to setup LiteFS, which mens we need it's binary and configuration available in the container. This is the reason for having a custom [Dockerfile](Dockerfile)
- The file implementing [the backend](pages/api/[table].ts)
    Most of the code deals with the configuration of the backend, and 99% of the functionality is withing these lines:
    ```typescript
    // parse the Request object into and internal AST representation
    let subzeroRequest = await subzero.parse(publicSchema, `${urlPrefix}/`, role, request)
    // .....
    // generate the SQL query from the AST representation
    const { query, parameters } = subzero.fmt_main_query(subzeroRequest, queryEnv)
    // .....
    // execute the query
    const result = await db.get(query, parameters)
    ```

    Aditionally there is some code specific to a LiteFS setup that periodically checks is the current node is the primary node and if not, it will redirect the request to the primary node.
    


