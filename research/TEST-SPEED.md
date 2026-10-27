# Test speed: audit and migration plan (bug-fix chat, 2026-10-27; step 1, DESK ONLY)

The user's goal: "they should be SECONDS long." Target (Coordinator, wall clock on this machine): a RELEASE GATE <= 60 s = all game rules/logic in Node
(sim engine + pure modules) in parallel, plus a tiny browser SMOKE (one shared Chromium, a handful of screens, no fixed sleeps) <= 30 s of that; the
full browser suite shrinks to a few real-render checks (<= 3 min), run only for UI/render changes. Every migrated check keeps its planted defect; the old
test is retired only after the new one catches the same plant.

## What is measured, and what is not (read this first)
- 102 test files: 76 launch Chrome, 26 are plain Node. A local full run is ~30 min (game chat: shard 1 ~14 min, shard 2 ~15 min, 16 cores, load 6-7).
- There are NO per-test timings except `tools/test.sh`'s `secs` table from CI, 2026-10-22 (stale, 40 of the tests). This commit makes test.sh print each test's seconds and write
  `TIMES=<file>` (a TSV: test, seconds, pass/flaky/fail); validated on three Node tests incl. a planted failing one (recorded `fail`, 3.1 s = two tries).
  **Everything in the "class" column below is a judgement from each test's header and a grep of what it calls, NOT a measurement.** The baseline run (batch 0) replaces
  guesses with seconds; classes are then confirmed per test when it is migrated.
- Raw grep counts per test (`waitForTimeout` fixed sleeps; logic/screen/render hits of what the test touches) are in the table; fixed sleeps are the first thing the shared-browser layer removes.

## Classes
- **LOGIC**: checks a rule (flight physics, hazards, money, missions, saves). Home: Node on `src/sim/world.js createWorld` (proven identical to the game by `tests/sim-equiv.cjs`) or a pure module. Target ~1 s each.
- **DATA**: checks files/data (assets exist, links resolve, fact keys, art provenance). Needs no game at all: plain Node, <1 s.
- **SCREEN**: checks what the DOM shows or does (menus, tabs, buttons, input, text fit, tours, offline banners). Stays in a browser but in ONE shared Chromium, a page per file, waits on game state, no fixed sleeps.
- **RENDER**: checks pixels/art in the real renderer. A handful, run only for UI/art changes.
- **CONTRACT**: game-vs-engine equivalence (`sim-bank`, `sim-masks`, `sim-rng-split`): need both sides, keep in the browser but they are few and are what justifies moving LOGIC tests to Node. `sim-equiv` already covers the engine side in Node.

