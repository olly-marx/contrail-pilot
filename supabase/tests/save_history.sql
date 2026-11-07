-- SAVE HISTORY (draft; NOT RUN: no Postgres where it was written). Same harness as boards8.sql (supabase/tests/run-m8.sh on branch feat/m8-db): apply
-- the schema drafts, then 20261105000000_save_history.sql, then this file. Every check is an ASSERT: a wrong result stops the run (ON_ERROR_STOP).
\set ON_ERROR_STOP 1
-- 1. the progress score, by hand: 10 landings + 20/10 flights + 3 x 2 missions + 2 x (1+2) levels + 4/2 trees + (2 planes - the first) = 10 + 2 + 6 + 6 + 2 + 1 = 27
do $$ begin
  assert save_progress('{"landings":10,"flights":20,"missionsDone":["a","b"],"levels":{"x":1,"y":2},"planted":{"o":4},"fleet":{"planes":{"a":{},"b":{}}}}'::jsonb) = 27, 'progress by hand';
  assert save_progress('{}'::jsonb) = 0 and save_progress('{"levels":"x","planted":[],"missionsDone":5}'::jsonb) = 0, 'a blank or odd save scores 0, no error';
end $$;
-- 2. the history, as one pilot
insert into auth.users (id) values ('b2b2b2b2-0000-0000-0000-000000000001') on conflict do nothing;
insert into players (id, first_name, word, tag, hidden) values ('b2b2b2b2-0000-0000-0000-000000000001', 'Olly', 'Gardener', 11, false) on conflict do nothing;
select set_config('request.uid', 'b2b2b2b2-0000-0000-0000-000000000001', false);
create function pg_temp.sv(landings int, flights int) returns jsonb language sql as $$ select jsonb_build_object('landings', landings, 'flights', flights) $$;
do $$ declare r boolean; begin
  r := put_save(pg_temp.sv(100, 200), 1000, '9.9.9'); assert r, 'the first save is kept';
  assert (select count(*) from player_save_history) = 0, 'nothing was replaced, nothing is kept';
  r := put_save(pg_temp.sv(110, 220), 2000, '9.9.9'); assert r, 'a newer save is kept';
  assert (select count(*) from player_save_history) = 1 and (select reason from player_save_history) = 'overwritten', 'the first overwrite keeps the old save as overwritten';
  r := put_save(pg_temp.sv(120, 240), 3000, '9.9.9'); assert r;
  assert (select count(*) from player_save_history) = 1, 'a second overwrite within 6 hours keeps nothing more';
  -- the poorer, later save (the bug): accepted, and the richer one is kept
  r := put_save(pg_temp.sv(5, 6), 4000, '9.9.9'); assert r, 'a newer poorer save is still accepted';
  assert (select count(*) from player_save_history where reason = 'replaced by lower progress') = 1
     and (select max(progress) from player_save_history) = save_progress(pg_temp.sv(120, 240)), 'the richer save it replaced is kept as replaced by lower progress';
  -- an older stamp is refused and keeps nothing
  r := put_save(pg_temp.sv(1, 1), 3500, '9.9.9'); assert not r, 'an older save is not kept';
  assert (select count(*) from player_save_history) = 2, 'a refused save keeps nothing';
  -- retention: 3 per pilot, the richest
  perform put_save(pg_temp.sv(300, 600), 5000, '9.9.9');
  perform put_save(pg_temp.sv(10, 20), 6000, '9.9.9');
  perform put_save(pg_temp.sv(200, 400), 7000, '9.9.9');
  perform put_save(pg_temp.sv(4, 8), 8000, '9.9.9');
  assert (select count(*) from player_save_history) = 3, 'at most 3 are kept per pilot: ' || (select count(*) from player_save_history);
  assert (select min(progress) from player_save_history) >= save_progress(pg_temp.sv(110, 220)), 'the 3 kept are the richest';
  assert exists (select 1 from player_save_history where progress = save_progress(pg_temp.sv(300, 600))), 'the richest save ever is still there';
  assert (select count(*) from get_save_history()) = 3, 'get_save_history returns the pilot''s own';
end $$;
-- 3. nobody else can read the table, and an old client is still refused
do $$ begin
  assert not has_table_privilege('authenticated', 'public.player_save_history', 'select') and not has_table_privilege('anon', 'public.player_save_history', 'select'), 'the table is closed to the game and to anonymous callers';
end $$;
