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
import { areaOf, AREAS } from './areas.js';
import { HAZARD_POOLS } from './cappool.js';
import { fleetOf, planeById } from './fleet.js';
export const CAP = { heatSeeds: [1, 2, 3], roundKm: 500, msPerFrame: 6, maxKm: 60000, hazards: false, v: 2 };   // v: bumped so saved estimates (capKey) are made again

const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
export const capKey = save => hash(JSON.stringify([save.fleet || null, save.levels || null, save.fuel || null, save.habitat || null, areaOf(save.city) || null, CAP]));
// (0.73.1) The last range worked out, even if a purchase or a move has made it stale since (it is redone on HOME and in the hangar): until 0.73.1 a stale estimate read 0,
// so a crossing the plane could fly dropped back to 'More range' after any purchase. capFresh says whether it is up to date.
export const capFor = save => { const c = save.capability; return c && Number.isFinite(c.km) ? c.km : 0; };
export const capFresh = save => !!(save.capability && save.capability.key === capKey(save));
// (0.73.2, CROSSINGS V5) The range FROM an area: the plane over THAT area's land (its nature cools the flight). save.capArea[area] = { km, key }; the area the player is in
// also has save.capability. A save placed in the area's start city is what the estimate flies.
export const atArea = (save, area) => (AREAS[area] && areaOf(save.city) !== area ? { ...save, city: AREAS[area].start } : save);
export const capForArea = (save, area) => { if (area && area === areaOf(save.city) && save.capability) return capFor(save); const c = (save.capArea || {})[area]; return c && Number.isFinite(c.km) ? c.km : 0; };
export const capAreaFresh = (save, area) => { const c = (save.capArea || {})[area]; return !!c && c.key === capKey(atArea(save, area)); };
export const roundCap = km => Math.round(km / CAP.roundKm) * CAP.roundKm;
// The pool for the plane you fly (an era without its own pool yet uses the nearest earlier one).
export const poolFor = save => { const p = planeById(fleetOf(save).plane), era = p ? p.era : 0;
  for (let e = era; e >= 0; e--) if (HAZARD_POOLS[e]) return HAZARD_POOLS[e]; return []; };
// RANGE = the HEAT distance only since 0.73.0 (Oliver, 2026-11-23: 'judge that on the distance the plane can fly based on the nature and plane upgrades'; his plane read
// ~17,000 km after 25,000 km flights). The hazard pool (a sim pilot's crash distance, medians 14,000-17,000 km on EVERY plane) capped the estimate, so upgrades barely
// moved it; crashing is skill, not range. Measured 2026-11-23: twin at flight 140 heat 26,100 km, shown 15,000. CAP.hazards true brings the old min() back.
export function combine(heats, pool) {
  const all = []; for (const h of heats) { if (!CAP.hazards) { all.push(h); continue; } for (const z of pool) all.push(Math.min(h, z)); }
  all.sort((a, b) => a - b); return roundCap(all.length ? all[all.length >> 1] : 0);
}
const heatOpts = () => ({ pilots: ['careful'], seeds: CAP.heatSeeds, maxKm: CAP.maxKm });
// The whole estimate at once (Node, tests; the Worker runs the heat part of this).
export async function estimateNow(save) {
  const { capability } = await import('./sim/simulate.js');
  return combine(capability(JSON.parse(JSON.stringify(save)), heatOpts()).careful.runs, poolFor(save));
}

let job = null;   // one estimate at a time; a newer save state replaces it
const store = (save, key, heats, onDone, area = null) => {
  const km = combine(heats, poolFor(save));
  if (area) { save.capArea = { ...(save.capArea || {}), [area]: { km, key } }; if (area === areaOf(save.city)) save.capability = { km, key, area }; }
  else { save.capability = { km, key, area: areaOf(save.city) || null }; const a = areaOf(save.city); if (a) save.capArea = { ...(save.capArea || {}), [a]: { km, key } }; }
  onDone && onDone(km); };
// estimate(save, onDone, { area }): the range from `area` (default: where the player is). false when already up to date.
export function estimate(save, onDone, { frame = cb => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(cb) : setTimeout(cb, 16)), worker = typeof Worker !== 'undefined', area = null } = {}) {
  const view = area ? atArea(save, area) : save, key = capKey(view);
  if (area ? capAreaFresh(save, area) : save.capability && save.capability.key === key) return false;   // up to date
  if (job && job.key === key) return true;                            // already running
  const copy = JSON.parse(JSON.stringify(view));                       // the sim never touches the real save
  const me = job = { key };
  if (worker) {
    try {
      const w = new Worker(new URL('./capworker.js', import.meta.url), { type: 'module' });
      w.onmessage = e => { w.terminate(); if (job !== me) return; job = null; store(save, key, e.data.runs, onDone, area); };
      w.onerror = () => { w.terminate(); if (job === me) { job = null; estimate(save, onDone, { frame, worker: false, area }); } };
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
      job = null; store(save, key, r.careful.runs, onDone, area);
    };
    frame(tick);
  });
  return true;
}
export const estimating = () => !!job;
