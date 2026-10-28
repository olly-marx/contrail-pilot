# M8: bring online back (plan, bug-fix chat, 2026-10-28)

Status: PLAN. Written before building, as the user asked. Nothing has been applied anywhere; no live database was read.

## Decisions and confirmations I need (the live part waits for these)

1. **The live database apply.** The Coordinator relays that the user authorised applying the live changes once they pass against a local copy, each with a backup and an undo script, reported after. My standing instruction from the user (memory, 2026-10-24) was that live database changes are his to decide, and this authorisation reached me through a peer, so **I will do everything up to the live apply (all local, section 3) and then ask the user directly in this chat, showing the exact scripts, before I touch the live project.** I also have no live credentials in this session; the user supplies the database URL / service key for the apply only.
2. **Wipe the season-1 boards** at the restart (decided 2026-10-26: archive to `archive_season1`, check the counts, delete; undo script puts it back). Still wanted?
3. **MISSIONS board counts missions finished on flights** (`flights.missions_done`, the column the user approved). Missions finished off-flight (funding a nature project) are not in a flight, so they only reach the board with the player's next flight. OK, or count from `player_saves` instead?
4. **When PILOT appears.** Proposal: with BOARDS (after the 3rd landing), the name tour restored for that moment; names stay generated (first name + word + tag), unchanged privacy rules.
5. **Old clients.** Anything older than the first online release is refused at upload with "update required" (the draft `season_controls`), so season-1 clients cannot post into the new boards.

## 1. What exists (measured from the repo)

- **Live schema = `supabase/migrations/` (7 files, up to `20261023120000_send_flights.sql`)** as far as the repo says; I have not checked the live project (no reads yet). Tables: `players`, `flights` (landed, distance_m, shade, heat_trapped, night_dodges, crystals, plane_co2, species[], mission_done bool, lap, crash text), `devices`, `player_saves`, `pilot_codes`, `restore_links`, `code_attempts`, `name_words`, `blocked_words`, `allowed_names`. Functions: `leaderboard(board, period)` (13 boards, 4 periods), `send_flights(batch)`, `put_save`/`get_save`, `claim_pilot`, `restore_*`, `flights_rate_limit()`.
- **Drafts (UNTRACKED in `~/cp-fixes/supabase/drafts/`, to be moved into the repo by this plan):** `tree_boards` (land-tagged tree kinds; OVERALL tree part `least(kinds,10)*25`), `season_wipe` + `season_wipe_undo` (archive-then-delete, refuses a second run), `season_controls` (`public.season.start_at`, `min_client`, `send_flights(batch, client)` and `put_save(save, stamp, client)` refuse below it with SQLSTATE `CP001`; drops the direct-insert policy), `retire_restore_links`, and `client-season-rollout.patch` (removes `src/restore.js`, sends `client: VERSION`, "Update to keep playing!" banner). Tests: `supabase/tests/run*.sh` in Docker Postgres 17 (`run-rollout.sh` runs the whole sequence).
- **The client switches online off:** `window.__CP_NO_ONLINE = true` set by `src/season2.js` (every online function in `src/online.js` returns early: `noOnline()`); PILOT hidden and BOARDS = MY RECORDS (`src/ui.js` tab `show`, `src/recordsui.js`); the name tour marked done in season 2 (`src/tour.js` line 56); "resting" text in `src/pilot.js`.
- **Latent bug to fix with it:** `src/GameScene.js` sends `shade: Math.max(0, -this.sunBlocked)`; `sunBlocked` is positive by day, so every uploaded flight has shade 0 (research/BACKLOG.md M8-1).
- **Parked tests that return with this:** `online`, `onlinesave`, `offline`, `restore` (retired with restore links), the name step of `tours`; all assume the classic game and are re-homed as part of the flip.

## 2. Design

**The 8 boards online, two periods (the user's answers 2026-10-26/28; `research/PROPOSAL-BOARDS-S2.md`).** `leaderboard(board text, period text)` keeps its signature and result columns (`place, name, tag, score, is_me`); `period` is `week` (the Europe/London calendar week) or `ever`; anything else is treated as `ever`. Counted only from `season.start_at`. Per player over their flights in the period:

| board | score | order |
|---|---|---|
| `longest` | max `distance_m` over landed flights | high |
| `kinds` | distinct `species` tags over landed flights (land-tagged, as `tree_boards`) | high |
| `cool` | sum of `greatest(0, shade - heat_trapped)` over landed flights (flight by flight, as MY RECORDS) | high |
| `missions` | sum of `missions_done` | high |
| `longestCrash` | max `distance_m` over crashed flights | high |
| `shortest` | min `distance_m` over crashed flights | LOW first |
| `bird` | count of `crash = 'bird'` | high |
| `crashes` | count of not-landed flights | high |

Top 50 plus the caller's own row if outside it; `hidden` players excluded (unchanged). OVERALL, LAPS, CLEAN PLANE, the points and the other 5 oops boards go away. (`distance_m` holds the game's distance as shown, km, as before.)

