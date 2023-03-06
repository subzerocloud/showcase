## What is this?
This is an example of subZero packaged and running as a PostgreSQL extension. There are no othere services to manage, just install the extension rpm/deb/apk package and it's ready to go.
Currently this is an experimental feature.

### Files and directories
- [Dockerfile](Dockerfile) - Builds the docker image that has the extension installed
- [docker-compose.yml](docker-compose.yml) - Starts the database with the extension installed
- [db/init.sh](db/init.sh) - Adds the configuration for the extension to postgresql.conf
- [db/schema.sql](db/schema.sql) - Creates the schema and tables for the example
- [introspection_query.sql](introspection_query.sql) - The introspection query used to figure out the schema structure. This can be customized or it's possible to have a pregenerated schema.json file instead.

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
    
    Get id,name,client and tasks for project with id 2
    ```bash
    curl -i 'http://localhost:3000/projects?select=id,name,client:clients(*),tasks(id,name,users(name))&id=eq.2'
    ```

    Insert a new client and return the id and name
    ```bash
    curl -X POST \
    -H 'Prefer: return=representation' \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/vnd.pgrst.object+json' \
    -d '{"name":"new client"}' \
    'http://localhost:3000/clients?select=id,name'
    ```

### Things to do after this

Try replacing the `db/schema.sql` with your own schema and data and enjoy an instant PostgREST like experience right from your database.