#!/bin/sh
# Database tests in a throwaway Postgres 17 (Docker), with a small stand-in for Supabase's auth.
# Read the output: each "EXPECT ..." line follows the statement it describes.
# names.sql must print no NOT BLOCKED line; WRONGLY BLOCKED should list only place names.
set -e
cd "$(dirname "$0")/.."
docker rm -f cp-pg >/dev/null 2>&1 || true
docker run -d --name cp-pg -e POSTGRES_PASSWORD=x postgres:17 >/dev/null
until docker exec cp-pg pg_isready -U postgres -q; do sleep 1; done; sleep 2
docker exec -i cp-pg psql -q -U postgres -v ON_ERROR_STOP=1 < tests/stub.sql
for m in migrations/*.sql; do docker exec -i cp-pg psql -q -U postgres -v ON_ERROR_STOP=1 < "$m"; done
docker exec -i cp-pg psql -q -t -U postgres < tests/names.sql
docker exec -i cp-pg psql -q -U postgres < tests/rls.sql 2>&1
docker exec -i cp-pg psql -q -U postgres < tests/claim.sql 2>&1
docker exec -i cp-pg psql -q -U postgres < tests/online_save.sql 2>&1
docker exec -i cp-pg psql -q -U postgres < tests/send_flights.sql 2>&1
docker rm -f cp-pg >/dev/null
