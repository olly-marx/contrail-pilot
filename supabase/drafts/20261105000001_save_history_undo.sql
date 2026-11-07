-- UNDO of 20261105000000_save_history.sql (draft; NOT RUN): puts put_save(save, stamp, client) back as the M8 version and drops the history.
-- WARNING: the history table is DROPPED with its rows. Copy them out first if you want them: select * from player_save_history;
begin;
drop function public.get_save_history();
drop function public.put_save(jsonb, bigint, text);
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
drop table public.player_save_history;
drop function public.save_progress(jsonb);
commit;
