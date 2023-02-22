-- function to get a specific jwt claim from user variables
-- we need it as a workaround for view definitions not allowing access to user variables
delimiter //
create function get_jwt_claim(path text)
returns json
deterministic no sql
begin
    return json_extract(@request.jwt.claims, path);
end
//

-- a sample view that simulates RLS (Row Level Security) from postgres
create view EmployeeView as
select * from Employee
where
-- allow access to rows where the employee id matches the id in the jwt claim
EmployeeId = get_jwt_claim('$.id');