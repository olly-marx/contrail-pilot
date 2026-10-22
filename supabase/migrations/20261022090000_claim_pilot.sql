-- Restore lost progress (2026-10-22, the user's request). A phone's browser wiped all of the game's
-- storage (save, pilot name and anonymous login together), so that device became a stranger to
-- its own pilot. A temporary RESTORE button lets a friend pick their old pilot and take it over
-- (its flights and name); the game then rebuilds a save from the flight history.
-- Guarded by ONE shared password the user gives to friends: only its SHA-256 hash is stored, in a
-- table no game role can read, and the hash is set by hand in the database (never in this repo).
-- Each pilot can be claimed ONCE. The button is removed once everyone is restored.

alter table public.players add column claimed_at timestamptz;   -- set when a device claims this pilot

create table public.restore_secret (hash text not null);          -- one row, set by hand; no grants
alter table public.restore_secret enable row level security;
revoke all on public.restore_secret from anon, authenticated;

create function public.restore_password_ok(pw text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from restore_secret where hash = encode(sha256(convert_to(coalesce(pw, ''), 'UTF8')), 'hex'))
$$;
revoke all on function public.restore_password_ok(text) from public, anon, authenticated;

-- Old pilots that can still be claimed (password needed even to list them): not hidden, never
-- claimed, with flights, not the caller's own. Name, number, flights and best landed flight.
create function public.claimable_pilots(pw text)
returns table (id uuid, name text, tag smallint, flights bigint, best integer, last_flight timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not restore_password_ok(pw) then raise exception 'wrong password'; end if;
  return query
    select p.id, p.first_name || ' the ' || p.word, p.tag, count(f.id),
           coalesce(max(f.distance_m) filter (where f.landed), 0), max(f.created_at)
    from players p join flights f on f.player_id = p.id
    where not p.hidden and p.claimed_at is null and p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000')
    group by p.id
    order by max(f.created_at) desc;
end $$;

-- Claim an old pilot for this device: its flights move to the caller, the caller takes its name,
-- and the old row is deleted so nobody can claim it again. Returns every flight now on the caller,
-- oldest first, for the game to rebuild a save from.
create function public.claim_pilot(pw text, old uuid)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  o players%rowtype;
begin
  if not restore_password_ok(pw) then raise exception 'wrong password'; end if;
  if me is null then raise exception 'sign in first'; end if;
  if old = me then raise exception 'that is already you'; end if;
  select * into o from players where id = old and claimed_at is null and not hidden for update;
  if not found then raise exception 'that pilot has already been claimed'; end if;
  insert into players (id, first_name, word, tag) values (me, o.first_name, o.word, o.tag)
    on conflict (id) do update set first_name = excluded.first_name, word = excluded.word, tag = excluded.tag;
  update flights set player_id = me where player_id = old;
  delete from players where id = old;
  update players set claimed_at = now() where id = me;
  return (select coalesce(jsonb_agg(jsonb_build_object('landed', landed, 'distance_m', distance_m, 'crystals', crystals,
      'species', species, 'mission_done', mission_done, 'lap', lap, 'created_at', created_at) order by created_at), '[]'::jsonb)
    from flights where player_id = me);
end $$;

revoke all on function public.claimable_pilots(text) from public;
revoke all on function public.claim_pilot(text, uuid) from public;
grant execute on function public.claimable_pilots(text) to authenticated;
grant execute on function public.claim_pilot(text, uuid) to authenticated;
