-- M8 step 4, RETIRE THE RESTORE LINKS (draft; research/M8-ONLINE.md; the user: everyone restarts anyway). A live-database change the user confirms first.
-- Kept OUT of migrations/ on purpose. Run it after 20261028020000_season_wipe.sql (which already copies restore_links into archive_season1);
-- this file makes sure of the copy itself, so it also works alone.
-- Removes: restore_preview(text), restore_claim(text), restore_link_player(text) and the restore_links table.
-- Does NOT touch players.claimed_at (harmless; only the restore code read it).
-- Undo: 20261028030001_retire_restore_links_undo.sql.
begin;
create schema if not exists archive_season1;
revoke all on schema archive_season1 from public, anon, authenticated;
create table if not exists archive_season1.restore_links as table public.restore_links;
do $$ begin
  if (select count(*) from archive_season1.restore_links) <> (select count(*) from public.restore_links) then
    raise exception 'archive of restore_links does not match: nothing was dropped';
  end if;
end $$;
drop function public.restore_preview(text);
drop function public.restore_claim(text);
drop function public.restore_link_player(text);
drop table public.restore_links;
commit;
