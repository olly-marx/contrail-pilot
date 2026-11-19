#!/bin/sh
# Database tests in a throwaway Postgres 17 (Docker), with a small stand-in for Supabase's auth.
# Read the output: each "EXPECT ..." line follows the statement it describes.
# names.sql must print no NOT BLOCKED line; WRONGLY BLOCKED should list only place names.
set -e
cd "$(dirname "$0")/.."
PG=${CP_PG:-cp-pg}; docker rm -f $PG >/dev/null 2>&1 || true
docker run -d --name $PG -e POSTGRES_PASSWORD=x postgres:17 >/dev/null
until docker exec $PG pg_isready -U postgres -q; do sleep 1; done; sleep 2
docker exec -i $PG psql -q -U postgres -v ON_ERROR_STOP=1 < tests/stub.sql
for m in migrations/*.sql; do docker exec -i $PG psql -q -U postgres -v ON_ERROR_STOP=1 < "$m"; done
docker exec -i $PG psql -q -t -U postgres < tests/names.sql
docker exec -i $PG psql -q -U postgres < tests/rls.sql 2>&1
docker exec -i $PG psql -q -U postgres < tests/online_save.sql 2>&1
docker exec -i $PG psql -q -U postgres < tests/send_flights.sql 2>&1
docker exec -i $PG psql -q -U postgres < tests/flight_limits.sql 2>&1
PG=${CP_PG:-cp-pg}; docker rm -f $PG >/dev/null
