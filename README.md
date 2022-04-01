## What is this?

**subZero** is a standalone, extensible web server that turns your database directly into a REST/GraphQL api.

You can use it for free as a docker image where the constraints and permissions in the database determine the api endpoints and operations.

Alternatively, you can use it as a library dependence in your Rust code to bootstrap 90% of your backend and extend it with your custom routes and functionality. 

## Strengths

- ### Complete CRUD and Auth out of the box
    Just by defining your tables and views in your database you get a powerful CRUD api out of the box that will cover 90%+ of your needs. Throw in some database grands and constraints and you've got your self an authentication/authorization functionality also.
- ### Extensible (use it as a library)
    The majority of the alternatives are available only as standalone services and to add custom functionality you have to use a combination between a proxy, messaging server and lambda functions (in addition to your database). This, as you imagine, massively complicates your production infrastructure and deployment procedure and of course you need extensive devops knowledge and resources. By using subzero as a library, you side step all that needles complication and deploy your custom application as a single binary/container.
- ### Rust codebase
    Rust is consistently voted [the most loved language](https://insights.stackoverflow.com/survey/2021#section-most-loved-dreaded-and-wanted-programming-scripting-and-markup-languages) by developers and in heavy use at AWS, Google, Microsoft. This ensures that besides it's raw speed you also get a big pool of highly competent developers that a ready (and will enjoy) work on the codebase.
- ### <insert_superlative_here> Speed
    It's already cliche to use words like *blazing*, *lightning*, *impressive* to describe the performance of your product and we are running out of adjectives. How do you describe a product that is up to **8 times faster** then the alternatives? We would like to assume credit for that though at this stage, this speed can mostly be attributed to Rust, that is to say, we haven't really optimized the code for performance yet, so expect even more impressive numbers.

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

The REST API uses [PostgREST dialect](https://postgrest.org/en/stable/api.html) so you can use any of it's specific client implementation (though we prefer default http clients since PostgREST specific clients do nothing more then assemble a url string).

PostgreSQL backend sample request.
```
curl -i "http://localhost:8000/projects?select=id,name,tasks(name)&id=gt.1"
```

SQLite backend sample request.
```
curl -i "http://localhost:9000/projects?select=id,name,tasks(name)&id=gt.1"
```

## Source code
While in beta, you can get a lifetime license and access to the full source code by starring this repository.

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