Counts of the 76 browser tests: LOGIC 34, DATA 9, SCREEN 26, RENDER 3, CONTRACT 3.
Many LOGIC tests also check a screen string; for those the logic moves to Node and a thin screen assertion moves into the smoke/SCREEN layer (the game chat's list of 25 logic-driving browser tests agrees with this).

## Batch plan (each batch ends with before/after seconds per test and the plants caught)
0. **Timed baseline** (needs a machine turn): `TIMES=base.tsv tools/test.sh --shard 1/2` and `2/2`, then fill the "CI s" column with measured seconds; confirm classes. One run, ~30 min.
1. **DATA to Node** (zero risk, ~10 tests: links, fleetfacts, textures, projectart, treeart, badgeart, landmarks, treelayout, fields, terrain): swap `chromium` for `fs`/`fetch` of files on disk; each keeps its planted-missing-file/dead-link plant.
2. **Slowest LOGIC to Node on the engine** (the ones the CI table says dominate: flight 90, lanes 65, forest 60, hazards 32, ponds 29, powerups 20, forecast, margin, atc, issr-reveal, banners, twilight, collisions, everyleg). Pattern: `createWorld(save, seed)` + the test's pilot/step loop (as `tests/sim-hazards.cjs`, `sim-trees.cjs`), assertion unchanged. Each needs its plant re-proved in Node (change the constant in `src/config.js` / a rules line).
3. **Money/progress LOGIC to Node** (missions 39, crystals 38, progression 33, rewards 28, badges, fares, eras, reset, restore, upgrades, savesafe, flightregion, regions, pickupgates, journey, nature, runway-back): pure `src/*.js` + `RULES.bankFlight` on a fake scene, as `tests/offer-gate.cjs` and `sim-result-fields` do.
4. **Shared-browser layer** next to `tests/lib/classic.js`: `tests/lib/shared.js` launches ONE Chromium per process (reuse across the files a runner executes), hands each file a fresh context, and offers `waitFor(page, cond)` (polls game state) to replace the fixed sleeps (hangar 13, school 13, progression 14, missions 13, hazards 13, controls 12, tours 12, wild 12, ...). Runner: one node process loads many SCREEN files instead of 40 launches (Chrome start-up is a big part of a 2-30 s test).
5. **Gate + rule + CI**: `tools/gate.sh` = all Node tests in parallel (`xargs -P`) + `tests/season2-smoke.cjs` on the shared browser, target <= 60 s; RELEASING.md rule "release gate = the fast gate; the full browser suite only when UI/render files change (`index.html`, `style.css`, `src/ui.js`, `src/hub.js`, `src/wild.js`, `src/globe.js`, `src/tips.js`, assets)"; deploy.yml gets a `gate` job (required, fast) and a path-filtered `full` job. CI changes go through the release manager (me), one release, full run on the exact commit as always.

Risk to watch: a Node test that passes because the engine is too forgiving (it must still FAIL on the plant); keep `sim-equiv`, `sim-bank`, `sim-rng-split` as the proof that the engine equals the game. Do NOT relax a threshold to make a migrated test fast.

## Progress log
- **2026-10-27 batch 2, test 1: `lanes` (CI 65 s, browser) -> `tests/sim-lanes.cjs` (0.6 s, Node, the sim engine).** Same two halves (icy air never fills a storm gap; flocks never sit in a gap as the plane passes) and the same pass marks. Plants (edit `src/sim/rules.js`; the header of the test lists the sed lines): the addIssr guard removed -> FAILS (196 of 200 direct tries, 349 steps in the long run); the addFlock guard removed -> FAILS ONLY after I added a direct bird check (the long run alone PASSED the planted defect: a flock almost never arrives in a gap by chance; the old browser test has the same blind spot, to be confirmed on the baseline turn). Old `lanes.cjs` is kept until the baseline turn runs it against both plants, then retired. Before/after: ~65 s -> 0.6 s.
- **2026-10-27 batch 2, test 2: `flight` (CI 90 s, browser) -> `tests/sim-flight.cjs` (0.6 s, Node, 3 clean runs PASS).** Same six checks (land at the 2nd airport with takeoff/landing/night seen; night heat trapped, no sun; day sun blocked, no heat; overheat ends the run for the heat; no-tap ground crash; storm hit ends the flight). Plants, all FAIL in Node: landing disabled, overheat disabled, ground crash disabled, heatTrapped zeroed, sunBlocked zeroed, hitsStorm disabled (header lists the seds). The old `flight.cjs` is kept until the baseline turn runs it against the same six plants. Before/after: ~90 s -> 0.6 s.
- **2026-10-27 batch 2, test 3: `forest` (CI 60 s, browser) -> `tests/sim-forest.cjs` (0.3 s, Node).** Same 11 checks, 50 ms frames. Five plants, all FAIL in Node (header lists the seds): forest cap removed, land cap removed, old-wood boost removed, kinds power zeroed, store power zeroed. Old `forest.cjs` kept until the baseline turn runs it against the same five. ~60 s -> 0.3 s.
- **2026-10-27 GATE batch (Node half of the gate): `tools/gate.sh` = 32 declared Node tests in a 4-worker pool, GATE=1 small forms: 13.3 s wall clock (was ~64 s as a plain pool; the sim chat's studies were running, load 7-9).** Three tiers declared in `tests/GATE`, `tests/DEEP` (full sweeps, `gate.sh --deep`, thresholds untouched) and `tests/BROWSER`, with `gate.sh --lint` (proven by 4 planted list defects). Small forms (env `GATE=1`; no GATE = the unchanged full sweep): `sim-result-fields` 9 flights -> 4 (6@0.85 + the three s=0.8 scrape skies): 1.7 s, plants scrape/nofly/trees all FAIL; `sim-care` 12 skies -> seed 3 at both skills (same GOLD by index): 1.2 s, PLANT=care FAILS; `sim-player` 20/30 skies -> 5: PLANT=bob FAILS in 2 s, clean PASSES in 14 s; PLANT=classic did not fail even at the full size on the live storms (the sim chat pins STORMS startGap 150 / shrink 1 on its branch feat/progression-s2: re-derive after it lands). **Findings (gates that could not fail):** `sim-hazards` PLANT=old PASSED on main and at the commit that introduced it (the 22% figure was measured on the pre-0.12 storms; sim chat fixed it with a pin, 14107ca); `sim-player` PLANT=classic likewise. `sim-tapper` (52 s, 1.4 GB) has no gate form: the clean control is one state-space search that does not shrink, and a 36-frame window of the planted sky found no dead end (the control could not fail); DEEP only, until a different cheap control is found. `sim-hazards` stays DEEP until the pin lands.
- **Correction to the plan:** batch 1 (DATA) is worth little in seconds (the CI table gives 2 s each) and several "DATA" tests are not: `textures.cjs` needs the real Phaser loader, and `links.cjs` mixes a data check (upgrade links, Node-able) with the About page (screen). Do the big LOGIC tests first (batch 2/3: flight 90, school 67, forest 60, missions 39, crystals 38, progression 33, hazards 32, ponds 29, rewards 28), then DATA.

## Per-test table (browser tests only; Node tests already run in ~0.1-25 s)
CI s = the 2026-10-22 CI seconds where known (stale). Sleeps = fixed `waitForTimeout` calls. Hits = logic/screen/render greps (a crude signal, not the class).

| test | class (guess) | CI s | sleeps | hits L/S/R |
|---|---|---|---|---|
| flight | LOGIC | 90 | 7 | 1/6/2 |
| school | SCREEN | 67 | 13 | 5/17/2 |
| lanes | LOGIC | 65 | 3 | 0/2/0 |
| forest | LOGIC | 60 | 2 | 2/1/0 |
| missions | LOGIC | 39 | 13 | 8/17/1 |
| crystals | LOGIC | 38 | 3 | 2/7/0 |
| progression | LOGIC | 33 | 14 | 9/15/0 |
| hazards | LOGIC | 32 | 13 | 0/1/0 |
| ponds | LOGIC | 29 | 3 | 2/1/0 |
| rewards | LOGIC | 28 | 5 | 12/10/0 |
| controls | SCREEN | 27 | 12 | 8/10/0 |
| online | SCREEN | 25 | 18 | 2/43/4 |
| tours | SCREEN | 22 | 12 | 2/42/4 |
| issr-reveal | LOGIC | 21 | 1 | 0/2/0 |
| features | SCREEN | 20 | 6 | 1/12/0 |
| flightregion | LOGIC | 20 | 5 | 11/2/1 |
| powerups | LOGIC | 20 | 1 | 1/1/0 |
| updates | SCREEN | 20 | 10 | 3/22/0 |
| wildlife | LOGIC | 20 | 2 | 2/2/0 |
| journey | LOGIC | 17 | 8 | 3/11/0 |
| crash | SCREEN | 15 | 4 | 3/4/0 |
| everyleg | LOGIC | 15 | 1 | 1/1/0 |
| forestmeter | LOGIC | 15 | 1 | 7/1/0 |
| nature | LOGIC | 15 | 9 | 10/18/0 |
| pixelpreview | RENDER | 15 | 3 | 0/4/19 |
| banners | LOGIC | 14 | 4 | 1/1/0 |
| hangar | SCREEN | 14 | 13 | 0/27/1 |
| gate | SCREEN | 11 | 5 | 0/1/1 |
| restore | LOGIC | 9 | 3 | 27/0/0 |
| upgrades | LOGIC | 9 | 4 | 3/3/0 |
| wild | SCREEN | 9 | 12 | 10/22/1 |
| collisions | LOGIC | 7 | 2 | 0/1/10 |
| runway-back | LOGIC | 6 | 9 | 1/5/0 |
| savesafe | LOGIC | 6 | 1 | 5/0/0 |
| links | DATA | 2 | 2 | 0/6/0 |
| textures | DATA | 2 | 0 | 0/0/0 |
| atc | LOGIC | - | 1 | 0/1/0 |
| badgeart | DATA | - | 0 | 0/1/1 |
| badges | LOGIC | - | 0 | 13/1/0 |
| biodiversity | SCREEN | - | 4 | 4/16/0 |
| cache | RENDER | - | 4 | 0/2/0 |
| eras | LOGIC | - | 4 | 4/7/0 |
| faces | RENDER | - | 0 | 0/0/0 |
| fares | LOGIC | - | 2 | 2/6/0 |
| fields | DATA | - | 2 | 0/6/0 |
| fleetfacts | DATA | - | 5 | 0/10/0 |
| forecast | LOGIC | - | 1 | 1/1/0 |
| gaphint | LOGIC | - | 1 | 0/1/0 |
| globe | SCREEN | - | 14 | 2/11/8 |
| hangarnew | SCREEN | - | 8 | 2/17/0 |
| hubscreen | SCREEN | - | 5 | 3/18/1 |
| landmarks | DATA | - | 0 | 0/0/0 |
| looks | SCREEN | - | 1 | 0/5/3 |
| margin | LOGIC | - | 1 | 1/1/0 |
| nature-unknown | SCREEN | - | 1 | 3/0/0 |
| newplayer | SCREEN | - | 5 | 6/1/0 |
| offline | SCREEN | - | 9 | 1/6/0 |
| onlinesave | SCREEN | - | 7 | 10/9/0 |
| pickupgates | LOGIC | - | 1 | 0/1/0 |
| projectart | DATA | - | 2 | 1/4/0 |
| regions | LOGIC | - | 9 | 3/18/2 |
| reset | LOGIC | - | 1 | 6/1/0 |
| season2 | SCREEN | - | 4 | 31/21/0 |
| season2-smoke | SCREEN | - | 4 | 7/34/0 |
| sim-bank | CONTRACT | - | 0 | 8/0/0 |
| sim-masks | CONTRACT | - | 0 | 6/0/8 |
| sim-rng-split | CONTRACT | - | 0 | 3/0/1 |
| stormart | SCREEN | - | 2 | 0/1/6 |
| swipe | SCREEN | - | 18 | 0/31/12 |
| terrain | DATA | - | 1 | 6/1/0 |
| textfit | SCREEN | - | 1 | 0/2/1 |
| treelayout | DATA | - | 2 | 1/4/0 |
| treepic | SCREEN | - | 2 | 3/6/1 |
| twilight | LOGIC | - | 0 | 0/0/0 |
| welcome | SCREEN | - | 3 | 2/9/0 |
| wildfield | SCREEN | - | 5 | 7/11/1 |

## Classic triage, step 1: what the shipped game does with the 75 classic tests (measured 2026-10-27)

Classic is RETIRED (user decision, 2026-10-27): `index.html` forces season 2 for everyone and the old classic save is never read, so no player can reach classic and there is no classic smoke to keep. 75 of the 78 browser tests `require('./lib/classic.js')` (1674 s of the 2014 s baseline). Method: `SHIPPED=1` makes `tests/lib/classic.js` run the SAME test against the shipped game (an `s2:` storage-key shim; a save with no `areas` gets `areas ['weurope'], homeArea, city LONDON` so the start choice does not cover TAKE OFF). Shim proven first: the same page reports `window.SEASON2 false` without it and `true` with the season-2 tag showing under it. `tools/shipped-probe.sh`, once per test, no retries, 150 s limit; probe 1 = all 75 (12 passed, 63 failed, 54 of them a 32 s TimeoutError = the start choice), probe 2 = the 63 with the start-area shim.

**RESULT: 40 of 75 pass UNCHANGED in the shipped game; 35 still fail.** A pass means the rule survives in season 2 and the test is re-homed by making the shipped game its default (no classic.js). It does NOT yet mean its planted defect is re-proven in the new mode: that is still owed per test (a test can pass vacuously). Seconds are the 0.15.0 baseline.

### Rule survives (pass in the shipped game as is), 40 tests, 865 s of baseline

atc (9), badgeart (8), badges (3), cache (46), collisions (12), controls (40), crash (13), crystals (49), eras (12), everyleg (12), faces (6), fares (21), flight (79), forecast (8), forest (57), forestmeter (10), gaphint (24), hazards (38), issr-reveal (24), lanes (76), margin (8), nature-unknown (3), pickupgates (21), pixelpreview (14), ponds (32), powerups (8), projectart (7), reset (10), runway-back (8), savesafe (14), season2-smoke (58), sim-masks (6), sim-rng-split (8), stormart (4), textfit (10), textures (2), treelayout (6), twilight (3), updates (79), welcome (16)

### Fail in the shipped game, 35 tests, 808 s of baseline: each needs a decision from its failure (DELETE if the rule is gone / PORT to the season-2 screens or to Node)

| test | baseline s | first failure line in the shipped game |
|---|---|---|
| banners | 13 |   name: 'TimeoutError' |
| biodiversity | 11 |   name: 'TimeoutError' |
| features | 22 |   name: 'TimeoutError' |
| fields | 8 |   name: 'TimeoutError' |
| fleetfacts | 7 |   name: 'TimeoutError' |
| flightregion | 11 | FAIL |
| gate | 17 |   name: 'TimeoutError' |
| globe | 20 | FAIL |
| hangar | 25 |   name: 'TimeoutError' |
| hangarnew | 9 |   name: 'TimeoutError' |
| journey | 32 |   name: 'TimeoutError' |
| landmarks | 5 | FAIL |
| links | 4 |   name: 'TimeoutError' |
| looks | 22 |   name: 'TimeoutError' |
| missions | 50 | FAIL |
| nature | 26 |   name: 'TimeoutError' |
| newplayer | 23 |   fails: [ |
| offline | 56 | FAIL |
| online | 29 | page.evaluate: TypeError: Cannot read properties of null (reading 'length') |
| onlinesave | 36 |   name: 'TimeoutError' |
| progression | 38 |   name: 'TimeoutError' |
| regions | 11 |   name: 'TimeoutError' |
| restore | 16 | FAIL |
| rewards | 28 | FAIL |
| school | 74 |   name: 'TimeoutError' |
| season2 | 44 |   fails: [ |
| sim-bank | 7 | FAIL |
| swipe | 29 | FAIL |
| terrain | 22 |   fails: [ |
| tours | 37 |   name: 'TimeoutError' |
| treepic | 10 |   fails: [ |
| upgrades | 12 |   name: 'TimeoutError' |
| wild | 16 |   name: 'TimeoutError' |
| wildfield | 16 |   name: 'TimeoutError' |
| wildlife | 25 | FAIL |

Reading the failing set by what the tests need (judgement, to be confirmed one by one): (a) ONLINE features that are dormant until M8 (online, onlinesave, restore, newplayer, tours' name step, offline): the rule exists in code but is not reachable in season 2 -> park in a DORMANT list, not delete; (b) the OLD-HUB SCREENS (hangar, hangarnew, nature, wild, wildfield, regions, fields, biodiversity, looks, upgrades, progression, rewards, school, missions, journey, fleetfacts, gate, links, features, banners, tours, treepic, terrain, wildlife, flightregion, globe, swipe): the season-2 hub replaced the buttons and flow they click, so each is PORT (new selectors) or, where the rule is only classic's (missions' index flow, journey's London-first choices, season2's preview switch), DELETE with the season-2 Node tests (missions2/4, areas) as the replacement; (c) `sim-bank` fails in the shipped game because its Node side is not season 2 (a CONTRACT test: fix the engine side, not the game).

**Classic code paths now dead for players** (note for later removal, not removed in this pass): `window.SEASON2_FORCE === false` branches, `?season2=off` and the preview switch in `src/season2.js`, the classic mission index flow (`save.mission`, `MISSION n/N`), the London-first `schoolSave`/`HOME` path in `src/route.js`, `?newplayer=1` (`src/newplayer.js`), and the old-save migrations (`trees` -> seeds, eras reset, welcome cards) which only an old classic save can reach.
