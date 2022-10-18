# Northwind Traders (by subZero)
### Running on Cloudflare&apos;s Pages + D1
This is a demo of the Northwind dataset
- Frontend is implemented in NextJS</li>
- Backend is implemented in Typescript and leverages subZero as a library to automatically expose a PostgREST compatible backend on top of the underlying database
- Data is stored in [D1](https://blog.cloudflare.com/introducing-d1) Cloudflare's SQLite compatible edge database
- Everything is deployed to [Cloudflare Pages](https://pages.cloudflare.com/) which
  hosts the frontend and also runs the backend as a single serverless function in [Functions](https://developers.cloudflare.com/pages/platform/functions/)

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
