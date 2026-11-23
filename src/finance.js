// NATURE FINANCE: natural capital (the user, 2026-10-27; research/PROPOSAL-ERAS-4-6-SYSTEMS.md section 5). Real finance is
// starting to value nature. Crystals are the ordinary currency (experts run short); a late-game player is RICH in natural
// currency (seeds). The exchange desk trades both ways at the MARKET's true rate (it moves each game day, the same for
// everyone) plus a GAP set by the WHOLE WORLD's biodiversity: a bare world pays badly, a healthy one well (2026-11-13; the
// market section below). Opens in the 2010s (era 3). The sim measures it before release.
// Level 3 (bonds) opens in the 2030s, level 4 (the dividend) in the far future.
import { AREAS } from './areas.js';
import { city } from './network.js';
import { biodiversity, worldBiodiversity } from './nature.js';
import { eraProgress } from './eras.js';
import { DAYNIGHT, PRICE_SCALE } from './config.js';

// 2026-11-23 REWORK (Oliver: 'it always says buy after next flight ... impossible to actually invest'). Measured: the 0.73.0 price
// scale had made the desk cost 9,000 seeds and keep back a 24,000 reserve, while the progression sim's era-3 pilot holds 100 to
// 3,900 seeds: nobody could trade or invest. Now: NO reserve, NO one-trade-a-landing rule (the buy/sell gap is the cost of
// trading), any amount up to what you can afford, and the desk's own prices set here in today's seeds (NOT through scaleSeeds;
// an era-3 flight earns ~350 seeds, so level 1 is about four flights). `fund` = the most the nature fund holds at that level.
export const FINANCE = {
  era: 3,
  levels: [
    { name: 'Natural capital account', cost: 1500, fund: 5000 },
    { name: 'Nature-positive rating', cost: 3000, fund: 8000 },
    // The 2030s: BONDS. Lock `lock` seeds for `landings` landings; get them back plus bondCrystals() crystals, nature read at
    // PAYOUT (nature pays interest only if you keep it healthy). At most `most` bonds at once.
    { name: 'Biodiversity bonds', cost: 5000, fund: 12000, era: 4, bond: { lock: 3000, landings: 10, perB: 4, most: 3 } },
    // The far future: the NATURE DIVIDEND. Each landing in an area whose OWN biodiversity is >= minBio pays perLanding crystals,
    // collected on the next hangar visit (at most `cap` a visit). Bonds stay.
    { name: 'Nature dividend', cost: 8000, fund: 20000, era: 5, bond: { lock: 3000, landings: 10, perB: 4, most: 3 }, dividend: { minBio: 60, perLanding: PRICE_SCALE.crystals, cap: 3 * PRICE_SCALE.crystals } },
  ],
};
export const bondCrystals = (save, b) => Math.floor(natureHealth(save) * PRICE_SCALE.crystals / b.perB);   // a bond's interest in crystals (x PRICE_SCALE.crystals since 0.73.0)
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
// TRADING (2026-11-23): any amount, any time the desk is open. maxBuy = crystals your seeds pay for; maxSell = the crystals you hold.
const deskOpen = save => financeLevel(save) > 0 && financeOpen(save);
export const maxBuy = save => deskOpen(save) ? Math.max(0, Math.floor((save.seeds || 0) / rate(save))) : 0;
export const maxSell = save => deskOpen(save) ? Math.max(0, Math.floor(save.crystals || 0)) : 0;
// Why you cannot buy or sell right now, in words for the greyed button (null when you can).
export function buyBlock(save) { return !deskOpen(save) ? 'Open the desk first' : maxBuy(save) ? null : `Need ${rate(save)} seeds for a crystal`; }
export function sellBlock(save) { return !deskOpen(save) ? 'Open the desk first' : maxSell(save) ? null : 'No crystals to sell'; }
// Buy / sell n crystals (clamped to what you can); returns how many moved.
export function trade(save, n = 1) {
  n = Math.min(Math.floor(n), maxBuy(save)); if (!(n > 0)) return 0;
  save.seeds -= n * rate(save); save.crystals = (save.crystals || 0) + n;
  return n;
}
export function sell(save, n = 1) {
  n = Math.min(Math.floor(n), maxSell(save)); if (!(n > 0)) return 0;
  save.crystals -= n; save.seeds = (save.seeds || 0) + n * sellRate(save);
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
  const b = bondCfg(save);
  return !!b && bonds(save).length < b.most && (save.seeds || 0) >= b.lock;
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
  const crystals = due.length * bondCrystals(save, b), seeds = due.reduce((a, x) => a + x.seeds, 0);
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

// ---------- the nature fund (2026-11-23 rework; Oliver: 'it should trend more upwards with some noise that make badly timed
// withdrawals lose money') ----------
// ONE PRICE for everyone, like the market: price(d) = 100 x exp(trend x d + x_d), where x_d is NOISE AROUND THE TREND, pulled back
// toward it each game day (an Ornstein-Uhlenbeck walk) and kicked by news days. You buy UNITS at today's price and sell them at the
// price on the day you take them out, less the fee. Because the noise always returns to the trend, a long hold almost always gains
// and a short one, or one taken out in a dip, often loses. On top, your holding earns a NATURE BONUS a game day set by the
// world's biodiversity (B now, folded in whenever you put in or take out).
// Simmed 2026-11-23 (3 game days a flight, 2% fee): held 1 flight loses 65% of the time, 5 flights 23%, 10 flights 3%, 20 never.
export const FUND = {
  trend: 0.0025,                 // the shared price's growth a game day (~0.75% a flight)
  bonus: { at0: 0, at100: 0.002 },   // your holding's extra growth a game day at world biodiversity 0 and 100
  pull: 0.12, sigma: 0.012,      // how fast the noise returns to the trend, and a game day's spread
  news: { chance: 1 / 8, size: 0.03 },   // one game day in eight carries a +/-3% story (it fades like any noise)
  fee: 0.02,                     // 2% taken when you take money out
  warm: 120,                     // game days of noise worked out before the first one asked for
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
// The noise (log distance from the trend) for game days d0..d1.
export function fundNoise(d0, d1) {
  const out = []; let x = 0;
  for (let d = d0 - FUND.warm; d <= d1; d++) { x = x * (1 - FUND.pull) + FUND.sigma * stepAt(d); const n = newsOn(d); if (n) x += n.size; if (d >= d0) out.push(x); }
  return out;
}
// The log move of the shared price from game day d0 to d1 (trend plus the change in noise). Only RATIOS are ever used, so nothing
// overflows however long a save has flown.
export function priceLog(d0, d1) { if (d1 <= d0) return 0; const x = fundNoise(d0, d1); return FUND.trend * (d1 - d0) + x[x.length - 1] - x[0]; }
export const bonusAt = B => FUND.bonus.at0 + (FUND.bonus.at100 - FUND.bonus.at0) * Math.max(0, Math.min(100, B)) / 100;
// The growth factor of a holding from game day d0 to d1 at world biodiversity B (the price move times the nature bonus).
export function growth(d0, d1, B) { return d1 > d0 ? Math.exp(priceLog(d0, d1) + bonusAt(B) * (d1 - d0)) : 1; }
// The fund's price for the graph: the last n game days, 100 at the trend's first day, and the trend line: [{ d, price, trend }].
export function fundSeries(save, n = 20) {
  const d1 = gameDay(save), d0 = Math.max(0, d1 - n + 1);
  return fundNoise(d0, d1).map((x, i) => ({ d: d0 + i, price: Math.round(1000 * Math.exp(FUND.trend * i + x)) / 10, trend: Math.round(1000 * Math.exp(FUND.trend * i)) / 10 }));
}
const fundCfg = save => { const L = FINANCE.levels[financeLevel(save) - 1]; return L && financeOpen(save) ? L.fund : 0; };
// The holding: { seeds, day, paid }: worth `seeds` on game day `day` (rolled up whenever you put more in), and `paid` = the
// seeds you put in, for the gain shown. A holding from before the rework has no `paid`: it reads as its own seeds.
export function fundOf(save) {
  const f = save.finance && save.finance.fund; if (!f) return null;
  return { seeds: f.seeds || 0, day: f.day || 0, paid: f.paid ?? f.seeds ?? 0 };
}
// What your fund is worth now (seeds, whole), 0 with nothing in.
export function fundValue(save) { const f = fundOf(save); return f ? Math.floor(f.seeds * growth(f.day, gameDay(save), financeBio(save))) : 0; }
// What taking it all out pays now (value less the fee).
export const cashValue = save => Math.floor(fundValue(save) * (1 - FUND.fee));
// The most you can put in now: the room under the level's cap, and your seeds.
export function canInvest(save) {
  const cap = fundCfg(save); if (!cap) return 0;
  return Math.max(0, Math.min(cap - fundValue(save), Math.floor(save.seeds || 0)));
}
export function investBlock(save) { return !fundCfg(save) ? 'Open the desk first' : canInvest(save) ? null : fundValue(save) >= fundCfg(save) ? 'Fund full' : 'No seeds to put in'; }
// Put n seeds in (clamped to canInvest): what is in is valued now and rolled into one holding from today. Returns seeds put in.
export function invest(save, n = canInvest(save)) {
  n = Math.min(Math.floor(n), canInvest(save)); if (!(n > 0)) return 0;
  const f = fundOf(save), v = fundValue(save);
  save.seeds -= n; save.finance.fund = { seeds: v + n, day: gameDay(save), paid: (f ? f.paid : 0) + n };
  return n;
}
// Take everything out (less the fee): seeds paid, 0 with nothing in.
export function cashOut(save) {
  if (!fundOf(save)) return 0;
  const pay = cashValue(save);
  save.seeds = (save.seeds || 0) + pay; delete save.finance.fund;
  return pay;
}
