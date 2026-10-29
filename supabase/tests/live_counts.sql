-- READ-ONLY. Row counts of the tables the M8 steps touch (before the backup, and after each step).
select 'players ' || count(*) from public.players
union all select 'flights ' || count(*) from public.flights
union all select 'player_saves ' || count(*) from public.player_saves
union all select 'devices ' || count(*) from public.devices
union all select 'pilot_codes ' || count(*) from public.pilot_codes
union all select 'restore_links ' || count(*) from public.restore_links;
