-- Live baseline (security audit, 2026-11-19). The M8 drafts (feat/m8-db: boards8_schema, boards8_leaderboard,
-- retire_restore_links; season_wipe) were applied to the live project by hand on 2026-11-03 and never became
-- migrations, so a database built from this folder was the OLD game's. This migration brings a repo-built database
-- to the live schema. It is SCHEMA ONLY and IDEMPOTENT: on the live project every statement is a no-op (proved:
-- live dump -> apply this -> dump again = no change). It does NOT archive or wipe anything (the season wipe was a
-- one-off data step; its draft stays on feat/m8-db). Proof against the live dump: research/SECURITY-AUDIT.md.
begin;

alter table public.flights add column if not exists missions_done smallint not null default 0 check (missions_done between 0 and 200);

create table if not exists public.season (
  only_row   boolean primary key default true check (only_row),
  start_at   timestamptz not null default '-infinity',
  min_client text not null default '0.0.0' check (min_client ~ '^[0-9]+(\.[0-9]+)*$')
);
insert into public.season default values on conflict do nothing;
alter table public.season enable row level security;
revoke all on public.season from anon, authenticated;

create or replace function public.client_ok(v text) returns boolean
language sql stable security definer set search_path = public as $$
  select case when v is null or v !~ '^[0-9]+(\.[0-9]+)*$' then (select min_client from season) = '0.0.0'
              else string_to_array(v, '.')::int[] >= string_to_array((select min_client from season), '.')::int[] end
$$;
revoke all on function public.client_ok(text) from public, anon, authenticated;

drop function if exists public.send_flights(jsonb);
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
  if (select count(*) from flights where player_id = me and created_at > now() - interval '1 day') + n > 300 then
    raise exception 'too many flights today';
  end if;
  perform set_config('cp.bulk', 'on', true);
  insert into flights (player_id, landed, distance_m, shade, heat_trapped, night_dodges, crystals, plane_co2, species, mission_done, lap, crash, missions_done)
  select me, (f->>'landed')::boolean, (f->>'distance_m')::integer, coalesce((f->>'shade')::real, 0), coalesce((f->>'heat_trapped')::real, 0),
         coalesce((f->>'night_dodges')::smallint, 0), coalesce((f->>'crystals')::smallint, 0), coalesce((f->>'plane_co2')::real, 1),
         coalesce(array(select jsonb_array_elements_text(f->'species')), '{}'), coalesce((f->>'mission_done')::boolean, false),
         coalesce((f->>'lap')::boolean, false), nullif(f->>'crash', ''),
         least(greatest(coalesce((f->>'missions_done')::int, 0), 0), 200)::smallint
  from jsonb_array_elements(batch) as f;
  perform set_config('cp.bulk', 'off', true);
  return n;
end $$;
grant execute on function public.send_flights(jsonb, text) to authenticated;

drop function if exists public.put_save(jsonb, bigint);
create or replace function public.put_save(save jsonb, stamp bigint, client text default null) returns boolean
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

drop policy if exists "add my own flights" on public.flights;

drop function if exists public.restore_preview(text);
drop function if exists public.restore_claim(text);
drop function if exists public.restore_link_player(text);
drop table if exists public.restore_links;

drop function if exists public.leaderboard(text, text);
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
    where s.score is not null and (board = 'shortest' or s.score > 0)
  )
  select place, name, tag, score, is_me from ranked
  where place <= 50 or is_me
  order by place, name
$$;

grant execute on function public.leaderboard(text, text) to anon, authenticated;

commit;
