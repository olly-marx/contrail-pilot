-- M8 step 1, SCHEMA (draft; research/M8-ONLINE.md). A live-database change the user confirms first. Kept OUT of migrations/ on purpose.
-- Adds: flights.missions_done (missions finished in a flight; the MISSIONS board), the season table (start_at, min_client), client_ok(),
-- send_flights(batch, client) and put_save(save, stamp, client) that refuse an old game with SQLSTATE 'CP001' / 'update required', and drops the
-- direct insert policy on flights (everything goes through send_flights). Applying it early is harmless: min_client starts at 0.0.0, start_at at -infinity.
-- Undo: 20261028000000_boards8_schema_undo.sql (run AFTER 20261028010000_boards8_leaderboard_undo.sql).
begin;

alter table public.flights add column missions_done smallint not null default 0 check (missions_done between 0 and 200);

create table public.season (
  only_row   boolean primary key default true check (only_row),
  start_at   timestamptz not null default '-infinity',
  min_client text not null default '0.0.0' check (min_client ~ '^[0-9]+(\.[0-9]+)*$')
);
insert into public.season default values;
alter table public.season enable row level security;
revoke all on public.season from anon, authenticated;   -- no policies: the game can neither read nor change it

-- true if version v ('0.11.9') is at least the minimum; NUMERIC per part ('0.11.10' is above '0.11.9'); a missing or malformed version is below any minimum above 0.0.0
create function public.client_ok(v text) returns boolean
language sql stable security definer set search_path = public as $$
  select case when v is null or v !~ '^[0-9]+(\.[0-9]+)*$' then (select min_client from season) = '0.0.0'
              else string_to_array(v, '.')::int[] >= string_to_array((select min_client from season), '.')::int[] end
$$;
revoke all on function public.client_ok(text) from public, anon, authenticated;

drop function public.send_flights(jsonb);
create function public.send_flights(batch jsonb, client text default null) returns integer
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := my_player(); n integer;
begin
  if not client_ok(client) then raise exception 'update required' using errcode = 'CP001'; end if;
  if me is null or not exists (select 1 from players where id = me) then raise exception 'no pilot yet'; end if;
  if batch is null or jsonb_typeof(batch) <> 'array' then raise exception 'send a list of flights'; end if;
  n := jsonb_array_length(batch);
  if n = 0 then return 0; end if;
  if n > 100 then raise exception 'too many flights in one go'; end if;
  if (select count(*) from flights where player_id = me and created_at > now() - interval '1 day') + n > 300 then
    raise exception 'too many flights today';
  end if;
  perform set_config('cp.bulk', 'on', true);   -- this transaction only
  insert into flights (player_id, landed, distance_m, shade, heat_trapped, night_dodges, crystals, plane_co2, species, mission_done, lap, crash, missions_done)
  select me, (f->>'landed')::boolean, (f->>'distance_m')::integer, coalesce((f->>'shade')::real, 0), coalesce((f->>'heat_trapped')::real, 0),
         coalesce((f->>'night_dodges')::smallint, 0), coalesce((f->>'crystals')::smallint, 0), coalesce((f->>'plane_co2')::real, 1),
         coalesce(array(select jsonb_array_elements_text(f->'species')), '{}'), coalesce((f->>'mission_done')::boolean, false),
         coalesce((f->>'lap')::boolean, false), nullif(f->>'crash', ''),
         least(greatest(coalesce((f->>'missions_done')::int, 0), 0), 200)::smallint   -- clamped: a silly number must not reject the whole batch
  from jsonb_array_elements(batch) as f;
  perform set_config('cp.bulk', 'off', true);
  return n;
end $$;
grant execute on function public.send_flights(jsonb, text) to authenticated;

drop function public.put_save(jsonb, bigint);
create function public.put_save(save jsonb, stamp bigint, client text default null) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := my_player();
begin
  if not client_ok(client) then raise exception 'update required' using errcode = 'CP001'; end if;
  if me is null or not exists (select 1 from players where id = me) then raise exception 'no pilot yet'; end if;
  insert into player_saves as ps (player_id, save, stamp) values (me, put_save.save, put_save.stamp)
    on conflict (player_id) do update set save = excluded.save, stamp = excluded.stamp, updated_at = now()
    where ps.stamp < excluded.stamp;
  return found;
end $$;
revoke all on function public.put_save(jsonb, bigint, text) from public;
grant execute on function public.put_save(jsonb, bigint, text) to authenticated;

drop policy "add my own flights" on public.flights;

commit;
