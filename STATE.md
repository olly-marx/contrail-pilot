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
forward drift, aim X). Biodiversity meter across flights (barren land -> grassland -> young woodland -> forest -> rainforest; was "Wild Land") (variety beats quantity;
spruce, then native birch/oak/rowan/fruit) and rewilding projects (meadow → hedgerows → pond →
water voles → beavers → storks) visible in the world. Hazards: turbulence from 4 km, no-fly
zones from 8 km, birds from 10 km. Flight School (guided first flight with Captain Cumulus) and
one-time pause-and-explain for every new mechanic (`explain()` in GameScene; `seenTips` holds
seen ids; `'*'` in seenTips skips all, used by tests). Arcade-style results reveal.

Wildlife that grows with Biodiversity (`wildlifeScene()` in `src/nature.js`): bare land = a few
cows/sheep, a few identical spruce, empty sky; rising meter adds trees of the planted kinds, wild
animals (rabbit 8, hedgehog 20, fox 40, deer 65) and harmless sky birds (robin 8, swallow 20,
buzzard 40). Extend `WILD_ANIMALS`/`SKY_BIRDS` as new regions unlock. Exhaust plume: grey puffs as
dark as CO2 (`kit.smoke`) plus white water-vapour wisps (`kit.vapour`, hydrogen 2.5x). Greener
Cabin upgrade line (veggie meals, no single-use plastic, only food ordered, lighter trolleys;
-2% to -8% CO2, unlocks after 1 landing); its facts await the fact-check with nature.js.

Controls (2026-10-16): take-off is press-and-HOLD (`TAKEOFF` in config; letting go only slows the
roll, never fails), then "Now TAP to fly!". Tests skip the hold with `autoTakeoff: true` in the
save (test-only, like `'*'` in seenTips); `tests/controls.cjs` exercises the real hold. The parcel
aim X used to mark the screen spot, ignoring ground scroll during the fall (measured miss 58-234
px vs 32 px plots); `predictLanding()` now returns the ground spot. Soil patches 48 px, widened by
the separate Soil Patches line (64, 80). Turbulence is a bounded patch (fly over/under), from 4 km,
bump +-60, tap lag 30-120 ms. Mid-run tips (`explain()`) close only with their OK button (`#coachOk`, enabled after 0.7 s); taps on the game are ignored while a tip is up. Only the school "tap the screen" step keeps tap-anywhere.

Two currencies (2026-10-16): SEEDS (the old "trees" money: grabbed in the sky, kept only on
landing; `save.seeds`, old saves' `trees` key migrates in `loadSave()`; dropped parcels and planted
trees are still "trees") and ICE CRYSTALS (`save.crystals`, always kept, even on a crash): +1 for
passing icy air that was in your path at night without a contrail (max 3 a night), +2 for a
clean night (Night Owl); see `CRYSTALS` in config.js.
Daytime contrails earn none (not always cooling in reality). Crystals are also spent on Rewilding
(2-8 each) and the upper Radar levels (2, 5). Hangar has PLANE and NATURE tabs (`tabOf()`).
Difficulty: first 1.5 km is a warm-up (no speed-up, no gap narrowing); then speed 90 -> 140 at
0.55/s, gaps 150 -> 115 at 1 px/pair. Soil plots from 1 km (was 1.5); floating seeds start at 25%.
ISSRs are lumpy (3-5 ellipses, `inIssrShape()`), not boxes.

Collisions (2026-10-17) are pixel-accurate: the plane's drawn pixels (rotated with its tilt,
`planePixels()`) against the hazard's drawn pixels (`alphaMask()`); boxes used to crash on empty
corners (31 such placements in one sweep). Storms forgive a nick of `HAZARDS.stormForgive` (5)
pixels (`hitsStorm()`); no-fly zones and birds forgive nothing. Turbulence is cloud-shaped
(`cloudShape()`/`inCloud()`, shared with ISSRs). Every upgrade costs at least 1 ice crystal; seed
prices were cut ~30%. Soil plots from 1 km.

Review fixes (2026-10-17): no CO2 while parked waiting for the HOLD; CO2 gauge uses setSize (it
grew downward); crystals+multiplier on HUD row 2, airport sign at y 46; birds drawn pale at night;
"Flight over! Seeds lost." for any non-landing. Lightning: `flashStorm()` shows pixel-identical
flash overlays + a bolt (visual only, not in collisions), flickering twice. Biodiversity fills
faster (native 6*sqrt(n) cap 18, spruce 2*sqrt(n) cap 6; rewilding needs 3/8/15/22/32/45).

