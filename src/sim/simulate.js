// Fast flights with no drawing (sim engine, 2026-10-25): the game's own rules (src/sim/rules.js) on a plain
// world (src/sim/world.js), stepped like the game at 60 frames a second. tests/sim-equiv.cjs proves these are the
// game's flights, step for step. Runs in Node or the browser.
//
//   simulate(save, { pilot, seed, maxKm, crashes, dtMs }) -> { km, end, heat, steps, marks, breakdown, ms }
//     save:    a stored save (as in localStorage; it is prepared as the game prepares it and never changed)
//     pilot:   'straight' | 'careful' | 'smart' (src/sim/pilots.js)
//     crashes: false (default) = only the heat ends the flight, as the balance probe; true = storms, birds and
//              the ground end it too (the pilots do not try to land: airports are moved out of reach)
//     maxKm:   stop here if nothing else ended it (default 100,000)
//     km:      distance as the game shows it (1 px scrolled = 1 km); end: 'overheat' | 'crash' | 'maxKm'
//     marks:   [km, heat] every 2,000 steps (the heat trace)
//
//   capability(save, { pilots, seeds, ... }) -> { [pilot]: { median, min, max, runs: [km...] } }
//     How far this plane and nature can go, per pilot, over several skies (seeds). For balance studies and,
//     later, the in-game estimate ("your plane + nature can reach ~6,200 km").
import { createWorld } from './world.js';
import { pilotTarget } from './pilots.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function simulate(save, { pilot = 'smart', seed = 1, maxKm = 100000, crashes = false, dtMs = 16.67 } = {}) {
  const t0 = now();
  const w = createWorld({ autoTakeoff: true, ...save }, seed);
  const dt = Math.min(dtMs, 50) / 1000;   // as GameScene.update clamps it
  for (let i = 0; i < 2000 && w.state !== 'playing'; i++) w.step(dt);
  w.explain = () => false;
  w.nextAirport.worldX = 1e12;   // the test pilots never land
  if (!crashes) { w.hitsStorm = () => false; w.hitBird = () => false; w.spriteBottom = () => -1; }
  const marks = [];
  let steps = 0;
  while (w.state === 'playing' && w.distancePx < maxKm && steps < 3e6) {
    if (w.plane.y > pilotTarget(w, pilot) && w.plane.vy > -40) w.applyFlap();
    w.step(dt); steps++;
    if (steps % 2000 === 0) marks.push([Math.round(w.distancePx), Math.round(w.heat)]);
  }
  const end = w.state === 'playing' ? 'maxKm' : /hot/.test(w.endReason) ? 'overheat' : 'crash';
  const B = w.breakdown, r = v => Math.round(v * 10) / 10;
  return { km: Math.round(w.distancePx), end, reason: w.endReason || '', heat: r(w.heat), steps, marks,
    breakdown: { co2: r(B.co2), night: r(B.night), sun: r(B.sun), trees: r(B.trees) }, ms: Math.round(now() - t0) };
}

export function capability(save, { pilots = ['straight', 'careful', 'smart'], seeds = [1, 2, 3, 4, 5], ...opts } = {}) {
  const out = {};
  for (const pilot of pilots) {
    const runs = seeds.map(seed => simulate(save, { ...opts, pilot, seed }).km).sort((a, b) => a - b);
    out[pilot] = { median: runs[Math.floor(runs.length / 2)], min: runs[0], max: runs[runs.length - 1], runs };
  }
  return out;
}
