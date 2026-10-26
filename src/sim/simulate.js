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
//     overrides: other config numbers for this call (see withOverrides); onStep(w): called before every step
//     dtMs:    keep 16.67 (the game's frame). Bigger steps are NOT the same flights: at 33 or 50 ms medians moved
//              by up to 11% (measured 2026-10-26), so they are not a shortcut.
//
//   capability(save, { pilots, seeds, ... }) -> { [pilot]: { median, min, max, runs: [km...] } }
//     How far this plane and nature can go, per pilot, over several skies (seeds). For balance studies and,
//     later, the in-game estimate ("your plane + nature can reach ~6,200 km").
import { createWorld } from './world.js';
import { pilotTarget } from './pilots.js';
import * as CONFIG from '../config.js';
import * as FLEET from '../fleet.js';

// Try other numbers for one call: { CLIMATE: { heatTrappedPerCol: 0.3 }, ISSR: { spawnChance: 0.5 }, CONTRAIL_MARGIN: [...] }.
// Any table exported by src/config.js or src/fleet.js. The rules read these live, at every use, so a change made
// in onStep(w) takes effect that very step. The kit (w.kit) is built once at take-off from the save and fleet.js:
// to change a kit number mid-flight, change w.kit. Everything is put back afterwards.
function withOverrides(overrides, fn) {
  const saved = [];
  for (const [name, values] of Object.entries(overrides || {})) {
    const table = CONFIG[name] || FLEET[name];
    if (!table || typeof table !== 'object') throw new Error(`simulate: no table ${name} in config.js or fleet.js`);
    saved.push([table, Array.isArray(table) ? [...table] : { ...table }]);
    Object.assign(table, values);
  }
  try { return fn(); } finally {
    for (const [table, before] of saved) { if (Array.isArray(table)) table.splice(0, table.length, ...before); else { for (const k of Object.keys(table)) if (!(k in before)) delete table[k]; Object.assign(table, before); } }
  }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function simulate(save, { overrides, ...opts } = {}) { return withOverrides(overrides, () => fly(save, opts)); }

function fly(save, opts) { const g = flight(save, opts); let r; while (!(r = g.next()).done); return r.value; }

// A flight that can pause: yields after every step (the caller decides when to stop for now), returns the result.
function* flight(save, { pilot = 'smart', seed = 1, maxKm = 100000, crashes = false, dtMs = 16.67, onStep } = {}) {
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
    if (onStep) onStep(w);   // e.g. a heat number that ramps with w.distancePx
    if (w.plane.y > pilotTarget(w, pilot) && w.plane.vy > -40) w.applyFlap();
    w.step(dt); steps++;
    if (steps % 2000 === 0) marks.push([Math.round(w.distancePx), Math.round(w.heat)]);
    yield;
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

// The same as capability(), a little at a time, for the game (the hangar's "your plane can reach ~N km"):
// a whole estimate is seconds of work on a phone, so the game calls run(ms) once a frame (or in a Web Worker)
// and shows the answer when done. Overrides are not allowed here: this is the game's real plane.
//   const est = capabilityLater(save, { pilots: ['careful'], seeds: [1, 2, 3] });
//   each frame: const r = est.run(4); if (r) show(r.careful.median);   // null until finished
export function capabilityLater(save, { pilots = ['careful'], seeds = [1, 2, 3], ...opts } = {}) {
  const jobs = pilots.flatMap(pilot => seeds.map(seed => ({ pilot, seed })));
  const kms = Object.fromEntries(pilots.map(p => [p, []]));
  let k = 0, g = null, result = null;
  return {
    done: () => !!result,
    progress: () => (result ? 1 : k / jobs.length),
    run(ms) {
      if (result) return result;
      const until = now() + ms;
      while (k < jobs.length) {
        if (!g) g = flight(save, { ...opts, ...jobs[k] });
        let r;
        do { r = g.next(); } while (!r.done && now() < until);
        if (!r.done) return null;
        kms[jobs[k].pilot].push(r.value.km); g = null; k++;
        if (now() >= until) break;
      }
      if (k < jobs.length) return null;
      result = Object.fromEntries(pilots.map(p => { const runs = kms[p].sort((a, b) => a - b);
        return [p, { median: runs[Math.floor(runs.length / 2)], min: runs[0], max: runs[runs.length - 1], runs }]; }));
      return result;
    },
  };
}
