-- Offline play batch upload (20261023120000_send_flights.sql). Read the EXPECT lines.
\set ON_ERROR_STOP 0
reset role;
insert into auth.users values ('d4d4d4d4-0000-0000-0000-000000000004'), ('e5e5e5e5-0000-0000-0000-000000000005');
set role authenticated;
set request.uid = 'd4d4d4d4-0000-0000-0000-000000000004';
select send_flights('[{"landed":true,"distance_m":1000}]');
\echo EXPECT refused: no pilot yet
insert into players (first_name, word, tag) values ('Bea', 'Comet', 51);
select send_flights('[]') as none;
\echo EXPECT 0
select send_flights((select jsonb_agg(jsonb_build_object('landed', true, 'distance_m', 1000 + i, 'shade', 1.5, 'species', jsonb_build_array('oak', 'birch'), 'crash', null)) from generate_series(1, 30) i)) as sent;
\echo EXPECT 30: far more than 5 flights in one minute, in one call
select count(*) as rows, sum((species = '{oak,birch}')::int) as with_species, min(created_at) > now() - interval '1 minute' as server_clock from flights;
\echo EXPECT 30, 30, t
insert into flights (landed, distance_m) values (true, 1), (true, 2), (true, 3), (true, 4), (true, 5), (true, 6);
\echo EXPECT refused: the 30 just sent count towards the per-minute limit, so a single insert is still 'too many flights too fast' (the old limit stands)
select count(*) as rows_now from flights;
\echo EXPECT 30: none of those singles got in
select send_flights((select jsonb_agg(jsonb_build_object('landed', true, 'distance_m', 5)) from generate_series(1, 101))) ;
\echo EXPECT refused: too many flights in one go (101)
select send_flights('[{"landed":true,"distance_m":1000},{"landed":true,"distance_m":999999999}]');
\echo EXPECT refused: a bad flight (distance out of range) rejects the whole batch
select count(*) as rows_after_bad from flights;
\echo EXPECT 30: nothing from the bad batch got in
select send_flights((select jsonb_agg(jsonb_build_object('landed', true, 'distance_m', 7)) from generate_series(1, 100))) as sent;
select send_flights((select jsonb_agg(jsonb_build_object('landed', true, 'distance_m', 8)) from generate_series(1, 100))) as sent;
select send_flights((select jsonb_agg(jsonb_build_object('landed', true, 'distance_m', 9)) from generate_series(1, 100))) as sent;
\echo EXPECT 100, 100, then refused on the third: 30 + 200 = 230, another 100 would pass 300 in a day
select count(*) as rows_total from flights;
\echo EXPECT 230
insert into flights (landed, distance_m) values (true, 10);
\echo EXPECT refused: the setting does not leak, the limit is back for single inserts
select current_setting('cp.bulk', true) as bulk_flag;
\echo EXPECT off or empty
-- Someone else cannot see Bea's flights, and can send none without a pilot.
set request.uid = 'e5e5e5e5-0000-0000-0000-000000000005';
select send_flights('[{"landed":true,"distance_m":1000}]');
\echo EXPECT refused: no pilot yet
select count(*) as other_sees from flights;
\echo EXPECT 0
