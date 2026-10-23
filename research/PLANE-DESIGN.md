# My Plane: design (draft 3, FINAL for approval, 2026-10-23, art session)

Built from `plane-generations.md`, `plane-atc.md`, `plane-weather.md`, `plane-future.md` and the fact-check
`plane-verification.md`. Nothing here is built yet. Numbers marked **(est.)** are game estimates, not
measurements; the game will never present them as facts.

## Contents
1. Rules this design keeps
2. The shape: four branches, six eras
3. Branch 1: Jets (the plane itself, and the efficiency trap)
4. Branch 2: Weather prediction (knowing where the icy air is)
5. Branch 3: Air traffic control (a slightly kinder sky)
6. Branch 4: Future planes (one chosen path)
7. Era gadgets (magnet, hold, landing, sensors, cabin)
8. Unlocking: eras are earned by flying time; seeing your progress
9. Money: seeds, crystals and keeping seeds flowing
10. The reset (option a) and what is kept
11. Art
12. Build order
13. Status (decided, and what is still open)

## 1. Rules this design keeps
- **The controls never change.** Every plane taps, climbs and falls exactly the same. Collisions keep using
  the one base plane outline (`alphaMask('plane')`); new planes are drawn on top inside that footprint, as the
  current upgrade overlays are. Upgrades change what happens around the plane, never how it flies.
- **Contrails are the heart.** Every branch must change the contrail game, not just a number.
- **Honest science.** Every fact card says what is real, a prototype, a study or fiction, with a source.
  UNCONFIRMED claims from the fact-check are not shown as facts.
- **Nature is untouched.** The tree lines (trees, soil, species, nursery) stay as they are (nature.js maps
  their ids to regional tree slots).

## 2. The shape: four branches, six eras
Eras: **1950s, 1970s, 1990s, 2010s, 2030s, Far future.** Each branch has a ladder of generations; each
generation REPLACES the last in that branch. An era opens new rungs in every branch at once, plus a new set of
gadgets, so every era feels like a new chapter.

| Era | Jet | Weather | ATC | Gadgets (sample) |
|---|---|---|---|---|
| 1950s | Comet / 707 | Balloons and pilot reports | Fixed airways | Horseshoe magnet, mail sacks, ILS beams |
| 1970s | 747 jumbo | Early forecast models | Radar control | Electromagnet, cargo boxes, Trident autoland |
| 1990s | 1990s twins | Humidity sensors on airliners | More flight levels (RVSM) | Neodymium magnet, roller floor, GPS approaches |
| 2010s | A320neo / 737 MAX | Satellites + contrail models | Free routes + satellite tracking | Camera-magnet, smart hold, synthetic vision |
| 2030s | Open fan, then blended wing | AI forecasts | Contrail-aware control | Superconducting magnet, BWB cargo hall, camera autoland |
| Far future | Hydrogen | Laser (lidar) + shared airliner data | (full contrail-aware skies) | Tractor beam, "pocket dimension" hold (labelled fiction) |
Future planes (branch 4) open from the 2010s onward as specials you choose to fly.

## 3. Branch 1: Jets
What changes in play: CO2 per flight, contrail thickness and life, cargo, and **the contrail zone**.

**New mechanic, the efficiency trap.** Today a contrail forms only inside icy air. From now on each jet has a
**contrail margin**: early, hot-exhaust jets form contrails only deep inside icy air; efficient jets form them
right up to (and a little beyond) its edges, so the same patch of icy air is harder to dodge. Real basis:
Schumann et al. 2000 (two jets side by side: only the efficient one made a contrail), the ~700 m shift for
future engines, and Gryspeerdt 2024 (efficient aircraft make long-lived contrails more often). CONFIRMED.

