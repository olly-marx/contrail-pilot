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

## What is built (as of commit 792672e; much more since: see the NEXT TASK / Phase 1b sections and git log)

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

## Progress: missions, badges, prizes (reworked 2026-10-22, art session; supersedes the notes below)

Three systems, each with one job. Code: `src/missions.js`, `src/badges.js`, `src/rewards.js`; test `tests/badges.cjs`.
- **Missions = the lessons.** 13, in order, one idea each, most with a lesson picture: land at an
  airport, land with 5 seeds, make 10 shade, a night with no contrail, fly past an airport then land,
  plant a tree, 5 ice crystals, make your plane cleaner, reach CAIRO (or beyond), turbulence, 3 kinds of
  tree, a habitat project, round the world. No mission names a city that can end up behind you
  (Lola flew past PARIS on her first flight and the old "Land in PARIS" stranded her). Done missions
  are `save.missionsDone` (ids); `save.mission` is now the COUNT done (pilot.js, restore.js read it).
- **Badges = achievements.** 22 (`src/badges.js`), 12 tiered bronze/silver/gold, 7 secret ("???" until
  earned: Oops!, Bird Strike, Told Off, Meltdown, Close Call, Lucky 7, Seed Dodger). Each measures one
  number from the flight or the history; `save.badgeTiers` id -> tier; `save.badges` = ids earned
  (kept for restore.js). Medals `assets/ui/badge-<id>-<tier>.png` (tools/art/make_badges.py). Butterfingers
  (parcel on a runway) was dropped: possible in code, but nothing in play leads you there.
- **Prizes are claimed, never auto-paid.** Missions and badge tiers go into `save.unclaimed`; CLAIM /
  CLAIM ALL on the results screen and the FLY screen (`#tChallenges` is now "Prizes to claim").
- **Gone:** challenges and stages (`stageOf`), the +15/+1 new-city and +300/+25 lap prizes (cities feed
  Globetrotter; "Round the World in One Flight" is a badge). `missionReward`, `NEW_CITY`, `LAP` stay
  exported for restore.js. Old saves convert once on load (`migrateMissions`, `migrateBadges`), unpaid.
- Economy (from the tables, not measured in play): all badge prizes ~7,700 seeds over a whole game,
  vs ~4,000-8,000 from the old challenges + city prizes. Watch it.
- Also fixed: the HUD mission line wraps inside the bars (2 lines max); the landing multiplier is
  rounded to 1 decimal (1 + 0.7 x 3 showed 3.0999999999999996).

SUPERSEDED 2026-10-22 (see the Progress section above; the mission list, `save.mission` as an index, and
"Mission 1 requires landing at the FIRST airport" below are no longer true. Kept as history):
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

## NEXT TASK (handed off 2026-10-22): the other terrains, then global routing

Live and clean at 426c21d (CI green; CI is now ~4 min: tools/test.sh in 4 shards, one retry).
A. OTHER TERRAINS (the user's design, see "6. WILD AREA" below): every non-UK region gets what the UK
   has. Regions = REGIONS in src/wildlife.js (generated by the art session): mediterranean, desert,
   monsoon, eastasia, boreal, plains, tundra, PLUS African savanna and South American rainforest
   (the user wants them even with no route city over them; not in REGIONS yet).
   1. RESEARCH FIRST, per region, like the UK (two passes, every project and species fact with a
      real source; drop claims that can't be sourced): 8-11 habitat projects (real human actions,
      knock-on chains a kid can follow), species conditions + rarity, the region's rare top animals.
      Show the user the table before any code. Do NOT let the art session draw region projects
      before the user approves (told it so 2026-10-22).
   2. BUILD: habitats.js is UK-only today (UK_PROJECTS, UK_SPECIES, TIERS, RARITY); nature.js
      projectsDone/biodiversity/canAppear/wildlifeScene/ukSpecies are UK-only; save.habitat.woodland
      holds UK projects. Generalise per region: save.habitat[region], a meter per region (100 =
      everything there), wild.js region tabs (others say "soon"). Then send the art session the
      approved ids (proj-<id>, wild-<id>, any missing species).
   3. IN-FLIGHT TERRAIN: the flight shows the region you are over: REGIONS[r].ground/.hills keys
      exist (loaded), GameScene still uses 'ground'/'hills' only; regional trees exist (tree-<id>);
      wildlifeScene must use that region's species and meter.
B. GLOBAL ROUTING (Phase 2 note below): today src/route.js is ONE fixed eastward loop of 16 cities,
   legs = real km clamped 1000-3000, LAP_KM 32,060; save.city, laps, missions reach/lap, restore.js
   and LANDMARKS (16 cities, art) depend on it. The user wants more cities incl. the southern
   hemisphere and choosing directions (globe-trotting), so laps need redefining. Design it, explain,
   pause for the user's OK before building.
Loose ends: Stevo's restore link is unused (see "Lost saves"); remove the restore-link code + DB
functions once he's done. lanes.cjs/flight.cjs still count fixed time windows (flaky under load).
Not started: "Biodiversity King" board + boards revamp (DB change), upgrades tied to new variables,
the advanced autopilot (see items 5 below).

### Progress on A (2026-10-22, game session)
- Research for the 9 regions is done in 2 passes, plus pass 3 running. Files are OUTSIDE the repo in `~/contrail-research/<region>.md` (pass 1),
  `.v2.md` (independent re-check) and `.v3.md` (pass 3: closes every Wikipedia-only/PARTIAL/game-logic gap, adds org + learn_url
  + donate_url per project). 99 projects, 176 species (85 drawn, 91 to draw). Dropped: morpho, pangolin, mink row.
- The user's answers (2026-10-22): (1) one species may belong to SEVERAL regions (flamingo, ostrich, lappetvulture, redpanda,
  swallow, heron); (2) drawn ids reused for a different species get NEW drawings + new ids (eagle vs Spanish imperial eagle,
  turtle vs hawksbill; wall lizard / griffon unused; meerkat moves desert -> savanna); (3) LEAVE OUT the mink; (4) camel shown
  as herded camels: OK; (5) keep off-route projects (Chad, Yellowstone, Washington, Namibia, KAZA): routing will grow; (6) the art
  session is busy: start a NEW art session for the 91 region sprites; (7) EVERY claim needs a source, else fact-check it away.
