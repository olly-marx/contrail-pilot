// NATURE FINANCE: natural capital (the user, 2026-10-27; research/PROPOSAL-ERAS-4-6-SYSTEMS.md section 5). Real finance is
// starting to value nature. Crystals are the ordinary currency (experts run short); a late-game player is RICH in natural
// currency (seeds). The exchange desk turns seeds into crystals at a RATE SET BY YOUR NATURE'S HEALTH: healthier nature,
// a better rate. Opens in the 2010s (era 3). The sim chat measures it before release (BALANCE-RESCALE-S2's measured point:
// 20 seeds : 1 crystal above a 4,000 reserve doubled experts' purchases, typical players untouched).
//   health B  = the MEAN biodiversity (0-100) of the home lands of your open areas (a new area pulls it down until you
//               rebuild there: the "new land, new nature" story).
//   rate      = max(floor, base - slope x B) seeds per crystal.     Level 1 at B 40: 30:1; at B 80: 20:1 (the measured point).
//   you keep  = the reserve; at most `cap` crystals per landing.
// Level 3 (bonds) opens in the 2030s, level 4 (the dividend) in the far future.
import { AREAS } from './areas.js';
import { city } from './network.js';
import { biodiversity } from './nature.js';
import { eraProgress } from './eras.js';

export const FINANCE = {
  era: 3,
  levels: [
    { name: 'Natural capital account', cost: 1500, base: 40, slope: 0.25, floor: 20, reserve: 4000, cap: 10 },
    { name: 'Nature-positive rating', cost: 3000, base: 40, slope: 0.30, floor: 16, reserve: 3500, cap: 15 },
    // The 2030s: BONDS. Lock `lock` seeds for `landings` landings; get them back plus floor(B / perB) crystals, B read at
    // PAYOUT (nature pays interest only if you keep it healthy). At most `most` bonds at once; the reserve still holds.
    { name: 'Biodiversity bonds', cost: 5000, era: 4, base: 40, slope: 0.30, floor: 16, reserve: 3500, cap: 15, bond: { lock: 1000, landings: 10, perB: 4, most: 3 } },
    // The far future: the NATURE DIVIDEND. Each landing in an area whose OWN biodiversity is >= minBio pays perLanding crystal(s),
    // collected on the next hangar visit (at most `cap` a visit). Bonds stay.
    { name: 'Nature dividend', cost: 8000, era: 5, base: 40, slope: 0.30, floor: 16, reserve: 3000, cap: 20, bond: { lock: 1000, landings: 10, perB: 4, most: 3 }, dividend: { minBio: 60, perLanding: 1, cap: 3 } },
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
  // Save up for the next desk level (sim chat + Coordinator, 2026-10-29): while it exists and its era is open, keep its price
  // too, so the player reaches bonds and the dividend instead of trading down to the reserve every landing.
  const N = FINANCE.levels[lv], keep = N && eraProgress(save).index >= (N.era ?? FINANCE.era) ? Math.max(L.reserve, N.cost) : L.reserve;
  return Math.max(0, Math.min(L.cap, Math.floor(((save.seeds || 0) - keep) / rate(save))));
}
export function trade(save) {
  const n = canTake(save); if (!n) return 0;
  save.seeds -= n * rate(save); save.crystals = (save.crystals || 0) + n; save.finance.tradedAt = save.landings || 0;
  return n;
}
export function buyFinance(save) {
  const L = FINANCE.levels[financeLevel(save)];
  if (!L || !financeOpen(save) || eraProgress(save).index < (L.era ?? FINANCE.era) || (save.seeds || 0) < L.cost) return false;
  save.seeds -= L.cost; save.finance = { ...(save.finance || {}), level: financeLevel(save) + 1 };
  return true;
}

// ---------- bonds (level 3) ----------
const bondCfg = save => { const L = FINANCE.levels[financeLevel(save) - 1]; return L && L.bond; };
export const bonds = save => (save.finance && save.finance.bonds) || [];
export function canLock(save) {
  const b = bondCfg(save), L = FINANCE.levels[financeLevel(save) - 1];
  return !!b && bonds(save).length < b.most && (save.seeds || 0) - b.lock >= L.reserve;
}
export function lockBond(save) {
  if (!canLock(save)) return false;
  const b = bondCfg(save); save.seeds -= b.lock;
  save.finance.bonds = [...bonds(save), { at: save.landings || 0, seeds: b.lock }];
  return true;
}
// Matured bonds pay out (the hangar calls this on each visit): { seeds, crystals } paid, or null.
export function payBonds(save) {
  const b = bondCfg(save); if (!b) return null;
  const due = bonds(save).filter(x => (save.landings || 0) - x.at >= b.landings);
  if (!due.length) return null;
  const crystals = due.length * Math.floor(natureHealth(save) / b.perB), seeds = due.reduce((a, x) => a + x.seeds, 0);
  save.seeds = (save.seeds || 0) + seeds; save.crystals = (save.crystals || 0) + crystals;
  save.finance.bonds = bonds(save).filter(x => !due.includes(x));
  return { seeds, crystals };
}

// ---------- the dividend (level 4) ----------
// The area you are in pays if its own land is healthy: landings since the last collection, at most `cap`.
export function areaBio(save) { const k = (save.areas || []).find(a => AREAS[a] && AREAS[a].cities.includes(save.city)); const c = k && city(AREAS[k].start); return c ? biodiversity(save, c.region) : 0; }
export function payDividend(save) {
  const L = FINANCE.levels[financeLevel(save) - 1], d = L && L.dividend; if (!d) return 0;
  const since = (save.landings || 0) - (save.finance.divAt ?? save.landings ?? 0);
  save.finance.divAt = save.landings || 0;
  if (since <= 0 || areaBio(save) < d.minBio) return 0;
  const n = Math.min(d.cap, since * d.perLanding); save.crystals = (save.crystals || 0) + n; return n;
}
