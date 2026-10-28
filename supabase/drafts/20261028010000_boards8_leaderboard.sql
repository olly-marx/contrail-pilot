-- M8 step 2, THE 8 BOARDS (draft; research/M8-ONLINE.md, research/PROPOSAL-BOARDS-S2.md). Replaces leaderboard(): 4 good + 4 oops boards, two periods.
-- Same signature and result columns as before. Boards: longest, kinds, cool, missions, longestCrash, shortest (LOW first), bird, crashes.
-- Periods: 'week' = the Europe/London calendar week, anything else = 'ever'. Only flights since season.start_at count. Top 50 plus the caller's own row.
-- Needs 20261028000000_boards8_schema.sql (season, missions_done). Undo: 20261028010000_boards8_leaderboard_undo.sql.
begin;
drop function public.leaderboard(text, text);

create function public.leaderboard(board text, period text default 'ever')
returns table (place bigint, name text, tag smallint, score numeric, is_me boolean)
language sql stable security definer set search_path = public as $$
  with since as (
    select greatest(case when period = 'week' then date_trunc('week', now() at time zone 'Europe/London') at time zone 'Europe/London'
                         else '-infinity'::timestamptz end, (select start_at from season)) as t
  ),
  f as (
    select fl.* from flights fl join players p on p.id = fl.player_id, since
    where not p.hidden and fl.created_at >= since.t
  ),
  per as (
    select player_id,
      max(distance_m) filter (where landed)                                   as longest,
      (select count(distinct s) from f f2, unnest(f2.species) s
        where f2.player_id = f.player_id and f2.landed)                       as kinds,
      round((sum(greatest(0, shade - heat_trapped)) filter (where landed))::numeric, 1) as cool,
      sum(missions_done)                                                      as missions,
      max(distance_m) filter (where not landed)                               as longest_crash,
      min(distance_m) filter (where not landed)                               as shortest,
      count(*) filter (where crash = 'bird')                                  as bird,
      count(*) filter (where not landed)                                      as crashes
    from f group by player_id
  ),
  scored as (
    select player_id,
      case board
        when 'longest'      then longest
        when 'kinds'        then kinds
        when 'cool'         then cool
        when 'missions'     then missions
        when 'longestCrash' then longest_crash
        when 'shortest'     then shortest
        when 'bird'         then bird
        when 'crashes'      then crashes
      end::numeric as score
    from per
  ),
  ranked as (
    select rank() over (order by case when board = 'shortest' then s.score else -s.score end) as place,
           p.first_name || ' the ' || p.word as name, p.tag, s.score,
           s.player_id = public.my_player() as is_me
    from scored s join players p on p.id = s.player_id
    where s.score is not null and (board = 'shortest' or s.score > 0)   -- a crash at 0 km is a valid SHORTEST FLIGHT
  )
  select place, name, tag, score, is_me from ranked
  where place <= 50 or is_me
  order by place, name
$$;

grant execute on function public.leaderboard(text, text) to anon, authenticated;
commit;
