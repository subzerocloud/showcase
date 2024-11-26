
set search_path to public;
-- this function is copy/pasted from the @subzerocloud/auth package
-- while the auth schema is created and managed by the @subzerocloud/auth package
-- it is included here to ensure that the function is available when we define permissions
create schema if not exists auth;
create or replace function auth.jwt()
returns jsonb
language sql stable
as $$
    select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;



-- main schema for the application
drop table if exists todos;
create table if not exists todos (
    id serial primary key,
    title varchar(255) not null,
    done boolean default false,
    user_id integer not null default (auth.jwt() ->> 'sub')::integer
);
