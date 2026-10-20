\set ON_ERROR_STOP 0
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002'), ('cccccccc-0000-0000-0000-000000000003');
set role authenticated;
-- A
set request.uid = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into players (first_name, word, tag) values ('Ollie', 'Puffin', 27);
\echo EXPECT-OK above. Next: rude name refused
insert into players (id, first_name, word, tag) values ('cccccccc-0000-0000-0000-000000000003', 'Bob', 'Puffin', 11);
\echo EXPECT refused: player row for someone else
insert into flights (landed, distance_m, shade, heat_trapped, night_dodges, plane_co2, species, mission_done) values (true, 3000, 12, 2, 1, 0.8, '{oak,birch}', true);
\echo EXPECT-OK: A lands 3000 m. Ultimate = 300 + 30 + 100 + (12-2)*5 + 25 + 200*0.2 + 40 = 585
insert into flights (landed, distance_m) values (false, 10), (false, 10), (false, 10), (false, 10);
\echo EXPECT-OK: 4 more queued flights at once (5 in a minute is allowed)
insert into flights (landed, distance_m) values (false, 9000);
\echo EXPECT refused: a 6th within a minute is too fast
update flights set created_at = created_at - interval '1 minute';
\echo (update silently does nothing: no update policy)
insert into flights (player_id, landed, distance_m) values ('bbbbbbbb-0000-0000-0000-000000000002', true, 99999);
\echo EXPECT refused: flight for B
update players set hidden = true;
\echo EXPECT refused: cannot touch hidden
-- B
set request.uid = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into players (first_name, word, tag) values ('Fuuuck', 'Owl', 12);
\echo EXPECT refused: rude name
insert into players (first_name, word, tag) values ('Priya', 'Owl', 12);
insert into players (first_name, word, tag) values ('Priya', 'Owl', 12);
\echo EXPECT refused: second player row for B
reset role; update flights set created_at = created_at - interval '1 minute'; set role authenticated;
set request.uid = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into flights (landed, distance_m, shade) values (false, 9000, 50);
\echo EXPECT-OK: B crashes at 9000 m (should score nothing)
select count(*) as flights_b_can_see from flights;
\echo EXPECT 1 (only own)
set role anon; set request.uid = '';
select * from leaderboard('ultimate', 'today');
\echo EXPECT only Ollie, 585
select * from leaderboard('longest', 'all');
select count(*) from flights;
\echo EXPECT refused: anon cannot read flights
select * from blocked_words limit 1;
\echo EXPECT refused or empty: blocklist hidden
\echo EXPECT name 'Ollie the Puffin' and tag 27 as separate columns (above)
select * from leaderboard('crashes', 'today');
\echo EXPECT Oops crashes: Ollie 4 (the 4 tiny queued test crashes), Priya 1
select * from leaderboard('trapped', 'all');
\echo EXPECT Oops trapped: Ollie 2 (trapped heat counts on any flight)
select name, score from leaderboard('laps', 'all');
\echo EXPECT laps: nobody (0 rows)
reset role; insert into flights (player_id, landed, distance_m, lap) values ('aaaaaaaa-0000-0000-0000-000000000001', true, 1900, true); set role anon;
select name, score from leaderboard('laps', 'all');
\echo EXPECT laps: Ollie 1
select name, score from leaderboard('longestCrash', 'all');
\echo EXPECT longest crash: Priya 9000, Ollie 10
select name, score from leaderboard('avgCrash', 'all');
\echo EXPECT average crash: Priya 9000, Ollie 10
reset role; insert into flights (player_id, landed, distance_m, crash) values ('aaaaaaaa-0000-0000-0000-000000000001', false, 10, 'meteor');
\echo EXPECT refused: crash must be storm/bird/nofly/ground/overheat
set role anon;
reset role; update players set hidden = true where first_name = 'Ollie';
set role anon; select count(*) as rows_after_hiding from leaderboard('ultimate', 'all');
\echo EXPECT 0
