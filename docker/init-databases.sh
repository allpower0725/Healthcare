#!/bin/sh
# Docker entrypoint 在空資料卷執行；不包含資料表或舊庫轉換。
set -eu
psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=healthcare_password="$(cat /run/secrets/healthcare_password)" <<'SQL'
CREATE ROLE healthcare LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD :'healthcare_password';
CREATE DATABASE wjcch_db_test OWNER db_owner;
REVOKE ALL ON DATABASE postgres, template1, wjcch_db, wjcch_db_test FROM PUBLIC;
GRANT CONNECT ON DATABASE wjcch_db, wjcch_db_test TO healthcare;
SQL

for database in wjcch_db wjcch_db_test; do
  psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$database" <<'SQL'
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA heal_care AUTHORIZATION healthcare;
REVOKE ALL ON SCHEMA heal_care FROM PUBLIC;
SELECT format('ALTER ROLE healthcare IN DATABASE %I SET search_path TO pg_catalog, heal_care', current_database()) \gexec
ALTER DEFAULT PRIVILEGES FOR ROLE healthcare IN SCHEMA heal_care REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
SQL
done