| Gen | Jet | CO2 per flight (est., vs Gen 1) | Contrail margin | Contrail thickness | Fact card (sourced) |
|---|---|---|---|---|---|
| 1 | Comet / 707 | 1.00 | deep inside only | thick, sooty | Hottest exhaust = fewest contrails |
| 2 | 747 | 0.70 (est.) | inside | thick | First jumbo; big fan |
| 3 | 1990s twin | 0.55 (est.) | to the edge | medium | Two engines, not four |
| 4 | A320neo / MAX | 0.45 (est.) | slightly beyond | medium (soot down ~1000x, ice crystals barely down: Voigt 2026) | The cleaner-engine surprise |
| 5 | Open fan | 0.36 (est.; maker's target) | beyond | medium | No case round the fan |
| 6 | Blended wing | 0.28 (est.; maker's claim, disputed) | beyond | medium | The whole plane is a wing |
| 7 | Hydrogen | 0 CO2 | widest (+46% formation: Megill 2025) | thin, short-lived (80-90% fewer crystals: Bier 2024) | More contrails, but wispier |
Fuel (SAF) stays a separate choice: thinner contrails by soot (existing line, re-tiered by era).

## 4. Branch 2: Weather prediction
What changes in play: how far ahead icy air is revealed, how clearly, and how honest the forecast is.

**New mechanic, honest forecasts.** Real forecasts both miss icy air and show icy air that isn't there
(ERA5 skill 0.2-0.4; ~80% hits / ~30% false alarms only if 150 km off is allowed: CONFIRMED). So early
generations show some **false patches** (they fade when you get close) and **miss some real ones** (they
appear late). Each generation reveals further ahead with fewer false alarms and misses.

| Gen | Weather | Reveal ahead (est.) | False patches | Misses | Extra |
|---|---|---|---|---|---|
| 1 | Balloons + pilot reports | only when inside | many | many | Fact: balloons read up to 2.4x too dry |
| 2 | Forecast model | short | ~1 in 3 | some | Blurry edges |
| 3 | Airliner sensors | short | fewer | fewer | Exact along your own path |
| 4 | Satellites + contrail models | medium | fewer | few | Each patch labelled "warms" or "cools" |
| 5 | AI forecasts | long | few | few | Sharp edges |
| 6 | Laser + shared data (future) | longest | very few | very few | Thin layers shown exactly |


**Also (user, draft 2):**
- Good forecasts **subtly change the odds**: slightly fewer icy patches placed in your path at night, and a
  little less turbulence (real basis: route planning with humidity and clear-air-turbulence forecasts).
- A false patch **vanishes in a fun way** when you get close: it puffs into sparkles with a tiny
  "Forecast wrong!" popup.

## 5. Branch 3: Air traffic control (draft 2: nothing new to think about while flying)
The user found the "cleared band" too complicated, so it is DROPPED. ATC instead makes the sky slightly
kinder; every effect is small and needs no new decisions in flight:
1. **Wider gaps**: storm and no-fly gaps a little wider, at most ~5% after all upgrades (better spacing).
2. **Calmer gaps**: turbulence less likely to sit right at a gap.
3. **Bird advisories**: flocks less likely to sit in a gap (real: controllers pass on bird warnings).
4. **Smoother approach**: "airport ahead" earlier; storms less likely right before a runway (sequencing).
5. **Contrail-aware control** (last generation): a small crystal bonus per icy patch dodged at night (real:
   Maastricht 2021 and NATS trials).
Generations as before (fixed airways, radar, RVSM, free routes + satellite tracking, contrail-aware), each
adding a step of the above, with sourced fact cards.

**Weather + ATC together: the next-gap hint.** With both a good weather AND a good ATC generation, a faint
gate shows at the right edge of the screen at the height of the next gap, before it scrolls into view.

## 6. Branch 4: Future planes (draft 2: one path, chosen)
From the 2030s you **choose one future path** and cannot take the others, e.g. **Supersonic** (Concorde
history, Boom, X-59), **Hydrogen hypersonic** (Mach 5 study: zero CO2 but 8-20x the warming from water
vapour, ACP 2022 CONFIRMED verbatim) or **Ultra-efficient wing** (truss-braced wing study, solar plane as a
curiosity). Each path is a short ladder with its own trade-off. History and fiction appear as fact cards
(nuclear test plane, REAL 1950s history, sources to check; fusion jet, FICTION, labelled).
DECIDED (user, 2026-10-23): the path can be switched later, but for a BIG price.
(plane-future.md is NOT yet fact-checked: about 20 entries need sources before they appear.)

## 7. Era gadgets
Each gadget line has one rung per era, matched to that era's real technology (fiction labelled in the far
future). They map onto today's dials, so the code already supports them:
- **Magnet** (pick-up radius): horseshoe, electromagnet, neodymium, camera-magnet, superconducting, tractor beam.
- **Cargo hold** (landing multiplier per airport skipped): mail sacks, cargo boxes, roller floor, smart hold,
  BWB hall, pocket dimension.
- **Landing help** (landing window): ILS beams, Trident autoland (1965, REAL), GPS approaches, Garmin Autoland
  (2020, REAL), camera autoland, hover-settle.
- **Sensors** (night dodge crystals / ice warnings): eyes and thermometer, weather radar, humidity sensor,
  laser humidity sensor (WVSS-II, REAL), lidar, AI.
- **Cabin** (NEW: passengers and fares, see 9).

## 8. Unlocking: eras are earned by FLYING TIME (decided 2026-10-23)
- Eras open by **real minutes of flying**: a new counter `save.flightSeconds` adds the seconds actually flown,
  take-off to landing OR CRASH (crashes count fully), not paused tips or menus. It starts at 0 for everyone
  at the reset (the flight log never stored duration).
- Era n takes **30 x n^1.5 minutes** (just above linear; user's choice):

| Era reached | This era | Total flying | Keen (~45 min/day) | Casual (~15 min/day) |
|---|---|---|---|---|
| 1950s -> 1970s | 30 min | 30 min | day 1 | day 2 |
| 1970s -> 1990s | 85 min | 1.9 h | day 3 | ~day 8 |
| 1990s -> 2010s | 156 min | 4.5 h | day 6 | ~day 18 |
| 2010s -> 2030s | 240 min | 8.5 h | day 12 | ~day 34 |
| 2030s (future path) -> far future | 335 min | 14.1 h | day 19 | ~day 56 |
| far future complete | 441 min | 21.5 h | day 29 | ~day 86 |
(days = playing days; keen/casual rates from the flight log, section 9.)
- Prices are set so a typical player can also afford each era's first jet and gadgets when its time is
  reached: time and money line up instead of one blocking the other.

### Seeing your progress (user: players must be able to monitor it)
- **Results screen, after every flight (landed or crashed):** "+1.4 min flown" and an era bar that fills,
  e.g. "To the 1970s: 18 / 30 min"; a celebration when an era opens.
- **FLY screen:** a small era badge (e.g. "1950s") with the same bar under it.
- **Hangar:** the era timeline across the top (1950s ... far future), done eras lit, the next one with its bar
  and what it unlocks ("Next: the 747 jumbo, radar control, an electromagnet").
- **Not in flight:** nothing extra on the flying screen (keeps it clean).

## 9. Money
Measured so far (STATE.md): an average flight earns about 39 seeds and 4-7 crystals; 17% of real flights land;
badges pay ~7,700 seeds once. Seeds are scarce; crystals pile up.
1. **Crystal exchange** (hangar): trade crystals for seeds; the rate improves by era.
2. **Passenger fares** (Cabin gadget): a landed flight pays per passenger per 1,000 km. Lesson on the card: a
   fuller plane means less CO2 per passenger.
3. **Flight jobs**: three rotating contracts (e.g. "a whole night with no warming contrails"), replaced when done.
4. **Nature dividend**: each finished habitat project adds a little to every landing.
5. **First landing in each city**: ~104 cities since routing.
Prices: set from the measured income below so each era's first jet and gadgets are affordable when its flying time is reached (section 8).

### Measured play (2026-10-23, read-only aggregate of public.flights by the game session)
525 flights, 9 players (mostly the user, Lola and testers in the first 3 days: NOT festival behaviour).
Seeds are not stored: "sky seeds" are the restore.js estimate from distance (0.42d + 0.847d^2, d in 1000 km,
landed only), excluding mission, badge and city prizes. Duration is not stored: legs of 1,800-2,600 km take
~14-20 s, so a 5,000-8,000 km flight is ~40-70 s.
- Active days per player: median 1, p75 3. Flights per active day: median 29, p75 47. Landed: 20.4%.
- Sky seeds per flight (mean): flights 1-20: 8.7; 21-50: 10.2; 51+: 19.0. Per LANDED flight (median): 20, 25, 81.
- Top two players: A 51 flights/day, ~25.6 sky seeds per flight; B 42/day, ~15.2.
Pace: DECIDED as flying time, 30 x n^1.5 minutes per era (section 8); the earlier short/medium/long options are superseded.

## 10. The reset (user's choice, option a)
On the update: plane-side levels reset to the 1950s; seeds, crystals, nature (habitat projects, trees, found
animals, regions), badges, missions and all records (longest flight, total km `flownKm`, cities) are kept.
A one-time "Welcome to the 1950s" card explains it. The update is marked **major** in CHANGES.json.

## 11. Art (decided with the user, 2026-10-23, after PixelLab trials)
- **In flight: the size never changes (62x27), and the ORIGINAL plane is the benchmark.** The user loves its
  hard, clear, deliberate pixels (retro, not blurry). Blur comes from averaging: any shrink that blends pixels
  is rejected. The tilt stays as it is (collisions use the base 'plane' mask with the tilt; unchanged).
- **Recipe that works (trial 2026-10-23):** PixelLab pixflux drawing NATIVELY at 64x28, init image = the
  original plane, colour image = the original (forced palette), outline 'single color black outline', medium
  shading, init_image_strength ~200-300. Result: crisp, same palette and outline, a little more detail. Known
  flaw: the cockpit window comes out as "a couple of dots"; fix by hand or a 1-credit edit.
- **Hangar: a detailed version extrapolated from the SAME pixels** (bigger canvas, same livery and shape), so
  it is clearly the same plane. This is where detail lives (like the animals' field-guide cards; the user
  rejected cute/chibi cards).
- **Upgrade looks: no "abomination".** The old overlays stacked parts that poked out everywhere. New rule:
  each generation is ONE coherent plane; upgrades within it change only a few integrated things: livery colours,
  nose shape, winglets, engine nacelles, gear doors. Each look is drawn as a whole-plane variant from that
  generation's base (in flight and in the hangar), never as parts bolted on top.
- Provenance: every generated PNG keeps a note (tool, prompt, init image, strength, seed, date).
Trial images: /tmp/planes/ (not kept in the repo). **LOCKED recipe: research/PLANE-ART-RECIPE.md** (tools/art/plane_art.py);
first portrait: assets/ui/plane-hangar-jumbo.png (the 747, 400x176).

## 12. Build order
1. Measure income (DB + saves); fix the numbers in this doc.
2. Data + save migration (reset option a) + the hangar UI for 4 branches and eras.
3. Jets branch + the contrail-margin mechanic; art for the 7 jets.
4. Weather branch (reveal, false patches, misses).
5. ATC branch (cleared band).
6. Gadgets by era; cabin and fares; crystal exchange.
7. Future planes; flight jobs; nature dividend; city prizes.
Each step: tests with planted defects, full 2-shard run, CHANGES.json note.

## 13. Status
Decided (user, 2026-10-22/23): four branches, generations replace; era gadgets; ATC = kinder sky; fake forecast
patches vanish in a fun way; weather + ATC next-gap hint; one future path, switchable for a big price; reset
plane upgrades only; eras by flying time, 30 x n^1.5 min, crashes count; progress shown on results, FLY and
hangar screens; controls never change. Region art goes to a separate (third) session.
Open: PixelLab for plane art (2 free trial credits left; a paid plan needed for the rest, roughly 30-60
generations): waiting for the user's OK before spending anything.
