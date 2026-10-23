-- Offline play (game 0.10.0, 2026-10-23): flights saved while the wifi was down arrive together in ONE call.
-- The 5-a-minute limit on single inserts stays (it is what slows a script that sends fake flights). The
-- batch has its own limits: at most 100 flights in a call and 300 in a day per pilot, whole batch or nothing.

-- The per-flight limit steps aside only while send_flights is running (it sets cp.bulk for its own
-- transaction; the game cannot set it: PostgREST never lets a request choose a setting).
create or replace function public.flights_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('cp.bulk', true), '') <> 'on'
     and (select count(*) from flights where player_id = new.player_id and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'too many flights too fast';
  end if;
  new.created_at := now();   -- the server's clock, not the device's
  return new;
end $$;

create function public.send_flights(batch jsonb) returns integer
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := my_player(); n integer;
begin
  if me is null or not exists (select 1 from players where id = me) then raise exception 'no pilot yet'; end if;
  if batch is null or jsonb_typeof(batch) <> 'array' then raise exception 'send a list of flights'; end if;
  n := jsonb_array_length(batch);
  if n = 0 then return 0; end if;
  if n > 100 then raise exception 'too many flights in one go'; end if;
  if (select count(*) from flights where player_id = me and created_at > now() - interval '1 day') + n > 300 then
    raise exception 'too many flights today';
  end if;
  perform set_config('cp.bulk', 'on', true);   -- this transaction only
  insert into flights (player_id, landed, distance_m, shade, heat_trapped, night_dodges, crystals, plane_co2, species, mission_done, lap, crash)
  select me, (f->>'landed')::boolean, (f->>'distance_m')::integer, coalesce((f->>'shade')::real, 0), coalesce((f->>'heat_trapped')::real, 0),
         coalesce((f->>'night_dodges')::smallint, 0), coalesce((f->>'crystals')::smallint, 0), coalesce((f->>'plane_co2')::real, 1),
         coalesce(array(select jsonb_array_elements_text(f->'species')), '{}'), coalesce((f->>'mission_done')::boolean, false),
         coalesce((f->>'lap')::boolean, false), nullif(f->>'crash', '')
  from jsonb_array_elements(batch) as f;
  perform set_config('cp.bulk', 'off', true);
  return n;
end $$;
grant execute on function public.send_flights(jsonb) to authenticated;
