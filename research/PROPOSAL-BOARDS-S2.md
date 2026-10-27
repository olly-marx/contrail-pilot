# Proposal: boards for season 2, 4 good and 4 oops (bug-fix chat, 2026-10-27)

Status: PROPOSAL ONLY. Nothing is built. The user decides the questions below first. No live database change is made or needed to start.

The user's brief: "there's too many options right now, and the point system doesn't really make sense. It should be like 4 good options and 4 oops options." The leaderboard is to be the FUN feature, introduced after about flight 3 in the onboarding.

## Decisions for the user (answer these and I can build it)

1. **The line-up.** 4 good: FURTHEST FLIGHT, TREE KINDS, COOL SKIES, MISSIONS. 4 oops: BIRD MAGNET, STORM MAGNET, NO-FLY BUSTER, HOT HEAD (one line each in section 2). OK, or swap any? (Spare good ones: TOTAL KM / laps round the Earth. Spare oops: LONGEST CRASH, GROUND THUD.)
2. **Remove "Ultimate Flyer" and its points table entirely?** Recommended yes: it is the opaque part (section 1).
3. **Time periods.** Today there are 4 (TODAY, WEEK, MONTH, EVER). Recommended 2: THIS WEEK (resets every Monday, so a new player can win) and EVER. OK?
4. **Season 2 is offline. Start with "MY RECORDS"** (the same 8 boards, showing only YOUR best on this device, no server, no database change), and add the ranking against other pilots when online returns (M8)? Or keep the whole screen "resting" until M8?
5. **When it appears.** Today in season 2 the PILOT and BOARDS tabs are simply hidden (`show.pilot`/`show.boards` are `false` in `src/ui.js`) and the name tour is skipped (`src/tour.js` marks it done). The proposal: BOARDS appears after your 3rd landing, with a one-time card ("Your records!") and the first oops joke. PILOT (names) stays hidden until online returns. OK?
6. **For M8 (online) only:** MISSIONS needs one new column in the live database (section 4). That is a live database change: your yes, at that time, not now.

## 1. What there is today (measured from the code and the migrations, not from docs)

- `src/pilot.js` `BOARDS`: **8 good + 5 oops = 13 boards**, each with 4 periods = **52 views**, all in one list of buttons; plus a separate "how points work" screen (`#scoreInfo` in `index.html`).
- The good boards: ULTIMATE FLYER (points), LONGEST, FURTHEST, LAPS, TREE KINDS, COOL CONTRAILS, CLEAN PLANE, MISSIONS. Oops: CRASH CHAMPION, HEAT TRAPPER, CO2 CLOUD, LONGEST CRASH, AVERAGE CRASH.
- Why the points do not make sense (from `leaderboard()` in `supabase/migrations/20261021120000_crash_distance_boards.sql`): ULTIMATE = longest flight / 10 **+ all flights / 100** (the same kilometres counted twice) **+ 50 per tree kind + 5 per shade minus heat + 25 per night dodge + up to 200 for a clean plane + 40 per mission**. Seven different currencies in one number. CLEAN PLANE is set by which plane you OWN (a normal plane 0, hydrogen 200), not by how you fly; COOL CONTRAILS adds dodges at a different weight again (1 : 5).
- Everything the boards use is already stored per flight (`flights`: landed, distance_m, shade, heat_trapped, night_dodges, crystals, plane_co2, species[], mission_done, lap, and `crash` = storm / bird / nofly / ground / overheat). The game already counts crashes by kind in the save (`save.crashes`).
- In season 2 online is OFF (`window.__CP_NO_ONLINE`): the screen only says "The leaderboards are resting while season 2 starts". The drafts for the restart are on hold (`supabase/drafts/`: tree_boards, season_wipe, season_controls); the user decided NATURE counts land-tagged kinds and OVERALL's tree part is `least(kinds, 10) * 25`; that OVERALL goes away if decision 2 is yes.

## 2. The design: 4 good, 4 oops, no points

Every board is one number a child can check, with one line that says how to climb it. No points anywhere. Only landed flights count for the GOOD boards (as today); every flight counts for the OOPS boards.

