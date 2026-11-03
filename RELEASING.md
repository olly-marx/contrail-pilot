# Releasing Contrail Pilot

Started 2026-10-23 (the user: "0.9 pre-release", today's batch = 0.9.1). The game is **pre-release until 1.0.0**;
the plane redesign (jet generations, ATC, weather) is the planned 1.0.

## The version

`MAJOR.MINOR.PATCH`, written in ONE place: `src/version.js`. It shows on the About screen and the crash card, goes
into `version.json` (what is live), and CI tags the deployed commit `vX.Y.Z`.

| bump | when | examples |
|------|------|----------|
| **MAJOR** | players feel a reset, or the save changes shape | the plane-upgrade reset; (1.0.0 itself) |
| **MINOR** | new content or a new feature | new regions, a new pick-up, an upgrade branch |
| **PATCH** | fixes and tweaks that add nothing new to learn | FLY ON screen, twilight timing, leg length |

Before 1.0.0, MINOR may carry a big feature and MAJOR stays 0.

## Every release

1. Bump `src/version.js`.
2. Add an entry at the TOP of `CHANGES.json`: `id`, `version` (the same), `date` (YYYY-MM-DD), `level`, `notes`.
   - `level`: `minor` = the update banner only; `major` = also a one-time "What's new" card (use it for MINOR/MAJOR releases).
   - `notes`: short sentences a 7-10 year old can read. The banner shows the FIRST one, so lead with the headline.
3. `python3 tools/check-release.py` (also `tests/release.cjs`): version and top entry must agree; versions must fall down the list.
4. **The release gate** (the user's decision, 2026-10-28, replacing the full local 2-shard run): `tools/gate.sh --release`. It runs the Node gate (`tests/GATE`, ~10 s), the browser SMOKE tests and the browser tests of every group in `tests/PATHMAP` that a file changed since `origin/main` matches, all at once (about 1-3 minutes). It must end `RELEASE GATE: Node gate PASS, N browser test(s), 0 failed`. It refuses a loaded machine (load average above 10 or swap-in) and a changed file that no `tests/PATHMAP` group declares (declare it: `tools/gate.sh --lint`). `tools/gate.sh --plan` shows what a change would run and why. Stage only your own paths: other chats share the tree.
5. Commit, push to `main`. **CI then runs the whole suite on 4 shards and deploys only if it is green** (`deploy` needs `test`). Watch `version.json` for the new version (not the GitHub API: its unauthenticated quota is 60 requests an hour). The live game updates players on their next visit.
6. **If CI goes red** after a push: stop releasing until `main` is green; fix forward or revert within the hour; tell the Coordinator. Players are not affected (a red CI never deploys). A flaky test is a bug to fix (wait on game state, never on a fixed time), not a retry to ignore.

**A change to `src/sim/rules.js` (or `physics.js`, `world.js`) that alters behaviour ON PURPOSE** makes `tests/sim-equiv.cjs` fail: it replays 18 flights the game recorded. Re-record that golden from the browser, deliberately, and say so in the commit; never loosen the check. `sim-bank`, `sim-masks` and `sim-rng-split` (game versus engine) are necessary but not sufficient for a rules change, which is why `rules.js` pulls the whole `engine-core` group in `tests/PATHMAP`.

**Push-now** (pushing before the gate has finished) may be authorised ONLY for a bug that blocks players: they cannot play, or they lose saves (the user, 2026-10-28). Even then the gate keeps running and a red result is fixed forward at once. Every other release waits for the gate.

**What the smoke set is** (`tests/PATHMAP`, 11 runs, ~100 s wall): `season2-smoke` in 4 parallel pieces, `hubscreen`, `saveloss`, `records-screen`, `missionscreen`, `hudlayout`, `tourgiveup`, `textfit`, `crash`. `firsthour-real` (80 s, the only test that plays flight school like a child) is NOT in it: it runs for onboarding, engine-core and harness changes (user, 2026-10-28), and CI always runs it.

The full browser suite locally (`tools/test.sh`, 17-20 minutes) and the full sweeps (`tools/gate.sh --deep`) stay available for a risky change or a balance change; the old rule "a full 2-shard run clean before every push" is retired (research/PROPOSAL-RELEASE-GATE.md has the evidence: in this session's full local runs every failure was a test that needed updating or a flake, none a game bug; the two bugs players met had no test).

Commit subjects start with `fix:`, `feat:` or `chore:` (or `art:` for pictures), so the bump size is visible at a glance.
Entries before 0.9.1 have no `version`: they predate this scheme.

## Branches

- `main` is live: every push deploys (after the tests). Small fix chats commit straight to `main` as PATCH releases.
- Big upgrades (the plane eras) are built on a `feat/<name>` branch and merged when the whole thing works. If something
  must land half-built, hide it behind a switch in `FEATURES` (`src/config.js`). Rebase on `main` often.
- Roll back by reverting the commit (a revert deploys like anything else) and releasing a new PATCH: never reuse a version.

## Season 2 is the shipped game (0.12.0): what tests it

`index.html` turns season 2 on for everyone. Almost the whole browser suite still runs the CLASSIC game: each test
requires `tests/lib/classic.js`, which sets `window.SEASON2_FORCE = false` first (declared, not inferred). These cover the
shipped mode itself, so a change to it must keep them green:
- `tests/season2.cjs` (browser): the shipped default boots into season 2 (`SEASON2_FORCE` undefined -> on, no exit link, flag
  never written), the `s2:` save prefix, the start-area choice, area confinement, the crossing card and flight, the offer gate in
  the browser (4,549 km not offered, another area's flight does not count, 4,550 km + biodiversity 30 offered), a landed flight
  records `areaBest`, the MORE TO COME card.
- `tests/season2-smoke.cjs` (browser, NOT classic): fresh start, the six starter areas, one school flight start per area (from your own city, not London > Paris), the tabs, the offer card + a crossing flight start, MORE TO COME. Planted defects are listed in its header.
- `tests/offer-gate.cjs` (Node): the gate cannot offer early (`PLANT=nogate` must fail), `SEASON.maxEra`, `recordAreaBest`.
- `tests/sim-crossing.cjs`, `tests/areas.cjs` (Node): crossing flights in the engine, areas do not leak.
- `tests/sim-equiv.cjs` (Node): the engine flies the game's recorded flights; the golden is the CLASSIC world with the 0.12.0
  storms (STORMS startGap 200, gapShrinkPerPair 2), re-recorded on purpose with `tools/sim/trace.cjs` (which also runs classic).
NOT covered in season 2 yet: the rest of the suite (hangar, missions, nature, flights...) exercises the classic wiring of the
same code; the season-2-only parts are the files above. Add a test here when a season 2 feature is added.

## The release gate in practice (2026-11)
- **Run it on the EXACT commit you push** (`tools/gate.sh --release`, `BJOBS=3` is the working setting): 0 failed, 0 flaky, or it does not go. A targeted re-run of a failed test is not a substitute; a fix is a new commit and a new full gate. Start it only when the 1-minute load is under 8 (the gate itself peaks at ~28-31); record the start and peak load in the report. A narrow change plans a narrow gate (a 0.25.1 route-header fix was 56 of 108 browser tests, ~13 min; a change to a harness file is the full tier, ~23 min).
- **The planner** (`tools/gate-plan.py`, `tests/PATHMAP`): appending lines to `tests/GATE|DEEP|BROWSER|PATHMAP` is NOT a harness change (the plan is the new tests + what the rest of the diff maps to); editing or removing a list line, or touching `tests/lib/*`, `tools/gate*.sh`, `tools/test.sh`, `tools/gate-plan.py`, still means the whole browser tier. `gate.sh --lint` fails on a tracked file no group maps and on a browser test in no group.
- **Plants** (`tools/plants.tsv`, `tools/prove-plants.sh`): a gate is not a gate until a planted defect makes it FAIL and removing the plant makes it pass. A plant must change real behaviour, and the control must run first. A fix that lives in two files (each half covers the other) needs a JOINT plant: the file column takes `fileA,fileB`, the same sed script runs on each, each must change. Never plant in a file with uncommitted edits.
- **A test that is flaky under load is a bug.** Reproduce it on purpose (about `nproc` busy `node -e "for(;;);"` loops, killed by exact PID: never `pkill`/`pgrep` a pattern) before claiming a fix; if the old code does not fail under that load, the fix is not proven.
- **Measuring caches/network in a browser:** Playwright's `page.route` switches the HTTP cache off (refuse hosts with `--host-resolver-rules` instead); `ignoreHTTPSErrors` makes Chrome skip caching (trust a self-signed cert with `--ignore-certificate-errors-spki-list`); CDP `requestWillBeSent` fires for cache hits too (also read `requestServedFromCache` / `fromDiskCache`); a script-created Image has no initiator stack (mark your own requests with a header).

## The loading screen (0.24.0 / 0.24.1)
`src/preload.js` DECLARES every menu picture in two tiers (built from the game's tables, never a directory scan); `src/loader.js` draws the loading screen (a code-drawn contrail with a real files counter), loads tier 1 beside Phaser's own files, then fetches tier 2 one file at a time while the game is idle; `loading.flying` is DECLARED by the scene (set in `GameScene.startFlight`, cleared by `onFinish` / `backToMenu`), the pump never fetches while it is on. Tests: `tests/preloadlist.cjs` (Node), `preloadgate`, `flagclear`, `loadercount` (browser, each with plants). A new picture under `assets/ui` or `assets/pixellab/ui` must be declared in a tier, in `UNUSED`, or fail `preloadlist`.

## The service worker (0.25.0)
Offline play and Add to Home Screen. `sw.js` (per-build cache `cp-<BUILD>`; the shell is network-first with a 3 s timeout; `version.json` is never cached; pictures are cache-first and never revalidated; an install-time diff of `assets-manifest.json` copies unchanged pictures forward and fetches changed ones), `src/swreg.js` (registers only on a `?v`-stamped page, so local copies and every test stay worker-free), `manifest.webmanifest`. **`tools/make-site.sh <out> <build>` is the deploy's bundling** (stamps every URL, writes `version.json`, `sw.js`'s BUILD and `assets-manifest.json`); `deploy.yml` and the SW tests run the same script.
- **Kill switch:** a file `SW-OFF` at the repo root writes `"sw": false` into `version.json` at the next deploy; every page then unregisters its worker and clears every `cp-*` cache (and a worker that is only now updating refuses to install). `?nosw=1` does the same for one page. Use it FIRST if the live site misbehaves, debug second.
- **Tests:** `tests/swoffline.cjs` (a cold start with the server gone) and `tests/swkill.cjs` run on Playwright, hosted under `/contrail-pilot/` like Pages; `tests/swupdate.cjs` (A -> B -> C -> a slow index.html; the player must end on the newest build) runs on RAW Chrome (`tests/lib/rawchrome.js`, DevTools over Node's WebSocket, no Playwright): under Playwright the worker updates stalled in ~1 run in 3 (a tooling artefact: 0 stalls in 13 raw runs). Never write a service-worker UPDATE test on Playwright.
- **Pitfalls found (do not relearn):** cached code loses its `?v=` in `import.meta.url` (return a fresh `Response`; `updates.js` reads the stamp from `main.js`'s script tag too); `cache.match(..., {ignoreSearch:true})` scans every entry; Chrome does not honour `skipWaiting` inside install while pages are open (the page posts `{skip}`); an `unregister()` can queue behind other jobs (never await it in install or the kill path); `waitForFunction` with an async predicate is always true (poll with `evaluate`).
- **After a deploy that touches it:** diff the live site against a local `tools/make-site.sh` build (`assets-manifest.json` must be identical), run `swoffline` against the live URL once (read-only: reopen the profile with the host unresolvable), and watch the site for a window. iOS Safari is untested.

## Known exception: `tests/walkthrough.cjs` is NOT a real-taps-and-real-flight test
The rule since 2026-10-27 is that the walkthrough/rails tests use real taps and a real flight, no skips or hooks. `onrails` and `postrails` keep it (real mouse events, the pilot reads game state and taps). **`walkthrough` does not and never fully did**: its `fly()` sets `graceUntil`, replaces `hitsStorm` / `hitBird` with `() => false`, moves the next airport 1e7 px away, calls `applyFlap()` directly, zeroes `heat` every tick and ends the flight with `finish({ landed: true })` after patching the result fields. It tests the screens AFTER a flight (the lessons, the claims, the hangar lead), not the flight. Do not cite the rule as fully held; `research/TEST-SPEED-5.md` has the full list. (Found 2026-11-03 while classifying the waits of the five slowest browser tests.)

