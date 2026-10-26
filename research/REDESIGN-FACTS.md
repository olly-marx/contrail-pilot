# Redesign facts (measured from the code, 2026-10-25)

For the user's redesign ideas (biomes unlocking, story missions, longer gaps, restart). No code changed, no browser.
Measured from main at 2ed5663 (0.11.1) with a node script over `src/network.js`, `src/cities.js`, `src/geo.js`,
`src/missions.js`, `src/save.js`. Written by the PixelLab session, which did not build the routing; every number
here is from the code, not from memory.

## How routes work today (needed to read the rest)

- 104 airports. Each city links to its 5 nearest within 2,600 km, plus hand-made `BRIDGES` across seas (`LINKS`).
- Before take-off the player sees **3 choices** (`choices()`: the 3 neighbours pointing in the most different
  directions). After that the flight **keeps going on its own**: past each airport, `onward()` picks the neighbour
  that turns least. So the routes a player can actually fly are "a take-off choice, then autopilot".
- Every leg is squeezed to **1,800-2,600 game km** whatever its real length (`legGameKm`: 800 real km or less is
  1,800; 5,000 real km or more is 2,600). That is about 20 s of flying a leg.

## 1. The biome map

| Region | Cities | Borders (number of links into each neighbour) |
|---|---|---|
| woodland (UK and Europe) | 11 | mediterranean 12, boreal 12, tundra 6, plains 1, desert 1, ocean 1 |
| mediterranean | 8 | woodland 12, desert 4, plains 1, savanna 1 |
| desert | 13 | monsoon 8, savanna 8, mediterranean 4, woodland 1, ocean 1 |
| monsoon | 13 | desert 8, eastasia 7 |
| eastasia | 10 | monsoon 7, boreal 2, ocean 1 |
| boreal | 10 | woodland 12, plains 10, tundra 4, eastasia 2 |
| plains (N. America) | 12 | boreal 10, rainforest 7, mediterranean 1, tundra 1, woodland 1, ocean 1 |
| rainforest (S. America) | 10 | plains 7, savanna 2 |
| savanna (Africa) | 13 | desert 8, rainforest 2, mediterranean 1 |
| tundra (Iceland) | 2 | woodland 6, boreal 4, plains 1 |
| ocean (Honolulu, Nadi) | 2 | eastasia 1, plains 1, desert 1, woodland 1 |

Legs: **217 links stay inside one biome** (average 1,383 real km = 1,922 game km); **91 cross a border**
(average 2,071 real km = 2,019 game km). Inside a biome, legs are short and mostly at the 1,800 floor.

## 2. Single-biome trips from the two likely starts

As the game flies them today (a take-off choice, then the autopilot carries on):

- **Woodland** (11 cities): 18 take-off choices stay inside for at least 1 leg: 10 stay 1 leg, 5 stay 2 legs, 3 stay
  4 legs. Longest: **4 legs, 7,230 game km** (LONDON > BERLIN > WARSAW > KYIV > MOSCOW).
- **Mediterranean** (8 cities): 14 choices stay inside: 7 for 1 leg, 1 for 2, 4 for 3, 2 for 4. Longest: **4 legs,
  7,440 game km** (ISTANBUL > ATHENS > TUNIS > CASABLANCA > LISBON).

If the player could choose at every airport (not possible today), the longest 6-leg trip inside one biome is about
**11,100-11,200 game km** in both (e.g. ROME > ATHENS > TUNIS > CASABLANCA > BARCELONA > LISBON > MADRID).

So today, most flights leave a starting biome after 1-2 legs; a "stay in one biome longer" design needs either
longer legs or choosing at each airport.

## 3. Today's missions

There are **13** (not 16), done one at a time in order (`src/missions.js`). The prize grows with the position:
**seeds = 15 + 20 x index, crystals = 1 + 2 x index** (`src/rewards.js missionReward`).

