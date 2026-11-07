-- SAVE HISTORY (draft; NOT RUN: no Postgres on the machine that wrote it; written 2026-11-05 after the user lost a 260-flight save). A live-database change
-- the USER applies by pasting this whole file into the Supabase SQL editor. Kept OUT of migrations/ on purpose (a stray `supabase db push` would apply that folder).
-- Apply AFTER the M8 steps (20261028000000_boards8_schema.sql: it made put_save(save, stamp, client) and client_ok()). Undo: 20261105000001_save_history_undo.sql.
--
-- What it does, in ONE transaction:
--   1. save_progress(save jsonb): the same score the game uses (src/save.js progressOf): landings + flights/10 + 3 x missions + 2 x upgrade levels + trees/2 + planes beyond the first.
--   2. player_save_history: up to 3 OLDER saves per pilot, with a reason: 'overwritten' (a periodic snapshot: nothing newer than 6 hours is kept),
--      'replaced by lower progress' (a save that is >5% poorer replaced a richer one: the case that lost the user's save), 'client reset' (reserved: a later
--      game version will say so; this version never writes it). The 3 kept are the 3 RICHEST (then newest): a poorer save never pushes a richer one out.
--   3. put_save(save, stamp, client) is replaced by a version that keeps the old row in the history BEFORE it overwrites it. It still accepts the new save
--      (the player's own newer play must not be refused: the history is the net). Signature and behaviour for the game are unchanged.
--   4. get_save_history(): the pilot's own kept saves (newest first), for a later "go back" button in the game or a manual restore.
-- Nothing in the game needs this to run: the 0.31.0 client works with or without it. It is the SERVER half of the net.
begin;

create function public.save_progress(s jsonb) returns numeric
language sql immutable as $$
  select coalesce((s->>'landings')::numeric, 0)
       + coalesce((s->>'flights')::numeric, 0) / 10
       + greatest(coalesce((s->>'mission')::numeric, 0),
                  coalesce(jsonb_array_length(case when jsonb_typeof(s->'missionsDone') = 'array' then s->'missionsDone' end), 0)) * 3
       + coalesce((select sum(v::numeric) from jsonb_each_text(case when jsonb_typeof(s->'levels') = 'object' then s->'levels' end) t(k, v) where v ~ '^[0-9]+(\.[0-9]+)?$'), 0) * 2
       + coalesce((select sum(v::numeric) from jsonb_each_text(case when jsonb_typeof(s->'planted') = 'object' then s->'planted' end) t(k, v) where v ~ '^[0-9]+(\.[0-9]+)?$'), 0) / 2
       + greatest(coalesce((select count(*) from jsonb_object_keys(case when jsonb_typeof(s#>'{fleet,planes}') = 'object' then s#>'{fleet,planes}' end)), 0) - 1, 0)
$$;
revoke all on function public.save_progress(jsonb) from public;

create table public.player_save_history (
  id        bigserial primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  save      jsonb not null check (octet_length(save::text) < 300000),
  stamp     bigint not null,
  progress  numeric not null,
  reason    text not null check (reason in ('overwritten', 'replaced by lower progress', 'client reset')),
  kept_at   timestamptz not null default now()
);
create index player_save_history_pilot on public.player_save_history (player_id, progress desc, kept_at desc);
alter table public.player_save_history enable row level security;
revoke all on public.player_save_history from anon, authenticated;

drop function public.put_save(jsonb, bigint, text);
create function public.put_save(save jsonb, stamp bigint, client text default null) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare
  me uuid := my_player();
  old record;
  np numeric := save_progress(put_save.save);
  op numeric;
  why text;
begin
  if not client_ok(client) then raise exception 'update required' using errcode = 'CP001'; end if;
  if me is null or not exists (select 1 from players where id = me) then raise exception 'no pilot yet'; end if;
  -- the row that is about to be replaced (only if the new save is newer: otherwise nothing is replaced)
  select ps.save as s, ps.stamp as st into old from player_saves ps where ps.player_id = me for update;
  if found and old.st < put_save.stamp then
    op := save_progress(old.s);
    why := case when op >= 1 and np < op * 0.95 then 'replaced by lower progress'
                when op >= 1 and not exists (select 1 from player_save_history h where h.player_id = me and h.kept_at > now() - interval '6 hours') then 'overwritten'
           end;
    if why is not null then
      insert into player_save_history (player_id, save, stamp, progress, reason) values (me, old.s, old.st, op, why);
      -- keep the 3 richest (then newest): a poorer save never pushes a richer one out
      delete from player_save_history h where h.player_id = me and h.id not in
        (select id from player_save_history where player_id = me order by progress desc, kept_at desc, id desc limit 3);
    end if;
  end if;
  insert into player_saves as ps (player_id, save, stamp) values (me, put_save.save, put_save.stamp)
    on conflict (player_id) do update set save = excluded.save, stamp = excluded.stamp, updated_at = now()
    where ps.stamp < excluded.stamp;
  return found;
end $$;
revoke all on function public.put_save(jsonb, bigint, text) from public;
grant execute on function public.put_save(jsonb, bigint, text) to authenticated;

create function public.get_save_history() returns table (save jsonb, stamp bigint, progress numeric, reason text, kept_at timestamptz)
language sql stable security definer set search_path = public as $$
  select h.save, h.stamp, h.progress, h.reason, h.kept_at from player_save_history h where h.player_id = my_player() order by h.kept_at desc
$$;
revoke all on function public.get_save_history() from public;
grant execute on function public.get_save_history() to authenticated;

commit;
-- VERIFY after applying (read-only):
--   select to_regclass('public.player_save_history'), (select count(*) from player_save_history);               -> player_save_history | 0
--   select public.save_progress('{"landings":10,"flights":20,"missionsDone":["a","b"],"levels":{"x":1,"y":2},"planted":{"o":4},"fleet":{"planes":{"a":{},"b":{}}}}'::jsonb);   -> 27
