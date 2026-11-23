-- 0.73.0 economy (balance-waterways, 2026-11-23): crystals now come per 1,000 km landed (CRYSTALS.perKm 1) and per dodge at 2 x the Sensors multiplier (up to x6 = 12 a dodge),
-- and a clean night pays 6. The 2026-11-19 limits (0.02 a km + 10) were sized on 1-3 a dodge and would reject honest late-game flights, e.g. a 1,000 km flight with 4 dodges at
-- Sensors 12 (48 crystals, limit 30). New limits: 0.15 a km + 80 (1,000 km: 230; 10,000 km: 1,580; a measured late flight earns ~35 at 12,000 km).
-- NOT APPLIED until Oliver's go: a live database change (supabase/tests/flight_limits.sql must pass first).
begin;
update public.flight_limits set crystals_per_km = 0.15, crystals_allowance = 80 where only_row;
alter table public.flight_limits alter column crystals_per_km set default 0.15, alter column crystals_allowance set default 80;
commit;
