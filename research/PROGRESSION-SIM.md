# Progression simulator: first results (sim engine chat, 2026-10-26)

Checks research/MASTER-PLAN.md Parts B, C and I against the game's own rules. Code: `src/sim/player.js`,
`src/sim/progression.js`, `tools/sim/progression.mjs`, `tools/sim/calibrate.mjs`, `tools/sim/skill-grid.mjs`.
Everything here is MEASURED by those tools unless marked otherwise. Node only, about 0.1 s per flight.

## 1. The first finding: the test pilots cannot fly storm gaps

With crashes ON, all three balance pilots (straight, careful, smart) hit the first storm at about 400 km, in 20 of 20
skies (Comet, nothing bought).
- **Cause:** they aim within the gap using the 12 px hitbox, but a crash is tested on the 27 px drawn picture. They
  also fall past their target at up to 400 px/s.
- **So every crashes-off reach number is a never-crash UPPER BOUND.** This includes the era ladder in MASTER-PLAN
  Part A and the capability estimate.

**The gap-flying player (`src/sim/player.js`):**
- **Planning:** it plans with the picture's box, keeps its whole bob inside the gap, and taps at the bob's low point.
  (A tap lifts the plane 38 px; the tilt adds about 6 px at each end.)
- **Two bugs found and fixed while measuring:**
  - the bob lifted it out of the gap;
  - a look-ahead made it tap early when falling fast, lifting the bob too high.
- **Skill s (0 to 1) adds human errors** from the player's own seeded stream, so the flight's physics stream is
  untouched:
  - a reaction delay of up to 250 ms;
  - aim noise of up to ±30 px;
  - up to 30% missed taps.

  A less precise player keeps further from the gap's edges, by its own aim error.
- **Gate:** `tests/sim-player.cjs`. It fails if the bob bug is planted back.

**Distance against skill** (Comet bare, crashes on, 40 skies; median [p10-p90] km; `tools/sim/skill-grid.mjs`):

| s | careful | careless |
|---|---|---|
| 0.70 | 1,348 [620-2,737] | 5,932 [3,413-8,237] |
| 0.75 | 2,496 [1,112-5,953] | 8,250 [6,365-9,067] |
| 0.80 | 7,975 [1,813-9,125] | 8,442 [5,905-9,543] |
| 0.85 | 8,895 [6,365-10,126] | 8,905 [7,746-10,037] |
| 1.00 | 9,610 [7,746-10,916], mostly ending by overheating | 9,407 [8,435-10,607] |

**Two things to know:**
- **The curve is steep.** Careful goes from 2.5k to 8k between s = 0.75 and 0.80, so a small error in s moves the
  answer a lot.
- **Important for the heat tuning:** at the same skill, CARELESS flies further than careful below s ≈ 0.85.
  Avoiding or seeking icy air means more steering, and so more crashes. If real children are like this, a heat change
  that only punishes careless flying is partly undone by the crashes careful flying costs.

**A known limit:** even s = 1 is caught by the tightest no-fly gaps (82 px, minus a 38 px bob). A real expert taps in
smaller bursts; this player always taps fully.

## 2. Calibration against real players

The target is `tools/sim/real-players.json`: the live flights table, with the user's own flights EXCLUDED (as the user
asked). It is thin: 8 players on flight 1, 4 on flights 11-20, 3 past flight 20.

**Method (`tools/sim/calibrate.mjs`):**
- For each setting (constant skill s, careful or careless, maxSkip), 4 independent players fly 50 flights.
- Score per flight band = |log(median ratio)| + |log(p90 ratio)| + 2 × |landed-share difference|. 0 is a perfect
  match.

| band | real median / p90 / landed | best fits (score) |
|---|---|---|
| 1-5 | 3,166 / 5,620 / 16% | careless s=0.70 (0.24) |
| 6-10 | 1,950 / 6,355 / 22% | careful s=0.72 skip 2 (0.40); careful s=0.72 skip 3 (0.61) |
| 11-20 | 3,333 / 7,477 / 24% | careless s=0.70 (0.38) |
| 21-50 | 3,980 / 9,856 / 21% | careless s=0.70 (0.68): POOR, see below |

(Re-run 2026-10-26 after the shared-defaults fix, 12be91f. The first run had careful s=0.72 best for flights 1-5
(0.10) and careful s=0.75 for 6-10 (0.60): those scores were measured with the leak and are not to be cited.)

**What it says:**
- **The early real flights fit at s ≈ 0.70-0.75.** Careful and careless fit about equally well. The data cannot tell
  them apart.
- **Real players hardly improve over 50 flights:** the medians are 3.2k → 3.3k → 4.0k. The best fit is a near-constant
  s ≈ 0.70, not a learning curve. But the long tail grows (p90 7.5k → 9.9k), so some players do get much better.
- **Real players rarely land: 21%.** Simulated players at s ≥ 0.78 land 50-95% of flights, because the heat rule tells
  them to. Real children fly on until something stops them.
- **Flights 21-50 fit poorly.** The simulated distances bunch at the airports (about 3.7k, 5.5k and 7.3k), and none
  reach the real p90 of 9.9k. Real players skip more airports and crash later.
- **A flaw in this run:** the careless player draws its own maxSkip (0-2) and ignores the setting, so the careless
  rows repeat across skip values. A per-player "fly on" tendency would fit flights 21-50 better.