Playtest fixes (2026-10-18, Oliver's cousin): Flight School's icy-air step could get stuck if
the ISSR was missed; now school ISSRs are big, at plane height and shown at once (`bigIssr()`),
and a missed one is replaced ("Missed it!", `retry`). After any tip closes (and after skipping
school) there is a 1.2 s breather (`startGrace()`, `GRACE_MS`): plane hovers and blinks, can't
crash; the first tap ends it. The goal was confusing to a new player, so (user chose options 2+4):
Flight School is now 7 short steps (hold, tap, storm, seeds, day icy air, night icy air, land)
and ends on the How to play page (`#how`: one-line goal + 5 pictures), which GOT IT! closes to
the results; the page is also on the title screen.

Missions (2026-10-18, `src/missions.js`, `save.mission` index): the game's spine, 10 in order:
Land in PARIS; land with 5 seeds; a night with no contrail; reach AMSTERDAM; make 10 shade;
reach ROME (CO2 makes this need fuel/engines: `co2ToHeat` 1.5 = kerosene overheats ~6.5 km);
plant a tree (hard gate: Tree parcels); reach CAIRO; 5 crystals in one flight; round the world
to NEW YORK (12 airports). Route is now PARIS..TOKYO, LOS ANGELES, NEW YORK. Card on the title
(`renderMission()`), live line under the distance (`missionText`), results step `#rMission`.
Passing an airport shows "Passed X. Next: Y" for 4 s. The user dropped "Earth cooler than at
take-off" as a mission (too hard: CO2). Flight School is freeze-show-do (16 steps, 7 diagram lessons from `assets/ui/lesson-*.png`
shown in the coach bubble with the game frozen and dimmed, `#coachDim`; `ui.coach(..., pic)`);
How to play shows BEFORE Flight School (`startSchool()`), no longer after. `hud.highlight()` frames
the Earth bar during the contrail lesson.

Landing (2026-10-19): the old glide assist (from 450 m) held the plane nearly flat into storms
near airports; replaced by a landing FLARE (`AIRPORT.flare*`): only when low (<80 px), falling,
within 320 m of the runway start, and with no storm between the plane and the runway, the plane
sinks just fast enough to touch down on the runway (before its far end), burning CO2 x1.5. Far
out or behind a storm you fall freely. Signs say "get LOW to land". Tests: free fall far out,
flare lands, over-runway flare lands before the end, no flare with a storm in the way. Breather after "Now TAP to fly!"; the first tip (`explainWhenClear()`) waits for a clear
sky. School: the night step clears the day's icy air first and gives pass/fail feedback; (2026-10-19)
the day contrail step ends only 1.2 s after you leave the icy air (it froze 0.44 s after the first
contrail square before), then a dusk leg fades to night over ~6 s while you fly two storms (18
steps now). Tips school teaches (`School.TAUGHT`) are marked seen on finish or skip, so the first
real flight doesn't repeat them; the contrail step's words are honest about the bar (CO2 keeps it red) and the bubble
sits high so the ground shows. Mission 1 requires landing at the FIRST airport. Results use the
real multiplier. Not fixed (cosmetic): FREE "pick" frames overflow the hangar panel.

Citizen Zoo is behind a switch (2026-10-19, the group didn't take to it): `FEATURES.citizenZoo`
in `src/config.js`, currently false. Off hides every `[data-feature="citizenZoo"]` element (the
hangar's real-tree gate, the About section), drops `citizenzoo` Learn more links, and `cz()`
picks Citizen-Zoo-free versions of the facts. `?citizenzoo` in the URL turns it on (demos).
Possible future collaboration; nothing was removed.

## Decisions (don't re-litigate without the user)

- Trees are only kept on a safe landing; crash/overheat loses all cargo. No distance trees.
- Leaderboard ranks the longest LANDED flight, not "coolest" (a tiny hop would win otherwise).
  Not built yet: needs a Supabase project from the user.
- Real trees: a "Plant a real one" link out to Citizen Zoo behind a hold-2-seconds grown-up gate;
  the game takes no payments. (2026-10-19: the hold shows a filling bar, then reveals a real link
  the grown-up taps; it used to window.open from a timer, which phones block.)
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

1. URL for Merrick's contrail-forecast site (`forecast` in `src/links.js`, not used anywhere until
   it exists). DONE 2026-10-19: AEIS group, Brahmal Institute, North Atlantic trial news and
   Citizen Zoo links (checked in a browser); About page + title credit. Logos: the user
   supplied official files; pixel versions by the art session (`assets/ui/logo-*.png`,
   `tools/art/make_logos.py`) are on the About page, title credit and grown-up link. Get sign-off
   from Imperial comms / Citizen Zoo before the festival. `logo-aeis.png` is the real AEIS lockup
   (user-supplied 2026-10-19; greyscale, needs a light background); the dotted mark first thought
   to be AEIS is not, and is parked as `tools/art/logos/dotted-i-unknown.png`.
2. Supabase project (URL + anon key) for the shared leaderboard and festival tree counter.
3. Should the landing X for parcels be an upgrade ("Drop sight") rather than free?
4. Should trees planted on a flight that later crashes count for Biodiversity? (currently yes)
5. Fact-check by the group / Citizen Zoo of the nature facts in `src/nature.js`.
6. Pace: first upgrade after ~2 good flights; maybe faster for a festival (3-6 flights a kid).

## Possible next work (not yet asked for)

Leaderboard (Supabase), more hazards (downdrafts, volcanic ash, crosswinds), pixel art for the
remaining code-drawn textures (art session), cache-busting for deploys (phones keep old JS ~10
min), festival kiosk mode and QR poster.

## Checks

`python3 -m http.server 8000` in the repo, then `NODE_PATH=<dir with playwright-core>
node tests/<name>.cjs` for flight, issr-reveal, progression, school, hazards, nature, textures, wildlife, controls. Each was
validated by planting a defect and seeing it fail. The local scratch install used so far is
`/tmp/cp-test/node_modules` (may be gone after a reboot: `npm i --no-save playwright-core`).
