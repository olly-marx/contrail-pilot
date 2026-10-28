-- M8 undo of 20261028020000_season_wipe.sql: puts season 1 back (run BEFORE undoing the schema, so the columns still match). Run by hand, as the table owner.
-- Flights come back with their ORIGINAL ids and created_at (the insert trigger would overwrite created_at and
-- limit 5 a minute, so it is switched off for the insert and back on after). Flights and saves of pilots who
-- no longer exist are skipped. Flights played in the new season stay (their ids are higher: no collision);
-- a pilot who already has a NEW-season save keeps it (the archived one is not put over it).
-- The archive schema is left in place: drop it by hand (drop schema archive_season1 cascade) once sure.
begin;
alter table public.flights disable trigger flights_rate_limit;
insert into public.flights overriding system value
  select * from archive_season1.flights a where a.player_id in (select id from public.players)
  on conflict (id) do nothing;
alter table public.flights enable trigger flights_rate_limit;
insert into public.player_saves
  select * from archive_season1.player_saves a where a.player_id in (select id from public.players)
  on conflict (player_id) do nothing;
commit;
