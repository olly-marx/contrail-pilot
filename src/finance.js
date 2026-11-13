// NATURE FINANCE: natural capital (the user, 2026-10-27; research/PROPOSAL-ERAS-4-6-SYSTEMS.md section 5). Real finance is
// starting to value nature. Crystals are the ordinary currency (experts run short); a late-game player is RICH in natural
// currency (seeds). The exchange desk trades both ways at the MARKET's true rate (it moves each game day, the same for
// everyone) plus a GAP set by the WHOLE WORLD's biodiversity: a bare world pays badly, a healthy one well (2026-11-13; the
// market section below). Opens in the 2010s (era 3). The sim measures it before release.
//   you keep  = the reserve; at most `cap` crystals per landing.
// Level 3 (bonds) opens in the 2030s, level 4 (the dividend) in the far future.
import { AREAS } from './areas.js';
import { city } from './network.js';
import { biodiversity, worldBiodiversity } from './nature.js';
import { eraProgress } from './eras.js';
import { DAYNIGHT } from './config.js';

export const FINANCE = {
  era: 3,
  levels: [
    { name: 'Natural capital account', fund: 2000, cost: 1500, reserve: 4000, cap: 10 },
    { name: 'Nature-positive rating', fund: 3000, cost: 3000, reserve: 3500, cap: 15 },
    // The 2030s: BONDS. Lock `lock` seeds for `landings` landings; get them back plus floor(B / perB) crystals, B read at
    // PAYOUT (nature pays interest only if you keep it healthy). At most `most` bonds at once; the reserve still holds.
    { name: 'Biodiversity bonds', fund: 4000, cost: 5000, era: 4, reserve: 3500, cap: 15, bond: { lock: 1000, landings: 10, perB: 4, most: 3 } },
    // The far future: the NATURE DIVIDEND. Each landing in an area whose OWN biodiversity is >= minBio pays perLanding crystal(s),
    // collected on the next hangar visit (at most `cap` a visit). Bonds stay.
    { name: 'Nature dividend', fund: 5000, cost: 8000, era: 5, reserve: 3000, cap: 20, bond: { lock: 1000, landings: 10, perB: 4, most: 3 }, dividend: { minBio: 60, perLanding: 1, cap: 3 } },
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
// The EXCHANGE and the fund read the WHOLE WORLD's biodiversity: the mean meter of every land (src/nature.js
// worldBiodiversity). The user, 2026-11-13: 'it's over all land. That is just the sad reality and you will get bad rates
// until the whole world is more diverse.' (Measured: B ~8 in era 3, research/finbio-report.txt.) natureHealth above stays
// for the bonds' interest.
export const financeBio = save => worldBiodiversity(save);
// ---------- the market (the user, 2026-11-13: 'your rate vs the true exchange rate, which can fluctuate too') ----------
// TIME is GAME time (the user, 2026-11-13: 'use in game time, since the flights have a day and night'): one game day is a day
// plus a night of flying (DAYNIGHT, 30 s), counted from save.flightSeconds. Nothing moves while you are not flying, the clock
// cannot be wound, and the sim engine advances it like any flight.
export const GAME_DAY = DAYNIGHT.daySeconds + DAYNIGHT.nightSeconds;
export const gameDay = save => Math.floor((save.flightSeconds || 0) / GAME_DAY);
// A 32-bit integer hash to [0, 1) (no Math.random: the series must be the same everywhere).
function hash01(n, salt = 0) {
  let x = (n ^ salt ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0; x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0; x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}
const unit = (d, salt) => (hash01(d, salt) * 2 - 1) * Math.sqrt(3);   // mean 0, variance 1, never past +/-1.73
// THE TRUE RATE: one price for everyone, seeds per crystal. It wanders around `mid` and is pulled back each day by `pull`
// (an Ornstein-Uhlenbeck walk on its log), so it swings about 18 to 35 and never runs away (clamped at `edge`). Worked from `warm` days back.
// YOUR RATES: you pay the true rate PLUS a gap and get it LESS half the gap. The gap is `gap0` on a bare world and `gap100`
// on a fully healthy one; each desk level above the first trims it by `perLevel`. GAME VALUES, est.: the sim measures them.
export const MARKET = { mid: 25, pull: 1 / 10, sigma: 0.075, edge: 0.45, warm: 120, gap0: 0.5, gap100: 0.1, curve: 4, perLevel: 0.15 };   // edge: |log move| at most 0.45 (16..39); 2026-11-13 'should fluctuate a bit more'
const SALT_MARKET = 0x3c6ef372;
// The true rate for each of the game days d0..d1 (inclusive), as an array.
export function trueRates(d0, d1) {
  const out = []; let x = 0;
  for (let d = d0 - MARKET.warm; d <= d1; d++) { x = Math.max(-MARKET.edge, Math.min(MARKET.edge, x * (1 - MARKET.pull) + MARKET.sigma * unit(d, SALT_MARKET))); if (d >= d0) out.push(Math.round(10 * MARKET.mid * Math.exp(x)) / 10); }
  return out;
}
export const trueRate = d => trueRates(d, d)[0];
// STEEP EARLY (the user, 2026-11-13: 'it needs to be steep in the early stages'): the gap closes as (1 - b)^curve, so the
// first greening of the world narrows it most (curve 4: half the gap is gone by world B ~16).
export function gapAt(level, B) { const b = Math.max(0, Math.min(100, B)) / 100; return (MARKET.gap100 + (MARKET.gap0 - MARKET.gap100) * Math.pow(1 - b, MARKET.curve)) * (1 - MARKET.perLevel * Math.max(0, level - 1)); }
// Seeds you PAY for a crystal and seeds you GET for one, at true rate T. Selling always pays less than buying costs.
export function buyAt(level, B, T) { return level ? Math.max(1, Math.round(T * (1 + gapAt(level, B)))) : null; }
export function sellAt(level, B, T) { return level ? Math.max(1, Math.min(buyAt(level, B, T) - 1, Math.round(T * (1 - gapAt(level, B) / 2)))) : null; }
export const rate = (save, level = financeLevel(save)) => buyAt(level, financeBio(save), trueRate(gameDay(save)));
export const sellRate = (save, level = financeLevel(save)) => sellAt(level, financeBio(save), trueRate(gameDay(save)));
// The last n game days for the desk's graph: [{ d, true, pay, get }].
export function marketSeries(save, n = 20, level = Math.max(1, financeLevel(save))) {
  const d1 = gameDay(save), d0 = Math.max(0, d1 - n + 1), B = financeBio(save);
  return trueRates(d0, d1).map((T, i) => ({ d: d0 + i, true: T, pay: buyAt(level, B, T), get: sellAt(level, B, T) }));
}
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
// Put seeds in; they grow or shrink each GAME DAY you fly. Each game day d has a fixed random step (a hash of d), and
//   value = paid in x exp( sum over the game days held of (drift + sigma x step(d)) + the news jumps ),
// with the drift set by the WORLD's biodiversity when you cash out. Clamped to [clamp]. GAME VALUES, est.: target (sim
// thread, pending): a full fund earns on average about a fifth of a flight's seeds per flight.
export const FUND = {
  // Sized from the sim's LEARNING pilot (research/finbio-learn-report.txt, 2026-11-13; it supersedes the fixed-skill run):
  // era 3: flights 90-95 s = ~3 game days, ~49.5 seeds a flight, world B 23.5 (p10 8, p90 28). Target: a full level-1 fund
  // (2,000) drifts ~10 seeds a flight there (about a fifth of a flight); bigger funds at higher levels earn more.
  sigma: 0.006,                  // a game day's spread
  drift: { at0: 0.0012, at100: 0.0035 },   // the mean move a game day at world biodiversity 0 and 100: always above zero
  news: { chance: 1 / 8, size: 0.015 },   // one game day in eight carries a +/-1.5% story
  fee: 0.01,                     // 1% taken when you cash out
  step: 500,                     // seeds a tap puts in
  clamp: [0.5, 3],
};
const SALT_FUND = 0, SALT_NEWS = 0x5bd1e995;
export const stepAt = d => unit(d, SALT_FUND);
const GOOD = ['Reef restoration beats its target', 'Forest fund plants a million trees', 'Wetland project wins a prize', 'River clean-up opens early'];
const BAD = ['Storm hits the forest fund', 'Drought slows the wetland project', 'Coral bleaching hits the reef fund', 'Wildfire burns a planted hillside'];
// Game day d's story, or null on a quiet day.
export function newsOn(d) {
  if (hash01(d, SALT_NEWS) >= FUND.news.chance) return null;
  const up = hash01(d, 0x27d4eb2f) < 0.5, list = up ? GOOD : BAD, text = list[Math.floor(hash01(d, 0x165667b1) * list.length)];
  return { up, text, size: up ? FUND.news.size : -FUND.news.size };
}
export const newsToday = save => newsOn(gameDay(save));
export const driftAt = B => FUND.drift.at0 + (FUND.drift.at100 - FUND.drift.at0) * Math.max(0, Math.min(100, B)) / 100;
// The fund's own log-price on game day d relative to day d0 (no drift: the drift is yours, set by nature).
function moveLog(d0, d1, B) {
  let log = 0; const mu = driftAt(B);
  for (let d = d0 + 1; d <= d1; d++) { log += mu + FUND.sigma * stepAt(d); const n = newsOn(d); if (n) log += Math.log(1 + n.size); }
  return log;
}
// The growth factor from game day d0 to d1 at world biodiversity B (1 when no whole game day has passed).
export function growth(d0, d1, B) { return d1 > d0 ? Math.min(FUND.clamp[1], Math.max(FUND.clamp[0], Math.exp(moveLog(d0, d1, B)))) : 1; }
// The fund's price for the graph: the last n game days, 100 at the first.
export function fundSeries(save, n = 20) {
  const d1 = gameDay(save), d0 = Math.max(0, d1 - n + 1), B = financeBio(save), out = [];
  for (let d = d0; d <= d1; d++) out.push({ d, price: Math.round(1000 * Math.exp(moveLog(d0, d, B))) / 10 });
  return out;
}
const fundCfg = save => { const L = FINANCE.levels[financeLevel(save) - 1]; return L && financeOpen(save) ? L.fund : 0; };
export const fundOf = save => (save.finance && save.finance.fund) || null;
// What your fund is worth now (seeds, whole), 0 with nothing in.
export function fundValue(save) {
  const f = fundOf(save); if (!f) return 0;
  return Math.floor(f.seeds * growth(f.day, gameDay(save), financeBio(save)));
}
// Seeds a tap would put in now: FUND.step, or less to stay under the level's cap and above the desk's reserve.
export function canInvest(save) {
  const cap = fundCfg(save), L = FINANCE.levels[financeLevel(save) - 1]; if (!cap) return 0;
  const room = cap - fundValue(save), spare = (save.seeds || 0) - L.reserve;
  return Math.max(0, Math.min(FUND.step, room, spare));
}
// Put seeds in: what is already in is valued now and rolled into one holding that starts this game day.
export function invest(save) {
  const n = canInvest(save); if (!n) return 0;
  const v = fundValue(save);
  save.seeds -= n; save.finance.fund = { seeds: v + n, day: gameDay(save) };
  return n;
}
// Take everything out (less the fee): seeds paid, 0 with nothing in.
export function cashOut(save) {
  if (!fundOf(save)) return 0;
  const pay = Math.floor(fundValue(save) * (1 - FUND.fee));
  save.seeds = (save.seeds || 0) + pay; delete save.finance.fund;
  return pay;
}