- **Uncertainty:** with 3-8 real players per band, one player more or less moves a band median by roughly 1-2k.
  **Treat s as a parameter (0.70-0.75 for an early real player), not a fact.**

## 3. The timeline (150 flights from a fresh save, 3 skies each; `tools/sim/progression.mjs`)

**The model.** One flight:
1. **Fly:** the player at that flight's skill, crashes on. It lands by the heat rule, or after passing maxSkip
   airports. It drops parcels onto soil and steers for seeds inside its safe band.
2. **Bank:** the game banks the flight (`bankFlight`, the same code as the game).
3. **Claim:** the player claims every prize.
4. **Shop:** it buys the cheapest affordable thing, again and again (`buyFleet`, `buyLevel`, `fundProject`, the same
   code as the game), and flies the newest plane.

Every 10 flights it re-estimates capability. A crossing is offered when capability ≥ the tier's length AND the
biodiversity of the land of the city it is in is ≥ 30 (MASTER-PLAN B4, conditions 1 and 2). It is attempted as one
non-stop flight to a gateway.

| player | era 1 (747) | era 2 (twin) | bank at flight 50 / 150 | home biodiversity at 150 | crossings |
|---|---|---|---|---|---|
| calibrated careless s=0.70 | flight 34-37, 20 min | flight 116-133, 77 min | 150-530 / 240-540 seeds | 15-22 | none |
| calibrated careful s=0.72 | flight 39-43, 20 min | not by flight 150 (64-71 min flown) | 10-110 / 20-57 seeds | 22-24 | none |
| learning careful, s 0.72→0.88 | flight 27-29, 20-21 min | flight 80-84, 77 min | 610-860 / 2,900-3,800 seeds | 27-36 | none in 1 of 3 skies (home biodiversity 27); in the other two, tier 1 at flights 126 and 135 (2.2-2.3 h), then tiers 2-3 within 5-10 flights |

(Re-run after the shared-defaults fix, 12be91f. The first run, measured with the leak, had tier 1 in all 3 skies at
flights 127-142 and higher banks: those numbers are superseded. The conclusions below hold for both runs.)

**What it says:**
- **The era clock works as designed.** Eras open at 20 and 77 minutes of flying for every kind of player. Players who
  crash early just need more flights (34-48 against 27-29).
- **The nature gate, not the plane, decides when a crossing is offered.**
  - The never-crash capability estimate is 16-24k for all players by flight 150, far above every tier. So "capability
    ≥ tier" is never what holds them back.
  - The home land's biodiversity reaches 30 only for the learning careful player, and only after about 125-135
    flights (in 1 of 3 skies it was still 27 at flight 150).
- **Once nature passes 30, the crossings fall like dominoes.** Tiers 1 to 3 within 5-10 flights, because the plane has
  been ready for a long time.
- **Against MASTER-PLAN Part C,** which expects tier 1 around flights 25-50 and tier 3 around 70-120:
  - **real-like players** (s ≈ 0.70) never get there in 150 flights;
  - **a learning careful player** gets there about 3 times later than planned, then much faster than planned.
- **Crystals are the bottleneck**, as Part D suspected. The bank stays at 0-15 crystals for most of the run. Every
  upgrade needs some, and they come from night skill.

**Caveats** (v1; these change the numbers, not the method):
- **No areas.** The game has no areas yet, so landing moves the player between lands and its nature spreads over
  several of them. In the planned confined areas, the home land would fill faster. To fix: add the area confinement
  (MASTER-PLAN B2) to the route in the simulator, or wait for the game to have it.
- **Area missions are not a condition.**
- **The capability estimate uses the never-crash pilot.** This is the second finding to act on (below).
- **The shopping is cheapest-first,** not "most useful".

## 4. What to do with this (PROPOSED)

1. **Capability in the hangar should not be the never-crash number.**
   - Telling a child "your plane can reach ~20,000 km" when they crash at 3-5k is misleading.
   - Either estimate it with the gap-flying player at a typical real skill (s ≈ 0.75, crashes on), or show it as a
     potential: "if you fly perfectly".
   - For the crossing offer, either way works, as long as the crossing length is set against the same estimate.
2. **The biodiversity-30 gate is the slow part.** Look at it again once the simulator has areas: confinement may be
   enough. If not, lower it, or let projects count for more.
3. **Crossings unlock in a burst after the nature gate opens.** Space the tiers with something besides capability
   (e.g. one crossing per area, as B3 intends; the simulator does not have areas yet).
4. **Calibration next:**
   - fit a per-player "fly on" tendency (how many airports a child skips before trying to land);
   - fit a slowly rising skill curve, which only the long tail needs;
   - refit when the live table has more players.

## How to run

```
node tools/sim/skill-grid.mjs                         # distance vs skill (~70 s)
node tools/sim/calibrate.mjs                          # the calibration grid (~15 min)
FLIGHTS=150 SEED=1 CAREFUL=1 node tools/sim/progression.mjs   # one player's timeline (~15-25 s)
```

`progression({ careful, skill: n => s, flights, seed, tiers, every, maxSkip, capSeeds, start })` in
`src/sim/progression.js` returns the per-flight rows and the timeline events.
