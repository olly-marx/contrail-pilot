-- Undo of 20261028000000_boards8_schema.sql: back to the 7 live migrations' versions. Run AFTER 20261028010000_boards8_leaderboard_undo.sql.
-- This LOSES the missions_done values of flights sent since the schema was applied (nothing else).
begin;
drop function public.send_flights(jsonb, text);
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

drop function public.put_save(jsonb, bigint, text);
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
revoke all on function public.put_save(jsonb, bigint) from public;
grant execute on function public.put_save(jsonb, bigint) to authenticated;

create policy "add my own flights" on public.flights for insert to authenticated with check (player_id = public.my_player());
drop function public.client_ok(text);
drop table public.season;
alter table public.flights drop column missions_done;
commit;
