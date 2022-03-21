# What is this?
This is a demo repository for the new **subzero** codebase implemented in Rust.

subZero is a software development stack, with the primary focus of building GraphQL and REST APIs backed by a PostgreSQL/SQLite/Clickhouse database.

## Strengths compared to alternatives
- Implemented in Rust &mdash; a modern and powerful language love by developers
- Use it as a library/dependency to bootstrap your backend API Rust code
- 2x-8x times faster
- 50%-70% less memory usage

## Roadmap
- [x] Core functions/types
- [x] PostgreSQL backend
- [x] SQLite backend
- [x] REST frontend (PostgREST compatible)
- [x] Production ready code
- [ ] Stable library interface
- [ ] Clickhouse backend
- [ ] GraphQL frontend (Hasura/Postgraphile)



## Try it
Bring up the docker services
```
docker-compose up -d
```

You can interact with the database at the following endpoints
- Interact with the PostgreSQL database (subzero-postgresql) -  `http://localhost:8000/`
- Interact with the SQLite database (subzero-sqlite) - `http://localhost:9000/`

The REST API uses PostgREST dialect/conventions.

PostgreSQL backend sample request.
```
curl -i "http://localhost:8000/projects?select=id,name&id=gt.1"
```

SQLite backend sample request.
```
curl -i "http://localhost:9000/projects?select=id,name&id=gt.1"
```

## Source code
The source code is available under a commercial license.

You can get access by selecting one of the [sponsor tiers](https://github.com/sponsors/subzerocloud).

A general overview of the standard commercial license is:
### You can
- Use the binary/source for one project
- Develop a SaaS product
- Develop software that is distributed to clients in binary form.
### You can not
- Distribute/publish the source code
- Develop services/software that directly competes with subzero
- Study the code to create competing products

