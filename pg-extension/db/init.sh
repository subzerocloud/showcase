#!/bin/bash

set -e

CUSTOM_CONFIG=$(cat <<EOF
#------------------------------------------------------------------------------
# CUSTOM SETTINGS (they override the values set above in the config)
#------------------------------------------------------------------------------

# the the log level so we can see what's going on
log_min_messages = info

# load the subzero extension
shared_preload_libraries = 'subzero_pgx.so'

# set the subzero configuration
subzero.listen_addresses = '0.0.0.0'
subzero.port = 3000

# the database/authenticator_role configs must be correct or the extension will crash
subzero.database = 'app'

# for production, follow the advice for PostgREST setups regarding authenticator/anonymous roles
# for this example we just use the superuser to keep things simple
subzero.authenticator_role = 'superuser'
subzero.db_anon_role = 'superuser'

# the schemas to expose over http (comma separated)
subzero.db_schemas = 'public'

# the query used to introspect the database schema
# you can (carefully) edit this file to customize the introspection query
# it's possible to also use a json file for a preconfigured schema structure
subzero.db_schema_structure = '{"sql_file":"/introspection_query.sql"}'

# the secret used to verify the JWT tokens
subzero.jwt_secret = 'reallyreallyreallyreallyverysafe'

# CORS settings, allow access from any origin domain
subzero.access_control_allow_origin = '*'

EOF
)
echo "${CUSTOM_CONFIG}" >> /var/lib/postgresql/data/postgresql.conf
