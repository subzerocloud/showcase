## subzero library leveraged in a next.js app

Things added compared to a default next.js app:

- Added a docker-compose file that starts a postgres db. The db schema is defined in `db` folder.
- `npm run dev` will start the docker compose stack and the next.js app.
- Added a catch-all rest api handler in `app/rest/[...path]/route.ts` that provides a PostgREST-compatible API for accessing the database.
- `next.config.mjs` has some custom logic to copy over the subzero wasm files.


After running `npm install` and `npm run dev`, you can try the api like this:
```
# Note these jwt tokens work because they were created on https://jwt.io/ using the hardcoded secret in the .env file
export JWT_TOKEN1="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQifQ.fNyithqhPEfZHmmG1TVXLfLxHp_3YybuQ__Mqqh0JPE"
export JWT_TOKEN2="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQifQ.5J5SdQWhBdyNPCLpZP_VlNt7eYJHMGPKesxlY4sywuM"

curl -i "http://localhost:3000/rest/check" # call a custom route
curl -i "http://localhost:3000/rest/todos?select=id,name" # should raise an unauthorized error
curl -i -H "Authorization: Bearer $JWT_TOKEN1" "http://localhost:3000/rest/todos?select=id,name" # should return the todos for user 1
curl -i -H "Authorization: Bearer $JWT_TOKEN2" "http://localhost:3000/rest/todos?select=id,name" # should return the todos for user 2

Below is the original README.md from the next.js project template

------------------------------------------------------------


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
