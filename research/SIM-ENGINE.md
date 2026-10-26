# The sim engine: the game's flights without drawing

Written 2026-10-26 by the sim engine chat. Code: `src/sim/`. In the game since 0.11.7.

## What it is

The flight's rules (speed, the plane, heat and its parts, contrails and the light they block, icy air, storms,
no-fly zones, birds, turbulence, seeds and pick-ups, trees and the land's cooling, day and night, crashes) are one
set of methods in `src/sim/rules.js`. Two things run them:

- **the game**: `GameScene` mixes the rules into itself. Each frame `step(dt)` changes the flight's data, then
  `syncViews()` draws it. Inside the rules, everything seen or heard is a hook call (`popup`, `playSound`,
  `show*`, `unshow`, `on*`) that `GameScene` implements;
- **the engine**: `src/sim/world.js` makes a plain object with the same rules and empty hooks. It runs in Node
  or a Web Worker. No Phaser, no browser.

There is one copy of the physics, and the equivalence gate (below) proves the two are the same flights.

## Using it

```js
import { simulate, capability, capabilityLater } from './src/sim/simulate.js';

const save = { fleet: { plane: 'jumbo', planes: { jumbo: { engines: 3, body: 3, cabin: 3 } },
  systems: { forecast: 4, atc: 4, ops: 4 }, gadgets: { magnet: 4, hold: 4, gear: 4, sensors: 4, autopilot: 4 } },
  fuel: 'kerosene', priceVersion: 2, landings: 30, mission: 99 };   // a STORED save, as in localStorage

simulate(save, { pilot: 'smart', seed: 1 });
// -> { km: 19029, end: 'overheat', heat: 165, steps: 9382, marks: [[km, heat], ...], breakdown: { co2, night, sun, trees }, ms }

capability(save, { pilots: ['straight', 'careful', 'smart'], seeds: [1, 2, 3, 4, 5] });
// -> { smart: { median: 17253, min, max, runs: [...] }, ... }
```

- `save`: a stored save. It is made whole exactly as the game loads it (`prepareSave` in `src/save.js`) and never
  changed.
- `pilot`: `straight` (holds y = 200, ignores icy air), `smart` (dodges icy air at night and seeks it by day; sees
  all of it), `careful` (smart, but only sees icy air once it is revealed on screen: closest to a good player).
  Defined in `src/sim/pilots.js`.
- `seed`: which sky. Physics randomness has its own stream (`this.rng`, seeded by `save.simSeed`). Decoration
  (stars, animals, sparks) uses `Math.random` and never touches it.
- `km`: distance as the game shows it (1 px scrolled = 1 km).
- `crashes: false` (default): only the heat ends a flight, as in the balance probe. `true`: storms, birds and the
  ground count too. **But the three test pilots cannot fly storm gaps.** MEASURED 2026-10-26: with crashes on, all
  three hit the first storm at about 400 km in 20/20 skies. They aim within the gap using the 12 px hitbox, not the
  27 px picture that crashes, and fall past their target. So every crashes-off number is a never-crash upper bound,
  and `crashes: true` with these pilots measures nothing useful. A gap-flying pilot is proposed (PROGRESSION-SIM).
- `maxKm` (default 100,000): stop there if nothing else ended the flight. `end` is then `'maxKm'`.

### Trying other numbers (heat tuning)

```js
simulate(save, { seed: 1, overrides: { CLIMATE: { heatTrappedPerCol: 0.3 }, ISSR: { spawnChance: 0.5 } } });
simulate(save, { seed: 1, onStep: w => { CLIMATE.heatTrappedPerCol = ramp(w.distancePx); } });
```

- `overrides` works for any table exported by `src/config.js` or `src/fleet.js`. It is restored afterwards.
- The rules read these tables live at every use, so a change made in `onStep(w)` applies that very step.
- The kit (`w.kit`: co2, vapour, contrail life, margin level...) is built once at take-off from the save and
  `fleet.js`. To change a kit number mid-flight, change `w.kit`.

### A grid

Plain Node, one process; nothing is shared between calls:

```js
for (const plane of ['comet', 'jumbo', 'twin']) for (const up of ['base', 'mid', 'full'])
  console.log(plane, up, capability(makeSave(plane, up), { seeds: [1, 2, 3, 4, 5] }));
```

## Speed (measured 2026-10-26, this machine, Node 22, after the JIT has warmed up)

