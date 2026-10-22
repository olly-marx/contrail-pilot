-- Personal restore links (20261022120000_restore_links.sql): a code previews and claims ONE
-- pilot; wrong codes see nothing; a link works once; the codes table is unreadable.
\set ON_ERROR_STOP 0
insert into auth.users values ('dddddddd-0000-0000-0000-000000000004'), ('eeeeeeee-0000-0000-0000-000000000005'), ('ffffffff-0000-0000-0000-000000000006');
insert into players (id, first_name, word, tag) values ('dddddddd-0000-0000-0000-000000000004', 'Olly', 'Swift', 74);
insert into flights (player_id, landed, distance_m, mission_done, lap, crystals) values
  ('dddddddd-0000-0000-0000-000000000004', true, 18000, true, false, 7), ('dddddddd-0000-0000-0000-000000000004', false, 900, false, false, 1);
insert into restore_links (hash, player_id) values (encode(sha256(convert_to('olly-code', 'UTF8')), 'hex'), 'dddddddd-0000-0000-0000-000000000004');
set role authenticated;
set request.uid = 'eeeeeeee-0000-0000-0000-000000000005';
select * from restore_links;
\echo EXPECT refused: nobody reads the link codes
select * from restore_preview('wrong-code');
\echo EXPECT 0 rows: a wrong code shows nobody
select name, tag, flights, best from restore_preview('olly-code');
\echo EXPECT Olly the Swift, 74, 2 flights, best 18000
select restore_claim('wrong-code');
\echo EXPECT refused: wrong code (already used / unknown)
select jsonb_array_length(restore_claim('olly-code')) as flights_returned;
\echo EXPECT 2 flights returned
select first_name, word, tag, claimed_at is not null as claimed from players;
\echo EXPECT Olly Swift 74 claimed = t (now the row of the caller)
select count(*) as my_flights from flights;
\echo EXPECT 2 (the flights moved to the caller)
set request.uid = 'ffffffff-0000-0000-0000-000000000006';
select restore_claim('olly-code');
\echo EXPECT refused: the link has been used
select count(*) as preview_after from restore_preview('olly-code');
\echo EXPECT 0: a used link shows nobody
reset role;
