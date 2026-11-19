-- Unique pilot names and a fairer login lock-out (security plan A, 2026-11-19).
-- 1. Two pilots could share "Sam the Owl 42", so a copy looked identical on the boards. Now (lower(first_name), word, tag)
--    is unique; the game re-rolls the tag when a name is taken (src/online.js savePilot). Live had no duplicates (checked
--    2026-11-19), so the index builds.
-- 2. pilot_login counted wrong codes per TARGET pilot (10 an hour): names and tags are public on the boards, so anyone
--    could lock a real pilot out of logging in on a new device. Now wrong codes are counted per CALLER (10 an hour per
--    device), and per target only as a brute-force backstop (100 a day: with 24^4 x 90 = 30 million codes, about
--    800 years to try them all). Old codes keep working: the hash is unchanged.
begin;

create unique index if not exists players_name_unique on public.players (lower(first_name), word, tag);

alter table public.code_attempts add column if not exists caller uuid;
create index if not exists code_attempts_caller on public.code_attempts (caller, at);
create index if not exists code_attempts_target on public.code_attempts (player_id, at);

create or replace function public.pilot_login(first text, word text, tag smallint, code text)
returns table (ok boolean, why text, save jsonb, stamp bigint)
language plpgsql volatile security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  named uuid;
  target uuid;
  h text := encode(sha256(convert_to(lower(coalesce(code, '')), 'UTF8')), 'hex');
begin
  if me is null then raise exception 'sign in first'; end if;
  -- This device: at most 10 wrong codes an hour, whoever it tries.
  if (select count(*) from code_attempts a where a.caller = me and a.at > now() - interval '1 hour') >= 10 then
    return query select false, 'too many tries', null::jsonb, null::bigint; return;
  end if;
  select p.id into named from players p
    where lower(p.first_name) = lower(pilot_login.first) and p.word = pilot_login.word and p.tag = pilot_login.tag and not p.hidden;
  if named is null then
    return query select false, 'no such pilot', null::jsonb, null::bigint; return;
  end if;
  -- The pilot: at most 100 wrong codes a day from all devices together (a brute-force backstop, not a lock-out).
  if (select count(*) from code_attempts a where a.player_id = named and a.at > now() - interval '1 day') >= 100 then
    return query select false, 'too many tries', null::jsonb, null::bigint; return;
  end if;
  select c.player_id into target from pilot_codes c where c.player_id = named and c.hash = h;
  if target is null then
    insert into code_attempts (player_id, caller) values (named, me);
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
revoke all on function public.pilot_login(text, text, smallint, text) from public, anon;
grant execute on function public.pilot_login(text, text, smallint, text) to authenticated;

-- Advisor items (Supabase security advisor, 2026-11-19): a fixed search_path for normalise_name; the trigger function
-- is not an API call; the save and code functions need a signed-in device (the game always signs in anonymously first).
alter function public.normalise_name(text) set search_path = public;
revoke all on function public.flights_rate_limit() from public, anon, authenticated;
revoke all on function public.get_save(), public.has_pilot_code(), public.set_pilot_code(text), public.put_save(jsonb, bigint, text), public.send_flights(jsonb, text) from anon;

commit;
