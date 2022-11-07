## What is this?
This is a TypeScript implementation that can be used as an (extensible) drop-in replacement for PostgREST.
It uses **subZero** TypeScript [bindings](https://www.npmjs.com/package/subzerocloud) to generate the SQL queries.

## Why?
PostgREST will give you a powerfull REST API for your PostgreSQL database however the second you need to implement business logic that can not be done at the db level using triggers, functions or views you are stuck with the convoluted option of implementing it somewhere else, be that in a proxy service in front of PostgREST or as a completley separate endpoint, which in turn means you will allways need a separate 3rd service (besides PostgREST and the DB) to handle your business logic. Some people also object to having any business logic in the DB (except maybe for permissions and constraints), which is a valid point. 
This is where this project comes in. It allows you to implement your business logic in JavaScript and still use the same REST API as PostgREST.

## Try it out
- Bring up the docker-compose stack
    ```bash
    docker-compose up -d
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