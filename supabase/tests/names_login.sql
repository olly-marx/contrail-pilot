-- Unique names and the per-device login limit (20261119020000_names_and_login.sql). Read the EXPECT lines.
\set ON_ERROR_STOP 0
reset role;
insert into auth.users values ('10000000-0000-0000-0000-000000000001'), ('20000000-0000-0000-0000-000000000002'), ('30000000-0000-0000-0000-000000000003'), ('40000000-0000-0000-0000-000000000004');
set role authenticated;
set request.uid = '10000000-0000-0000-0000-000000000001';
insert into players (first_name, word, tag) values ('Sam', 'Owl', 42);
select set_pilot_code('Swift Otter Comet Hare 31');
\echo EXPECT-OK: Sam the Owl 42 with a code
set request.uid = '20000000-0000-0000-0000-000000000002';
insert into players (first_name, word, tag) values ('SAM', 'Owl', 42);
\echo EXPECT refused: duplicate key (players_name_unique): the same name in other letter case is the same pilot
insert into players (first_name, word, tag) values ('Sam', 'Owl', 43);
\echo EXPECT-OK: another tag is another pilot
-- The attacker (device 3) knows Sam's name from the boards and tries codes.
set request.uid = '30000000-0000-0000-0000-000000000003';
select count(*) filter (where not ok and why = 'wrong code') as wrong from generate_series(1, 10) i, pilot_login('sam', 'Owl', 42::smallint, 'guess ' || i || ' xxxxxxxxxxxxx');
\echo EXPECT 10 wrong
select ok, why from pilot_login('sam', 'Owl', 42::smallint, 'Swift Otter Comet Hare 31');
\echo EXPECT f, too many tries: the attacking device is stopped (even with the right code)
-- The real Sam on a new device (4) is NOT locked out.
set request.uid = '40000000-0000-0000-0000-000000000004';
select ok, why from pilot_login('Sam', 'Owl', 42::smallint, 'swift otter comet hare 31');
\echo EXPECT t, (null): Sam logs in on the new phone after the attack
select my_player() = '10000000-0000-0000-0000-000000000001' as phone_is_sam;
\echo EXPECT t
-- Functions that are not API calls.
set role anon;
select flights_rate_limit();
\echo EXPECT refused: permission denied (the trigger function)
select pilot_login('Sam', 'Owl', 42::smallint, 'x');
\echo EXPECT refused: permission denied for anon (sign in first)
