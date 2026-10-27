# Balance: eras 4-6, the twists, the systems and the crossing lengths (sim engine, 2026-10-27)

Task B. The user's targets: an EXPERT (s 0.9) makes crossing 4 about 10% of the time, crossing 5 about 2%, and the
final boss (a lap of the Earth, ~40,000 km) rarer still; s 1.0 = the user. Decisions this builds on:
research/PROPOSAL-ERAS-4-6-SYSTEMS.md (DECIDED): a harder sky by distance once an era is open (drifting no-fly zones,
turning flocks, pulsing storm gaps, the squeeze) AND longer crossings.

Method: the twists are built in src/sim/rules.js (branch feat/twists; tests/sim-twists.cjs). Each is on only when the
flight's era (the plane's era; `kit.era` stands in for planes not built yet) reaches its era and the flight has reached its
`from`, so Comet / jumbo / twin flights are unchanged (sim-equiv, sim-paired pass). The player is the gap-flying model
(src/sim/player.js) on twinFull with full Nature (Tree Planting 4, Soil 3, Species 4, every UK project), careful, budget 0.5,
40 skies per cell. Each sky is ONE open flight to 42,000 km; P(reach K) stands in for P(a crossing of K km is made). A
crossing also needs the landing; the open-flight figure is a slight overestimate. Noise at these rates: about ±5-7 points.

## 1. What limits distance

| Plane (heat) | Twists | s 0.9: 24k / 27k / 30k / 34k / 40k | s 1.0: same |
|---|---|---|---|
| today's twin | none (era 2) | .25 / .20 / .05 / .03 / 0 | .42 / .30 / .07 / .03 / 0 |
| today's twin | all at first guesses (era 5) | .30 / .15 / 0 / 0 / 0 | .50 / .23 / 0 / 0 / 0 |
| CO2 x0.5 + night contrail heat x0.4 | all at first guesses | .38 / .28 / .20 / .07 / .07 | .57 / .42 / .38 / .28 / .25 |

- **Heat is the ceiling.** On today's twin nobody reaches 30k once the twists are on; overheat ends 13-21 of 40 flights. So
  crossing 5 and the lap need the later planes' heat cuts: CO2 x0.5 (2030s) and less contrail heat at night.
- Below ~27k heat does not matter; only the barriers do.

## 2. What each knob buys (each alone, on the CO2 x0.5 + night x0.4 plane, era 5)

| Knob | s 0.9: 21k / 24k / 27k / 30k / 34k / 40k | s 1.0: same | Reading |
|---|---|---|---|
| base (turn 70, pulse 18, squeeze .03; no drift) | .38/.23/.20/.13/.07/.03 | .50/.45/.38/.28/.20/.13 | |
| drift towards LESS room, 10 px/s | .17/.07/.05/.03/0/0 | .35/.25/.15/.05/0/0 | steep |
| drift towards less room, 20 px/s | .17/0/0/0/0/0 | .25/.23/.20/.13/.13/.05 | a cliff |
| drift towards MORE room, 40 px/s | .05/0/... | 0 | a cliff (at 20 px/s "towards more room" EASED the sky: not monotonic) |
| pulse +-30 px (from 22k) | .38/.03/.03/0 | .50/.10/.05/0 | a cliff between 18 and 30 px |
| pulse +-45 px | .38/0/0/0 | .50/0/0/0 | |
| turn 110 px (from 18k) | .35/.20/.17/.13/.05/.03 | .50/.47/.35/.25/.15/.13 | mild: the bird planner copes |
| squeeze +0.06 per 4,000 km | .38/.23/.17/.07/.03/0 | .50/.45/.38/.23/.15/.15 | mild |
| contrail night heat x0.7 (no CO2 cut) | 30k .07 | 30k .23 | the 2030s "contrail-free cruise" |
| contrail night heat x0.4 | 30k .20 | 30k .38, 40k .03 | |
| CO2 x0.65 / x0.5 / x0.4 | 30k .13 / .20 / .20 | 30k .33 / .38 / .38; 40k .03 / .10 / .20 | the planes' CO2 |

The **hint lead** (ATC + forecast combo: more look-ahead) cannot be measured with this player: when it plans for gaps beyond
the screen edge it gets WORSE (median 15.2k -> 13.6k at s 0.9), so the combo's value to a human is unmeasured. **Bird
detection** (fewer birds or a predictable turn) has little to buy: turning flocks barely cost the model anything.

## 3. Sized proposal

Twists (now the config values on feat/twists; off for eras 0-2):

| Twist | From | Era | Value |
|---|---|---|---|
| no-fly gaps drift | 14,000 km | 3 (2010s) | 4 px/s, starting towards the side with LESS room (`drift.away`) |
| flocks turn once | 18,000 km | 4 (2030s) | 90 px |
| storm gaps pulse | 22,000 km | 5 (far future) | +-21 px every 3 s |
| the squeeze | 26,000 km, every 4,000 | 5 | +0.03 no-fly and bird chance (caps 0.6 / 0.7) |

Each crossing measured with ITS era's plane and the twists open by then:

| Crossing (plane) | Twists on | s 0.9: 24k / 27k / 30k / 34k / 40k | s 1.0 |
|---|---|---|---|
| 4 (2010s: CO2 x0.65) | drift | .15 / **.10** / .03 / 0 / 0 | .30 / .15 / .07 / 0 / 0 |
| 5 (2030s: CO2 x0.5, night x0.7) | drift, turn | .17 / .10 / **.03** / 0 / 0 | .33 / .07 / 0 / 0 / 0 |
| the lap (far future: CO2 x0.4, night x0.4) | all four | .07 / .03 / .03 / 0 / **0 of 40** | .25 / .20 / .13 / .07 / **.03** |

**Proposed km: crossing 4 = 27,000, crossing 5 = 30,000, the lap = 40,000** (the Earth). That gives an expert about 10% /
about 3% / under 1 in 40, and the user about 15% / 0-10% / about 3%. A drift of 7 px/s instead of 4 halves crossing 4 (27k
.00-.10); a pulse of 25 instead of 21 costs the lap about a third.

## 4. Caveats

- The model player is weak against MOVING no-fly gaps (it re-plans every frame but does not anticipate the motion); a human
  may find drift easier. Drift is the most sensitive knob: **playtest 4 px/s before trusting it**, and keep "drift shown"
  (the 2030s system's arrow) as the answer.
- Open flights, not landed crossings; one start plane (twinFull) with era kits emulated by CO2 / contrail-heat factors; 40
  skies per cell.
- Once a twist starts, the sky parts from the era-2 sky (flock placement retries see moving gaps): the same kind of sky, not
  the same one.
