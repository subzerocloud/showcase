-- create application roles
create role 'webuser';
create role 'anonymous';

-- revoke all privileges of autheticator role
revoke all privileges, grant option from 'authenticator';
set default role none to 'authenticator';

-- allow authenticator to switch to these roles
grant 'webuser', 'anonymous' to 'authenticator';

-- set the privileges  for anonymous role
grant select (productId,productName,unitPrice) on Product to 'anonymous';

-- set the privileges for webuser role
grant select on Category to 'webuser';
grant select on Region to 'webuser';
grant select on Territory to 'webuser';
grant select on CustomerDemographics to 'webuser';
grant select on Customer to 'webuser';
grant select on CustCustDemographics to 'webuser';
-- grant select on Employee to 'webuser';
grant select on EmployeeView to 'webuser';
grant select on EmployeeTerritory to 'webuser';
grant select on Supplier to 'webuser';
grant select on Product to 'webuser';
grant select on Shipper to 'webuser';
grant select on SalesOrder to 'webuser';
grant select on OrderDetail to 'webuser';
