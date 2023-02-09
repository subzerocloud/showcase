## What is this?
This is a TypeScript implementation that can be used as an (extensible) drop-in replacement for PostgREST.
It uses **subZero** TypeScript [bindings](https://www.npmjs.com/package/subzerocloud) to generate the SQL queries.

## Why?
PostgREST will give you a powerfull REST API for your PostgreSQL database however the second you need to implement business logic that can not be done at the db level using triggers, functions or views you are stuck with the convoluted option of implementing it somewhere else, be that in a proxy service in front of PostgREST or as a completley separate endpoint, which in turn means you will allways need a separate 3rd service (besides PostgREST and the DB) to handle your business logic. Some people also object to having any business logic in the DB (except maybe for permissions and constraints), which is a valid point. 
This is where this project comes in. It allows you to implement your business logic in JavaScript and still use the same REST API as PostgREST.

## Try it out
- Clone the repo
    ```bash
    git clone https://github.com/subzerocloud/showcase.git
    ```
 - cd to the example directory
    ```bash
    cd showcase/node-postgrest
    ```
- Install dependencies
    ```bash
    yarn install
    ```
- Run in dev mode
    Note: A postgres database will be started in background using docker-compose and populated with the Northwind database schema from `db` directory. You can swap this out with your own database schema.
    ```bash
    yarn dev
    ```
- Try some requests
    - As an anonymous user
        ```bash
        curl -i "http://localhost:3000/Products?select=ProductID&limit=3"
        ```
    - As an anonymous user to a restricted table
        ```bash
        curl -i "http://localhost:3000/Categories?select=CategoryID&limit=3"
        ```
    - As an authenticated user (alice)
        ```bash
        curl -i -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYWxpY2UifQ.BHodFXgm4db4iFEIBdrFUdfmlNST3Ff9ilrfotJO1Jk" \
        "http://localhost:3000/Categories?select=CategoryID&limit=3"
        ```