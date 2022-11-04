drop role if exists anon;
drop role if exists alice;
drop role if exists bob;
create role anon;
create role alice;
create role bob;

-- Resetting all privileges for application roles (start from a clean slate)
-- we use a convenience inline function here since PostgreSQL does not have a specific statement
-- you only need to list the roles and schemas that need to be reset
do $$
declare
    r text;
    s text;
    -- list roles which need resetting here
    role_list text[] = '{anon, alice, bob}';
    -- list schemas for which to reset privileges
    schema_list text[] = '{public}';
begin
    foreach r in array role_list loop 
        foreach s in array schema_list loop 
            execute format('revoke all privileges on all tables    in schema %I from %I', s, r);
            execute format('revoke all privileges on all sequences in schema %I from %I', s, r);
            execute format('revoke all privileges on all functions in schema %I from %I', s, r);
            execute format('revoke all privileges on                  schema %I from %I', s, r);
        end loop;
    end loop;
end$$;

grant usage on schema public to anon, alice, bob;
grant select ("ProductID","ProductName","SupplierID","CategoryID","QuantityPerUnit","UnitPrice") on public."Products" to anon;
grant select on all tables in schema public to alice;
grant select, insert, update, delete on all tables in schema public to bob;
