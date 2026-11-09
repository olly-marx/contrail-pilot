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
5. Commit, push to `main`. **CI then deploys only if the tests are green: if the branch run's marker `ci-ok-<sha7>` points at exactly this commit the test matrix is skipped (see "Fast deploys" at the end), otherwise the whole suite runs on 8 shards first** (`deploy` needs `decide`). Watch `version.json` for the new version (not the GitHub API: its unauthenticated quota is 60 requests an hour). The live game updates players on their next visit.
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
- **The planner** (`tools/gate-plan.py`, `tests/PATHMAP`): appending lines to `tests/GATE|DEEP|BROWSER|PATHMAP` is NOT a harness change (the plan is the new tests + what the rest of the diff maps to); editing or removing a list line, or touching `tests/lib/*`, `tools/gate*.sh`, `tools/test.sh`, `tools/gate-plan.py`, still means the whole browser tier. `gate.sh --lint` fails on a tracked file no group maps and on a browser test in no group. It also fails on a PLANT pair that is not routed (2026-11-07): every `tools/plants.tsv` row on a browser test says "a defect in FILE fails TEST", so a group matching FILE must name TEST (or TEST is smoke / CI-only); otherwise the local gate cannot catch that defect. A new plant row for a test the file does not already select needs its group line in `tests/PATHMAP` (an append).
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

## Proving plants: commit first (found 2026-11-03)
`tools/prove-plants.sh` SKIPS a plant whose target file has uncommitted edits (it must be able to restore the file from git), and it reports `SKIP ... has uncommitted edits`, which can read like a pass in a long log. Commit the file before proving plants that edit it (this hid 17 of 21 `releasegate` plants once, because the plants edit tests/PATHMAP and the PATHMAP change was not yet committed). A plant that only reports `NOT APPLIED` after a source change is STALE (it quotes text that moved): replace it. A plant that edits a `position: fixed` element inside a transformed ancestor is an equivalent mutant. Owed: the `releasegate` plant "onboarding changes no longer run firsthour-real" is NOT CAUGHT even on clean main (a weak plant: make it real or drop it).

## The branch run: the exact-commit proof on GitHub (2026-11-03, approved by the user; phase B is NOT decided)

**What it is.** Pushing a commit to a branch named `ci/<name>` starts `.github/workflows/verify-branch.yml`: the SAME test shards as the main CI (8 shards since 2026-11-09; one copy in tests.yml) (every `tests/*.cjs`, 189 files today), run remotely, no deploy and no release tag. `tools/test.sh` retries a failing test once and calls a pass-on-retry FLAKY (exit 0); the workflow fails the shard when the runner reports ANY flaky test (a `grep` on its output), so a flaky test cannot hide. When it ends, a `report` job writes ONE marker tag on that commit: `ci-ok-<sha7>` or `ci-fail-<sha7>` (a cancelled run writes none). It takes about 20 minutes and uses no CPU or memory on the release machine.

**Reading the answer (zero REST API calls).** `S=$(git rev-parse HEAD | cut -c1-7); git ls-remote --tags origin "ci-*-$S"`: `ci-ok-<S>` = green, `ci-fail-<S>` = red, nothing = not finished (poll every 2-3 minutes at most; no marker after 30 minutes means investigate, never "assume green"). The web UI shows the shard logs. Do not poll `gh run view`: the REST quota is shared by every agent and has run out twice.

**The rule, in two phases.**
- **Phase A (the first 5 releases after adoption): both.** Run the local `tools/gate.sh --release` exactly as today AND push the SAME commit to `ci/<name>`. Push to `main` only when the local gate is green (0 failed, 0 flaky, both tiers read separately) AND the marker is `ci-ok-<sha7>` for that exact sha. If the two ever disagree (local green, branch red or the reverse) stop and find out why: that disagreement is the evidence for or against phase B.
- **Phase B (if phase A showed no unexplained disagreement): the branch run is the exact-commit browser proof.** Locally run: `tools/check-release.py`, the lints, the Node tier (`tools/gate.sh`, ~45 s) and the smoke set (a new `tools/gate.sh --release --smoke` to be built), then push the exact commit to `ci/<name>` and wait for the marker. Push to `main` with `git push origin <that sha>:main` (a fast-forward; main must be an ancestor). A RED marker (`ci-fail-<sha7>`) means NO push to `main`: read the failing shard in the web UI, fix, commit, push a new sha (a new run), never push a red sha.
- **The exact-sha rule is unchanged:** any new commit (even a doc edit) is a new sha and needs its own marker. A marker for another sha is not evidence.
- **Push-now** (blocking bugs, see above) may still skip the branch run; the local gate and the main CI then apply as today.

**What stays local, always.** `check-release`, the lints, the Node tier and the smoke set (fast, catch the obvious); `tools/prove-plants.sh` (a plant edits a file in a worktree: commit first); every load-sensitive reproduction (busy `node -e "for(;;);"` loops, killed by exact PID): the GitHub runners are quiet VMs, so a test that fails only under this machine's load PASSES there; measurements (`tools/ux-measure.cjs`, timings); anything that needs the machine's own browser state. The branch run does NOT cover WebKit/iOS (Chrome only, like the local gate) or the live-site checks (service worker against the deployed host, `version.json`).

