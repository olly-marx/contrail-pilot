# Proposal: a release gate in seconds (bug-fix chat, 2026-10-28)

Status: PROPOSAL ONLY. It replaces the user's standing push rule ("a full 2-shard run on the exact commit, 0 failed, 0 flaky"), so the USER decides. Nothing is built; the tooling is described in section 5 and I build it after the answers.

## Decisions for the user (answer these and I can build it)

1. **Replace the full local 2-shard run (17-20 min) with: the Node gate (~10 s) + a small SMOKE set of browser tests (~70 s wall) + only the browser tests whose declared files the change touches?** Everything else runs in CI after the push, as it does today. Recommended yes (evidence in section 2: CI already blocks the deploy; the local full run caught no game bug in this session).
2. **If CI goes red after a push:** I stop releasing, fix forward or revert within the hour, and tell the Coordinator. Players are not affected (the deploy job needs the tests, section 2). OK?
3. **The smoke set** (section 4): the 10 browser tests that always run locally. Include `firsthour-real` (70 s, the only test that plays school like a child; it found the hangar trap) or drop it for a ~50 s smoke?
4. **The path map** (section 4) is my first DECLARATION by subject; the game chat and the sim chat should correct the groups they own.

> **Amendment 2026-10-28 (the user):** `firsthour-real` is moved OUT of the always-run smoke set; it runs for onboarding-group changes (and rules.js, harness), and CI always. The smoke set is therefore 11 runs; decision 3 above is answered this way.

## 1. What a release costs today (measured, 0.16.2 run on a quiet machine)

- Browser tier: **88 tests, 2,365 s of test time**; run on 2 shards that is **17-20 min** (`postrails` 283 s, `walkthrough` 181 s, `onrails` 134 s, `updates` 72 s are the long ones). Node gate: 39 tests, 83 s of test time, **10 s wall clock** with 6 workers.
- After the push, CI runs the SAME tests on 4 shards (~10-13 min) and only then deploys. So a release is live ~30 min after the local run starts, and the local run is a duplicate of CI.

## 2. Evidence that the duplicate buys little

- **CI already blocks the deploy.** `.github/workflows/deploy.yml`: `deploy` has `needs: test` (and `tag` needs `deploy`). A red shard means no deploy: the 0.16.0 push whose shard 3 was cancelled left the live site on 0.16.1. The local run protects `main` from a red commit; it does not protect players.
- **What the local full runs caught this session** (every release run listed, cause of each failure):

| release | failures in the strict local run | cause |
|---|---|---|
| 0.15.0 | `areas`, `sim-crossing` (both Node) | tests still switched season 2 on the old way after a code change: test drift. The Node gate catches these in 10 s |
| 0.15.2 | `season2` | the new lock on TAKE OFF (as designed): the test's save needed to have picked the free part |
| 0.15.4 | `school` (flaky) | a fixed 9 s of wall clock |
| 0.15.6 | `hubscreen`, `season2-smoke` (+ `school`, `globe` flaky under load 15-19) | expectations of the old BOARDS screen; load |
| 0.16.0 | `hazards`, `atc`, `welcome`, then `onrails` (flaky) | saves modelled a brand-new player after on-rails turned turbulence off; the tour overlay; the test pilot missing a patch |
| 0.15.1, 0.15.3, 0.15.5, 0.16.1, 0.16.2 | none | |

  **Zero of these was a game bug that players would have met.** The two bugs players DID hit (the hangar trap after flight school, 0.15.2; the lost saves, 0.15.3) passed the full suite: no test existed for them. They were found by the user's play and are covered now (`firsthour-real`, `saveloss`). A longer wait does not find missing tests.
- The smoke set below would have caught the browser failures that were real expectation changes (`hubscreen`, `season2-smoke` are in it) before the push; the rest (`hazards`, `atc`, `welcome`, `school`) CI catches ~13 min later at no cost to players.

## 3. The rule (the new text for `RELEASING.md` step 4 and the user's standing push rule)

> **Release gate.** Before a push: (1) `python3 tools/check-release.py`; (2) `tools/gate.sh --release`: the declared Node tests (`tests/GATE`, ~10 s) + the browser SMOKE tests (`tests/BROWSER` class `smoke`) + the browser tests whose path globs match a file changed since `origin/main`. All must pass with 0 failed and 0 flaky. A changed file that matches no declared group fails the lint (declare it). (3) Push. CI then runs the whole suite on 4 shards and deploys only if it is green.
> **After the push** the release manager watches `version.json` (not the API: its quota is 60 requests an hour). If CI goes red: no further release until `main` is green; fix forward or revert within the hour; tell the Coordinator. A flaky test in CI is a bug to fix, not a retry to ignore.
> **Still required when the change touches the rules or the save:** `tools/gate.sh --deep` (the full sweeps) before a balance change, as today.

## 4. The declarations

