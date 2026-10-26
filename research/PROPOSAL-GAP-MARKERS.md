# Proposal: see the next gaps earlier (gap prediction markers)

Status: DECIDED by the user (2026-10-26, via the coordinator): **NO base gates for anyone.** The hint stays a reward of
the three systems (as today), made **clearer in daylight**: a dark outline, no-fly stripes and the jump arrow, within the
systems' own lead. BUILT that way behind `?gapmarkers=on` (branch gap-markers): src/gapmarkers.js, GameScene.drawGapGates,
tests/gapmarkers.cjs; the sim files are untouched (no spawn change). Design A's base lead below is SUPERSEDED: do not
build it. The user plays at about era 3, mostly upgraded: check that case in daylight on the test turn.

Original status: PROPOSAL (game chat, 2026-10-26), for the coordinator. The user's priority: no-fly zones that feel
impossible; see the next gaps earlier and more clearly to get ready for them. The recommended design is to be built
behind `?gapmarkers=1` first. No browser was used for this; all numbers come from the sim engine on origin/main
ffa7bdc / 0.11.9.

## What happens today (measured)

- **The hint exists only for players who own all three systems.** `fleet.js` sets `hintLevel` to the lowest of the
  forecast, ATC and ops levels, so a player without all three has NO hint. A new or early player always has none.
  When there is a hint, it is a 2-4 px yellow sliver at the right edge, alpha 0.25-0.75 (`GameScene.drawGapHint`),
  shown for storms only, `GAP_HINT.lead` 0.5-1.5 s ahead.
- **The screen shows about one obstacle ahead.** The plane is at x = 60 on a 288 px screen, so it sees 238 px
  ahead, while storms are 230 px apart (`STORMS.spacing`). The next gap comes on screen just as you are threading
  the one before it.
- **Warning time** = from the gap entering the screen to it reaching the plane. Measured over 3 skies and 20,000 km
  (smart pilot, jumbo and comet):

  | | median warning | gap height | jump from the previous gap (median / p90) | speed |
  |---|---|---|---|---|
  | storms before 8,000 km | 1.72 s | 139 px | 66 / 171 px | 105 px/s |
  | storms from 8,000 km | 1.35 s | 115 px | 127 / 207 px | 133 px/s |
  | **no-fly zones** (from 8,000 km) | **1.37 s** | **87 px** | 79 / **214 px** | 131 px/s |

- **Why it feels impossible.** Climbing 214 px takes 1.15 s when you tap every 0.15 s (186 px/s), or 1.3 s every
  0.2 s (164 px/s). Add a 0.25 s reaction and you need about 1.4-1.55 s, but the warning is 1.37 s. And a no-fly
  zone forgives nothing (`stormForgive` is 0 for no-fly), with an 87 px gap of which the 38 px tap bob uses almost
  half.
- **It is NOT physically impossible.** The sim chat's perfect tapper (`tools/sim/tapper.mjs`, comet, seed 1,
  0-18,000 km) found 0 impossible, 0 frame-perfect, 0 expert and 0 hard moments: a 150 ms tap rate always gets
  through, IF you start moving early enough. So what is missing is **knowing in time**, and that is what a marker
  gives.

## Three designs

### A. Edge gate: the next gap shown at the right edge, early, for everyone (RECOMMENDED)
- **Where:** a clear "gate" on the right edge: two bright brackets at the gap's top and bottom, the gap filled
  faintly, and a small arrow at the plane's height pointing up or down towards it.
- **How far ahead:** a base lead for EVERYONE of 0.8 s before the column scrolls in, which turns a 1.37 s warning
  into ~2.2 s. The systems still add more lead as now, 0.5-1.5 s on top, so buying them still matters.
- **Storms and no-fly differ:**
  - storms: a yellow gate, as today's colour;
  - no-fly: a red-and-white striped gate, an extra 0.4 s (they forgive nothing and their gaps are 28 px smaller),
    and the arrow blinks when the jump is more than 120 px.
- **What it reveals:** only the NEXT gap's height and size, which the player will see anyway 1.4 s later. Nothing
  new is invented: the same kinds of sky, just seen sooner.
- **Cost:** one graphics object; the spawn moves `lead` px further right (the sim already does this for `GAP_HINT`).
  Small and familiar (it grows out of the current hint).

### B. Flight path ribbon
- A dotted line from the gap you are in to the next one: the path to fly.
- It reveals more (it tells you WHEN to move) and helps the most, but it takes away the skill, and it is busy on a
  small screen. Better suited to flight school or the easiest era.

### C. Radar strip (minimap)
- A thin strip along the top showing the next 2-3 gaps squeezed in, like a radar. It reveals the most (3 gaps ahead)
  and fits the "forecast/ATC" story.
- But the eye must leave the plane to read it. Children (the audience) read a top strip badly while tapping. It
  could be the top system level's reward later.

## Recommendation (SUPERSEDED by the user's decision above)
Build **A**, behind `?gapmarkers=1`:
- base lead 0.8 s for everyone, plus 0.4 s for no-fly;
- systems add `GAP_HINT.lead` on top;
- different storm and no-fly looks, and the direction arrow.

Then measure:
- with the sim player (`src/sim/player.js`): reaction ≈ s; check that distance at s = 0.70-0.75 rises without
  changing the s = 1 numbers much;
- with a test turn: screenshots, and real feel on a phone.

If A is not enough for no-fly, add B for no-fly only (a short ribbon from the gap you are in to a red gate).

## Rules to keep
- With the flag OFF nothing changes: sim-paired and sim-equiv pass, golden flights unchanged. With it ON, the same
  seed gives a different (equally random) sky: storms are drawn earlier, so their rng draws interleave differently
  with icy air and birds. Compare flag on vs off by medians over 20+ skies, never seed by seed.
- The flag is off by default; `FEATURES.gapMarkers` via `previewSwitch('gapmarkers')`.
- Files: `src/sim/rules.js` (the lead, in the sim chat's file: agree first); `GameScene.drawGapHint` (not the
  crossings code that 0.12.0 touches); one `FEATURES` line in `config.js` (not STORMS).

## Tests to write when built
- With the flag on and no systems, a gate is drawn before the column enters the screen, by >= 0.8 s (plant: base
  lead 0 → fails).
- A no-fly gate differs from a storm's and comes 0.4 s earlier (plant: the same look → fails).
- With the flag off, the drawing and spawn positions are byte-identical to today (sim-equiv; plant: base lead
  applied with the flag off → golden flights fail).
- The arrow points towards the gap from the plane's height (plant: sign flipped → fails).