- Pass 3 DONE for all 9 (2026-10-22): every claim has a fetched non-Wikipedia source or was reworded/dropped; every project has
  org/learn_url/donate_url (donate only on the org's own domain). Also dropped (the user): slendergazelle, hawksbill (no project
  link). Added: rainforest otterwatch (FZS Peru), tapirwork (IPE LTCI); monsoon rhinosanctuary. Rare/legendary species must keep
  a sourced `needs` link. Weak spots are listed at the end of each .v3.md.
- STEP 1 DONE + LIVE 2026-10-22 (4bf1af9, CI green, 38/38 tests): src/habitat/<region>.js (9 regions, generated from the
  .v3 research); habitats.js REGION_DATA/REGION_NAMES/RARITY_BIO, prices from tier+band (PRICE/BIO tables there);
  nature.js biodiversity(save, region), worldBiodiversity, projectsDone/canAppear/natureCooling(…, region), regionSpecies(region);
  wild.js region tabs (open once you have LANDED in a region city: discovered(); savanna/rainforest say "soon"), org + links
  behind a hold-2s gate, '?' for undrawn animals; badges.js rewilder counts every region. Tests: tests/habitatdata.cjs (data
  rules, 5 planted defects caught), tests/regions.cjs (3 planted defects caught). In flight nothing changed yet (still UK only).
  Rare/legendary animals with no sourced project link were lowered to uncommon (chameleon, mouflon, pelican, greatgreyowl).
- STEP 2 DONE + LIVE 2026-10-22 (ef68aeb, CI green, 41/41): src/geo.js (LAND boxes, first match wins, else 'ocean';
  along() great circle; legStrip() runs per leg with the sea squeezed to OCEAN_SHARE 0.35 and slivers < 4% merged;
  regionBelow()). GameScene: regionHere()/setRegion(): ground/hills crossfade via ground2/hills2 (1.5 s, same tint),
  wildlifeScene(save, region) (regional trees from WILDLIFE kind 'tree'; no cows/sheep outside the UK; .who maps a sprite
  to the species HERE), natureCooling(save, regionNow), save.discovered[region] (in flight only: doing it at scene build
  broke onlinesave sync), UK decor over the UK only. Sea/ice/savanna/rainforest keep the last land's strips until art
  exists (add REGIONS entries). Australia = desert, Patagonia = plains, NZ = woodland for now (part B to decide).
  Tests: tests/geo.cjs, tests/flightregion.cjs.
- HOTFIX 6606db1 (2026-10-22): ef68aeb froze flights over the SEA on saves with a UK project (iPhone reports from the
  user and Lola): natureCooling(save,'ocean') threw every frame (REGION_DATA has no 'ocean'). nature.js now treats regions
  with no data as empty; tests/flightregion.cjs flies over the sea WITH UK projects (fails on the old code). Lesson: test
  saves with no projects skip the land-cooling path (landFull is true at 0 projects).
- PART B (routing) DONE + LIVE 2026-10-22 (c9d5a12, CI green, 43/43): src/cities.js (104 airports, BRIDGES), src/network.js
  (NEAR 5 within 2600 km + bridges; legGameKm 1800-2600; choices() 3 most-spread; headingWord), src/route.js (tourPath:
  unseen first, least turn + Warnsdorff, BFS to nearest unseen when stuck; flightPath(save); save.city = NAME, save.heading,
  save.flownKm; migrateCity; EARTH_KM 40075; LAP_KM 32060 kept for the non-stop badge; OLD_LOOP for old saves/restore).
  GameScene: this.path, legKm(k), startCity always 0; startFlight rebuilds when the chosen way changed (not in school).
  FLY: 3 way buttons + src/globe.js (orthographic pixel globe, LAND boxes as dots, gold path); globe 96 px under 760 px tall,
  none under 600. Laps -> 'times round the Earth'. Missions 'reach-cairo' = reach a new land (r.newRegion), 'world' = World
  tour (tourLeft(save) empty). Tests: journey.cjs rewritten; geo.cjs checks world-tour quality (median <=110%, worst <=120%).
