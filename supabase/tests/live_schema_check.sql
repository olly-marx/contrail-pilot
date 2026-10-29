-- READ-ONLY. Prints a fingerprint of the live public schema (tables, columns, functions, policies). It is compared with the same query on a local
-- database built from the 7 repo migrations (supabase/migrations/): if the lines are identical, the live schema is what the M8 scripts were proven against.
select 'tables '   || count(*) || ' ' || md5(string_agg(table_name, '|' order by table_name)) from information_schema.tables where table_schema = 'public'
union all select 'columns '  || count(*) || ' ' || md5(string_agg(table_name || '.' || column_name || ':' || data_type || ':' || is_nullable, '|' order by table_name, column_name)) from information_schema.columns where table_schema = 'public'
union all select 'functions ' || count(*) || ' ' || md5(string_agg(p.oid::regprocedure::text, '|' order by p.oid::regprocedure::text)) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
union all select 'policies '  || count(*) || ' ' || coalesce(md5(string_agg(tablename || '.' || policyname || ':' || cmd, '|' order by tablename, policyname)), '-') from pg_policies where schemaname = 'public';
