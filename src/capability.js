// The hangar's capability estimate (M4, the user's pick 2026-10-28): how far YOUR plane + nature can get, flown by the sim
// engine's careful pilot who CAN crash (src/sim/player.js at the fitted EXPERT skill 0.9; the sim chat: s 0.8 sits on a
// cliff and is noise, s 0.9 is +-5% over 5 skies). It COUNTS ALONGSIDE the best landed flight for a crossing offer
// (crossings.js offerCtx takes the larger), so a guessed number can never block a crossing you have really flown.
//   capKey(save): what the estimate depends on (fleet, upgrade levels, fuel, nature projects, the area you are in);
//     a purchase changes it, and only then is the estimate run again.
//   capFor(save, area): the cached km for this save in that area, or 0 (not run yet / out of date).
//   estimate(save, onDone): runs it a little each frame (CAP.msPerFrame) so the hangar never stalls; onDone(km).
import { areaOf } from './areas.js';
export const CAP = { pilot: 'player', crashes: true, skill: 0.9, careful: true, seeds: [1, 2, 3, 4, 5], roundKm: 500, msPerFrame: 8, maxKm: 60000 };

const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
export const capKey = save => hash(JSON.stringify([save.fleet || null, save.levels || null, save.fuel || null, save.habitat || null, areaOf(save.city) || null, CAP]));
export const capFor = (save, area) => { const c = save.capability; return c && c.key === capKey(save) && c.area === area ? c.km : 0; };
export const roundCap = km => Math.round(km / CAP.roundKm) * CAP.roundKm;

let job = null;   // one estimate at a time; a newer save state replaces it
export function estimate(save, onDone, { frame = cb => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(cb) : setTimeout(cb, 16)) } = {}) {
  const key = capKey(save);
  if (save.capability && save.capability.key === key) return false;   // up to date
  if (job && job.key === key) return true;                            // already running
  const copy = JSON.parse(JSON.stringify(save));                       // the sim never touches the real save
  const me = job = { key };
  // The engine is loaded only when an estimate runs (it is big; and crossings.js imports this file for capFor).
  import('./sim/simulate.js').then(({ capabilityLater }) => { if (job !== me) return;
  const run = capabilityLater(copy, { pilots: [CAP.pilot], seeds: CAP.seeds, crashes: CAP.crashes, skill: CAP.skill, careful: CAP.careful, maxKm: CAP.maxKm });
  const tick = () => {
    if (job !== me) return;                                            // replaced by a newer estimate
    const r = run.run(CAP.msPerFrame);
    if (!r) { frame(tick); return; }
    job = null;
    save.capability = { km: roundCap(r[CAP.pilot].median), key, area: areaOf(save.city) || null };
    onDone && onDone(save.capability.km);
  };
  frame(tick); });
  return true;
}
export const estimating = () => !!job;
