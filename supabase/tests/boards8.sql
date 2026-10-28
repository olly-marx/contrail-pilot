-- M8 scenario A: the 8 boards, week + ever, hand-computed from boards8_seed.sql. Every check is an ASSERT: a wrong result stops the run (ON_ERROR_STOP).
\set ON_ERROR_STOP 1
-- a compact text of a board: "place name:score" joined; as the anonymous caller unless a pilot is set
create function pg_temp.b(board text, period text) returns text language sql as $$
  select coalesce(string_agg(place || ' ' || split_part(name, ' ', 1) || ':' || score::text || case when is_me then '*' else '' end, ' | ' order by place, name), '') from leaderboard(board, period)
$$;
do $$ begin
  -- EVER
  assert pg_temp.b('longest', 'ever')      = '1 Ben:12000 | 2 Ann:5000 | 3 Dan:700',        'longest ever: ' || pg_temp.b('longest', 'ever');
  assert pg_temp.b('kinds', 'ever')        = '1 Ann:3 | 2 Ben:1',                             'kinds ever (landed flights, distinct, land-tagged): ' || pg_temp.b('kinds', 'ever');
  assert pg_temp.b('cool', 'ever')         = '1 Ben:15.0 | 2 Ann:6.0',                        'cool ever (per flight, clamped at 0; Dan is 0 and absent): ' || pg_temp.b('cool', 'ever');
  assert pg_temp.b('missions', 'ever')     = '1 Ben:5 | 2 Ann:2',                             'missions ever: ' || pg_temp.b('missions', 'ever');
  assert pg_temp.b('longestCrash', 'ever') = '1 Ben:4000 | 2 Ann:900',                        'longestCrash ever: ' || pg_temp.b('longestCrash', 'ever');
  assert pg_temp.b('shortest', 'ever')     = '1 Ben:0 | 2 Ann:150',                           'shortest ever ASCENDING, a crash at 0 km is valid: ' || pg_temp.b('shortest', 'ever');
  assert pg_temp.b('bird', 'ever')         = '1 Ben:2 | 2 Ann:1',                             'bird ever: ' || pg_temp.b('bird', 'ever');
  assert pg_temp.b('crashes', 'ever')      = '1 Ann:2 | 1 Ben:2',                             'crashes ever (a tie shares the place): ' || pg_temp.b('crashes', 'ever');
  -- WEEK (flights 1 and 5 are 20 days old and must not count)
  assert pg_temp.b('longest', 'week')      = '1 Ann:3000 | 2 Dan:700',                        'longest week (Ben''s 12000 is old): ' || pg_temp.b('longest', 'week');
  assert pg_temp.b('kinds', 'week')        = '1 Ann:2',                                       'kinds week: ' || pg_temp.b('kinds', 'week');
  assert pg_temp.b('cool', 'week')         = '',                                              'cool week (nobody has shade above heat this week): ' || pg_temp.b('cool', 'week');
  assert pg_temp.b('missions', 'week')     = '1 Ann:2 | 2 Ben:1',                             'missions week: ' || pg_temp.b('missions', 'week');
  -- anything that is not 'week' is 'ever'; retired and unknown boards are empty
  assert pg_temp.b('longest', 'all') = pg_temp.b('longest', 'ever') and pg_temp.b('longest', 'today') = pg_temp.b('longest', 'ever'), 'an old period name means ever';
  assert pg_temp.b('overall', 'ever') = '' and pg_temp.b('nope', 'ever') = '' and pg_temp.b('trapped', 'week') = '', 'retired and unknown boards are empty';
  -- the hidden pilot is on no board
  assert not exists (select 1 from leaderboard('longest', 'ever') where name like 'Cat%') and not exists (select 1 from leaderboard('bird', 'ever') where name like 'Cat%'), 'a hidden pilot is on no board';
end $$;

-- "you": the caller's own row is marked
select set_config('request.uid', 'a1a1a1a1-0000-0000-0000-000000000001', false);
do $$ begin
  assert pg_temp.b('longest', 'ever') = '1 Ben:12000 | 2 Ann:5000* | 3 Dan:700', 'the caller (Ann) is marked: ' || pg_temp.b('longest', 'ever');
end $$;

-- the top 50 plus the caller's own row when below it: 55 extra pilots, Dan (700 km) falls to place 57
reset request.uid;
insert into auth.users select gen_random_uuid() from generate_series(1, 55);
insert into players (id, first_name, word, tag, hidden)
  select u.id, 'Pilot' || translate((row_number() over ())::text, '0123456789', 'abcdefghij'), 'Robin', 20 + (row_number() over ())::int, false from auth.users u where u.id not in (select id from players);
insert into flights (player_id, landed, distance_m)
  select p.id, true, 1000 + (row_number() over ())::int from players p where p.first_name like 'Pilot%';
select set_config('request.uid', 'd4d4d4d4-0000-0000-0000-000000000004', false);
do $$ declare n int; me int; begin
  select count(*), count(*) filter (where is_me) into n, me from leaderboard('longest', 'ever');
  assert n = 51 and me = 1, format('top 50 plus my row: %s rows, %s mine', n, me);
  assert (select place from leaderboard('longest', 'ever') where is_me) = 58, 'Dan is below 57 others (Ben, Ann, 55 extra): place ' || (select place from leaderboard('longest', 'ever') where is_me);
end $$;
reset request.uid;
select 'boards8 A: all assertions passed' as result;
