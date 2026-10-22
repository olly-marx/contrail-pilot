-- Online save and pilot codes (2026-10-22, the user: play the same pilot on phone AND laptop, and get
-- it back after a browser wipe, without passwords). Agreed design:
--   * A pilot can have several DEVICES (each device is an anonymous login). devices(device -> pilot);
--     my_player() = the pilot this device belongs to (its own id if it has not joined another).
--     Flights, renaming, "see my own" and the boards' is_me follow my_player().
--   * Each pilot has a PILOT CODE (4 words + a number, made by the game, shown on PILOT with "write
--     this down"). Only its SHA-256 is stored. "I already have a pilot": name + number + code joins
--     this device to that pilot. At most 10 wrong codes per pilot per hour.
--   * The save: one per pilot, put_save() keeps it only if newer than the stored one (by the game's
--     stamp), get_save() reads it. No direct table access from the game.

create table public.devices (
  device    uuid primary key references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  linked_at timestamptz not null default now()
);
alter table public.devices enable row level security;
revoke all on public.devices from anon, authenticated;

create function public.my_player() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce((select player_id from devices where device = auth.uid()), auth.uid())
$$;
grant execute on function public.my_player() to anon, authenticated;

-- Flights from a joined device go to its pilot (the game does not send player_id).
alter table public.flights alter column player_id set default public.my_player();
drop policy "see my own player"    on public.players;
drop policy "rename my own player" on public.players;
drop policy "add my own flights"   on public.flights;
drop policy "see my own flights"   on public.flights;
create policy "see my own player"    on public.players for select to authenticated using (id = public.my_player());
create policy "rename my own player" on public.players for update to authenticated using (id = public.my_player()) with check (id = public.my_player() and hidden = false);
create policy "add my own flights"   on public.flights for insert to authenticated with check (player_id = public.my_player());
create policy "see my own flights"   on public.flights for select to authenticated using (player_id = public.my_player());

-- ---------- the save ----------
create table public.player_saves (
  player_id  uuid primary key references public.players(id) on delete cascade,
  save       jsonb not null check (octet_length(save::text) < 300000),
  stamp      bigint not null,                     -- the game's own clock (ms) when the save changed
  updated_at timestamptz not null default now()
);
alter table public.player_saves enable row level security;
revoke all on public.player_saves from anon, authenticated;

-- Keep this save only if it is newer than the stored one. Returns true if it was kept.
create function public.put_save(save jsonb, stamp bigint) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := my_player();
begin
  if me is null or not exists (select 1 from players where id = me) then raise exception 'no pilot yet'; end if;
  insert into player_saves as ps (player_id, save, stamp) values (me, put_save.save, put_save.stamp)
    on conflict (player_id) do update set save = excluded.save, stamp = excluded.stamp, updated_at = now()
    where ps.stamp < excluded.stamp;
  return found;
end $$;

create function public.get_save() returns table (save jsonb, stamp bigint)
language sql stable security definer set search_path = public as $$
  select save, stamp from player_saves where player_id = my_player()
$$;

-- ---------- pilot codes ----------
create table public.pilot_codes (
  player_id uuid primary key references public.players(id) on delete cascade,
  hash      text not null,
  set_at    timestamptz not null default now()
);
create table public.code_attempts (player_id uuid not null references public.players(id) on delete cascade, at timestamptz not null default now());
alter table public.pilot_codes enable row level security;
alter table public.code_attempts enable row level security;
revoke all on public.pilot_codes, public.code_attempts from anon, authenticated;

-- Set (or change) this pilot's code. The game makes it; long enough not to guess.
create function public.set_pilot_code(code text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := my_player();
begin
  if me is null or not exists (select 1 from players where id = me) then raise exception 'no pilot yet'; end if;
  if length(coalesce(code, '')) < 16 then raise exception 'code too short'; end if;
  insert into pilot_codes (player_id, hash) values (me, encode(sha256(convert_to(lower(code), 'UTF8')), 'hex'))
    on conflict (player_id) do update set hash = excluded.hash, set_at = now();
end $$;

create function public.has_pilot_code() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pilot_codes where player_id = my_player())
$$;

-- "I already have a pilot": join this device to the pilot with this name, number and code. Any
-- pilot this device had of its own is merged in (its flights move over). Returns ok + the saved
-- progress, or ok = false and why ('no such pilot' | 'too many tries' | 'wrong code'). Wrong codes
-- are counted: 10 an hour per pilot, then 'too many tries'. (It returns instead of raising: an
-- error would roll back the counted attempt, and guessing would be unlimited. Caught by the tests.)
create function public.pilot_login(first text, word text, tag smallint, code text)
returns table (ok boolean, why text, save jsonb, stamp bigint)
language plpgsql volatile security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  target uuid;
  h text := encode(sha256(convert_to(lower(coalesce(code, '')), 'UTF8')), 'hex');
begin
  if me is null then raise exception 'sign in first'; end if;
  if not exists (select 1 from players p where lower(p.first_name) = lower(first) and p.word = pilot_login.word and p.tag = pilot_login.tag and not p.hidden) then
    return query select false, 'no such pilot', null::jsonb, null::bigint; return;
  end if;
  if (select count(*) from code_attempts a join players p on p.id = a.player_id
      where lower(p.first_name) = lower(first) and p.word = pilot_login.word and p.tag = pilot_login.tag and a.at > now() - interval '1 hour') >= 10 then
    return query select false, 'too many tries', null::jsonb, null::bigint; return;
  end if;
  select p.id into target from players p join pilot_codes c on c.player_id = p.id
    where lower(p.first_name) = lower(first) and p.word = pilot_login.word and p.tag = pilot_login.tag and not p.hidden and c.hash = h;
  if target is null then
    insert into code_attempts (player_id) select p.id from players p where lower(p.first_name) = lower(first) and p.word = pilot_login.word and p.tag = pilot_login.tag;
    return query select false, 'wrong code', null::jsonb, null::bigint; return;
  end if;
  if target <> me then
    if exists (select 1 from players where id = me) then   -- this device had its own pilot: merge it in
      update flights set player_id = target where player_id = me;
      delete from players where id = me;
    end if;
    insert into devices (device, player_id) values (me, target) on conflict (device) do update set player_id = excluded.player_id, linked_at = now();
  end if;
  return query select true, null::text, ps.save, ps.stamp from (select 1) one left join player_saves ps on ps.player_id = target;
end $$;

revoke all on function public.put_save(jsonb, bigint), public.get_save(), public.set_pilot_code(text), public.has_pilot_code(), public.pilot_login(text, text, smallint, text) from public;
grant execute on function public.put_save(jsonb, bigint), public.get_save(), public.set_pilot_code(text), public.has_pilot_code(), public.pilot_login(text, text, smallint, text) to authenticated;

-- ---------- boards: "(you)" follows the pilot ----------
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
      coalesce(sum(plane_co2 * distance_m), 0)                            as co2_made,
      coalesce(max(distance_m) filter (where not landed), 0)              as longest_crash,
      coalesce(avg(distance_m) filter (where not landed), 0)              as avg_crash
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
        when 'longestCrash' then longest_crash
        when 'avgCrash' then round(avg_crash::numeric)
        else round(longest / 10.0 + total / 100.0 + species * 50 + cooler * 5 + dodges * 25
                   + coalesce(greatest(0, 200 * (1 - co2)), 0) + missions * 40)
      end::numeric as score
    from per
  )
  select rank() over (order by s.score desc) as place,
         p.first_name || ' the ' || p.word as name,
         p.tag,
         s.score,
         s.player_id = public.my_player() as is_me
  from scored s join players p on p.id = s.player_id
  where s.score > 0
  order by s.score desc
  limit 50
$$;

grant execute on function public.leaderboard(text, text) to anon, authenticated;
