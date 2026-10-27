# Balance: the top end (sim engine, 2026-10-26)

How far can the best players fly, and what stops them? Measured with the gap-flying player
(`src/sim/player.js`) against the user's own flights. Each number is from Node runs of the simulator with
the commits listed at the end; the per-hazard rates for the user are estimates (see section 2).

## 1. The model player at the top end

Three fixes, each gated by a test that fails when the fix is planted out:

| Change | Commit | Gate | Effect at s = 1 |
|---|---|---|---|
| Look-ahead tap planner around birds | fdf476c | `tests/sim-hazards.cjs` (PLANT=old fails) | bird strikes per flock met 21.6% -> 5.3% (comet, heat off, 20 skies) |
| Faster hammering on long climbs, ramped in above s = 0.9 | ff3c733 | fit unchanged (calibrate byte-identical at 0.75 / 0.8 / 0.9) | no-fly deaths per zone 5.2% -> 3.3% (80 skies) |
| `simulate()`'s player drops tree parcels (progression.js's rule) | 09dabc6 | `tests/sim-trees.cjs` (PLANT=nodrop fails) | a save that owns trees now gets their cooling in single flights |

Tried and dropped (measured worse or no different, not committed):
- the look-ahead planner for no-fly zones: 2.8-10% per zone against the band's 2.3-3.3%;
- an expert "head start" (start the climb inside the column being left): 28% per zone, plus storm clips;
- keeping the next gap reachable by flying barrier-first (care 0 against care 1): 2.8% against 3.3%, 29 against 34 deaths, noise.

The skill fit is unchanged: BEGINNER 0.75, TYPICAL 0.80, EXPERT 0.90. Progression flights end before birds
(10,000 km) and every change above leaves s <= 0.9 flying as before, so the crossing 1-3 rates and the option B
numbers do not move. Progression runs always dropped parcels, so they never lacked tree cooling.

## 2. The user's flights (`~/contrail-data/olly-flights.csv`, 254 flights)

Median 9.2k, p90 16.8k, best 24,138 km, which LANDED (2026-10-23, trapped heat 43.6). The top five are 19.7-24.1k
(3 landed, 1 no-fly, 1 storm). Ends: storm 88, no-fly 55, landed 60, unrecorded 31, ground 13, bird 7.