- REGIONAL TREES DONE + LIVE (same commit): src/habitat/trees.js REGION_TREES (5 slots per region, sourced; 26 new to draw);
  nature.js UK_SLOTS/localTree; save.plantedIn[region][id]; slot 0 scores as plantation even when native; regional meter =
  trees + projects (raw scaled like the UK); GameScene plants localTree, t.art picture (UK slot's until drawn), no soil
  over sea/ice. Weak tree sources noted by the researcher: tundra willow (bee line), Iceland juniper, oil palm (The Conversation).
- ART DONE + LIVE 2026-10-23 (1f84ec4, CI green, 43/43): 91 region animals + 27 regional trees as dials in tools/art/species.py
  (make_wildlife.py: 472 new PNGs, old ones byte-identical). Weak where templates are missing (fish, sea turtle, shell, insects,
  scimitar/ibex/hooked horns, gharial snout, owl face, baobab trunk, giraffe neck patches, rhino lips, moon-bear chest V): the
  art session adds templates after the plane design. Region art loads ON DEMAND (GameScene.queueArt/loadPathArt): UK + home land
  at start, the path's lands in the background; spawns skip unloaded textures (start-up 2.1 s -> 2.8 s if all loaded at once).
  regionSpecies() guarded for sea/ice (crashed on Honolulu paths; tests/everyleg starts in HONOLULU).
- STORM CLOUDS (the user, 2026-10-23, reference picture; 'looks like stone, the gradient is what matters'): tools/art/make_storm.py
  repaints the 6 storm PNGs soft/pale inside the SAME alpha outline (asserted: collisions unchanged); GameScene.addStormPairAt tints
  each column top-to-base with STORM_TINT (white/pale grey -> slate). make_sprites.py calls make_storm.main() (art session).
- PIXEL ART MCP (asked 2026-10-23): PixelLab MCP (generative; needs the user's paid API token, added by the user with
  `claude mcp add`) or Aseprite MCP servers (editing; need Aseprite). Suggested trial: salmon, loggerhead, fish owl vs our style.
- PACING DATA for the plane design (read-only query, 2026-10-23; 525 flights, 9 players, mostly the user/Lola/testers): flights
  per active day median 29 (p75 47); landed 20.4%; sky seeds per landed flight median 20 (flights 1-20), 25 (21-50), 81 (51+).
  The flights table stores no seeds and no duration.
- NATURE tabs open from ANY airport of a region (src/cities.js) or flying over it (save.discovered).
- ART-BRIEF-REGIONS.md (generated from the data): 91 animals, 101 project icons, 9 field backdrops, savanna/rainforest/ocean
  terrain. The user will start a NEW art session for it.
- DECIDED (the user, 2026-10-22): region below the plane = REAL GEOGRAPHY (position along the real great circle of the leg, by
  fraction of the game leg, looked up in a declared ~10-degree world grid of region ids + ocean + ice); ocean as its own terrain but SHORTER than real (squeezed);
  CO2 soak only from the region below (yes); tabs open when a region is first flown over. Rollout: 1 data/saves/meters/tabs,
  2 region-below in flight, 3 global routing (B).
- NEW GOAL (the user, 2026-10-22): grow the game into a big global knowledge base of interesting climate research and cool
  non-profit projects, with links people can follow to donate. Keep the existing rule: the game takes no payments; outbound
  links go behind the grown-up gate (hold 2 s, as for Citizen Zoo). Not designed yet.
- Art session shipped 8ca186c (2026-10-22): longer sunset/sunrise (DAYNIGHT.blendSeconds 3 -> 6) with a day dial; SAF and
  autopilot pick-ups in flight (POWERUPS in src/config.js; autopilot shows "TAP to take control"); contrail-cooling wording;
  tests/powerups.cjs ([powerups]=20 in tools/test.sh). 35 browser tests now.
- Push ownership (the art session, 2026-10-22): the user's brief lets the ART session push its own work after a full
  tools/test.sh and CI to deploy success. (Working arrangement below updated to match.)

## Previous NEXT TASK (handed off 2026-10-21): the four to-do items. DONE; kept for the record

Live and clean at 27b143d (CI green). Do all four items from "## TO DO: balance, progression and
onboarding" below, in any order, each its own tested commit:
1. DONE 2026-10-21 (fb3c048): trees for long runs. See "Trees for long runs" below.
2. Re-price every upgrade per stage (income per flight at each stage; flights of saving per level;
   no useless or dominant level). Show the user the table before changing prices.
3. DONE 2026-10-21, SUPERSEDED 2026-10-22 (challenges and stages removed; crash missions became secret
   badges; see Progress above): tiered missions/challenges. Stages by upgrade levels owned (0/5/15/30/45:
   Learner, Cleaner plane, Long haul, Nature builder, Round the world; `stageOf` in rewards.js).
   9 new missions after the first 10 (19 now): turbulence, 10,000 km, "Crash into birds for the
   first time" and "Get told off by air traffic control" (done by a crash, or at once if it already
   happened: save.crashes counts crash kinds), 3 kinds, all 5 kinds (needs Fruit trees AND Tree drop
   plane: `needs.lines`), beavers, 20,000 km, a non-stop lap. 35 challenges with a `stage`; offered
   from your stage and the one below; prizes grow by stage (stage 5: 300-400 seeds). Funny ones:
   land with exactly 7 seeds, land with none, drop a parcel on a runway. A lap is 32,060 km
   (LAP_KM), NOT 31,520 as written before.
