// NATURE FINANCE: natural capital (the user, 2026-10-27; research/PROPOSAL-ERAS-4-6-SYSTEMS.md section 5). Real finance is
// starting to value nature. Crystals are the ordinary currency (experts run short); a late-game player is RICH in natural
// currency (seeds). The exchange desk turns seeds into crystals at a RATE SET BY YOUR NATURE'S HEALTH: healthier nature,
// a better rate. Opens in the 2010s (era 3). The sim chat measures it before release (BALANCE-RESCALE-S2's measured point:
// 20 seeds : 1 crystal above a 4,000 reserve doubled experts' purchases, typical players untouched).
//   health B  = the MEAN biodiversity (0-100) of the home lands of your open areas (a new area pulls it down until you
//               rebuild there: the "new land, new nature" story).
//   rate      = max(floor, base - slope x B) seeds per crystal.     Level 1 at B 40: 30:1; at B 80: 20:1 (the measured point).
//   you keep  = the reserve; at most `cap` crystals per landing.
// Levels 3 (bonds) and 4 (dividend) come with the 2030s / far-future releases.
import { AREAS } from './areas.js';
import { city } from './network.js';
import { biodiversity } from './nature.js';
import { eraProgress } from './eras.js';

export const FINANCE = {
  era: 3,
  levels: [
    { name: 'Natural capital account', cost: 1500, base: 40, slope: 0.25, floor: 20, reserve: 4000, cap: 10 },
    { name: 'Nature-positive rating', cost: 3000, base: 40, slope: 0.30, floor: 16, reserve: 3500, cap: 15 },
  ],
};
export const financeLevel = save => Math.min(FINANCE.levels.length, (save.finance && save.finance.level) || 0);
export const financeOpen = save => eraProgress(save).index >= FINANCE.era;

export function natureHealth(save) {
  const areas = (save.areas || []).filter(k => AREAS[k]);
  if (!areas.length) return biodiversity(save);
  const vals = areas.map(k => { const c = city(AREAS[k].start); return biodiversity(save, c ? c.region : undefined); });
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
export function rateAt(level, B) { const L = FINANCE.levels[level - 1]; return L ? Math.max(L.floor, Math.round(L.base - L.slope * B)) : null; }
export const rate = (save, level = financeLevel(save)) => rateAt(level, natureHealth(save));
// How many crystals you could take now (0 when the desk is shut, you are under the reserve, or you traded this landing).
export function canTake(save) {
  const lv = financeLevel(save), L = FINANCE.levels[lv - 1];
  if (!L || !financeOpen(save) || (save.finance.tradedAt ?? -1) === (save.landings || 0)) return 0;
  return Math.max(0, Math.min(L.cap, Math.floor(((save.seeds || 0) - L.reserve) / rate(save))));
}
export function trade(save) {
  const n = canTake(save); if (!n) return 0;
  save.seeds -= n * rate(save); save.crystals = (save.crystals || 0) + n; save.finance.tradedAt = save.landings || 0;
  return n;
}
export function buyFinance(save) {
  const L = FINANCE.levels[financeLevel(save)];
  if (!L || !financeOpen(save) || (save.seeds || 0) < L.cost) return false;
  save.seeds -= L.cost; save.finance = { ...(save.finance || {}), level: financeLevel(save) + 1 };
  return true;
}
