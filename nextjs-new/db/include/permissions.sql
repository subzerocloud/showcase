
-- since this project is connected to the database with a superuser,
-- we have permission to switch to the authenticated role (SET ROLE ...)
-- a more secure approach would be to create a new role (ususally called authenticator)
-- that has no permissions on the database and only has permissions to switch to the application role
-- for example:
-- create role authenticator noinherit login password 'mysecretpassword'; -- this role is used to connect to the database
-- grant anonymous to authenticator; -- this is the role when a request without a JWT token is made
-- grant authenticated to authenticator;

drop role if exists authenticated;
create role authenticated;

drop role if exists "anonymous";
create role "anonymous";


-- enable row level security on all tables in the public schema
alter table todos enable row level security;

-- define permissions and policies
-- allow authenticated role access to personal rows in todos table
-- notice the role has no access to the user_id column
grant 
    select (id, title, done),
    insert (title, done),
    update (title, done),
    delete
on todos to authenticated;

-- allow authenticated role access to the sequence, this is required for the insert statement
grant usage on sequence todos_id_seq to authenticated;

-- define policy to allow authenticated role access to their own todos
create policy "authenticated role access for todos" on todos to authenticated
using ( user_id = (auth.jwt()->>'sub')::integer );