4. DONE 2026-10-21: "tap here" tutorials, `src/tour.js` (dim panels round a hole, the art
   session's `assets/ui/tour-finger.png`, a bubble; only the target works). name tour on the menu
   after flight school (PILOT, name, word, SAVE, BOARDS, FLY; offline: says so and ends); hangar
   tour at the end of the first real flight's results (HANGAR, seeds, any FREE!, i, NATURE,
   TAKE OFF); a walk-through when upgrade lines open (all lines of one tab at once). Only starts on
   a screen that is showing (a new branch once started one mid-take-off). save.tours,
   save.shownLines. Tests opt out with seenTips ['*'] or tours ['*'].
5. DONE 2026-10-21 (user's asks, after the four): plane overlays in flight (art 74x39 layers,
   `src/planeparts.js` shared list); hangar plane model (`#hPlane`, ui.js renderPlaneModel): tap a
   card to zoom to that part and preview its next level, HIDE/SHOW PART to compare, a short part
   panel + more info; hangar backdrop/spot/brackets (art). Species from the art session's generated
   `src/wildlife.js` load by themselves (GameScene preload loop).
   NOT STARTED, discussed: upgrades tied to new variables (hazard warnings, turbulence control,
   golden seeds, ...) and an advanced autopilot with safe hand-back (see the chat of 2026-10-21:
   only "recoverable" lines, tap to take over, no switching on in a bad spot; open: does
   autopilot time earn crystals / count for boards?).
6b. 2026-10-22 (the user: meter full with few upgrades; NATURE screen confusing): biodiversity()
   now scales so 100 = EVERYTHING (raw 78 trees + 114 projects = 192; trees alone ~40). The user's
   rebuilt save went 100 -> 68. UK projects in 3 TIERS (habitats.js TIERS: 1 open, 2 at 12, 3 at 30;
   finished tiers fold to one line; the next locked tier is one card). Animals have RARITY (common /
   uncommon / rare / very rare: weight 10 / 4 / 1.5 / 0.5, earliest 0 / 1,500 / 4,000 / 8,000 km into a
   flight); wildlifeScene().pickWild(km)/pickSky(km); the meter decides how many. this.result.foundIds
   (animals found this flight) for the art session's results section.
6. WILD AREA, UK: BUILT 2026-10-21 (src/wild.js NATURE screen, src/habitats.js data; tests/wild.cjs).
   11 UK projects (deadwood, meadow, margins+bee banks [NOT beehives: honeybees compete with wild
   bees, Bumblebee Conservation Trust], hedgerow, pond, woodland, voles, beavers, rewet, storks,
   martens), bought one by one (save.habitat.woodland; old levels.rewild -> projects by
   migrateHabitat). 23 UK animals with needs (projects + meter); found when seen in a real flight
   (save.found). Every project/animal has >=1 source (2 research passes; ~7 claims only partly
   sourced: see the chat of 2026-10-21; facts were corrected to match sources). Group must still
   fact-check. Other regions + savanna/rainforest: NOT started (tabs say "soon"); regional terrain
   swap in flight NOT started. Art asked for: per-region scene backdrops, project icons.
   Original decisions:
   - ALL nature upgrades move to the NATURE tab (out of the hangar). NATURE = wild area + its projects.
   - Per region: you buy HABITAT PROJECTS (things people do to land/vegetation: hedgerows, ponds,
     meadows, bee-friendly actions, rewetting; or a reintroduction like beavers that changes the land).
     Each has a KNOCK-ON chain a kid can follow; it raises that terrain's biodiversity.
   - Animals are NEVER bought: species appear in flight over their region when conditions are met
     (rarer ones only when the land flourishes); "found" = seen on screen in flight; collection
     cards (art session portraits) with facts. All facts factChecked:false: the group must check.
   - Order: UK first end to end, then other regions. Add African SAVANNA and South American
     RAINFOREST too, even with no route city over them yet.
   - Leaderboard: one total "Biodiversity King" board; the user wants a wider boards revamp later.
   - Research first, with sources, shown to the user before code.
2c. 2026-10-22 (evidence from the user's real save: 487 crystals vs 403 seeds): crystal prices now
   1 per 8 seeds (were 1 per 18). Measured: real flights earn ~3.7 crystals each (4.1 even on a
   crash), the restore model ~6.6/flight incl. prizes vs ~39 seeds: about 1:6, so 1:18 prices made
   crystals never matter. Hangar now 17,485 seeds + 2,185 crystals (47 levels) + 11 UK projects.
   The user's save: found animals reset (16 of 17 were found in ~20 s on the old full meter, before
   rarity); visited needed no fix (they flew a real lap since).
