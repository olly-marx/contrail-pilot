# M8 live steps: the user runs them (decided 2026-10-29: "You run it")

Nothing here is run by Claude. The user runs each command in a terminal at the repo root on branch `feat/m8-db`
(`git fetch && git checkout feat/m8-db`), pastes the output into the chat, and Claude checks it before the next step.
Keep the connection string out of the chat: `export DB='postgresql://postgres:<password>@<host>:5432/postgres'` (Supabase dashboard > Project settings > Database > Connection string, the direct one).
Every apply script is ONE transaction (begin ... commit): it either fully applies or not at all. Each has an undo script next to it.

## A. Look first (read-only, changes nothing)
    psql "$DB" -t -A -f supabase/tests/live_schema_check.sql
Expected (the schema built from the 7 repo migrations; if any line differs, STOP and paste the lines):
    tables 10 c2e77120037afaab54546085d736c51f
    columns 40 b69a625c7216c50177620799216f8622
    functions 14 9e00958bba0b620ecd0d5a499b6877b7
    policies 6 c5f78d00b3b5a479e6ddd0e8d7ef3e24
    psql "$DB" -t -A -f supabase/tests/live_counts.sql      # paste the 6 lines: the "before" counts

## B. Backup (read-only on the live database)
    pg_dump "$DB" --format=custom --no-owner --schema=public -f ~/m8-backup-before.dump
    ls -l ~/m8-backup-before.dump && sha256sum ~/m8-backup-before.dump     # paste both
Claude then restores the dump into a local Postgres and runs the undo checks on it. Do not go on until Claude says the restore is good.

## C. Apply (each step: run, then the verify query, paste both)
C1  schema (harmless to the game that is live now)
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/drafts/20261028000000_boards8_schema.sql
    verify: psql "$DB" -t -A -c "select public.client_ok('0.18.1'), (select count(*) from pg_policies where policyname = 'add my own flights'), (select count(*) from information_schema.columns where table_name = 'flights' and column_name = 'missions_done')"      -> t|0|1
    undo:   psql "$DB" -v ON_ERROR_STOP=1 -f supabase/drafts/20261028000000_boards8_schema_undo.sql   (after undoing C2 first)
C2  the 8 boards
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/drafts/20261028010000_boards8_leaderboard.sql
    verify: psql "$DB" -t -A -c "select count(*) from public.leaderboard('longest', 'ever')"      -> a number (it runs; the old 13 boards are gone)
    undo:   psql "$DB" -v ON_ERROR_STOP=1 -f supabase/drafts/20261028010000_boards8_leaderboard_undo.sql
C3  the season wipe (archives, compares counts inside the transaction, then deletes flights + player_saves; players, devices and codes stay)
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/drafts/20261028020000_season_wipe.sql
    verify: psql "$DB" -t -A -f supabase/tests/live_counts.sql     -> flights 0, player_saves 0, the others as before
            psql "$DB" -t -A -c "select (select count(*) from archive_season1.flights), (select count(*) from archive_season1.player_saves)"   -> the before counts of flights and player_saves
    undo:   psql "$DB" -v ON_ERROR_STOP=1 -f supabase/drafts/20261028020001_season_wipe_undo.sql
C4  retire the restore links
    psql "$DB" -v ON_ERROR_STOP=1 -f supabase/drafts/20261028030000_retire_restore_links.sql
    verify: psql "$DB" -t -A -c "select to_regclass('public.restore_links') is null, (select count(*) from archive_season1.restore_links)"   -> t|<the before restore_links count>
    undo:   psql "$DB" -v ON_ERROR_STOP=1 -f supabase/drafts/20261028030001_retire_restore_links_undo.sql
Undo order is the reverse of the apply order: C4, C3, C2, C1.

## D. Then Claude releases the client 0.22.0 (gate on the exact commit) and says when version.json shows it

## E. Season controls (only after D: from then on clients older than 0.22.0 are refused)
    psql "$DB" -t -A -c "update public.season set start_at = now(), min_client = '0.22.0' returning start_at, min_client"
    verify: psql "$DB" -t -A -c "select public.client_ok('0.21.1'), public.client_ok('0.22.0')"      -> f|t
    undo:   psql "$DB" -t -A -c "update public.season set start_at = '-infinity', min_client = '0.0.0'"
