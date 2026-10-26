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
4. Full `tools/test.sh` (2 shards locally; count failures). Stage only your own paths: other chats share the tree.
5. Commit, push to `main`, watch CI to "deploy success" and the `tag` job. The live game updates players on their next visit.

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
- `tests/offer-gate.cjs` (Node): the gate cannot offer early (`PLANT=nogate` must fail), `SEASON.maxEra`, `recordAreaBest`.
- `tests/sim-crossing.cjs`, `tests/areas.cjs` (Node): crossing flights in the engine, areas do not leak.
- `tests/sim-equiv.cjs` (Node): the engine flies the game's recorded flights; the golden is the CLASSIC world with the 0.12.0
  storms (STORMS startGap 200, gapShrinkPerPair 2), re-recorded on purpose with `tools/sim/trace.cjs` (which also runs classic).
NOT covered in season 2 yet: the rest of the suite (hangar, missions, nature, flights...) exercises the classic wiring of the
same code; the season-2-only parts are the files above. Add a test here when a season 2 feature is added.
