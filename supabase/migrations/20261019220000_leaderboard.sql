-- Contrail Pilot: players, flights and leaderboards.
--
-- Who can do what (row-level security):
--   * Every device signs in anonymously, so auth.uid() is a real, unforgeable player id.
--   * A player can create and rename ONLY their own row, and add flights ONLY for themselves.
--   * Flights can never be edited or deleted from the game.
--   * Nobody reads the tables directly. Boards come from leaderboard(), which hides
--     players with hidden = true (set by hand in the dashboard).
--   * The publishable key ships in the site; the service key never does.

-- ---------- names ----------
-- A name is "<first name> the <builder word> <number>", e.g. "Ollie the Puffin 27".
-- First name: letters only, 2-12, checked against a word filter. The builder word must come
-- from this list (the game shows the same list).
create table public.name_words (word text primary key);
insert into public.name_words (word) values
  ('Puffin'), ('Swift'), ('Falcon'), ('Otter'), ('Badger'), ('Hedgehog'), ('Kestrel'), ('Beaver'),
  ('Owl'), ('Fox'), ('Robin'), ('Heron'), ('Bumblebee'), ('Dragonfly'), ('Squirrel'), ('Hare'),
  ('Comet'), ('Rocket'), ('Cloud'), ('Rainbow'), ('Pilot'), ('Navigator'), ('Explorer'), ('Gardener');

-- Rude words, slurs and so on, matched inside the first name (lowercase, and again with repeated
-- letters squashed, so "Buuummm" still hits "bum"). A few short words hide inside real names
-- (Cassandra, Massimo), so those only count at the START or END of a name. Not readable by the game.
create table public.blocked_words (word text primary key, edges_only boolean not null default false);
insert into public.blocked_words (word) values
  ('arse'), ('ass'), ('bitch'), ('bollock'), ('boob'), ('bum'), ('butt'), ('cock'), ('crap'),
  ('cunt'), ('damn'), ('dick'), ('dildo'), ('fag'), ('fanny'), ('fuck'), ('fuk'), ('fuq'),
  ('hitler'), ('homo'), ('jizz'), ('knob'), ('nazi'), ('nigg'), ('nigr'), ('nonce'), ('paki'),
  ('penis'), ('piss'), ('poo'), ('porn'), ('prick'), ('pussy'), ('rape'), ('retard'), ('sex'),
  ('shag'), ('shit'), ('slag'), ('slut'), ('spastic'), ('tit'), ('twat'), ('vagina'), ('wank'),
  ('whore'), ('willy');
update public.blocked_words set edges_only = true
  where word in ('ass', 'poo', 'sex', 'tit', 'bum', 'butt', 'crap', 'damn', 'homo', 'rape', 'cock', 'boob');
-- Real names that start or end with a blocked word. Checked first: an exact match skips the filter.
create table public.allowed_names (name text primary key);
insert into public.allowed_names (name) values
  ('titus'), ('titan'), ('tito'), ('dickon'), ('cassidy'), ('cassie'), ('cass'), ('jasper'),
  ('bassam'), ('hassan'), ('assia'), ('lassie'), ('butters'), ('poorna'), ('dickens'),
  ('pooja'), ('poonam'), ('assan'), ('assad'), ('assim'), ('sexton'), ('titania'), ('bumi');

create function public.normalise_name(n text) returns text
language sql immutable as $$
  select regexp_replace(lower(n), '(.)\1+', '\1', 'g')
$$;

create function public.name_ok(first text) returns boolean
language sql stable security definer set search_path = public as $$
  select first ~ '^[A-Za-z]{2,12}$'
     and (exists (select 1 from allowed_names where name = lower(first))
          or not exists (select 1 from blocked_words b, (values (lower(first)), (normalise_name(first))) v(n)
                         where case when b.edges_only then v.n like b.word || '%' or v.n like '%' || b.word
                                    else position(b.word in v.n) > 0 end))
$$;

-- ---------- players ----------
create table public.players (
  id         uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  first_name text not null check (public.name_ok(first_name)),
  word       text not null references public.name_words(word),
  tag        smallint not null check (tag between 10 and 99),
  hidden     boolean not null default false,   -- set true in the dashboard to take a name off the boards
  created_at timestamptz not null default now()
);

-- ---------- flights ----------
-- One row per finished flight (school flights are not sent). Plain numbers from the game's
-- result screen; the boards do all the adding up, so nothing is stored twice.
create table public.flights (
  id           bigint generated always as identity primary key,
  player_id    uuid not null default auth.uid() references public.players(id) on delete cascade,
  landed       boolean not null,
  distance_m   integer not null check (distance_m between 0 and 500000),
  shade        real not null default 0 check (shade between 0 and 10000),        -- daytime contrail shade (size of sunBlocked)
  heat_trapped real not null default 0 check (heat_trapped between 0 and 10000), -- heat trapped by night contrails
  night_dodges smallint not null default 0 check (night_dodges between 0 and 500), -- icy air avoided at night
  crystals     smallint not null default 0 check (crystals between 0 and 5000),
  plane_co2    real not null default 1 check (plane_co2 between 0 and 3),         -- the plane's cruising CO2: normal plane 1, hydrogen 0
  species      text[] not null default '{}' check (cardinality(species) <= 50),   -- tree species planted
  mission_done boolean not null default false,
  created_at   timestamptz not null default now()
);
create index flights_player_time on public.flights (player_id, created_at);
create index flights_time on public.flights (created_at);

