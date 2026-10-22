-- Personal restore links (2026-10-22, the user: "personal links would be cool... then we don't have
-- to worry about passwords"). Replaces the shared password (20261022090000_claim_pilot.sql): each
-- old pilot gets its OWN long random code, sent by the user as a link (?restore=<code>). Only the
-- code's SHA-256 is stored, in restore_links (no grants), inserted by hand via the CLI, never in
-- this repo. A code shows whose pilot it is, then claims it for the device that opened it (flights
-- and name move there); each code works once. No list of pilots, no shared password.

drop function public.claimable_pilots(text);
drop function public.claim_pilot(text, uuid);
drop function public.restore_password_ok(text);
drop table public.restore_secret;

create table public.restore_links (
  hash      text primary key,                                          -- sha256 of the code in the link
  player_id uuid not null references public.players(id) on delete cascade,
  used_at   timestamptz
);
alter table public.restore_links enable row level security;
revoke all on public.restore_links from anon, authenticated;

create function public.restore_link_player(code text) returns uuid
language sql stable security definer set search_path = public as $$
  select l.player_id from restore_links l join players p on p.id = l.player_id
  where l.hash = encode(sha256(convert_to(coalesce(code, ''), 'UTF8')), 'hex') and l.used_at is null and p.claimed_at is null and not p.hidden
$$;
revoke all on function public.restore_link_player(text) from public, anon, authenticated;

-- Whose pilot is this link for? (So the game can ask "Restore Olly the Swift?" before claiming.)
create function public.restore_preview(code text)
returns table (name text, tag smallint, flights bigint, best integer)
language sql stable security definer set search_path = public as $$
  select p.first_name || ' the ' || p.word, p.tag, count(f.id), coalesce(max(f.distance_m) filter (where f.landed), 0)
  from players p left join flights f on f.player_id = p.id
  where p.id = restore_link_player(code)
  group by p.id
$$;

-- Claim the link's pilot for this device: its flights move to the caller, the caller takes its
-- name, the old row is deleted and the link used up. Returns every flight now on the caller, oldest
-- first, for the game to rebuild a save from.
create function public.restore_claim(code text)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  old uuid := restore_link_player(code);
  o players%rowtype;
begin
  if me is null then raise exception 'sign in first'; end if;
  if old is null then raise exception 'this link has already been used'; end if;
  if old = me then raise exception 'that is already you'; end if;
  select * into o from players where id = old for update;
  update restore_links set used_at = now() where player_id = old;
  insert into players (id, first_name, word, tag) values (me, o.first_name, o.word, o.tag)
    on conflict (id) do update set first_name = excluded.first_name, word = excluded.word, tag = excluded.tag;
  update flights set player_id = me where player_id = old;
  delete from players where id = old;
  update players set claimed_at = now() where id = me;
  return (select coalesce(jsonb_agg(jsonb_build_object('landed', landed, 'distance_m', distance_m, 'crystals', crystals,
      'species', species, 'mission_done', mission_done, 'lap', lap, 'created_at', created_at) order by created_at), '[]'::jsonb)
    from flights where player_id = me);
end $$;

revoke all on function public.restore_preview(text) from public;
revoke all on function public.restore_claim(text) from public;
grant execute on function public.restore_preview(text) to authenticated;
grant execute on function public.restore_claim(text) to authenticated;