- **Per step:** 5-12 us. The game's step is 16.67 ms, so a flight is about 10,000 steps.
- **Per flight:** Comet 32 ms, 1970s jumbo with all upgrades 66-103 ms.
- **For comparison:** the browser probe that drew every frame took 12.9 ms a step (the plane build's profile),
  over 1,000 times slower.
- **A capability table** (3 pilots x 5 skies, jumbo): 3.1 s.
- **Keep `dtMs` at 16.67.** At 33 or 50 ms per step the medians moved by up to 11% (jumbo straight: 16,368 km at
  16.67 ms, 14,647 km at 33 ms). Those are different flights, not a shortcut.

## In the game: the hangar estimate

`capabilityLater(save, { pilots, seeds })` does the same as `capability()`, a few milliseconds at a time:

```js
const est = capabilityLater(save, { pilots: ['careful'], seeds: [1, 2, 3] });
// each frame:
const r = est.run(4);   // up to 4 ms of flying; null until done
if (r) show(`Your plane can reach about ${r.careful.median} km`);
```

Budget:
- **Measured on this machine:** 3 flights (careful x 3 seeds, jumbo) took 322 ms of work, i.e. 79 slices of 4 ms
  (about 1.3 s at 60 frames a second).
- **On a phone (not measured; a guess):** 4-8 times slower would be 1.3-2.6 s of work, about 5-10 s at 4 ms a
  frame. **Not 200 ms.**
- **So** run it in a Web Worker, start it when the hangar opens, and cache the answer by save (plane, levels,
  nature) so it is only worked out again after a purchase.
- **Within 200 ms** you could afford about 1-2 flights on a phone, which is too few skies for a fair median.
- **Measure this on a real phone before relying on it.**

## How the pilots drive the game

Every pilot plays the game only as a player can:
- **taps:** `w.applyFlap()`, the same flap a finger makes (vy = `PLANE.flapVelocity`, then `PLANE.gravity`), on the
  frames it chooses;
- **the tree button:** `w.dropParcel()`, only in the progression player.

Nothing moves the plane directly. On top of that, the TEST HARNESS changes some outcomes, never the flying:
- `crashes: false` (default) sets `hitsStorm`, `hitBird` to never-hit and `spriteBottom` to never-grounded;
- the airport is moved out of reach (`nextAirport.worldX = 1e12`), except in the progression simulator, which lands;
- lesson pop-ups never pause the game (`explain` returns false);
- a crossing flight sets its gateway's distance (`nextAirport.worldX = crossing length`).

## What it does not model

- **Anything only seen or heard:** pictures, sounds, pop-ups, toasts, the HUD.
- **Lesson pop-ups that pause the game:** `explain()` returns false, so flight school's pauses and the hot warning
  never stop the clock.
- **Flight school:** `school` is null.
- **Landing, and what follows it:** the test pilots never land (airports are moved out of reach). The results
  screen, seeds banked, fares, missions, badges, the save and the online boards are all GameScene's `onFinish`,
  which is empty in the engine.
- **Animal discoveries:** which animals you see uses `Math.random` on purpose.
- **A real player's tap timing:** the pilots flap the moment they want to (`applyFlap`). A tap in turbulence is
  delayed (`flap()` via `later()`) only if you call `flap()`.

## Keeping it bit-identical

- **The gate:** `node tests/sim-equiv.cjs` (plain Node, about 5 s; also runs in `tools/test.sh`).
  - The engine flies 18 flights recorded from the real game: no upgrades and the full jumbo, x straight, careful
    and smart, x seeds 1-3, 6,000 steps each.
  - Every 100th step's fingerprint must match `tests/sim-golden.json`.
  - It also checks itself: a CO2 change of one part in a million, planted in the engine only, must fail.
- **Change physics in `src/sim/` only.**
  - `rules.js`: methods on `this`.
  - `physics.js`: pure functions.
  - Never draw or play sound there: add a hook (a `GameScene` method, plus an empty one in `world.js`
    `VIEW_HOOKS`).
  - Hook names must not be Phaser scene properties. `sound`, `time` and `add` are taken, which is why the sound hook
    is `playSound`.
- **`Object.assign(GameScene.prototype, RULES)` runs after the class.** A `GameScene` method with a rule's name is
  replaced by the rule (that is how `finish` became the rules' and the results became `onFinish`).
- **Physics randomness:** `this.rand()`, `this.between()`, `this.floatBetween()`. Looks: `Math.random`.
  `tests/sim-rng-split.cjs` fails if decoration draws from the physics stream.
- **After a deliberate physics change, re-record the golden from the GAME, never from the engine.** It needs a
  browser, so do it on a test turn:

  ```
  python3 -m http.server 8000 &
  PLANE=none node tools/sim/trace.cjs > none.json
  PLANE=jumboFull node tools/sim/trace.cjs > jumbo.json
  ```

  Rebuild `tests/sim-golden.json` from those two files (see the comment at the top of `tests/sim-equiv.cjs`).
- **To see where a game and an engine part:**
  - `COMPARE=golden.json [ENGINE=1] EVERY=1 node tools/sim/trace.cjs` reports the first differing step and its
    line.
  - The line's fields (`src/sim/trace.js`): step, km, plane y and vy, heat, its four parts, day, hits, cargo,
    storms, icy air, contrails, seeds, flocks, turbulence.

## History

- 0.11.5: physics random stream, baked collision masks, the first pure rules, records for contrails, icy air and
  seeds.
- 0.11.7: the whole update loop, the Node engine, `simulate()`, `capability()`.
- Found on the way: before 0.11.5, flights with weather forecasts were not repeatable. A fake patch faded through
  a Phaser tween with varying timing, and the careful pilot reads that fade.
