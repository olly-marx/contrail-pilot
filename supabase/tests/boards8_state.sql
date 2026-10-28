-- one line per fact about the data and schema the M8 steps touch; the same text before and after an apply+undo means the undo put everything back
select 'flights '       || count(*) || ' ' || coalesce(md5(string_agg(to_jsonb(f)::text, '|' order by id)), '-') from (select id, player_id, landed, distance_m, shade, heat_trapped, species, crash, created_at from flights) f
union all select 'saves '   || count(*) || ' ' || coalesce(md5(string_agg(to_jsonb(s)::text, '|' order by player_id)), '-') from player_saves s
union all select 'links '   || count(*) || ' ' || coalesce(md5(string_agg(to_jsonb(l)::text, '|' order by hash)), '-') from (select * from restore_links) l
union all select 'players ' || count(*) || ' ' || md5(string_agg(to_jsonb(p)::text, '|' order by id)) from players p
union all select 'devices ' || count(*) || ' ' || md5(string_agg(to_jsonb(d)::text, '|' order by device)) from devices d
union all select 'codes '   || count(*) || ' ' || md5(string_agg(to_jsonb(c)::text, '|' order by player_id)) from pilot_codes c
union all select 'funcs '   || md5(string_agg(p.oid::regprocedure::text, '|' order by p.oid::regprocedure::text)) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
union all select 'cols '    || md5(string_agg(table_name || '.' || column_name || ':' || data_type, '|' order by table_name, column_name)) from information_schema.columns where table_schema = 'public'
union all select 'tables '  || md5(string_agg(table_name, '|' order by table_name)) from information_schema.tables where table_schema = 'public';
