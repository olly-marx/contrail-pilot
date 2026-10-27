# Balance: the early shop gap (sim engine, 2026-10-27)

The question: under 0.12.0-1 every level-1 line seemed bought by flight 5-9, while crossing 1 was not offered until
~flight 30, so the shop looked empty for ~20 flights. Measured here under the LIVE 0.12.1 rules (9fa8805: B storms,
crossings 6,500 / 13,000 / 18,000 km, offered when the best LANDED ordinary flight >= 70% of the crossing and
biodiversity >= 30, era cap 2).

Method: the progression simulator (`src/sim/progression.js`) with the gap-flying player, careful, a constant skill
s = 0.75 / 0.80 / 0.90 / 1.0, 4 seeds x 100 flights each. The cheapest-first shop and claim-every-prize are as in
progression.js. Scratch tree `~/sim-9fa8805` (live code + a `gateBest` switch for the offer rule; areas are not modelled,
so all flights count for one area). "Empty" = a flight after which nothing is bought.

> **Caveat (2026-10-27): these runs used the CLASSIC whole-world route network.** `SEASON2_ON` (src/cities.js) reads
> `window.SEASON2`, which never exists in Node, so the progression sim never flew season 2's area-locked routes or its
> S2 bridges. Route-driven numbers here (where crossings open, biodiversity, projects, the shop) are approximate until
> re-run with season 2 on in Node. Crash and hazard rates do not depend on routes. Do not cite the route-driven numbers as
> season-2 measurements; do not assume they are wrong either: they are unverified.

## 1. The landing rule decides almost everything

The simulated player lands once it has passed `maxSkip` airports. With maxSkip 2 (the value the progression runs used
so far) its best landed flight stays ~5.5-7.5k km, so crossing 2 (needs a landed 9,100 km) is almost never offered.
This is a modelling choice, not the game. The user lands much longer flights (median 9.2k). Per 1,000 km the model
earns crystals at the user's rate (0.50-0.59 against 0.66), so the economy per km is right; only flight length differs.
Below, maxSkip 4 (a player who goes for long landed flights) is the baseline. maxSkip 2 is in section 4.

## 2. Where the gate opens (maxSkip 4)

| s | Biodiversity 30 (= crossing 1 offered), flight | Crossing 1 made, flight (median minutes) | Crossing 2 made, flight | Crossing 3 |
|---|---|---|---|---|
| 0.75 | 30 / 49 / 68 / 42 | 31 / 63 / 68 / 53 (47 min) | none in 100 flights | none |
| 0.80 | 21 / 33 / 29 / 42 | 22 / 37 / 29 / 43 (31 min) | - / 67 / 99 / 70 (77 min) | none |
| 0.90 | 21 / 18 / 26 / 25 | 21 / 18 / 26 / 25 (36 min) | 26 / 19 / 27 / 28 (38 min) | none |
| 1.0 | 24 / 20 / 27 / 28 | 24 / 20 / 27 / 28 (37 min) | 26 / 21 / 28 / 29 (39 min) | none |

- The distance part of the gate never binds for crossing 1: a first flight already beats 4,550 km.
  **Biodiversity 30 is the gate**, reached at flights 18-68.
- For s >= 0.9, crossing 2 follows crossing 1 within 1-5 flights: their landed flights already pass 9,100 km.
- Crossing 3 (18,000 km; offered at a landed 12,600 km) was made once in 48 runs (option B, s 0.9). It is the
  "very hard" crossing the user asked for.

## 3. Is the shop empty?

| s | Flights with nothing bought (of 100) | Longest empty run | Items bought | What blocks |
|---|---|---|---|---|
| 0.75 | 72-78 | 22-42 | 45-50 | SEEDS: ~20-70 banked, crystals 50-90 (crashes cost the landing pay) |
| 0.80 | 57-71 | 7-24 | 50-75 | seeds, then crystals once crossing 2 is made |
| 0.90 | 49-56 | 4-8 | 80-85 | CRYSTALS: ~7,500 seeds banked, 0-22 crystals; top-level era-2 items (e.g. gear5, sensors5) every 2-4 flights |
| 1.0 | 51-56 | 5-6 | 78-84 | crystals, as 0.90 |

So under 0.12.1 there is **no early gap before crossing 1 for typical and better players**: the empty runs before
crossing 1 are at most 2-8 flights. Cheap level-2/3 items and the area's projects fill flights 5-30. The real gaps:
- **Beginners (s 0.75): long empty runs (22-42 flights)**, seed-starved. Crossing 1 comes late (flights 31-68).
- **Experts after crossing 2 (~39 min in)**: 60-70% of flights buy nothing, because crystals pace the top era-2 items
  and the release stops at era 2. A slow late game, not an empty one, until crossing 3 or the next release.

## 4. Options (each measured, 4 seeds x 100 flights, maxSkip 4)

| Option | What changes | s 0.75 | s 0.80 | s 0.90 / 1.0 |
|---|---|---|---|---|
| none (0.12.1) | | empty 72-78, run 22-42 | empty 57-71, run 7-24 | empty 49-56, run 4-8 |
| **A. Re-price**: every crystal price halved (fleet seeds/16 instead of /8; upgrade lines and projects x0.5) | prices | empty 70-80, run 18-52 | empty 57-81, run 9-65 | empty 52-59, run 4-6; c1/c2 2-8 flights earlier |
| **B. Exchange desk**: seeds above a 1,500 reserve turn into crystals at 20:1 after each flight | a new shop feature | no effect (never 1,500 seeds) | almost none | empty 47-51, run 3-4, +7-11 items; 200-250 crystals exchanged |
| **C. Mission prizes**: missions pay double seeds (`missionReward` seeds x2; crystals unchanged) | prizes | empty 67-72, **run 7-15**, +3-11 items | empty 56-64, run 7-20 | (not run) |

Reading:
- **A (re-pricing) does not help** where the gap is. Beginners are short of SEEDS, not crystals, and at the top it
  only moves the crossings a little earlier. Not recommended.
- **B helps experts only**, a little (-5 percentage points of empty flights). It turns their idle seed bank into
  progress. Cheap to build. Optional.
- **C helps beginners most** (the longest empty run falls from 22-42 to 7-15 flights) with no change for the top.
  Recommended if the beginners' experience matters (it is the group with real empty stretches).

Time to play: crossing 1 at ~31-47 min of flying (typical to beginner) and ~36-37 min (experts) under all options. A
moves experts' crossings 1-2 about 2-8 flights (~3-8 min) earlier. B and C do not move the crossings.

**Recommendation: "no change" to prices (A). Consider C for beginners (double mission seed prizes), and B as a
later quality-of-life feature for experts.** The "empty shop for 20 flights" premise does not hold under 0.12.1 for
typical players, so there is no urgent change.

## 5. Caveats

- Areas are not modelled (one area's best and biodiversity); area missions are not a condition yet (M6).
- maxSkip is a fixed policy (section 1). With maxSkip 2, crossing 2 is not reached by anyone in 100 flights.
- 4 seeds per cell, one player model. The shop buys the cheapest thing first; a human may save up.
- Scratch edits only (`~/sim-9fa8805`: progression gateBest/earnedCr/EXCHANGE, fleet CRYSTAL_DIV, rewards SEED_PRIZE).
  Nothing here is in the game.
