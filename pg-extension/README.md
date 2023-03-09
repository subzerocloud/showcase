## What is this?
This is an example of subZero packaged and running as a PostgreSQL extension. There are no othere services to manage, just install the extension rpm/deb/apk package and it's ready to go.
Currently this is an experimental feature.

### Files and directories
- [Dockerfile](Dockerfile) - Builds the docker image that has the extension installed
- [docker-compose.yml](docker-compose.yml) - Starts the database with the extension installed
- [db/init.sh](db/init.sh) - Adds the configuration for the extension to postgresql.conf
- [db/northwindtraders-postgres.sql](db/northwindtraders-postgres.sql) - Creates the tables and data for the example
- [introspection_query.sql](introspection_query.sql) - The introspection query used to figure out the schema structure. This can be customized or it's possible to have a pregenerated schema.json file instead.

### Leverage the extension to import data into Excel

[![Importing data into Excel 365 from a local PostgreSQL database](http://img.youtube.com/vi/XlqQUq3k5uw/0.jpg)](http://www.youtube.com/watch?v=XlqQUq3k5uw "Importing data into Excel 365 from a local PostgreSQL database")

### Try it out
- Clone the repo
    ```bash
    git clone https://github.com/subzerocloud/showcase.git
    ```
- Cd to the example directory
    ```bash
    cd showcase/pg-extension
    ```
- Bring up the database

    Note: This will also build the db docker image that has the extension installed starting from the official postgres image (check [Dockerfil](Dockerfile)).
    For now the extension is only built for PG15 on debian-bullseye.
    Let us know discord/email if you need other versions/architectures
    ```bash
    docker-compose up -d
    ```
- Try some PostgREST style requests
    

    Get the supplier with id 2 and all the products it sells
    ```bash
    curl -i 'http://localhost:3000/Suppliers?select=*,Products(ProductID,ProductName,Category:Categories(CategoryID,CategoryName))&SupplierID=eq.2'
    ```

    Insert a new product category
    ```bash
    curl -X POST \
    -H 'Prefer: return=representation' \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/vnd.pgrst.object+json' \
    -d '{"CategoryID":9,"CategoryName":"new category"}' \
    'http://localhost:3000/Categories?select=CategoryID'
    ```

### Things to do after this

Try replacing the `db/northwindtraders-postgres.sql` with your own schema and data and enjoy an instant PostgREST like experience right from your database.