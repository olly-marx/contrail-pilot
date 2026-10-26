# Backlog: every known bug, TODO and open decision (written 2026-10-25 by the bug-fix chat)

Sources: the user's bug lists (relayed by the Coordinator), `STATE.md` (its "TO DO", "Open questions", "Known flaky tests"), `research/*.md`,
this chat's own work. **Status words:** LIVE = released and CI green; FIXED-UNPUSHED = done in a worktree, not yet shipped; OPEN = nothing done;
WAITING-USER = needs a decision or information from the user; WAITING-DATA = blocked on a measurement. "Verified" means I ran it this session; everything
else is copied from a doc and **unverified** (the docs are not always current: STATE.md predates the fleet economy).

## A. The user's bug list (2026-10-25, in the Coordinator's priority order)
| # | item | status | detail |
|---|---|---|---|
| A0 | Mission 8 "Make your plane cleaner" can't be finished after the eras reset (goal read the retired fuel/engine lines) | LIVE 0.11.3 | `tests/missionclean.cjs`; planted old goal fails 5 checks |
| A1 | Stuck after an upgrade: "autopilot starts after take-off and I can't click" | WAITING-DATA | NOT reproduced (mouse and touch, 4 buys, 78-case sweep, stale-timer theory refuted). Needs the user's device, hold-or-tap take-off, which upgrade, a screenshot. If a crash card shows, it is A2. |
| A2 | Crashes that force an app restart | WAITING-USER | waiting for the user's screenshot of the crash card (`src/crash.js`; its RESTART path has `tests/crash.cjs`) |
| A3 | Cities shown over the sea | LIVE 0.11.3 (Lisbon); WAITING-USER (Honolulu, Nadi) | legStrip now keeps the airport's land at both ends (`tests/geo.cjs`). Honolulu and Nadi are declared 'ocean' islands: still over open sea (12 leg ends). Options: island land boxes (credits the rainforest for the world tour) or a runway island |
| A4 | Text spilling out of boxes (airport call, biome banner, DROP button) | LIVE 0.11.3 | `tests/textfit.cjs` at 390 and 320 px; button reads SEND A SEED |
| A5 | All wild areas look the same (tree layout) | LIVE 0.11.4 (game chat) | per-region seeded layout |

## B. Shipped this session (for the record)
0.9.1 (FLY ON, twilight, legs), 0.9.2 (offline play + `send_flights`), 0.11.0 (globe, swipe, pinned NATURE, self-update), 0.11.3 (above). All CI green and tagged.

## C. Art waiting on the user's approval
- **Seven new in-flight look cues + a bolder hush-kit**, drawn locally (0 PixelLab generations): `tools/art/planes/upgrades/review-new-looks-2x.png` (also in `~/globe-approval/`).
  Status: FIXED-UNPUSHED and unwired (jumbo lounge, wide-body, twin FADEC, combustor, fly-by-wire, screens, XL bins). Waiting-user: approve or change each cue; then the plane build wires `LOOKS`, then the hangar versions are drawn.
- Proposal 6 decisions (research/PROPOSAL-6-PLANE-ART.md): how to split the 268.5 PixelLab generations (region art wants 69 animals + 15 trees), 747 in-flight redo (18 to 36 generations, "not now"), winglets hangar-only. WAITING-USER.

## D. Proposals written, decisions waiting
- PROPOSAL-12-MISSIONS.md (missions redesign) and PROPOSAL-18-KIOSK.md (festival kiosk; keep uncommitted until the user has read it). WAITING-USER.
- New regions (research packs in `~/contrail-research/`): biome names, cities, third-party donate pages, Patagonia thin, koala rarity, macron font options. WAITING-USER.
- Auckland shows the "UK" label (a data question). WAITING-USER.
- Globe at <= 600 px tall (shipped 0.11.0; a decision on the small-screen layout). WAITING-USER.
- Ducrust / Jono restore links (`?restore=<code>`): were sent links, keep the restore codes; STATE.md "Lost saves" section says TEMPORARY. OPEN: remove once the players have restored.

