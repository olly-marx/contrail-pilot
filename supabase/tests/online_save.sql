-- Online save + pilot codes (20261022150000_online_save.sql). Read the EXPECT lines.
\set ON_ERROR_STOP 0
reset role;
insert into auth.users values ('a1a1a1a1-0000-0000-0000-000000000001'), ('b2b2b2b2-0000-0000-0000-000000000002'), ('c3c3c3c3-0000-0000-0000-000000000003');
set role authenticated;
-- Phone: makes pilot "Kim the Comet 42", a code, a flight and a save.
set request.uid = 'a1a1a1a1-0000-0000-0000-000000000001';
insert into players (first_name, word, tag) values ('Kim', 'Comet', 42);
select set_pilot_code('short');
\echo EXPECT refused: code too short
select set_pilot_code('Otter Comet Robin Hare 77');
select has_pilot_code() as phone_has_code;
\echo EXPECT t
insert into flights (landed, distance_m) values (true, 5000);
select put_save('{"seeds": 100}', 1000) as kept;
\echo EXPECT t (first save)
select put_save('{"seeds": 50}', 900) as kept;
\echo EXPECT f: an OLDER save never replaces a newer one
select save->>'seeds' as seeds, stamp from get_save();
\echo EXPECT 100, 1000
select * from pilot_codes;
\echo EXPECT refused: nobody reads the codes
-- Laptop: wrong code, then the right one (any capitals).
set request.uid = 'b2b2b2b2-0000-0000-0000-000000000002';
select ok, why from pilot_login('Kim', 'Comet', 42::smallint, 'otter comet robin hare 11');
\echo EXPECT f, wrong code
select ok, why from pilot_login('Nobody', 'Comet', 42::smallint, 'otter comet robin hare 77');
\echo EXPECT f, no such pilot
select ok, save->>'seeds' as seeds, stamp from pilot_login('kim', 'Comet', 42::smallint, 'OTTER COMET ROBIN HARE 77');
\echo EXPECT t, 100, 1000: the laptop joined and got the save
select my_player() = 'a1a1a1a1-0000-0000-0000-000000000001' as laptop_is_kim;
\echo EXPECT t
insert into flights (landed, distance_m) values (true, 7000);
select count(*) as kims_flights_seen from flights;
\echo EXPECT 2: the laptop flight counts for Kim, and the laptop sees both
select put_save('{"seeds": 300}', 2000) as kept;
\echo EXPECT t: the laptop saves newer progress
set request.uid = 'a1a1a1a1-0000-0000-0000-000000000001';
select save->>'seeds' as phone_sees from get_save();
\echo EXPECT 300: the phone sees the laptop progress
update players set word = 'Rocket';
select first_name, word from players;
\echo EXPECT Kim Rocket (rename works from the phone)
set request.uid = 'b2b2b2b2-0000-0000-0000-000000000002';
update players set word = 'Comet';
select word from players;
\echo EXPECT Comet (rename works from the laptop too)
set role anon; set request.uid = 'b2b2b2b2-0000-0000-0000-000000000002';
select name, is_me from leaderboard('longest', 'all') where name like 'Kim%';
\echo EXPECT Kim the Comet, is_me = t on the laptop
set role authenticated;
-- A stranger guesses: 10 wrong codes, then even the right one is refused for an hour.
set request.uid = 'c3c3c3c3-0000-0000-0000-000000000003';
\echo (the laptop wrong guess above was attempt 1; 9 more:)
select count(*) filter (where not ok) as wrong from generate_series(1, 9) i, pilot_login('Kim', 'Comet', 42::smallint, 'guess guess guess ' || i);
\echo EXPECT 9 wrong
select ok, why from pilot_login('Kim', 'Comet', 42::smallint, 'otter comet robin hare 77');
\echo EXPECT f, too many tries (even with the right code, for an hour)
reset role;
