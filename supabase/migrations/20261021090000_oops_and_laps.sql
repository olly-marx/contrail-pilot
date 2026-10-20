-- Oops boards and laps (2026-10-21).
--
-- flights.crash: how a flight ended when it did NOT land (storm / bird / nofly / ground / overheat),
-- null for a landing. flights.lap: this landing completed a lap of the world (back in LONDON).
-- leaderboard() gains:
--   laps      laps of the world (a "good" board, landed flights only like the others)
--   crashes   OOPS: flights that did not land
--   trapped   OOPS: heat trapped by night contrails (all flights)
--   co2       OOPS: CO2 made = plane's cruising CO2 x km flown (all flights)
-- The Oops boards are for fun; they never count towards Ultimate Flyer. The game shows them for
-- TODAY only, so nobody stays at the top of a "bad" board for ever.
-- The pilot's number now comes back on its own (tag), so the screen can show it small and not
-- next to the score, where it was easy to mix up with the score.

alter table public.flights
  add column crash text check (crash in ('storm', 'bird', 'nofly', 'ground', 'overheat')),
  add column lap boolean not null default false;

drop function public.leaderboard(text, text);

create function public.leaderboard(board text, period text default 'all')
returns table (place bigint, name text, tag smallint, score numeric, is_me boolean)
language sql stable security definer set search_path = public as $$
  with since as (
    select case period
      when 'today' then date_trunc('day',   now() at time zone 'Europe/London') at time zone 'Europe/London'
      when 'week'  then date_trunc('week',  now() at time zone 'Europe/London') at time zone 'Europe/London'
      when 'month' then date_trunc('month', now() at time zone 'Europe/London') at time zone 'Europe/London'
      else '-infinity'::timestamptz end as t
  ),
  f as (
    select fl.* from flights fl join players p on p.id = fl.player_id, since
    where not p.hidden and fl.created_at >= since.t
  ),
  per as (
    select player_id,
      coalesce(max(distance_m) filter (where landed), 0)                  as longest,
      coalesce(sum(distance_m) filter (where landed), 0)                  as total,
      (select count(distinct s) from f f2, unnest(f2.species) s
        where f2.player_id = f.player_id and f2.landed)                   as species,
      greatest(0, coalesce(sum(shade - heat_trapped) filter (where landed), 0)) as cooler,
      coalesce(sum(night_dodges) filter (where landed), 0)                as dodges,
      avg(plane_co2) filter (where landed)                                as co2,
      count(*) filter (where mission_done)                                as missions,
      count(*) filter (where landed and lap)                              as laps,
      count(*) filter (where not landed)                                  as crashes,
      coalesce(sum(heat_trapped), 0)                                      as trapped,
      coalesce(sum(plane_co2 * distance_m), 0)                            as co2_made
    from f group by player_id
  ),
  scored as (
    select player_id,
      case board
        when 'longest'  then longest
        when 'total'    then total
        when 'nature'   then species
        when 'cooler'   then round((cooler + 5 * dodges)::numeric, 1)
        when 'cleaner'  then round(greatest(0, 200 * (1 - co2))::numeric)
        when 'missions' then missions
        when 'laps'     then laps
        when 'crashes'  then crashes
        when 'trapped'  then round(trapped::numeric, 1)
        when 'co2'      then round(co2_made::numeric)
        else round(longest / 10.0 + total / 100.0 + species * 50 + cooler * 5 + dodges * 25
                   + coalesce(greatest(0, 200 * (1 - co2)), 0) + missions * 40)
      end::numeric as score
    from per
  )
  select rank() over (order by s.score desc) as place,
         p.first_name || ' the ' || p.word as name,
         p.tag,
         s.score,
         s.player_id = auth.uid() as is_me
  from scored s join players p on p.id = s.player_id
  where s.score > 0
  order by s.score desc
  limit 50
$$;

grant execute on function public.leaderboard(text, text) to anon, authenticated;
