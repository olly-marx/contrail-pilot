// The hangar's capability estimate (M4, the user's pick 2026-10-28): how far YOUR plane + nature can get, for the sim
// engine's careful pilot who CAN crash at the fitted EXPERT skill 0.9. It COUNTS ALONGSIDE the best landed flight for a
// crossing offer (crossings.js offerCtx takes the larger), so a guessed number can never block a crossing you have flown.
//
// How (the Coordinator's budget, 2026-10-28: < 1 s on the main thread, the answer within ~5 s on a phone): flying the
// crashes-on player live costs ~20 s of CPU on a strong plane, so the estimate is split in two.
//   HEAT: 3 skies of the cheap careful pilot with crashes OFF, live (it reads your plane, systems, fuel and nature); in a
//         Web Worker when the browser has one, else a few ms each frame.
//   HAZARDS: how far the crashes-on player gets with the heat OFF, measured in advance per plane era (src/cappool.js).
//   estimate = the median, over every pair, of min(heat km, hazard km), rounded to 500 km.
// Accuracy against 20 crashes-on flights: see src/cappool.js (+0.2% .. +14%; tests/capability.cjs holds it to 20%: the bare twin sits at +15%).
//   capKey(save) / capFor(save, area) / estimate(save, onDone) / estimating() / combine(heats, pool) / estimateNow(save)
import { areaOf } from './areas.js';
import { HAZARD_POOLS } from './cappool.js';
import { fleetOf, planeById } from './fleet.js';
export const CAP = { heatSeeds: [1, 2, 3], roundKm: 500, msPerFrame: 6, maxKm: 60000 };

const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
export const capKey = save => hash(JSON.stringify([save.fleet || null, save.levels || null, save.fuel || null, save.habitat || null, areaOf(save.city) || null, CAP]));
export const capFor = (save, area) => { const c = save.capability; return c && c.key === capKey(save) && c.area === area ? c.km : 0; };
export const roundCap = km => Math.round(km / CAP.roundKm) * CAP.roundKm;
// The pool for the plane you fly (an era without its own pool yet uses the nearest earlier one).
export const poolFor = save => { const p = planeById(fleetOf(save).plane), era = p ? p.era : 0;
  for (let e = era; e >= 0; e--) if (HAZARD_POOLS[e]) return HAZARD_POOLS[e]; return []; };
export function combine(heats, pool) {
  const all = []; for (const h of heats) for (const z of pool) all.push(Math.min(h, z));
  all.sort((a, b) => a - b); return roundCap(all.length ? all[all.length >> 1] : 0);
}
const heatOpts = () => ({ pilots: ['careful'], seeds: CAP.heatSeeds, maxKm: CAP.maxKm });
// The whole estimate at once (Node, tests; the Worker runs the heat part of this).
export async function estimateNow(save) {
  const { capability } = await import('./sim/simulate.js');
  return combine(capability(JSON.parse(JSON.stringify(save)), heatOpts()).careful.runs, poolFor(save));
}

let job = null;   // one estimate at a time; a newer save state replaces it
const store = (save, key, heats, onDone) => { save.capability = { km: combine(heats, poolFor(save)), key, area: areaOf(save.city) || null }; onDone && onDone(save.capability.km); };
export function estimate(save, onDone, { frame = cb => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(cb) : setTimeout(cb, 16)), worker = typeof Worker !== 'undefined' } = {}) {
  const key = capKey(save);
  if (save.capability && save.capability.key === key) return false;   // up to date
  if (job && job.key === key) return true;                            // already running
  const copy = JSON.parse(JSON.stringify(save));                       // the sim never touches the real save
  const me = job = { key };
  if (worker) {
    try {
      const w = new Worker(new URL('./capworker.js', import.meta.url), { type: 'module' });
      w.onmessage = e => { w.terminate(); if (job !== me) return; job = null; store(save, key, e.data.runs, onDone); };
      w.onerror = () => { w.terminate(); if (job === me) { job = null; estimate(save, onDone, { frame, worker: false }); } };
      w.postMessage({ save: copy, opts: heatOpts(), season2: !!globalThis.SEASON2 });
      return true;
    } catch (e) { /* no module workers here: fall back to slices */ }
  }
  // The engine is loaded only when an estimate runs (it is big; and crossings.js imports this file for capFor).
  import('./sim/simulate.js').then(({ capabilityLater }) => {
    if (job !== me) return;
    const run = capabilityLater(copy, heatOpts());
    const tick = () => {
      if (job !== me) return;                                          // replaced by a newer estimate
      const r = run.run(CAP.msPerFrame);
      if (!r) { frame(tick); return; }
      job = null; store(save, key, r.careful.runs, onDone);
    };
    frame(tick);
  });
  return true;
}
export const estimating = () => !!job;