The data records how each flight ended but not how many hazards it met, so the met counts are ESTIMATED from
distance: no-fly zones = (km - 8,000) / 230 x 0.45 per flight; flocks = (km - 10,000) / 700 x 0.55 x 0.75 (the 0.75
assumes the user's bird-advisory level, which the data does not record).

| Per hazard met | User (estimate) | Model, s = 1 |
|---|---|---|
| No-fly deaths per zone | ~3.8% (55 / ~1,439) | 2.8-3.3% |
| Bird deaths per flock | ~2.5% (7 / ~283) | 5-7% |

So the model's no-fly handling is already human-level (no-fly tuning stops there), and it is about twice as bad
as the user with birds. The user's top end fits s ~ 0.95-1.0 with a full forest; EXPERT 0.90 stays the strong
regular player.

## 3. Eras 4-6: how far can a late plane get?

twinFull, option B storms, kit gaps 1.03, gapBirds 0.75, heat x1, 40 skies, careful, budget 0.5
(`~/sim-81e1ea0-p2/era456.mjs`, NATURE=full). "Full" = Tree Planting 4, Soil 3, Species 4 and every UK woodland
project: 6 trees planted a flight, tree cooling ~60.

| s | Nature | Median | P(>= 21k) | P(>= 26k) | P(>= 30k) | Ends |
|---|---|---|---|---|---|---|
| 0.9 | none | 15.1k | 0.07 | 0 | 0 | Restricted 18, overheat 10, Storm 8, Bird 4 |
| 0.9 | full | 16.7k | 0.38 | 0.20 | 0.05 | Restricted 27, Storm 6, overheat 3, Bird 2 |
| 1.0 | none | 17.4k | 0.17 | 0 | 0 | overheat 21, Restricted 14, Storm 3, Bird 2 |
| 1.0 | full | 18.8k | 0.47 | 0.30 | 0.07 | Restricted 21, overheat 9, Bird 5, Storm 3 |

Reading: with a full forest, heat does not need to drop for 21k; no-fly zones become the first limit, as in the
user's own ends. Below full Nature, heat binds again. This is PROVISIONAL until the user's real Nature levels are
known (the CSV lists the kinds planted per flight, not upgrade levels).

The earlier answer "an expert needs gaps 1.2 + no birds + heat x0.6 for 21k" measured the old model player's
ceiling (no planting, weak around birds), not the game's. It is withdrawn; do not cite it.

## 4. Retracted: "the generator makes impossible no-fly pairs"

Claimed and retracted the same day. The measurement read a storm's x after the game had dropped it from
`w.storms`, so its position was stale: 145 px between columns instead of `STORMS.spacing` 230, so 0.6 s for the
move instead of ~1.0 s. With the right spacing every flagged pair is reachable. `tools/sim/check-reach.mjs` checks
each consecutive pair from recorded frames: 0 impossible in 20 comet + 20 twinFull skies to 24k (2 tight). A
planted bottom-then-top pair FAILS it, and the exact tap search (`tapper.mjs`) agrees that nothing survives. Its
reach bound ignores the bob and the tilt, so a pass is evidence, not proof. No generator change was made.

## 5. Local commits to fold into a suite turn (in `~/cp-sim`, not pushed)

| Commit | What |
|---|---|
| fdf476c | bird tap planner; `tests/sim-hazards.cjs`; `tools/sim/hazard-ends.mjs`; `tools/sim/check-reach.mjs` |
| ff3c733 | faster climbing above s = 0.9; hazard-ends SEED0 |
| 09dabc6 | parcel drops in `simulate()`; `tests/sim-trees.cjs` |
| a591a5a | hazard-ends takes CARE |
| (this file) | research/BALANCE-TOP-END.md |

Rebase onto main after 0.12.0, then a full 2-shard `tools/test.sh`. Not run here: `tests/sim-bank`, `sim-masks` and
`sim-rng-split` need the browser (playwright-core). The other 10 Node sim tests pass, `sim-equiv` byte-identical.

> **Re-checked under season-2 routes (2026-10-27).** The first runs used the classic whole-world network (`SEASON2_ON`
> was always false in Node; fixed in src/cities.js to read `globalThis.SEASON2`). Re-run on s4-tiers 2488b8b with season
> 2 on (Western Europe start, area-locked routes, asserted): crossing 13,000 km gave the same P (s 0.9: 0.77 / 0.77; s 1.0:
> 0.87 / 0.73); 18,000 km slightly higher (s 0.9: 0.07 / 0.27; s 1.0: 0.10 / 0.20; was 0 / 0.17 and 0 / 0.13), within the
> ±0.08 noise. Longest empty shop run with S4's missions: s 0.75 7-14 (8-10 when it lands after 2 airports), s 0.8 5-9, s
> 0.9 / 1.0 4-7. The conclusions below stand; the route-driven numbers are within noise of the season-2 ones.

## 6. Crossing lengths (user decisions, 2026-10-26)

**0.12.x: 6,500 / 13,000 / 18,000 km** (crossing 1 unchanged; 2 and 3 "very hard"). Basis: B storms, saves from a
progression run per skill at flight 45 (jumbo) and 80 (twin for 0.9 and 1.0), 30 flights per length (±0.08):

| Length | s 0.80 | s 0.90 | s 1.0 |
|---|---|---|---|
| 13,000 | 0.07 / 0.00 | 0.77 / 0.77 | 0.87 / 0.70 |
| 18,000 | 0 / 0 | 0 (jumbo) / 0.17 (twin) | 0 (jumbo) / 0.13 (twin) |

The progression saves have a modest forest by flight 80 (trees 2, soil 2, no species), so an expert needs a better
forest for 18k, as intended. The user at full Nature was NOT measured as a gateway landing at 18k (open flights: 21k
is reached 47% of the time at s = 1), so the user probably makes crossing 3 more often than 1 in 3. 20,000 would be
closer to 1 in 3.

**Crossings 4 / 5 / final: proposal (not for 0.12.x, which stops at crossing 3; extreme expert goals by design).**
Targets for the user (s ~ 1.0, full Nature): crossing 4 about 1 in 5, crossing 5 rarely (~1 in 15), final a feat.
Today's best plane (twinFull, B, full Nature, open flights, 40 skies) gives P(reach) 0.47 at 21k, 0.30 at 26k and 0.07
at 30k. On today's kit that maps to about **4 = 27,000, 5 = 30,000, final = 32,000 km**. But crossings 4-6 are flown on
era 4-6 planes that do not exist yet, and their kit (heat, gaps, birds, tanker) will raise every P. So fix the lengths
by the TARGET P, re-measured once those planes are specified: pick the km where the user-level player (s 1.0, full
Nature, the era's top plane) lands the gateway ~20% (4), ~7% (5) and ~2-3% (final). Placeholders today stay
21,000 / 26,000 / 30,000 in season.js; with today's kit those would be ~1 in 2, ~1 in 3 and ~1 in 14 for the user:
not extreme enough for 4 and 5.
