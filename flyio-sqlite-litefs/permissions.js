// Internal permissions can be defined here.
// They are usefull when the underlying database does not have that capability or when the database is not under your control to define api specific roles.
// Permission system is modeled after PostgreSql GRANT + RLS functionality.
// If the permissions array is empty, the internal permission system is disabled and assumes that the underlying database has the
// necessary permissions configured.

export default [
    // allow select on all tables used in the UI for the public role
    { "table_schema": "public", "table_name": "Customers", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Suppliers", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Products", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Orders", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Employees", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Customer", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },
    { "table_schema": "public", "table_name": "Order Details", "role": "public", "grant": ["select"], "using": [{ "sql": "true" }] },

    // allow select and insert (on specific columns) for the Categories table
    // try inserting a new category with the following curl command:
    // curl -X POST -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"CategoryName":"Ice Cream"}' "http://localhost:3000/api/Categories?select=CategoryID,CategoryName"
    { "table_schema": "public", "table_name": "Categories", "role": "public", "grant": ["select"] },
    { "table_schema": "public", "table_name": "Categories", "role": "public", "grant": ["insert"], "columns": ["CategoryName", "Description"] },
    {
        "table_schema": "public", "table_name": "Categories", "role": "public",
        "policy_for": ["all"],
        // can see all categories
        "using": [{ "sql": "true" }],
        // can insert only a "Ice Cream" as a new category
        "check": [{"column":"CategoryName","op":"=","val":"Ice Cream"}]
    },

    // other examples
    // {
    //     "name": "public can see rows marked as public",
    //     "table_schema": "public", "table_name": "permissions_check",
    //     "role": "public",
    //     "grant": ["select"], "columns": ["id", "value"],
    //     "policy_for": ["select"], 
    //     "using": [{"column":"public","op":"=","val":"1"}]
    // },
    // {
    //     "name": "validation for hidden value",
    //     "table_schema": "public", "table_name": "permissions_check",
    //     "role": "public",
    //     "restrictive": true,
    //     "check": [{
    //         "tree":{
    //             "logic_op":"or",
    //             "conditions":[
    //                 {"column":"hidden","op":"=","val":"Hidden"},
    //                 {"column":"hidden","op":"=","val":"Hidden changed"}
    //             ]
    //         }
    //     }]
    // },
    // {
    //     "name": "admin allow all",
    //     "table_schema": "public", "table_name": "permissions_check",
    //     "role": "admin",
    //     "grant": ["select", "insert", "update", "delete"],
    //     "policy_for": ["select", "insert", "update", "delete"],
    //     "using": [{"sql":"true"}],
    //     "check": [{"sql":"true"}]
    // },
    // {
    //     "name": "alice allow owned",
    //     "table_schema": "public","table_name": "permissions_check",
    //     "role": "alice",
    //     "grant": ["all"],
    //     "policy_for": ["select", "insert", "update", "delete"],
    //     "using": [{"column":"role","op":"=","env":"request.jwt.claims","env_part":"role"}],
    //     "check": [{"column":"role","op":"=","env":"request.jwt.claims","env_part":"role"}]
    // },
    // {
    //     "name": "bob allow owned",
    //     "table_schema": "public","table_name": "permissions_check",
    //     "role": "bob",
    //     "grant": ["all"],
    //     "policy_for": ["all"],
    //     "using": [{"column":"role","op":"=","val":"bob"}],
    //     "check": [{"column":"role","op":"=","val":"bob"}]
    // },
]