## E. Balance and economy (user-requested study)
- Part A (km before overheating per plane x nature): the plane build. Part B (time to earn): `research/BALANCE-TIME-TO-EARN.md`, 4 seeds, LIVE as a document.
  **Finding (measured, seed 1, 0.11.7):** crystals are the binding currency (about 4 a flight; 1,058 earned = the 1,046 the ladder costs); seeds are about 2x more than needed. DONE as a measurement; the design decision (change crystal income or crystal prices?) is WAITING-USER via the Coordinator.
- Real beginners' distance per flight: DONE (the Coordinator ran the read-only live query after the user added the rule; 8 players, the user's account excluded, relayed 2026-10-25, not re-run by me): flights 1 to 20 end at a median of 2,000 to 5,000 game km (p90 3.8 to 7.5k), flights 51+ at a median of 5.6k (p90 12.6k), about 20% landed. So real beginners crash long before heat could end a flight (a Comet overheats near 9,000 km), and earn far less per flight than the perfect pilot of part B.
- Price ladder gates (`tools/price-ladder.mjs`, `--selftest`): written; value gates (what a level DOES) not written; needs the plane build's agreement. OPEN.
- Missions redo to pay "15+20i seeds, 1+2i crystals" (1,755 / 169 in all): see PROPOSAL-12.

## F. Tests and tooling
- `tests/updates.cjs` flaky ("no reload during a flight ... [1,1]"): root cause found (the test let an unflown plane crash, so the flight had ended before the asked-for update); fix + planted-defect proof done. FIXED-UNPUSHED (test only, in ~/cp-fixes).
- `tests/globe.cjs` flaky once (0.11.6 run: 'a drag at 4x slower CPU should hold 30 frames a second, got 28.2'): an absolute fps threshold. Fixed (best of 3 against a same-load baseline; 'once settled' waits for the coast to end). Proven: clean passes, planted 40 ms paint fails, 8 busy loops pass. FIXED-UNPUSHED.
- `tests/controls.cjs` flaky once (0.11.8 run: 'the autopilot should steer up towards the storm gap, not hover: climbed 36'): the breather climb was read after a fixed 700 ms WALL wait; a second wall-clock check ('letting go should slow down', fixed 500 ms) failed under load too. Both rewritten to wait on game state; climb proven in a harness (frames 150 ms late: old 45 px, new 97); the full-file proof (3 clean runs + SLOWFRAMES=150) needs a QUIET ~3-min machine slot. FIXED-UNPUSHED (tests/controls.cjs + tests/lib/throttle.js SLOWFRAMES).
- `tests/school.cjs` FLAKY once under load (0.11.3's first run, "missing the icy air should bring more"); passed 6/6 alone and on the clean rerun; likely load. OPEN, watch.
- `tools/income.cjs` rewritten for the fleet economy with `NORENDER=1` (18x faster); `PROBE` stubs rejected by the plane build (they change the seeded sky). FIXED-UNPUSHED.
- STATE.md "Known flaky tests": lanes, flight, hazards, wildlife were fixed in 2026-10-22/24 (see that section; unverified since). Do not treat as open without a new failure log.
- Session-start per-seed repeatability: scene start waits on real time, so per-seed results are not repeatable even when drawing (the sim engine's landing is meant to fix this).

## G. Older STATE.md items (unverified, may be done)
- "TO DO: balance, progression and onboarding": balance DONE 2026-10-21; trees for long runs DONE; onboarding tours exist (`src/tour.js`, live); tiered missions per level and "super-tiered upgrades presenting Imperial research" (needs the user to name groups): OPEN.
- Open questions 1 to 6 in STATE.md: (1) forecast site URL (2) done (3) Drop sight as an upgrade? (4) trees on a crashed flight count for biodiversity (currently yes) (5) fact-check of `src/nature.js` by the group / Citizen Zoo (6) pace of the first upgrade: all WAITING-USER; (2) is done.
- "Possible next work": more hazards (downdrafts, ash, crosswinds), pixel art for remaining code-drawn textures, festival kiosk and QR poster: OPEN, not asked for.

## H. Uncommitted in ~/cp-fixes (will go out with the next release, after a full 2-shard run)
`tests/updates.cjs`, `tools/income.cjs`, `tools/price-ladder.mjs`, `research/PROPOSAL-6/12/18`, `research/BALANCE-TIME-TO-EARN.md`, this file, and the art (`tools/art/make_upgrades.py` + PNGs + provenance). Nothing art-related is wired.
