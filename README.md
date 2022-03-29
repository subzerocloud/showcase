## What is this?
This is a demo repository for the new **subzero** codebase implemented in Rust.

**subZero** is a standalone web server that turns your database directly into a REST/GraphQL api.

You can use it as precompiled binary (or docker image) where the constraints and permissions in the database determine the api endpoints and operations or you can use it as a library dependence in your Rust code to bootstrap 90% of your backend while having the complete freedome to implement the remaining bits yourself. 

## Strengths compared to alternatives
- Implemented in Rust &mdash; a modern and powerful language love by developers
- Use it as a library/dependency to build custom solutions
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

Note that this will pull in prebuilt public docker images and not actually compile the code in this repository.

The REST API uses PostgREST [dialect/conventions](https://postgrest.org/en/stable/api.html).

PostgreSQL backend sample request.
```
curl -i "http://localhost:8000/projects?select=id,name&id=gt.1"
```

SQLite backend sample request.
```
curl -i "http://localhost:9000/projects?select=id,name&id=gt.1"
```

## Source code
While in beta, you can get a license and access instantly (and compile the code in this repository) by selecting the [Beta Tester](https://github.com/sponsors/subzerocloud) sponsor tier or contact us and we'll give you access manually (in about 1 day).

## License
A general overview of the standard commercial license is:
### You can
- Use the binary distribution for commercial or non-commercial purposes without charge 
- Use the source distribution to develop a SaaS product (subject to charges)
- Use the source distribution to develop software that is distributed to clients in binary form (subject to charges).
### You can not
- Distribute/publish the source code
- Develop services/software that directly competes with subzero
- Study the code to create competing products

