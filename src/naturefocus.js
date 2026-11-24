// NATURE'S FOCUS (Plan D; Oliver, 2026-11-23: 'too many regions and too many projects ... overwhelmed by all of them and which to choose so we end up not caring').
// Pure: no DOM. Two rules the NATURE screen (src/wild.js, src/ui.js go('nature')) reads:
//   focusLand(save, isOpen)  the land NATURE opens on: the land the crossing on offer leaves from while that crossing waits on its nature (Plan B, src/crossings.js),
//                            else the land you are in, else your home land. `isOpen(land)` says whether the player has that land (wild.js discovered).
//   onOffer(ps, done, n)     the projects of a tier the screen shows: the first n not yet done, in tier order (OFFER, 3), and how many more wait behind 'show all'.
import { available, readiness, natureNeed, departureLand } from './crossings.js';
import { city } from './network.js';

export const OFFER = 3;
export function focusLand(save, isOpen = () => true) {
  try {
    const c = available(save)[0];
    if (c && save.tutorialDone) { const l = departureLand(c), rd = readiness(save, c); if (l && isOpen(l) && !rd.nature) return { land: l, why: 'crossing', to: c.to, have: rd.natureHave, need: natureNeed(c) }; }
  } catch (e) { /* no crossing data: fall through */ }
  const here = save.city && city(save.city) && city(save.city).region;
  if (here && isOpen(here)) return { land: here, why: 'here' };
  return { land: null, why: 'home' };
}
export function onOffer(ps, done, n = OFFER) {
  const left = ps.filter(p => !done.includes(p.id));
  return { shown: left.slice(0, n), more: Math.max(0, left.length - n) };
}
