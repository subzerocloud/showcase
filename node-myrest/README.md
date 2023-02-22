## What is this?
This is a TypeScript server that provides a PostgREST compatible REST API for a MySQL database.
It uses **subZero** TypeScript [bindings](https://www.npmjs.com/package/@subzerocloud/nodejs) to generate the SQL queries.

## Try it out
- Clone the repo
    ```bash
    git clone https://github.com/subzerocloud/showcase.git
    ```
 - cd to the example directory
    ```bash
    cd showcase/node-myrest
    ```
- Install dependencies
    ```bash
    yarn install
    ```
- Start the db server

    Note: A mysql database will be started in background using docker-compose and populated with the Northwind database schema from `db` directory. You can swap this out with your own database schema.
    ```bash
    yarn db
    ```
- Build the code
    ```bash
    yarn build
    ```
- Start the server 
    
    You can also use `yarn watch` to start the server in watch mode and automatically rebuild on changes to the code in `src`
    ```bash
    yarn start
    ```

- Try some requests
    - As an anonymous user
        ```bash
        curl -i "http://localhost:3000/Product?select=productId,productName,unitPrice&limit=2"
        ```
    - As an anonymous user to a restricted table
        ```bash
        curl -i "http://localhost:3000/Customer"
        ```
    - As an authenticated user (role: webuser, id: 1)
        ```bash
        curl -i -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2VidXNlciIsImlkIjoxfQ.6No6voSS0_Oky6DJ1niEIBohXqJwK8eLAC1lJpMAcgA" \
        "http://localhost:3000/Customer?limit=3"
        ```
    - As an authenticated user to a view that filters rows based on the user's id from jwt
        ```bash
        curl -i -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2VidXNlciIsImlkIjoxfQ.6No6voSS0_Oky6DJ1niEIBohXqJwK8eLAC1lJpMAcgA" \
        "http://localhost:3000/EmployeeView"
        ```

    - A request with a filter and embedding of related data
        ```bash
        curl -i -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2VidXNlciIsImlkIjoxfQ.6No6voSS0_Oky6DJ1niEIBohXqJwK8eLAC1lJpMAcgA" \
        "http://localhost:3000/Product?select=productId,productName,unitPrice,Category(name:categoryName),Supplier(companyName)&unitPrice=gt.5&unitPrice=lt.20"
        ```