2. DONE 2026-10-21: new prices (user OK'd the ~20,000-seed table: 20,125 seeds, 1,119 crystals at
   ~1 per 18 seeds; crystal income NOT measured against this). Old saves re-valued ONCE at full value
   (user's choice, no bonus) by `src/reprice.js`: bank + old prices of owned levels, rebuilt at new
   prices from levels already owned, cheapest first, branches valid; message `#repriced`. No save =
   left alone. A fully bought old plane is worth 3,535 seeds and keeps 33 of 53 levels.
   Measurement notes (earlier): `tools/income.cjs` (campaign
   autopilot): all 53 levels after 20-24 landed flights; most levels cost < 1 landed flight of
   income. Real players land 17% of flights (DB, 236 flights). The user expected prices much
   higher (a 17,000 km landing pays ~300 seeds: income grows ~distance squared, which the
   autopilot under-measures because it lands early). Proposed a ~20,000-seed hangar (stage 1-2
   unchanged, stage 3 x1.5, 4 x2.5, 5 x4); waiting for the user's answer.
Rules: no upgrade may change the controls; saving up cooling stays (no floor); explain the
mechanism and pause before each non-trivial change; database changes (Supabase) need the user's OK
before `~/.local/bin/supabase db push` and must go live BEFORE the game that depends on them.

## Phase 1b (asked 2026-10-20) — DONE and live

Asked by the user, in this order of their message (nothing started yet; explain + pause first):
1. Missions/challenges reward more, and MORE challenges that pay currency (seeds/crystals).
2. Much wider and deeper upgrade trees.
3. Real-ish distances to real major cities, and more cities (today: AIRPORT.names, every 1500 km).
4. A lap of the world: getting back to LONDON pays an extra bonus.
5. UX overhaul: "navigating back and forth is still super strange" (title / hangar / pilot /
   boards / results / about are separate pop-ups with their own back buttons; design one clear
   navigation model).
STATUS 2026-10-20: all five built and pushed. 1 rewards (`src/rewards.js`: mission prizes, 3 of 16
challenges, +15/+1 new city, +300/+25 lap + Round the World badge; SUPERSEDED 2026-10-22, see Progress); 2 upgrade trees (16 lines,
53 levels; `tree` + `requires` branches; new: Lighter Plane, Long Wings, Landing Gear, Bigger Hold,
Crystal Lens, Weather Forecast, Tree Nursery); 3 journey (`src/route.js`, 16 cities, legs real km
clamped 1000-3000, a lap 32,060 km (sum of legKm; "31,520" was written here until 2026-10-21 and was always wrong); flights start at `save.city`); 4 lap bonus; 5 the bottom bar
(FLY / HANGAR / NATURE / PILOT / BOARDS, `ui.go()`). Decided by the user: flights start where you
landed; distances real up to a max with short legs stretched; bottom bar.
PENDING (needs the user's OK: database change): a "laps" stat on the online leaderboard.
DONE 2026-10-20 from the same message: ponds that "follow the plane" after a while — fixed
(stray flight-setup lines inside the per-frame tree-cooling code emptied the pond list each
time trees cooled); `tests/ponds.cjs`.

## TO DO: balance, progression and onboarding (asked 2026-10-21; not started unless marked)

Balance DONE 2026-10-21 (`tools/balance.cjs`: seeded, repeatable; straight vs smart autopilots;
crashes off; median of seeds 1-3). Changes: hydrogen CO2 0 -> 0.25; SAF CO2 0.85/0.7/0.45 ->
0.9/0.8/0.65; night contrail heat x fuel water (hydrogen 2.5x); from 3,000 km into a flight icy air
AT NIGHT comes more often and bigger (+2.0x per 10,000 km). Results (straight / smart, km):
none 5,423 / 6,130 (unchanged early game); SAF max 13,285 / 33,375; hydrogen max 9,394 / 25,813.
Tried and dropped: stronger night contrails on long flights (hurt careful flying as much as careless);
hydrogen day shade boost (helped the straight pilot as much); ramping day icy air (SAF smart pilot then
never overheated: shade banked without limit). The smart pilot sees all icy air and still spends
~15% of the night in it (each tap hops ~40 px).
User's rules:
- Option (a): ignoring contrails is punished. Target for a fully upgraded plane: straight pilot
  overheats ~10,000 km, near-perfect pilot ~25,000-30,000 km and STILL overheats eventually
  (possible but very hard, never impossible).
- Saving up cooling is GOOD (bank it when it's easy, spend it when it's hard). No floor on cooling.
- NO upgrade may change the controls (people learn them). Long Wings was changed to CO2 for this.
- Upgrades are what let you keep completing missions.
- The longest runs must be IMPOSSIBLE without a full set of trees planted (trees as the late-game
  enabler for very long flights).

Progression:
- Tiered sets of missions/challenges by level and upgrades owned: each stage has its own kinds of
  challenge. Some funny, e.g. "Crash into birds for the first time" when you first reach the
  distances where birds appear.
- Super-tiered plane and nature upgrades that get more and more technical, as a chance to present
  research from other groups at Imperial (needs the user to name groups / projects).
- Re-measure every upgrade's price and value per stage (flights of saving needed; no useless or
  dominant level), after the balance is settled.

Trees for long runs (user agreed 2026-10-21): trees stay small on short flights but grow bigger
and keep helping the longer a flight goes, so a full forest of every kind is what takes a top plane
from ~25,000 km to a full lap. Without the full set, the longest runs are impossible.
DONE 2026-10-21 (fb3c048). Measured first: once the autopilot really planted (new `PLANT=1`),
today's 6 trees made the smart top plane fly FOR EVER (>100,000 km, 5/5 seeds) and lifted the
straight pilot ~12,000 -> ~17,000 km. Also found: ANY cooling that never stops (even half
today's forest, or rewilding's 0.04/s per project) lets a careful pilot fly for ever, because
its late-game warming is nearly flat. User agreed: "full forest" = all 5 kinds planted on THIS
flight. Built (`FOREST` in config.js): trees x0.5; old-wood boost for grown trees from 10,000 km
(x up to 3 with 5 kinds, x(kinds/5)^2); a forest can only soak up 80 CO2 per flight with 5 kinds
(x(kinds/5)^4, min 12), rewilded land 30; then "Your forest is full of carbon!".
Results (smart, hydrogenMax, PLANT=1, seeds 1-5): 5 kinds 30,313 / 25,407 / 33,907 / 54,323 /
33,046 (median 33,046, past a lap of 32,060); 4 kinds (seeds 1-3) 25,129 / 37,421 / 25,841. Straight with a full forest
16,627 / 12,513 / 9,219 / 16,982 / 12,641 (no trees: median 12,048). Every run overheats.

Onboarding ("forced action" tutorials, like proper games):
- First time in the game: must choose a pilot name, then be shown the leaderboard.
- After the first flight: a full guided tour of the hangar.
- Whenever something new unlocks: a "tap here" pointer tutorial that walks you through it.

## PHASE 2 (written down 2026-10-20 at the user's request; not started)

Added 2026-10-21:
- **Regional climates and geology** along the route (feeds the land types below).
- **Pixel cities to fly past**: city skylines and landmarks (Eiffel Tower etc.) at each city on the
  route (art session).
- **More cities in the southern hemisphere**, and NOT one fixed order: choose directions and globe-trot
  (the journey in `src/route.js` is currently one fixed eastward loop; laps would need redefining).
- **Wild area, by region / continent**: a collection screen of the tiny animals, birds and plants
  you've gathered, like a Pokedex but fun rather than detailed.

- **Wild area**: from the Biodiversity screen, a screen showing your forest/land.
- **Continents and geography**: regions with their own land type (forest, mountain, plains, ...),
  each with its own trees and animals, feeding the wild area.
- **Deeper plane engineering**: different planes and much deeper plane upgrades, for the
  engineering-minded.
- **Science upgrades**: advanced routing (predicted best lines), turbulence control (and make
  turbulence STRONGER so this matters), bird detection, and an AUTOPILOT boost you can pick up
  while flying (must be unlocked first).

### Phase 2 art brief (relayed 2026-10-21 from session ojm-92; owned by the art session)

1. **Regions**, one per stretch of `src/route.js` (each region: ground strip, hills backdrop,
   3 growth stages per tree, 2-frame animals and birds; ~150 sprites, existing sizes/style):
   Woodland & farms (London, Paris, Berlin; exists) / Mediterranean (Rome, Athens): olive, cypress,
   umbrella pine; wild boar, tortoise, lizard; hoopoe, bee-eater / Desert (Cairo, Dubai): date palm,
   acacia; camel, fennec fox, oryx; falcon / Monsoon & rainforest (Delhi, Bangkok): banyan, bamboo,
   teak; elephant, macaque, tiger; hornbill, peacock / East Asia & mountains (Beijing, Tokyo): cherry
   blossom, maple, pine; panda, tanuki, snow monkey; crane / Boreal & mountains (Anchorage,
   Vancouver): fir, spruce; moose, bear, beaver; bald eagle / Plains & eastern forest (Chicago,
   New York): prairie grass, sugar maple; bison, raccoon; cardinal / Volcanic tundra (Reykjavik):
   moss, birch scrub; arctic fox; puffin. New cities: map onto a region or ask the user.
2. **Plane looks upgraded**: base plane + one overlay layer per upgrade line (`src/upgrades.js`),
   changing with level, so every combination works; plus motion (nav-light blink, engine shimmer,
   a sparkle when a level is bought).
3. **RULE (user decided): upgrades change only the LOOK.** Collisions use the BASE plane outline:
   `planePixels()` reads `alphaMask('plane')`, so overlays must be separate sprites/keys drawn on
   top and must never be baked into the `'plane'` texture. Game session owns the collision code.
4. Split as usual: the art session commits only its own files/hunks; the game session pushes.

## Earlier task (2026-10-19), all DONE and live

Leaderboard + light profiles + a menu from the runway:
1. DONE 2026-10-19: `#runwayBack` "◀ MENU" button (and Esc) while parked on the runway ->
   `GameScene.backToMenu()` -> title, no crash. `save.flights` now counts at LIFT-OFF, not on
   TAKE OFF. Test: `tests/runway-back.cjs`.
   Decided with the user: names = typed first name (letters only, <=12, word-filtered) + builder
   word + number, e.g. "Ollie the Puffin 27". Ultimate Flyer = transparent weighted sum (ⓘ button)
   of longest landed, total landed distance, species, day shade + night dodges, CO2/km vs base
   plane, missions. Boards: Today / Week / Month / All time.
   Supabase: project `contrail-pilot`, ref `mkucbsjzbipjaiqzrlkj` (NOT drift_db). CLI at
   `~/.local/bin/supabase`, logged in, linked; `supabase/config.toml` pushed (anonymous sign-ins
   on, 300/h per IP, `[storage.vector] enabled = false` — vector buckets are paid, push 402s).
   Publishable key: sb_publishable_Oa3FSfnjmRu2xL_RmiKOqA_j3tEfgMd (public by design).
2+3. BUILT 2026-10-20, committed locally (6d5a80e database, 0728494 game), NOT pushed:
   `supabase/migrations/20261019220000_leaderboard.sql` (players, flights, RLS, word filter,
   leaderboard(board, period)); `src/online.js`, `src/pilot.js`; tests `tests/online.cjs` (fake
   Supabase) and `supabase/tests/run.sh` (throwaway Postgres in Docker). ORDER MATTERS: the
   migration must be live (`supabase db push`, the user runs it or approves it) BEFORE the game is
   pushed, or naming says "No internet". Then check against the real project (anonymous sign-in,
   a test player, one flight, leaderboard()) and ask the user to delete the test player.
   Ultimate weights measured on autopilot flights: shade ~2-4/km flying straight, so 5 pts per
   net shade unit; "cleaner" uses the plane's cruising CO2 (`kit.co2Cruise`, normal 1, hydrogen 0)
   because CO2/km falls with distance. Boards count LANDED flights only, including tree kinds:
   this differs from the in-game Biodiversity meter, which counts trees from crashed flights too
   (open question 4).
2. Nickname sign-in (no passwords; a nickname + device id is enough) and a simple profile page.
3. Supabase back end: overall leaderboard plus per-stat boards, e.g. longest LANDED flight (see
   Decisions: never "coolest"), best contrail choices (shade made by day / night contrails dodged /
   crystals), biodiversity, missions done. Supabase is NOT installed on this machine and no
   Supabase connector is set up: the user must create a project and give the URL + anon key (or
   install the CLI). The game is a static site on GitHub Pages: client-side supabase-js with
   row-level security; never ship a service key. Kids' festival: nicknames need a word filter.

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
Agreed split: it commits only its own files/hunks as small art commits; pushing to main: either session, each
after a full tools/test.sh (failures counted) and CI watched to deploy success (the user's brief to the art session, 2026-10-22;
before that the game session owned pushing). NEVER `git add -A` here: stage your own paths only (`git apply --cached` for
hunks). Uncommitted art files in `git status` belong to that session; leave them.
Gotcha that broke the live site once: `makeTextures()` returns early if a guard texture exists;
when a texture moves to a PNG the guard must be a code-only key, or better a per-key
`if (!this.textures.exists(key))` skip (asked the art session to do this).

## Tip pictures wanted from the art session (requested 2026-10-20)

Tips name a drawing; it shows once `assets/ui/<name>.png` exists (words only until then; same
style and size as `lesson-storm.png` etc.). Wanted:
`lesson-plot` (brown soil patch, parcel falling down-and-forwards, the X), `lesson-tree-co2`
(a tree pulling CO2 bubbles from the air, small next to a plane's CO2 cloud), `lesson-biodiversity`
(3 different trees with animals), `lesson-bars` (the CO2 gauge + Earth bar), `lesson-hot` (red-full
Earth bar), `lesson-bonus` (plane passing an airport, x1.5), `lesson-gold` (golden seed = 3),
`lesson-crystals` (ice crystal icon), `lesson-turbulence`, `lesson-birds`, `lesson-nofly`.

## Known flaky tests

- 2026-10-22 local 4-shard run: lanes.cjs ("plenty of storms" saw 13 gaps) and flight.cjs (overheat
  check timed out) each failed once under load and passed on retry. Both still count fixed TIME
  windows: next candidates for waiting on the game.

- CI REWORKED 2026-10-22 (the user: 12+ min and failing most of the time): 4 shards in parallel
  (tools/test.sh --shard k/4, balanced by per-test time), every test runs, a failure is retried once
  (pass on retry = FLAKY warning, not a block; twice = blocks). All tests now wait for the game
  (tests/lib/ready.js ready/started) instead of fixed sleeps: 380+ PNGs made fixed waits race the
  loader. forest.cjs 189 s -> ~30 s (50 ms frames). Locally: tools/test.sh (same runner). 8 of the 15
  runs before this failed, nearly all timing.

- `tests/flight.cjs` failed ONCE in a full run on 2026-10-22 (reason not captured: the run's output was
  cut), then passed 3 reruns. Watch it.

- `tests/wildlife.cjs` failed once in CI (f036b7d, 2026-10-20): "bare land should still have a few
  cows/sheep" — one snapshot right after take-off; animals are random. Fixed the same day: it now
  collects what appears over ~4 s.
- FIXED 2026-10-22: hazards.cjs now sets HAZARDS.birds.chance = 1 (the bird roll was the flake; it
  blocked deploys twice); flight.cjs waits for the scene after TAKE OFF (read nextAirport too early in CI).
  Old note: `tests/hazards.cjs` fails ~1 in 6 runs ON c1bf7d1 TOO (measured 2026-10-19: 6/16 on the clean
  commit): the teleporting autopilot's flight ends (`state "over"` near 46 km) after birds missed
  their 55% spawn roll at 10 km. Rerun before blaming a change. `tests/school.cjs` crashed once in
  ~5 runs.

## Lost saves and TEMPORARY personal restore links (2026-10-22)

The user's phone lost ALL the game's browser storage (save + pilot name + anonymous login): a browser
wipe, not our code (nothing in the game touches the name/login keys). Stevo likely too (a second
anonymous login 21 Oct 23:01 became "Stevo the Bumblebee").
- LIVE: migration 20261022120000_restore_links.sql (replaced the shared-password version
  20261022090000, whose functions/table it drops; that one replaced a no-password version that was
  blocked as a security weakening). restore_links(hash, player_id): one long random code per old
  pilot, only its SHA-256 stored, inserted by hand via the CLI, never in the repo. restore_preview(code),
  restore_claim(code): the opening device takes over that pilot (flights + name), once.
- Codes made 2026-10-22 for Olly the Swift 74, Stevo the Explorer 27, Ducrust the Robin 99, Jono the
  Rocket 93; the links were given to the user in chat (not stored anywhere else).
- Game: ?restore=<code> (src/pilot.js checkRestoreLink): code removed from the address bar at once,
  "Restore X?" confirm, claim, src/restore.js rebuilds the save (exact: best, landings, missions, laps,
  trees; estimated: seeds 0.42d+0.85d^2 per landed flight, d in 1000 km, plus prizes; spent
  cheapest-first on upgrades + habitat projects). Stevo: his link opened on the Bumblebee phone merges both.
- Saves are written twice (save.js BACKUP), unreadable ones kept aside, navigator.storage.persist().
- REMOVE when everyone is restored: checkRestoreLink + restorePreview/restoreClaim, and a migration
  dropping restore_links / restore_preview / restore_claim.
- DONE 2026-10-22 (the user OK'd it): ONLINE SAVE, migration 20261022150000_online_save.sql (LIVE).
  devices(device -> pilot) + my_player(): a pilot can have several devices; flights / rename /
  is_me follow the pilot. Pilot code = 4 NAME_WORDS + a number (made in the game, SHA-256 only in
  pilot_codes); pilot_login(first, word, tag, code) joins a device (merging any pilot it had);
  10 wrong codes per pilot per hour, then refused (it RETURNS why instead of raising: raising rolled
  back the counted attempt, i.e. unlimited guessing: caught by supabase/tests/online_save.sql).
  put_save keeps a save only if newer (game stamp); get_save. Game (online.js): syncUp every 30 s,
  4 s after each flight and on leaving the page; syncDown on opening (newer online wins unless this
  device has unsent changes; a device that never synced keeps whichever save has more progress).
  PILOT shows "Your pilot code" + "I already have a pilot". Tests: onlinesave.cjs, online_save.sql.

## Supabase (online names + leaderboards)

Project `contrail-pilot`, ref `mkucbsjzbipjaiqzrlkj` (NOT drift_db). CLI `~/.local/bin/supabase`,
logged in and linked. Migrations in `supabase/migrations/` (leaderboard, oops_and_laps,
crash_distance_boards), all pushed. DB tests: `supabase/tests/run.sh` (throwaway Postgres in Docker).
Game side: `src/online.js` (publishable key, anonymous sign-in, 5-flight outbox), `src/pilot.js`
(PILOT + BOARDS screens; Oops boards have every period since 2026-10-21, user's request: no DB change was needed). `supabase/config.toml` has
`[storage.vector] enabled = false` (paid feature: config push 402s otherwise).

## Open questions waiting on the user

1. URL for Merrick's contrail-forecast site (`forecast` in `src/links.js`, not used anywhere until
   it exists). DONE 2026-10-19: AEIS group, Brahmal Institute, North Atlantic trial news and
   Citizen Zoo links (checked in a browser); About page + title credit. Logos: the user
   supplied official files; pixel versions by the art session (`assets/ui/logo-*.png`,
   `tools/art/make_logos.py`) are on the About page, title credit and grown-up link. Get sign-off
   from Imperial comms / Citizen Zoo before the festival. `logo-aeis.png` is the real AEIS lockup
   (user-supplied 2026-10-19; greyscale, needs a light background); the dotted mark first thought
   to be AEIS is not, and is parked as `tools/art/logos/dotted-i-unknown.png`.
2. Supabase project (URL + anon key) for the shared leaderboard: now the NEXT TASK (above).
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
