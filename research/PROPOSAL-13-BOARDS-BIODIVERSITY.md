# Proposal 13: boards revamp and a "Biodiversity King" board

Status: PROPOSAL ONLY (2026-10-24, PixelLab session). Nothing is built. The user approves or changes it first.

## What is there today (read from the code, not from docs)

- `src/pilot.js` `BOARDS`: 8 "good" boards (Ultimate Flyer, Longest, Furthest, Laps, Tree kinds, Cool contrails,
  Clean plane, Missions) + 5 "Oops" boards, each for Today / Week / Month / Ever. That is 13 buttons in one list.
- The database (`supabase/migrations/`): one `flights` row per flight (distance, shade, heat trapped, night dodges,
  crystals, plane CO2, tree `species[]`, mission done). One SQL function `leaderboard(board, period)` adds up a
  player's flights in the period and ranks them. It was replaced 4 times by drop-and-recreate migrations.
- **Biodiversity is not in the database at all.** The region meters (`src/nature.js`) are worked out on the
  device from the save (projects done, trees planted there, animals found). `player_saves.save` holds the whole
  save as JSON, but the meter maths lives only in the game's JavaScript.

## The revamp (what a kid sees)

1. **Four tabs instead of one long list:** FLYING (Longest, Furthest, Laps), PLANET (Cool contrails, Clean plane),
   NATURE (Biodiversity King, Tree kinds), and OOPS (the 5 fun ones). Ultimate Flyer stays at the top of every tab.
2. **"You" row always visible:** if you are not in the top 50, your own place shows under the list ("You: 212th").
   (`is_me` already exists; the server would also return your own row when you are outside the top 50.)
3. **Each board says in one line how to climb it** (the `what` line exists; make it an action:
   "Finish nature projects and plant trees in many lands").

## Biodiversity King: what it counts

The **sum of your region meters** (0-100 each, 10 lands, so 0-1000) at the end of each landed flight. The board
shows your **best** in the period. That rewards caring for many lands, not just the UK, and it is what the game
already calls biodiversity, so the number on the board matches the meters a kid sees.

## Database change, spelled out

One new migration, `supabase/migrations/2026MMDDhhmmss_biodiversity_board.sql`:

1. **Column:** `alter table public.flights add column bio smallint check (bio between 0 and 1000);`
   - Nullable: flights from older games simply have no value (they count as "no score", not 0).
2. **Function:** drop and recreate `leaderboard(text, text)` (same pattern as the 4 earlier migrations), adding
   `coalesce(max(bio) filter (where landed), 0) as bio` to the per-player sums and `when 'bio' then bio` to the
   board switch. Ultimate Flyer's formula: proposal **unchanged** (adding bio would change everyone's points
   overnight; the user decides).
3. **`send_flights`** (the batch insert, `20261023120000_send_flights.sql`) must accept and copy the new `bio`
   field. Check whether it lists columns explicitly; if so it needs recreating too.
4. **Tests:** `supabase/tests/` gets a case: two players, bio 300 and 450 → order 450, 300; a null bio row is
   ignored; a value of 1001 is rejected by the check.

Game side: `src/online.js` `sendFlight()` adds `bio: <sum of region meters>` (computed with the existing
`src/nature.js` functions); `src/pilot.js` adds the board entry and the tabs.

## Risks

- **Cheating:** like every board, the number comes from the device. The `check` caps it at 1000 (the real
  maximum), so a cheat can tie the top but not exceed it. Same trust level as the other boards today.
- **Migration order:** the function is dropped and recreated in one transaction; a game version that calls the
  old function during the deploy still works (same name and arguments). Ship the database first, then the game.
- **Old players:** everyone starts at "no score" on this board until their next landed flight. Say so on the
  board ("Land a flight to get on this board").
- **Meter recalibration:** if `nature.js`'s meter maths changes later (it was recalibrated on 2026-10-22), old
  `bio` values are on the old scale. Mitigation: the board uses the period's best, so Today/Week heal quickly;
  Ever does not. Decide whether a recalibration resets Ever.

## Test plan (when built)

A planted-defect gate for each piece: the board ranks by best bio (plant: sum instead of max → fails); null rows are
ignored (plant: coalesce null to 0 and count → fails); the game sends the sum of all 10 meters (plant: UK only → fails).
