#!/bin/sh
# M8 database proof in a throwaway Postgres 17 (Docker): the live schema (7 migrations) + the M8 drafts, on a LOCAL copy only. Never touches a live database.
# A = the 8 boards (boards8.sql asserts). Exit non-zero on any failed assert.
set -e
cd "$(dirname "$0")/.."
N=cp-pg-m8
psql_() { docker exec -i $N psql -q -U postgres -v ON_ERROR_STOP=1 "$@"; }
fresh() { docker rm -f $N >/dev/null 2>&1 || true; docker run -d --name $N -e POSTGRES_PASSWORD=x postgres:17 >/dev/null
  until docker exec $N pg_isready -U postgres -q; do sleep 1; done; sleep 2
  psql_ < tests/stub.sql; for m in migrations/*.sql; do psql_ < "$m"; done; }
trap 'docker rm -f $N >/dev/null 2>&1 || true' EXIT
fresh
for d in drafts/20261028000000_boards8_schema.sql drafts/20261028010000_boards8_leaderboard.sql; do psql_ < $d; done
psql_ < tests/boards8_seed.sql
psql_ < tests/boards8.sql

# B = apply every step on the LIVE schema + seed, check each, undo in reverse, and the state must equal what it was before.
D=drafts/20261028
state() { psql_ -t -A < tests/boards8_state.sql; }
fresh
psql_ < tests/boards8_seed_pre.sql
state > /tmp/m8_s0.txt
psql_ < ${D}000000_boards8_schema.sql; psql_ < ${D}010000_boards8_leaderboard.sql
state > /tmp/m8_s1.txt
psql_ < ${D}020000_season_wipe.sql
psql_ <<'SQL'
do $$ begin
  assert (select count(*) from flights) = 0 and (select count(*) from player_saves) = 0, 'wipe: flights and saves are gone';
  assert (select count(*) from players) = 4 and (select count(*) from devices) = 1 and (select count(*) from pilot_codes) = 1, 'wipe keeps players, devices, codes';
  assert (select count(*) from archive_season1.flights) = 10 and (select count(*) from archive_season1.player_saves) = 2 and (select count(*) from archive_season1.restore_links) = 2, 'archive holds every row';
  assert (select flights from archive_season1.wiped) = 10, 'wiped record';
end $$;
SQL
# a second wipe must refuse
if psql_ < ${D}020000_season_wipe.sql >/dev/null 2>&1; then echo "FAIL: a second wipe was allowed"; exit 1; fi
psql_ < ${D}030000_retire_restore_links.sql
psql_ <<'SQL'
do $$ begin
  assert to_regclass('public.restore_links') is null, 'retire: table gone';
  assert not exists (select 1 from pg_proc where proname in ('restore_preview', 'restore_claim', 'restore_link_player')), 'retire: functions gone';
end $$;
SQL
psql_ < ${D}030001_retire_restore_links_undo.sql
psql_ < ${D}020001_season_wipe_undo.sql
state > /tmp/m8_s2.txt
diff /tmp/m8_s1.txt /tmp/m8_s2.txt || { echo "FAIL: undo of retire+wipe did not restore the state after the schema step"; exit 1; }
psql_ < ${D}010000_boards8_leaderboard_undo.sql; psql_ < ${D}000000_boards8_schema_undo.sql
psql_ -c "drop schema archive_season1 cascade" >/dev/null
state > /tmp/m8_s3.txt
diff /tmp/m8_s0.txt /tmp/m8_s3.txt || { echo "FAIL: full undo did not restore the live state"; exit 1; }
echo "boards8 B: wipe, retire and all undos proven (state restored exactly)"
