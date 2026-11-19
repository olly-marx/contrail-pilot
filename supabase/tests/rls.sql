-- Row-level security and the boards, as live since M8 (rewritten 2026-11-19 with the live baseline: flights go in only
-- through send_flights, the 8 boards longest/kinds/cool/missions/longestCrash/shortest/bird/crashes, periods week/ever).
\set ON_ERROR_STOP 0
insert into auth.users values ('aaaaaaaa-0000-0000-0000-000000000001'), ('bbbbbbbb-0000-0000-0000-000000000002'), ('cccccccc-0000-0000-0000-000000000003');
set role authenticated;
-- A
set request.uid = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into players (first_name, word, tag) values ('Ollie', 'Puffin', 27);
\echo EXPECT-OK above. Next: player row for someone else refused
insert into players (id, first_name, word, tag) values ('cccccccc-0000-0000-0000-000000000003', 'Bob', 'Puffin', 11);
\echo EXPECT refused: player row for someone else
select send_flights('[{"landed":true,"distance_m":3000,"shade":12,"heat_trapped":2,"night_dodges":1,"plane_co2":0.8,"species":["oak","birch"],"missions_done":2},
  {"landed":false,"distance_m":10,"crash":"bird"},{"landed":false,"distance_m":10,"crash":"storm"},{"landed":false,"distance_m":10,"crash":"ground"},{"landed":false,"distance_m":12,"crash":"bird"}]') as sent;
\echo EXPECT 5: A lands 3000 km and crashes 4 times
insert into flights (landed, distance_m) values (true, 9000);
\echo EXPECT refused: no direct inserts (only send_flights)
insert into flights (player_id, landed, distance_m) values ('bbbbbbbb-0000-0000-0000-000000000002', true, 99999);
\echo EXPECT refused: flight for B
update flights set distance_m = 99999;
\echo (update does nothing: no update policy)
update players set hidden = true;
\echo EXPECT refused: cannot touch hidden
-- B
set request.uid = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into players (first_name, word, tag) values ('Fuuuck', 'Owl', 12);
\echo EXPECT refused: rude name
insert into players (first_name, word, tag) values ('Priya', 'Owl', 12);
insert into players (first_name, word, tag) values ('Priya', 'Owl', 12);
\echo EXPECT refused: second player row for B
select send_flights('[{"landed":false,"distance_m":9000,"shade":50,"crash":"storm"}]') as sent;
\echo EXPECT 1: B crashes at 9000 km
select count(*) as flights_b_can_see from flights;
\echo EXPECT 1 (only own)
set role anon; set request.uid = '';
select count(*) from flights;
\echo EXPECT refused or 0: anon cannot read flights
select * from blocked_words limit 1;
\echo EXPECT refused or empty: blocklist hidden
select name, tag, score from leaderboard('longest', 'ever');
\echo EXPECT only Ollie the Puffin, 27, 3000 (B never landed)
select name, score from leaderboard('kinds', 'ever');
\echo EXPECT Ollie 2
select name, score from leaderboard('cool', 'ever');
\echo EXPECT Ollie 10.0 (shade 12 - trapped 2, landed flights only)
select name, score from leaderboard('missions', 'week');
\echo EXPECT Ollie 2
select name, score from leaderboard('crashes', 'ever');
\echo EXPECT Ollie 4, Priya 1
select name, score from leaderboard('bird', 'ever');
\echo EXPECT Ollie 2
select name, score from leaderboard('shortest', 'ever');
\echo EXPECT Ollie 10 first, Priya 9000
select name, score from leaderboard('longestCrash', 'ever');
\echo EXPECT Priya 9000, Ollie 12
reset role; set cp.bulk = 'on'; insert into flights (player_id, landed, distance_m, crash) values ('aaaaaaaa-0000-0000-0000-000000000001', false, 10, 'meteor'); set cp.bulk = 'off';
\echo EXPECT refused: crash must be storm/bird/nofly/ground/overheat
reset role; update players set hidden = true where first_name = 'Ollie';
set role anon; select count(*) as rows_after_hiding from leaderboard('longest', 'ever');
\echo EXPECT 0