**Smoke (always, locally, 4 workers): ~70 s wall, 260 s of tests.** `season2-smoke` (48 s: every starter area, tabs, no page errors), `hubscreen` (6), `firsthour-real` (70), `saveloss` (24), `records-screen` (39), `missionscreen` (25), `hudlayout` (26), `tourgiveup` (4), `textfit` (8), `crash` (10). Without `firsthour-real` the wall clock is ~50 s.

**Path map (a changed file also runs these; first match wins per file, all matched sets are unioned).** Declared by subject, not by grepping mentions (a grep of the tests names `src/hub.js` in no test although `hubscreen` tests the hub, and `records.js` in none):

| group | files | extra browser tests |
|---|---|---|
| docs and data, nothing to run | `research/*`, `*.md`, `CHANGES.json`, `src/version.js`, `tools/*`, `supabase/*`, `.github/*` (CI itself is the test) | none |
| onboarding | `src/tour.js`, `src/tips.js`, `src/missions2.js`, `src/hub.js`, `src/upgrades.js`, `src/startchoice.js` | `onrails`, `rails2`, `tipqueue`, `l4hint`, `walkthrough`; `postrails` (283 s) only when `src/missions2.js` or `src/upgrades.js` changed |
| boards and records | `src/records.js`, `src/recordsui.js` | `records-screen` (already smoke) |
| save and season 2 | `src/save.js`, `src/season2.js`, `src/areas.js`, `src/season.js`, `src/crossings.js`, `src/updates.js`, `src/main.js` | `season2`, `savesafe`, `updates`, `cache` |
| nature screen | `src/wild.js`, `src/nature.js`, `src/habitats.js`, `src/landtrees.js`, `src/wildlife.js`, `src/animalart.js` | `nature`, `wild`, `wildfield`, `regions`, `biodiversity`, `treepic`, `wildlife` |
| hangar and upgrades | `src/hangar.js`, `src/fleet.js`, `src/fleetfacts.js`, `src/upgrades.js` | `hangar`, `upgrades`, `progression`, `looks`, `fleetfacts` |
| flight rules (browser side) | `src/sim/rules.js`, `src/sim/physics.js`, `src/GameScene.js`, `src/config.js` | `flight`, `hazards`, `lanes`, `forest`, `atc`, `forecast`, `collisions` (these have Node twins in the gate; the browser copies cover the real scene) |
| menu screens and map | `src/ui.js`, `src/globe.js`, `src/cities.js`, `src/route.js`, `src/network.js`, `src/geo.js`, `src/pilot.js`, `src/swipe.js`, `index.html`, `style.css` | `globe`, `journey`, `swipe`, `hangarnew`, `gate`, `features`, `links` |
| art and sound | `assets/*`, `src/sound.js`, `src/pixellab.js`, `src/landmarks.js`, `src/Hud.js` | `textures`, `projectart`, `badgeart`, `faces`, `landmarks`, `stormart`, `pixelpreview` |
| online (parked until M8) | `src/online.js`, `src/restore.js`, `src/uploadbanner.js` | `online`, `onlinesave`, `restore`, `offline` (parked: CI only) |
| anything else | a path that matches no group | the lint FAILS (declare it); `gate.sh --release` then runs the whole browser tier locally until it is declared |

`GameScene.js`, `ui.js`, `rules.js`, `index.html` and `style.css` are in the broad groups on purpose: a change there is the likeliest to need screens, and CI backs up what the map misses.

**Expected local cost.** Docs/tools only: gate 10 s. A records or save change: gate + smoke ≈ 75 s wall. An onboarding change (what most recent releases were): gate + smoke + onrails/rails2/walkthrough in parallel ≈ 3 min wall (`postrails`, 283 s, only for missions2/upgrades). Today: 17-20 min every time.

## 5. The tooling (built after the answers)

- `tests/BROWSER` lines become `name  class  glob,glob,...` (class `smoke` or `ci`; globs optional). `tools/gate.sh --lint` fails if a browser test has no class, or a tracked `src/**`, `assets/**` or root file matches no group (so a new file cannot slip through unmapped: proved by planting one).
- `tools/gate.sh --plan [--base REF]`: prints which tests would run for the files changed since `REF` and why (the plan is checked by unit cases: a docs-only diff -> none; `src/recordsui.js` -> records-screen; an unmapped file -> lint failure).
- `tools/gate.sh --release`: lint, the Node gate, and the selected browser tests on 4 workers, one summary line with the wall clock; refuses to start if the machine is under load (`/proc/loadavg` > 10 or swap-in above ~0) because a loaded machine produced three invalid runs this session.
- `RELEASING.md` step 4 and `tools/test.sh` stay for the full run (CI uses it); the deploy workflow is unchanged.

## 6. Risks

- A defect only a non-selected browser test would catch reaches `main` red and is stopped by CI before any deploy: cost = ~13 min and a fix-forward, not a bad release.
- The map can be wrong in a way that hides a dependency: mitigated by CI, by the lint (nothing unmapped), and by tightening a group the first time CI catches something the local run did not (the failure is then a new line in the map).
- A flaky browser test now costs a CI cycle instead of a local retry: the flake policy (fix the wait, never retry blindly) is unchanged.