**Schema changes (additive, with an undo each):** `alter table flights add column missions_done smallint not null default 0 check (missions_done between 0 and 200)`; `send_flights` reads it and the new client version; `leaderboard()` replaced (drop and recreate, as 4 times before); plus the drafted `season` table, `client_ok()`, the dropped direct-insert policy, the wipe and the restore-links retirement, in that order.

**Client changes (one release, `0.17.0`):** remove the offline switch for the shipped game (`src/season2.js`: keep `__CP_NO_ONLINE` only for the tester modes); `shade: Math.max(0, this.sunBlocked)`; send `missions_done` and `client: VERSION`; BOARDS screen = MY RECORDS plus, when online, a ranking tab per board (THIS WEEK / EVER; "You: 12th" row); PILOT tab and the name tour return after the 3rd landing; "Update to keep playing!" on `CP001`; remove `src/restore.js` and its UI (restore links retired); the upload banner and the outbox (`flush`, `catchUp`) switched back on; MY RECORDS stays the offline fallback.

## 3. Local proof first (no live access needed)

1. Move the drafts and their tests into `supabase/` in the repo (tracked), plus new migrations `20261028*_boards8.sql` (leaderboard, missions_done, send_flights) and tests `boards8.sql`.
2. `supabase/tests/run-rollout.sh` extended: build a throwaway Postgres 17 with the 7 live migrations, load a realistic seed (many players/flights incl. crashes, species lists, week boundaries), apply the sequence **tree_boards -> boards8 -> season_wipe -> season_controls -> retire_restore_links**, assert each board's top rows against hand-computed expectations, `week` vs `ever`, `shortest` ascending, the caller's own row, a hidden player, an old client refused (`CP001`), and the wipe's archive counts; then run each UNDO and assert the database equals the pre-state (table row counts and a checksum of every table).
3. **Planted defects** for each assertion (wrong sort order for `shortest`, a week boundary off by a day, clamp removed from `cool`, hidden player shown, min_client not enforced, undo that loses rows): each must fail the suite.
4. The client against a local PostgREST-compatible stand-in is covered by the existing fake-Supabase browser tests (`online`, `onlinesave`, `offline`), re-homed to the shipped game.

## 4. Live apply runbook (only after the user confirms in this chat)

Preconditions: section 3 green; the user has given the database URL for the apply; the live schema version is READ once to confirm it equals the 7 repo migrations (the only live read, read-only, listed first). Then, one step at a time, each reported before the next:
1. **Backup**: `pg_dump` of `players, flights, player_saves, devices, pilot_codes, restore_links` (data + schema) to a file kept outside the repo, with its row counts and checksum written to `research/M8-RUN-LOG.md`.
2. Apply `tree_boards`, `boards8` (adds the column and the new `leaderboard`), verify with the same assertions as section 3 on a small read-only query set.
3. **Wipe** (`season_wipe`): archive, compare counts, delete, verify; the undo script is tested again on the live backup copy in the local database, not on live.
4. `season_controls` with `start_at = now()` and `min_client = '0.17.0'`; verify an old-version upload is refused.
5. Retire the restore links.
Each step has an undo script kept next to it; any failed check stops the run and restores from the backup. Nothing is destructive without its archive, and no step runs before the previous is verified.

## 5. Order of work

(1) this plan and the decisions above; (2) move the drafts into the repo, write `boards8` and its tests, prove them with planted defects against local Postgres; (3) the client release `0.17.0` built and gate-tested against the fake Supabase, NOT yet released (an online client released before the database would show errors); (4) STOP and ask the user to confirm the live apply; (5) apply live step by step with reports; (6) release `0.17.0`; (7) watch the first real flights land on the boards.

## 6. Risks

- **A live change cannot be fully undone from the client side**: hence the backup before, the archive before the wipe, and the stop-and-ask.
- **Old clients** (still on season-1 builds in caches) are refused politely, not silently ignored.
- **Children's names and privacy**: unchanged generated names, `hidden` flag, no free text; nothing new is collected except `missions_done` and the client version.
- **Rate limits**: unchanged (5 a minute single, 100 in a batch, 300 a day).
- **The shade fix changes the meaning of old data**: the wipe removes old flights, so no history is mixed.