| # | Mission | Goal | Prize (seeds / crystals) |
|---|---|---|---|
| 1 | Land at an airport | land | 15 / 1 |
| 2 | Land with 5 seeds | land with 5 seeds | 35 / 3 |
| 3 | Make 10 shade in one flight | 10 daytime shade | 55 / 5 |
| 4 | A night with no contrail | a whole night, no icy air | 75 / 7 |
| 5 | Fly past an airport, then land | skip 1, land | 95 / 9 |
| 6 | Plant a tree | 1 tree (needs Tree parcels) | 115 / 11 |
| 7 | Earn 5 ice crystals in one flight | 5 crystals | 135 / 13 |
| 8 | Make your plane cleaner | buy fuel/engine, land | 155 / 15 |
| 9 | Reach a new part of the world | a new region from the air | 175 / 17 |
| 10 | Bump through turbulence | fly through bumpy air | 195 / 19 |
| 11 | Plant 3 kinds of tree in one flight | 3 kinds | 215 / 21 |
| 12 | Bring wildlife back | a habitat project | 235 / 23 |
| 13 | World tour | every region discovered from the air | 255 / 25 |

**Pacing: NOT MEASURED.** Nothing in the code or `research/` records which flight a typical player finishes each
mission on. The plane build's new-player measurement (`research/PLANE-ONBOARDING-PLAN.md`) covers flights 1-5
but not missions. A bot run over the missions would give it; that needs a test turn from the coordinator.
**Likely bug (read from the code, not yet seen in a browser):** mission 8 "Make your plane cleaner" checks
`levels.fuel + levels.engine >= 1`, but those lines are in `RETIRED_LINES` (`src/fleet.js`): the eras reset deletes them,
the hangar no longer lists them (`#hUpgrades` is emptied; `upgrades.js retired()`), so they cannot be bought. Missions
run in order, so a player who reaches mission 8 after the eras can never finish it, and missions 9-13 never come.
Reported to the coordinator for the bug-fix chat; a browser check needs a test turn.

## 4. What "longer gaps between airports" would touch

- `src/network.js`: `LEG_LO = 1800`, `LEG_HI = 2600`, `REAL_LO/HI`, `legGameKm()`. One place sets every leg's length;
  `route.js legBetween()` and `GameScene.legKm()` use it.
- `src/config.js`: `STORMS.spacing` (230 px between storm pairs; tuned "with the shorter legs back"),
  `gapShrinkPerPair` and `WORLD.warmup` (gaps narrow per pair: longer legs means narrower gaps by the 1st airport),
  `HAZARDS` start distances (turbulence 2,000, no-fly 8,000, birds 10,000 m), the `lateRamp` (bigger icy air on
  long flights), and `AIRPORT` (sign 700 px ahead, storm-free zone round runways).
- Money: fares are **seeds per 1,000 km of a landed flight** (`src/fleet.js`), and the landing multiplier grows per
  airport skipped (`perSkip`), so longer legs pay more fares per leg and skipping is rarer: the prices would need a
  look (the bug-fix chat's pricing work).
- Heat: flights end when the Earth bar fills; `CLIMATE.dangerLine` (165 since 0.10.3) was tuned so a 1950s Comet
  flies ~9,100-11,800 km. Longer legs with the same heat means fewer airports reached before overheating.
- `tools/balance.cjs` measures km until overheating per plane; its targets would need re-reading after any change.
- Tests that assume today's leg lengths (to check before changing): `tests/everyleg.cjs`, `flightregion.cjs`,
  `regions.cjs`, `geo.cjs`.

## 5. A restart that keeps stats

The save is one JSON object (`src/save.js`, key `contrailPilot.v2`), plus `player_saves` online.

**Progress (a restart would wipe):** `seeds`, `crystals`, `fleet` (planes, systems, gadgets), `levels`, `fuel`,
`city`, `heading`, `visited`, `mission`, `missionsDone`, `unclaimed`, `habitat` (projects done per region),
`planted`, `plantedIn`, `found` (animals), `discovered` (regions), `freeUpgrade`, `freeGiven`, `eraWelcome`,
`tutorialDone`, `seenTips`, `tours`, `dayNightSeen`, `shopSeen`, `shownLines`.

**Stats (could be kept):** `flights`, `landings`, `crashes`, `bestDistance`, `flownKm`, `flightSeconds`, `laps`,
`coolLandings`, `badges`, `badgeTiers`.

**Settings (keep):** `muted`, `autoTakeoff`, `priceVersion`, `repriced`.

Decisions hidden in this list: are **badges** stats (keep) or progress (earn again)? Do **eras** restart (they open
by `flightSeconds`, a stat, so keeping that stat keeps the eras open)? Do found **animals** restart? The online
**leaderboards** are built from the `flights` table, not the save, so they keep everything unless the database is
changed (a live-database change: the user decides).