**What the main CI does.** On `push: main` the gate job skips the test matrix when `ci-ok-<sha7>` points at exactly this commit (see "Fast deploys"); otherwise it runs the shards (with the retry-once rule) and deploys if green; then it tags `vX.Y.Z`. The branch run adds a stricter proof BEFORE main; it does not replace the main run (phase 2 of the proposal, "skip main's tests when a green marker exists", is not part of this change). `tools/test.sh` and `deploy.yml` are not changed by the branch run, so main's behaviour (retry once, a flaky test is a warning) is exactly as before.

**Cleaning up (monthly sweep by the release manager).** Every `ci/*` branch and `ci-*` marker tag the release manager creates is listed in `~/contrail-research/BRANCH-CI-CREATED-REFS.txt`. After a branch has been fast-forwarded into `main` (or abandoned), delete it: `git push origin --delete ci/<name>` and its markers `git push origin ":refs/tags/ci-ok-<sha7>"` / `ci-fail-<sha7>`. Once a month sweep anything older than 14 days that is on that list. Never delete a ref that is not on the list (other chats' branches, `vX.Y.Z` tags, `main`). A chat that pushes its own `ci/<name>` adds it to the list (or tells the release manager).

**Cost and limits.** The repository is public, so Actions minutes are free; a branch run is 8 shard jobs (+1 report; it was 4 before 2026-11-09) and two runs started together all started within 2 s. The 20-concurrent-job limit of the free plan is untested beyond 8 jobs. A new push to the SAME `ci/<name>` cancels the run in progress (own concurrency group, never `pages`, so it cannot cancel a main run).

## Fast deploys: the deploy gate, 8 shards, dry runs (user decision 2026-11-09)

Why: a release used to cost two full test runs on the same commit (branch run about 20 min, then main's run about 20 min). Now main's deploy skips the test matrix when the branch run already passed that exact commit. Design and safety argument: research/CI-FAST-DESIGN.md.

How it works. deploy.yml starts with a `gate` job (`tools/ci-gate.sh gate <full-sha> <event>`). It prints skip=true only when the event is a push, the sha is 40 hex characters, exactly one tag `ci-ok-<sha7>` exists, that tag points at exactly the full sha, and no `ci-fail-<sha7>` exists. Anything else, including an error reading the tags, prints skip=false and the tests run as before. A manual dispatch always runs the tests. The `decide` job (`tools/ci-gate.sh decide`) is the one place that says whether the deploy may run: it deploys after skip=true with a skipped test job, or after skip=false with a successful test job, and never after a failed, cancelled or contradictory state. The marker is written only by the `report` job of verify-branch.yml, after every shard passed with no flaky test.

What this means for a release: push the branch run (`ci/<name>`), wait for `ci-ok-<sha7>` on the exact sha, fast-forward main to that sha. Main's run then shows the test job skipped and deploys in about 2 minutes. If you push a sha without a marker, the tests run (about 10 minutes at 8 shards) and the deploy waits for them.

Shards. tests.yml is the only copy of the test matrix; verify-branch.yml (strict: a pass-on-retry fails the shard) and deploy.yml (retry-once, as before) both call it. The shard count is the length of the matrix list. tools/test.sh balances the shards by tests/DURATIONS.tsv (seconds per test on a runner) and prints `shard k/N: predicted P s, actual A s` into every shard's summary. Regenerate the file with `tools/durations.sh <run-id>` from a green branch run when the slowest shard is more than 1.25 times the mean of the shards, and after adding a test over 60 s. A test missing from the file counts as the median. Go from 8 to 10 shards only after 8 runs clean and the slowest shard is still over 8 minutes; GitHub's documented limit is 20 concurrent jobs on a Free account.

Dry runs. A push of a commit to `ci-dry/skip-<name>` or `ci-dry/run-<name>` runs deploy.yml from that commit with nothing deployed and nothing tagged (the test job only echoes, the deploy and tag jobs are skipped). The `dry-check` job compares what the gate decided with the expectation in the branch name and goes red on a mismatch: `skip-*` expects the tests skipped, `run-*` expects the tests to run. Before a change to deploy.yml, tests.yml, verify-branch.yml or tools/ci-gate.sh reaches main: (1) a branch run of the exact sha gives its marker; (2) the same sha pushed to `ci-dry/skip-<name>` must be green and show `tests skipped`; (3) a descendant commit without a marker pushed to `ci-dry/run-<name>` must be green and show the shards running; (4) a copy with the marker check removed, pushed to `ci-dry/run-plant`, must be RED. Delete the `ci-dry/*` branches afterwards and record them in the created-refs list.

Risk. If the gate job itself has a bug it fails closed: the tests run. If the gate job cannot start at all (checkout fails), nothing deploys until the run is re-run; that never deploys an untested commit.

When GitHub is down or the gate misbehaves (the speed-up is never the only path). Five steps, done by a human:
1. Run the whole local gate on the exact commit: `tools/gate.sh --release` (the Node tier and the planned browser tests).
2. Push the commit to `main` as a fast-forward. If the gate job skips the tests wrongly or cannot run, open Actions, Test and deploy, "Run workflow" on `main`: a manual dispatch always runs the full test matrix and deploys when it is green.
3. If Actions itself is unavailable, wait: nothing deploys without Actions, and nothing untested deploys.
4. After the deploy, check `version.json` on the live site shows the new commit and version, and that the tag `vX.Y.Z` exists.
5. A bug in `tools/ci-gate.sh` is fixed by reverting the commit that changed it; `git revert` of the workflow files restores the old two-run behaviour (the previous deploy.yml is in the history, 76e0326).
