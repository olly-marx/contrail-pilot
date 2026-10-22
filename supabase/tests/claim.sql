-- Restore button (20261022090000_claim_pilot.sql): password needed, flights move, claim once,
-- the password hash is unreadable. Read the EXPECT lines.
\set ON_ERROR_STOP 0
insert into auth.users values ('dddddddd-0000-0000-0000-000000000004'), ('eeeeeeee-0000-0000-0000-000000000005'), ('ffffffff-0000-0000-0000-000000000006');
insert into restore_secret values (encode(sha256(convert_to('test-pass', 'UTF8')), 'hex'));
insert into players (id, first_name, word, tag) values ('dddddddd-0000-0000-0000-000000000004', 'Olly', 'Swift', 74);
insert into flights (player_id, landed, distance_m, mission_done, lap, crystals) values
  ('dddddddd-0000-0000-0000-000000000004', true, 18000, true, false, 7), ('dddddddd-0000-0000-0000-000000000004', false, 900, false, false, 1);
set role authenticated;
set request.uid = 'eeeeeeee-0000-0000-0000-000000000005';
select * from restore_secret;
\echo EXPECT refused: nobody reads the password hash
select name from claimable_pilots('nope');
\echo EXPECT refused: wrong password (listing)
select name, tag, flights, best from claimable_pilots('test-pass');
\echo EXPECT Olly the Swift, 74, 2 flights, best 18000 (and Priya the Owl from rls.sql)
select claim_pilot('nope', 'dddddddd-0000-0000-0000-000000000004');
\echo EXPECT refused: wrong password (claim)
select jsonb_array_length(claim_pilot('test-pass', 'dddddddd-0000-0000-0000-000000000004')) as flights_returned;
\echo EXPECT 2 flights returned
select first_name, word, tag, claimed_at is not null as claimed from players;
\echo EXPECT Olly Swift 74 claimed = t (now the row of the caller)
select count(*) as my_flights from flights;
\echo EXPECT 2 (the flights moved to the caller)
set request.uid = 'ffffffff-0000-0000-0000-000000000006';
select claim_pilot('test-pass', 'dddddddd-0000-0000-0000-000000000004');
\echo EXPECT refused: already claimed
select count(*) as claimable_now from claimable_pilots('test-pass');
\echo EXPECT 1: only Priya; Olly is claimed and cannot be taken again
reset role;
