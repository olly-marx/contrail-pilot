-- M8 test seed A: a small database for the board logic (run AFTER boards8_schema.sql: it sets flights.missions_done). Four pilots, flights across this week and older.
-- created_at is set by hand (the insert trigger forces now()), with the trigger switched off for the update only.
\set ON_ERROR_STOP 1
insert into auth.users values ('a1a1a1a1-0000-0000-0000-000000000001'), ('b2b2b2b2-0000-0000-0000-000000000002'),
  ('c3c3c3c3-0000-0000-0000-000000000003'), ('d4d4d4d4-0000-0000-0000-000000000004');
insert into players (id, first_name, word, tag, hidden) values
  ('a1a1a1a1-0000-0000-0000-000000000001', 'Ann', 'Robin', 11, false),
  ('b2b2b2b2-0000-0000-0000-000000000002', 'Ben', 'Heron', 12, false),
  ('c3c3c3c3-0000-0000-0000-000000000003', 'Cat', 'Falcon', 13, true),    -- hidden: never on a board
  ('d4d4d4d4-0000-0000-0000-000000000004', 'Dan', 'Swift', 14, false);
-- (tag, kind) flights: old = 20 days ago, recent = today
insert into flights (player_id, landed, distance_m, shade, heat_trapped, species, crash) values
  -- Ann: two landings (one old, one recent), a bird crash, a storm crash
  ('a1a1a1a1-0000-0000-0000-000000000001', true, 5000, 10, 4, '{oak,birch}', null),
  ('a1a1a1a1-0000-0000-0000-000000000001', true, 3000, 2, 6, '{oak,africa:acacia}', null),
  ('a1a1a1a1-0000-0000-0000-000000000001', false, 900, 1, 0, '{}', 'bird'),
  ('a1a1a1a1-0000-0000-0000-000000000001', false, 150, 0, 0, '{}', 'storm'),
  -- Ben: one long landing, a bird crash at 0 km (a valid SHORTEST FLIGHT), a bird crash far
  ('b2b2b2b2-0000-0000-0000-000000000002', true, 12000, 20, 5, '{oak}', null),
  ('b2b2b2b2-0000-0000-0000-000000000002', false, 0, 0, 0, '{}', 'bird'),
  ('b2b2b2b2-0000-0000-0000-000000000002', false, 4000, 3, 0, '{}', 'bird'),
  -- Cat (hidden): would top every board
  ('c3c3c3c3-0000-0000-0000-000000000003', true, 99999, 99, 0, '{a,b,c,d,e}', null),
  ('c3c3c3c3-0000-0000-0000-000000000003', false, 1, 0, 0, '{}', 'bird'),
  -- Dan: nothing but a landing with more heat than shade (cool must clamp to 0 and so be absent)
  ('d4d4d4d4-0000-0000-0000-000000000004', true, 700, 1, 9, '{}', null);
update flights set missions_done = 2 where id = 2; update flights set missions_done = 4 where id = 5; update flights set missions_done = 1 where id = 7;
alter table flights disable trigger flights_rate_limit;
-- flights 1 and 5 are old (20 days ago); every other flight stays "today"
update flights set created_at = now() - interval '20 days' where id in (1, 5);
alter table flights enable trigger flights_rate_limit;
