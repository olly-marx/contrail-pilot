-- Flight sanity limits (20261119010000_flight_limits.sql). Read the EXPECT lines.
\set ON_ERROR_STOP 0
reset role;
insert into auth.users values ('f6f6f6f6-0000-0000-0000-000000000006');
set role authenticated;
set request.uid = 'f6f6f6f6-0000-0000-0000-000000000006';
insert into players (first_name, word, tag) values ('Fin', 'Otter', 61);
-- The positive control: flights like the live record ones all pass.
select send_flights('[
  {"landed":true,"distance_m":21127,"shade":84.7,"heat_trapped":64,"night_dodges":10,"crystals":34,"plane_co2":1.1,"species":["oak","birch","mediterranean:olive","boreal:spruce"],"missions_done":9},
  {"landed":false,"distance_m":0,"crash":"ground"},
  {"landed":true,"distance_m":63000,"shade":600,"heat_trapped":200,"crystals":1500,"night_dodges":60,"plane_co2":0,"missions_done":20}]') as sent;
select count(*) as kept from flights where player_id = 'f6f6f6f6-0000-0000-0000-000000000006';
\echo EXPECT 3 sent, 3 kept: real and late-game flights pass
-- One impossible number at a time: each must be set aside with its own reason.
select send_flights('[
  {"landed":true,"distance_m":150001},
  {"landed":true,"distance_m":1000,"shade":51},
  {"landed":true,"distance_m":1000,"heat_trapped":51},
  {"landed":true,"distance_m":1000,"crystals":231},
  {"landed":true,"distance_m":1000,"night_dodges":16},
  {"landed":true,"distance_m":1000,"missions_done":21},
  {"landed":true,"distance_m":1000,"plane_co2":1.6},
  {"landed":true,"distance_m":1000,"species":["a","b","c","d","e","f","g","h","i","j","k","l","m"]},
  {"landed":true,"distance_m":1000,"species":["<script>"]},
  {"landed":true,"distance_m":"far"},
  {"landed":true}]') as sent;
select count(*) as kept from flights where player_id = 'f6f6f6f6-0000-0000-0000-000000000006';
\echo EXPECT 11 sent, still 3 kept
reset role;
select string_agg(why, ',' order by id) as reasons from flights_rejected;
\echo EXPECT distance,shade,heat_trapped,crystals,night_dodges,missions_done,plane_co2,species,species,malformed,distance missing
set role authenticated;
select count(*) from flights_rejected;
\echo EXPECT refused or 0: players cannot read the rejected list
select * from flight_limits;
\echo EXPECT refused or no rows: players cannot read or change the limits
select flight_problem('{"distance_m":1}');
\echo EXPECT refused: the check is not callable from the API