| | Board | The rule (the one line on screen) | Data |
|---|---|---|---|
| GOOD | **FURTHEST FLIGHT** | Your longest flight that landed, in km. | `bestDistance` (exists) |
| GOOD | **TREE KINDS** | How many different kinds of tree you have planted (a kind counts once per land). | `planted` / `plantedIn` (exists) |
| GOOD | **COOL SKIES** | Shade you made in the sun, minus heat your contrails trapped at night, over all landed flights. | needs a running total in the save (new, see 3) |
| GOOD | **MISSIONS** | Missions you have finished. | `missionsDone.length` (exists) |
| OOPS | **BIRD MAGNET** | Flights that ended in a bird strike. | `crashes.bird` (exists) |
| OOPS | **STORM MAGNET** | Flights that ended in a storm. | `crashes.storm` (exists) |
| OOPS | **NO-FLY BUSTER** | Flights that ended in a no-fly zone. | `crashes.nofly` (exists) |
| OOPS | **HOT HEAD** | Flights grounded because the planet got too hot. | `crashes.overheat` (exists) |

Why these: the four good ones cover the four things the game teaches (fly far, plant trees, cool the sky, do the missions). The four oops ones are the four hazards the player meets, so each is a joke the child already understands, and none can be farmed for a prize: oops boards never feed anything else. Dropped: ULTIMATE FLYER (opaque), LAPS and FURTHEST TOTAL (the same kilometres again; spares), CLEAN PLANE (set by a purchase, not by play), and the five old oops boards (CO2 CLOUD, HEAT TRAPPER, the two crash-distance boards and total crashes: replaced by the four by kind).

On screen: the 8 boards as two rows of four cards (GOOD above, OOPS below, a funny heading), tap one to see its rule and your number; two small period buttons (THIS WEEK / EVER). Retired with the points: the "how points work" screen.

## 3. How it works now, with online off (no database change)

**MY RECORDS.** The BOARDS screen shows the 8 cards with YOUR best / total on this device, a "NEW RECORD!" mark the moment you beat yourself, and a line "Pilots' rankings come back with online." Everything it needs is already in the save except COOL SKIES, which needs a running total: one new save field `records.cool` (shade minus heat trapped, landed flights), added where a finished flight is banked (`RULES.bankFlight` in `src/sim/rules.js`, shared by the game and the Node engine, so it is testable in Node in under a second). THIS WEEK for personal records: `records.week = { start, ...}` kept the same way, reset on Monday by the menu (the date stays out of the rules, as for the daily missions).

**Onboarding.** After the 3rd landing the BOARDS tab appears (one line in the tab bar's reveal list in `src/ui.js`, next to HANGAR/NATURE) and a one-time card says "Your records! Beat yourself. And watch out for the OOPS boards." The first time you crash a particular way, a joke toast ("Bird Magnet: 1"). Nothing changes before flight 3; no name tour is needed while online is off.

**Tests (plan, each proved by a planted defect).** Node: each of the 8 records changes only on the flight that should change it (a landing changes the good ones; a crash by kind changes exactly one oops one; a landed flight never touches the oops ones; COOL SKIES = shade minus heat; THIS WEEK resets). Browser (one test, shipped game): BOARDS hidden before the 3rd landing, appears after; 4 + 4 cards; a crash by a bird raises BIRD MAGNET on the screen.

## 4. When online returns (M8): what the database needs

- **No new tables, no new columns for 7 of the 8 boards**: `flights` already has every field (`landed`, `distance_m`, `shade`, `heat_trapped`, `species`, `crash`).
- **One rewritten function**: `leaderboard(board, period)` is dropped and recreated (as it was 4 times before) with the 8 new board ids and two periods (week, ever). It also needs the season filter from the on-hold draft (`public.season.start_at`).
- **MISSIONS needs one new column**: `flights.mission_done` is a yes/no per flight, but season 2 finishes several missions in one flight, and some without a flight (a nature project). Add `missions_done smallint not null default 0` to `flights` (and to `send_flights`), or count them from `player_saves`. LIVE DATABASE CHANGE: your yes at that time.
- **TREE KINDS** follows the draft `tree_boards` decision (distinct land-tagged kinds). **COOL SKIES** = `sum(shade - heat_trapped)` over landed flights, already how COOL CONTRAILS is computed minus the dodge weight.
- The old boards' data stays untouched; no rows are deleted.

## 5. Risks and what is NOT in this proposal

- Rankings against other children need names and a server: unchanged privacy rules (generated names only, `hidden` flag), nothing new is collected.
- The week reset for personal records depends on the device clock: a child who changes the clock can fake a "week". Harmless (personal only); the server's clock decides once online returns.
- Not designed here: prizes for board places (none today; the user has not asked), and the art for the 8 cards (PixelLab icons, a later step).
