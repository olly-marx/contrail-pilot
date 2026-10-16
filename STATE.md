# Contrail Pilot — state of the work

Read this first in a new session. Last updated 2026-10-16.

## What this is

A Flappy-Bird-style pixel web game about contrails for the Great Exhibition Road Festival, built
for Oliver's Imperial contrail research group. Phaser 3, static site, no build step.

- Live: https://olly-marx.github.io/contrail-pilot/ (GitHub Pages, deployed by
  `.github/workflows/deploy.yml`: all `tests/*.cjs` run in headless Chrome first; a failure blocks
  the deploy). Repo: github.com/olly-marx/contrail-pilot (public; needed for free Pages).
- Design plan (Claude doc, kept roughly in sync, "As built" notes in the Progression section):
  https://claude.ai/code/artifact/f83412c6-0386-4b2c-9bb0-e1ff46b3b8fa
- `README.md` has the file map and how to run the checks.

## What is built (all live as of commit 792672e)

Flight with takeoff, airports every 1500 m (glide onto a runway to land or fly on), storms,
hidden ISSRs that fade in near the plane, contrails, day/night with sunlight beams blocked by
contrails (cooling) and night heat trapped (warming), CO2 gauge (left) and Earth heating bar with
face (right), overheat ending. Tree tokens float in the sky as cargo, banked only on a safe
landing, x1.5 per airport skipped. Hangar with 7 levelled upgrade lines that unlock gradually
(fuel/engines after 3 landings, nature after the first tree), free first upgrade after the first
landing, info pop-ups with Learn more links. Parcel-drop planting onto soil plots (parachute,
forward drift, aim X). Wild Land biodiversity meter across flights (variety beats quantity;
spruce, then native birch/oak/rowan/fruit) and rewilding projects (meadow → hedgerows → pond →
water voles → beavers → storks) visible in the world. Hazards: turbulence from 2.5 km, no-fly
zones from 5 km, birds from 10 km. Flight School (guided first flight with Captain Cumulus) and
one-time pause-and-explain for every new mechanic (`explain()` in GameScene; `seenTips` holds
seen ids; `'*'` in seenTips skips all, used by tests). Arcade-style results reveal.

## Decisions (don't re-litigate without the user)

- Trees are only kept on a safe landing; crash/overheat loses all cargo. No distance trees.
- Leaderboard ranks the longest LANDED flight, not "coolest" (a tiny hop would win otherwise).
  Not built yet: needs a Supabase project from the user.
- Real trees: a "Plant a real one" link out to Citizen Zoo behind a hold-2-seconds grown-up gate;
  the game takes no payments.
- ISSRs: the user prefers the LIGHT pale-cloud look (pale ice fill, faint sparkles). Not dark.
- Language for 7-10 year olds; screens show little text, things are taught in play.
- Physics is deliberately simplified (daytime contrails are not always net cooling); stand
  staff should say so if asked.

## Working arrangement with the art session (important)

A second Claude session ("Contrail game artwork") works in this same tree, drawing PNGs with
`tools/art/make_sprites.py` and `tools/art/make_background.py` into `assets/`, and editing
`src/GameScene.js` (preload, makeTextures, runway/plot code) and `src/Hud.js`.
Agreed split: it commits only its own files/hunks as small art commits; this (game) session owns
pushing to main. NEVER `git add -A` here: stage your own paths only (`git apply --cached` for
hunks). Uncommitted art files in `git status` belong to that session; leave them.
Gotcha that broke the live site once: `makeTextures()` returns early if a guard texture exists;
when a texture moves to a PNG the guard must be a code-only key, or better a per-key
`if (!this.textures.exists(key))` skip (asked the art session to do this).

## Open questions waiting on the user

1. URLs for Merrick's contrail-forecast site and the Imperial project page (`src/links.js`,
   currently "coming soon").
2. Supabase project (URL + anon key) for the shared leaderboard and festival tree counter.
3. Should the landing X for parcels be an upgrade ("Drop sight") rather than free?
4. Should trees planted on a flight that later crashes count for Wild Land? (currently yes)
5. Fact-check by the group / Citizen Zoo of the nature facts in `src/nature.js`.
6. Pace: first upgrade after ~2 good flights; maybe faster for a festival (3-6 flights a kid).

## Possible next work (not yet asked for)

Leaderboard (Supabase), more hazards (downdrafts, volcanic ash, crosswinds), pixel art for the
remaining code-drawn textures (art session), cache-busting for deploys (phones keep old JS ~10
min), festival kiosk mode and QR poster.

## Checks

`python3 -m http.server 8000` in the repo, then `NODE_PATH=<dir with playwright-core>
node tests/<name>.cjs` for flight, issr-reveal, progression, school, hazards, nature. Each was
validated by planting a defect and seeing it fail. The local scratch install used so far is
`/tmp/cp-test/node_modules` (may be gone after a reboot: `npm i --no-save playwright-core`).