-- No more than one flight every 10 seconds per player (a real flight takes far longer).
create function public.flights_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from flights where player_id = new.player_id and created_at > now() - interval '10 seconds') then
    raise exception 'too many flights too fast';
  end if;
  new.created_at := now();   -- the server's clock, not the device's
  return new;
end $$;
create trigger flights_rate_limit before insert on public.flights
  for each row execute function public.flights_rate_limit();

-- ---------- row-level security ----------
alter table public.players       enable row level security;
alter table public.flights       enable row level security;
alter table public.name_words    enable row level security;
alter table public.blocked_words enable row level security;
alter table public.allowed_names enable row level security;

create policy "make my own player"   on public.players for insert to authenticated with check (id = auth.uid() and hidden = false);
create policy "see my own player"    on public.players for select to authenticated using (id = auth.uid());
create policy "rename my own player" on public.players for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and hidden = false);
create policy "add my own flights"   on public.flights for insert to authenticated with check (player_id = auth.uid());
create policy "see my own flights"   on public.flights for select to authenticated using (player_id = auth.uid());
create policy "anyone reads words"   on public.name_words for select using (true);
-- blocked_words / allowed_names: no policies = nobody reads them from the game.

-- A player can't un-hide themselves by renaming: `hidden` is excluded from what the game may write.
revoke update on public.players from anon, authenticated;
grant  update (first_name, word, tag) on public.players to authenticated;

-- ---------- boards ----------
-- leaderboard(board, period): top 50 for one board over 'today' | 'week' | 'month' | 'all'.
-- Every board counts LANDED flights only (a crash scores nothing), except missions, which
-- only move on after a landing anyway.
--
-- Ultimate Flyer = the sum of these parts (shown to players behind the i button):
--   longest landed flight   1 point per 10 m
--   total landed distance   1 point per 100 m
--   tree species planted    50 points each different species
--   cooler contrails        5 points per unit of (day shade - night heat trapped, never below 0)
--                           + 25 per night dodge
--   cleaner flying          up to 200: 200 x (1 - your plane's average cruising CO2), where the
--                           normal plane is 1 and hydrogen is 0
-- Weights set from autopilot flights (2026-10-20): flying straight makes ~2-4 shade per km, so
-- 20/unit let shade swamp distance; CO2 per km falls with distance (take-off is spread out),
-- so the plane's cruising CO2 is compared instead.
--   missions done           40 each
create function public.leaderboard(board text, period text default 'all')
returns table (place bigint, name text, score numeric, is_me boolean)
language sql stable security definer set search_path = public as $$
  with since as (
    select case period
      when 'today' then date_trunc('day',   now() at time zone 'Europe/London') at time zone 'Europe/London'
      when 'week'  then date_trunc('week',  now() at time zone 'Europe/London') at time zone 'Europe/London'
      when 'month' then date_trunc('month', now() at time zone 'Europe/London') at time zone 'Europe/London'
      else '-infinity'::timestamptz end as t
  ),
  f as (
    select fl.* from flights fl join players p on p.id = fl.player_id, since
    where not p.hidden and fl.created_at >= since.t
  ),
  per as (
    select player_id,
      coalesce(max(distance_m) filter (where landed), 0)                  as longest,
      coalesce(sum(distance_m) filter (where landed), 0)                  as total,
      (select count(distinct s) from f f2, unnest(f2.species) s
        where f2.player_id = f.player_id and f2.landed)                   as species,
      greatest(0, coalesce(sum(shade - heat_trapped) filter (where landed), 0)) as cooler,
      coalesce(sum(night_dodges) filter (where landed), 0)                as dodges,
      avg(plane_co2) filter (where landed)                                as co2,
      count(*) filter (where mission_done)                                as missions
    from f group by player_id
  ),
  scored as (
    select player_id,
      case board
        when 'longest'  then longest
        when 'total'    then total
        when 'nature'   then species
        when 'cooler'   then round((cooler + 5 * dodges)::numeric, 1)
        when 'cleaner'  then round(greatest(0, 200 * (1 - co2))::numeric)
        when 'missions' then missions
        else round(longest / 10.0 + total / 100.0 + species * 50 + cooler * 5 + dodges * 25
                   + coalesce(greatest(0, 200 * (1 - co2)), 0) + missions * 40)
      end::numeric as score
    from per
  )
  select rank() over (order by s.score desc) as place,
         p.first_name || ' the ' || p.word || ' ' || p.tag as name,
         s.score,
         s.player_id = auth.uid() as is_me
  from scored s join players p on p.id = s.player_id
  where s.score > 0
  order by s.score desc
  limit 50
$$;

grant execute on function public.leaderboard(text, text) to anon, authenticated;
grant execute on function public.name_ok(text) to anon, authenticated;
