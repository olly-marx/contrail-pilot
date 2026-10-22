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

## NEXT TASK (handed off 2026-10-21) — the four to-do items, any order

Live and clean at 27b143d (CI green). Do all four items from "## TO DO: balance, progression and
onboarding" below, in any order, each its own tested commit:
1. DONE 2026-10-21 (fb3c048): trees for long runs. See "Trees for long runs" below.
2. Re-price every upgrade per stage (income per flight at each stage; flights of saving per level;
   no useless or dominant level). Show the user the table before changing prices.
3. DONE 2026-10-21: tiered missions/challenges. Stages by upgrade levels owned (0/5/15/30/45:
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
challenges, +15/+1 new city, +300/+25 lap + Round the World badge); 2 upgrade trees (16 lines,
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
Agreed split: it commits only its own files/hunks as small art commits; this (game) session owns
pushing to main. NEVER `git add -A` here: stage your own paths only (`git apply --cached` for
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
