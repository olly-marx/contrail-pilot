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
import { biodiversity, worldBiodiversity } from './nature.js';
import { eraProgress } from './eras.js';
import { areaLands } from './arealand.js';

export const FINANCE = {
  era: 3,
  levels: [
    { name: 'Natural capital account', fund: 2000, cost: 1500, base: 40, slope: 0.25, floor: 20, reserve: 4000, cap: 10 },
    { name: 'Nature-positive rating', fund: 3000, cost: 3000, base: 40, slope: 0.30, floor: 16, reserve: 3500, cap: 15 },
    // The 2030s: BONDS. Lock `lock` seeds for `landings` landings; get them back plus floor(B / perB) crystals, B read at
    // PAYOUT (nature pays interest only if you keep it healthy). At most `most` bonds at once; the reserve still holds.
    { name: 'Biodiversity bonds', fund: 4000, cost: 5000, era: 4, base: 40, slope: 0.30, floor: 16, reserve: 3500, cap: 15, bond: { lock: 1000, landings: 10, perB: 4, most: 3 } },
    // The far future: the NATURE DIVIDEND. Each landing in an area whose OWN biodiversity is >= minBio pays perLanding crystal(s),
    // collected on the next hangar visit (at most `cap` a visit). Bonds stay.
    { name: 'Nature dividend', fund: 5000, cost: 8000, era: 5, base: 40, slope: 0.30, floor: 16, reserve: 3000, cap: 20, bond: { lock: 1000, landings: 10, perB: 4, most: 3 }, dividend: { minBio: 60, perLanding: 1, cap: 3 } },
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
// The EXCHANGE and the fund read YOUR WORLD's biodiversity (the user, 2026-11-13: 'depending on how strong your global
// biodiversity is'): the mean meter of EVERY land in the areas you have opened (src/arealand.js areaLands), not only each
// area's home land (natureHealth, which stays for the bonds' interest). The whole planet's mean (worldBiodiversity) was
// tried first and measured too low to move the rate (research/finbio-report.txt: B ~8 in era 3, 38:1 at every level).
export function financeBio(save) {
  const lands = [...new Set((save.areas || []).flatMap(areaLands))];
  if (!lands.length) return worldBiodiversity(save);
  return Math.round(lands.reduce((a, r) => a + biodiversity(save, r), 0) / lands.length);
}
export const rate = (save, level = financeLevel(save)) => rateAt(level, financeBio(save));
// SELLING crystals for seeds (2026-11-13): the desk pays fewer seeds a crystal than it charges (the SPREAD), so flipping
// back and forth always loses. The spread narrows as the world's nature gets healthier: a better deal both ways.
export const SPREAD = { at0: 10, at100: 4 };
export const spreadAt = B => Math.round(SPREAD.at0 - (SPREAD.at0 - SPREAD.at100) * Math.max(0, Math.min(100, B)) / 100);
export function sellRateAt(level, B) { const b = rateAt(level, B); return b == null ? null : Math.max(1, b - spreadAt(B)); }
export const sellRate = (save, level = financeLevel(save)) => sellRateAt(level, financeBio(save));
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
// Crystals you could sell now: up to the level's cap, one trade (either way) a landing.
export function canSell(save) {
  const L = FINANCE.levels[financeLevel(save) - 1];
  if (!L || !financeOpen(save) || (save.finance.tradedAt ?? -1) === (save.landings || 0)) return 0;
  return Math.max(0, Math.min(L.cap, Math.floor(save.crystals || 0)));
}
export function sell(save) {
  const n = canSell(save); if (!n) return 0;
  save.crystals -= n; save.seeds = (save.seeds || 0) + n * sellRate(save); save.finance.tradedAt = save.landings || 0;
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

// ---------- the nature fund (every level, the 2010s on; the user, 2026-11-13) ----------
// Put seeds in; they grow or shrink on a REAL clock. The fund's moves are one series for everyone: each real hour h has a
// fixed random step (a hash of h, so the same hour is the same step on every phone and in tests). Your money follows
//   value = paid in x exp( sum over the hours held of (drift + SIGMA x step(h)) + the day's news jumps ),
// with the drift set by the WORLD's biodiversity when you cash out (healthy nature pays; a bare world drifts down). The
// growth is clamped to [CLAMP] and counts at most MAX_HOURS. GAME VALUES, est.: the sim thread measures them before release.
export const FUND = {
  sigmaH: 0.004,                 // an hour's spread (about 2% a day)
  driftDay: { at0: 0.003, at100: 0.012 },   // the mean daily drift at biodiversity 0 and 100: always above zero, so holding a few days beats the fee
  news: { chance: 1 / 3, size: 0.03, hour: 12 },   // a third of days carry one +/-3% story, at 12:00 UTC
  fee: 0.01,                     // 1% taken when you cash out
  step: 500,                     // seeds a tap puts in
  maxHours: 24 * 30, clamp: [0.5, 2],
};
const HOUR = 3600e3;
export const hourOf = ms => Math.floor(ms / HOUR);
// A 32-bit integer hash to [0, 1) (no Math.random: the series must be the same everywhere).
function hash01(n, salt = 0) {
  let x = (n ^ salt ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0; x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}
export const stepAt = h => (hash01(h) * 2 - 1) * Math.sqrt(3);   // mean 0, variance 1, never past +/-1.73
const GOOD = ['Reef restoration beats its target', 'Forest fund plants a million trees', 'Wetland project wins a prize', 'River clean-up opens early'];
const BAD = ['Storm hits the forest fund', 'Drought slows the wetland project', 'Coral bleaching hits the reef fund', 'Wildfire burns a planted hillside'];
// The day's story (d = days since 1970), or null on a quiet day.
export function newsOn(d) {
  if (hash01(d, 0x5bd1e995) >= FUND.news.chance) return null;
  const up = hash01(d, 0x27d4eb2f) < 0.5, list = up ? GOOD : BAD, text = list[Math.floor(hash01(d, 0x165667b1) * list.length)];
  return { up, text, size: up ? FUND.news.size : -FUND.news.size };
}
export const newsToday = (now = Date.now()) => newsOn(Math.floor(hourOf(now) / 24));
export const driftHourAt = B => (FUND.driftDay.at0 + (FUND.driftDay.at100 - FUND.driftDay.at0) * Math.max(0, Math.min(100, B)) / 100) / 24;
// The growth factor from hour h0 to hour h1 at world biodiversity B (1 when no whole hour has passed).
export function growth(h0, h1, B) {
  h1 = Math.min(h1, h0 + FUND.maxHours);
  if (!(h1 > h0)) return 1;
  let log = 0; const mu = driftHourAt(B);
  for (let h = h0 + 1; h <= h1; h++) {
    log += mu + FUND.sigmaH * stepAt(h);
    if (h % 24 === FUND.news.hour) { const n = newsOn(Math.floor(h / 24)); if (n) log += Math.log(1 + n.size); }
  }
  return Math.min(FUND.clamp[1], Math.max(FUND.clamp[0], Math.exp(log)));
}
const fundCfg = save => { const L = FINANCE.levels[financeLevel(save) - 1]; return L && financeOpen(save) ? L.fund : 0; };
export const fundOf = save => (save.finance && save.finance.fund) || null;
// The clock never runs backwards for a save: a phone set back reads the latest hour this save has seen.
function nowHour(save, now) { const h = Math.max(hourOf(now), (save.finance && save.finance.seenHour) || 0); if (save.finance) save.finance.seenHour = h; return h; }
// What your fund is worth now (seeds, whole), 0 with nothing in.
export function fundValue(save, now = Date.now()) {
  const f = fundOf(save); if (!f) return 0;
  return Math.floor(f.seeds * growth(f.hour, nowHour(save, now), financeBio(save)));
}
// Seeds a tap would put in now: FUND.step, or less to stay under the level's cap and above the desk's reserve.
export function canInvest(save, now = Date.now()) {
  const cap = fundCfg(save), L = FINANCE.levels[financeLevel(save) - 1]; if (!cap) return 0;
  const room = cap - fundValue(save, now), spare = (save.seeds || 0) - L.reserve;
  return Math.max(0, Math.min(FUND.step, room, spare));
}
// Put seeds in: what is already in is valued now and rolled into one holding that starts this hour.
export function invest(save, now = Date.now()) {
  const n = canInvest(save, now); if (!n) return 0;
  const v = fundValue(save, now);
  save.seeds -= n; save.finance.fund = { seeds: v + n, hour: nowHour(save, now) };
  return n;
}
// Take everything out (less the fee): seeds paid, 0 with nothing in.
export function cashOut(save, now = Date.now()) {
  if (!fundOf(save)) return 0;
  const pay = Math.floor(fundValue(save, now) * (1 - FUND.fee));
  save.seeds = (save.seeds || 0) + pay; delete save.finance.fund;
  return pay;
}
