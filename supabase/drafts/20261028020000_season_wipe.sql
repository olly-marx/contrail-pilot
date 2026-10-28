-- M8 step 3, THE SEASON WIPE (draft; research/M8-ONLINE.md; decided 2026-10-26). A live-database change the user confirms first.
-- Kept OUT of migrations/ on purpose (a stray `supabase db push` would apply that folder). Test: tests/run-m8.sh.
-- Apply AFTER 20261028000000_boards8_schema.sql and 20261028010000_boards8_leaderboard.sql (the archive copies the flights table WITH missions_done).
--
-- The user's decision: wipe the boards at the restart (a new season). What this does, in ONE transaction:
--   1. COPIES to schema archive_season1 (no grants: the API cannot see it): flights, player_saves, players,
--      restore_links, devices, pilot_codes. Copies, so nothing depends on the live rows surviving.
--   2. Checks the copies have the same row counts as the live tables; raises (and rolls everything back) if not.
--   3. Deletes ALL flights (every board is built from flights: they all start at zero) and ALL player_saves
--      (so the old-format saves cannot flow back to a device on login or get_save()).
-- KEPT, on purpose: players (names, tags, hidden, claimed_at), devices, pilot_codes, restore_links (so pilots keep
-- their name and their code, and a device stays linked to its pilot).
-- Refuses to run twice (archive_season1.flights must not exist yet): a second wipe would archive an empty season.
-- Order: boards8_schema, boards8_leaderboard, THIS, retire_restore_links (this one copies restore_links, so run it before the retire).
-- Undo: 20261028020001_season_wipe_undo.sql (puts the archived flights and saves back). Undo order is the reverse: retire, wipe, leaderboard, schema.
begin;

do $$ begin
  if to_regclass('archive_season1.flights') is not null then
    raise exception 'archive_season1.flights already exists: the season was already wiped (undo or drop the archive by hand first)';
  end if;
end $$;

create schema if not exists archive_season1;   -- (retire_restore_links may have made it)
revoke all on schema archive_season1 from public, anon, authenticated;
create table archive_season1.flights       as table public.flights;
create table archive_season1.player_saves  as table public.player_saves;
create table archive_season1.players       as table public.players;
create table archive_season1.restore_links as table public.restore_links;
create table archive_season1.devices       as table public.devices;
create table archive_season1.pilot_codes   as table public.pilot_codes;
create table archive_season1.wiped (at timestamptz not null default now(), flights bigint, saves bigint);
insert into archive_season1.wiped (flights, saves)
  select (select count(*) from public.flights), (select count(*) from public.player_saves);

do $$ begin
  if (select count(*) from archive_season1.flights)      <> (select count(*) from public.flights)
  or (select count(*) from archive_season1.player_saves) <> (select count(*) from public.player_saves)
  or (select count(*) from archive_season1.players)      <> (select count(*) from public.players) then
    raise exception 'archive does not match the live tables: nothing was wiped';
  end if;
end $$;

delete from public.flights;
delete from public.player_saves;
-- (the flights identity counter is NOT reset: new flights get ids above every archived one, so an undo cannot collide)

commit;
