-- Flight sanity limits (security plan A, 2026-11-19). send_flights accepted any numbers inside the columns' wide
-- checks (500,000 km, shade 10,000, 200 missions, 50 species), so a few lines in a browser console topped every board.
-- Now each flight is checked against limits the real game cannot reach; a flight over a limit is NOT inserted into
-- flights (so it never reaches a board) but is kept in flights_rejected with the reason, for moderation. The batch
-- still succeeds, so an honest client never stalls on one odd flight.
--
-- The limits live in one row (flight_limits) so they can be retuned in the dashboard without a migration.
-- Where the numbers come from (measured 2026-11-19):
--   max_distance 150,000: the sim engine's strongest plane (hydrogen, every upgrade, careful pilot, no crashes) reached
--     41,934 to 63,370 km before overheating; live record 21,127. About 2.4x the sim's best.
--   per-km ratios, over all 377 live flights (each flight's distance floored at 500 km): shade 0.011 /km,
--     heat_trapped 0.0042, crystals 0.0036, night_dodges 0.0013. Limits are about 5x to 8x those, plus a small allowance.
--   missions_done: live max 9. species: live max 4 per flight.
-- These limits stop impossible numbers. They do NOT stop a forger who sends believable flights; that needs the
-- flight replay check (research/SECURITY-AUDIT.md, plan for real-value coins).
begin;

create table if not exists public.flight_limits (
  only_row            boolean primary key default true check (only_row),
  max_distance        integer not null default 150000,
  shade_per_km        real    not null default 0.05,
  heat_per_km         real    not null default 0.05,
  crystals_per_km     real    not null default 0.02,
  crystals_allowance  integer not null default 10,
  dodges_per_km       real    not null default 0.01,
  dodges_allowance    integer not null default 5,
  max_missions        integer not null default 20,
  max_species         integer not null default 12,
  max_co2             real    not null default 1.5
);
insert into public.flight_limits default values on conflict do nothing;
alter table public.flight_limits enable row level security;
revoke all on public.flight_limits from anon, authenticated;

create table if not exists public.flights_rejected (
  id         bigint generated always as identity primary key,
  player_id  uuid not null references public.players(id) on delete cascade,
  flight     jsonb not null,
  why        text not null,
  created_at timestamptz not null default now()
);
create index if not exists flights_rejected_player on public.flights_rejected (player_id, created_at);
alter table public.flights_rejected enable row level security;
revoke all on public.flights_rejected from anon, authenticated;

-- Why one flight (as sent) is impossible, or null when it is fine. Malformed values (not a number) count as impossible.
create or replace function public.flight_problem(f jsonb) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  L flight_limits%rowtype;
  d numeric; km numeric; sp jsonb;
begin
  select * into L from flight_limits;
  begin
    d  := (f->>'distance_m')::numeric;
    if d is null or d < 0 then return 'distance missing'; end if;
    if d > L.max_distance then return 'distance'; end if;
    km := greatest(d, 500);
    if coalesce((f->>'shade')::numeric, 0)        > L.shade_per_km * km then return 'shade'; end if;
    if coalesce((f->>'heat_trapped')::numeric, 0) > L.heat_per_km * km  then return 'heat_trapped'; end if;
    if coalesce((f->>'crystals')::numeric, 0)     > L.crystals_per_km * km + L.crystals_allowance then return 'crystals'; end if;
    if coalesce((f->>'night_dodges')::numeric, 0) > L.dodges_per_km * km + L.dodges_allowance then return 'night_dodges'; end if;
    if coalesce((f->>'missions_done')::numeric, 0) > L.max_missions then return 'missions_done'; end if;
    if coalesce((f->>'plane_co2')::numeric, 1)    > L.max_co2 then return 'plane_co2'; end if;
  exception when others then return 'malformed';
  end;
  sp := f->'species';
  if sp is not null and jsonb_typeof(sp) <> 'null' then
    if jsonb_typeof(sp) <> 'array' then return 'malformed'; end if;
    if jsonb_array_length(sp) > L.max_species then return 'species'; end if;
    if exists (select 1 from jsonb_array_elements(sp) e where jsonb_typeof(e) <> 'string' or e #>> '{}' !~ '^[a-z0-9_-]{1,24}(:[a-z0-9_-]{1,24})?$') then return 'species'; end if;
  end if;
  return null;
end $$;
revoke all on function public.flight_problem(jsonb) from public, anon, authenticated;

create or replace function public.send_flights(batch jsonb, client text default null) returns integer
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := my_player(); n integer;
begin
  if not client_ok(client) then raise exception 'update required' using errcode = 'CP001'; end if;
  if me is null or not exists (select 1 from players where id = me) then raise exception 'no pilot yet'; end if;
  if batch is null or jsonb_typeof(batch) <> 'array' then raise exception 'send a list of flights'; end if;
  n := jsonb_array_length(batch);
  if n = 0 then return 0; end if;
  if n > 100 then raise exception 'too many flights in one go'; end if;
  if (select count(*) from flights where player_id = me and created_at > now() - interval '1 day')
     + (select count(*) from flights_rejected where player_id = me and created_at > now() - interval '1 day') + n > 300 then   -- rejected ones count too
    raise exception 'too many flights today';
  end if;
  insert into flights_rejected (player_id, flight, why)
  select me, f, flight_problem(f) from jsonb_array_elements(batch) as f where flight_problem(f) is not null;
  perform set_config('cp.bulk', 'on', true);
  insert into flights (player_id, landed, distance_m, shade, heat_trapped, night_dodges, crystals, plane_co2, species, mission_done, lap, crash, missions_done)
  select me, (f->>'landed')::boolean, (f->>'distance_m')::integer, coalesce((f->>'shade')::real, 0), coalesce((f->>'heat_trapped')::real, 0),
         coalesce((f->>'night_dodges')::smallint, 0), coalesce((f->>'crystals')::smallint, 0), coalesce((f->>'plane_co2')::real, 1),
         coalesce(array(select jsonb_array_elements_text(f->'species')), '{}'), coalesce((f->>'mission_done')::boolean, false),
         coalesce((f->>'lap')::boolean, false), nullif(f->>'crash', ''),
         least(greatest(coalesce((f->>'missions_done')::int, 0), 0), 200)::smallint
  from jsonb_array_elements(batch) as f
  where flight_problem(f) is null;
  perform set_config('cp.bulk', 'off', true);
  return n;
end $$;

commit;
