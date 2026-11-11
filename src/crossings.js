// SEASON 2 crossings (the redesign, M3/M4; research/STORY-ANY-START.md tiers, MASTER-PLAN.md B3/B4): the only way out
// of an area. Each is ONE mission flight, non-stop, from a city of one area to the gateway of the next (either way),
// with a progress bar instead of the distance meter. Lengths are GAME km by era (src/season.js, TBD-SIM).
// era: 0 = 1950s ... 4 = 2030s, 5 = far future (src/eras.js). kind: frontier / ocean / second (frontier) / long / lap.
// The FINAL BOSS (the user, 2026-10-27): a LAP OF THE EARTH from your home city back to it, once every area is open.
// Auckland-Santiago, the old boss, is now an ordinary 2030s crossing (it closes the circle of areas).
import { SEASON } from './season.js';
import { AREAS, OCEAN_STONES, areaOf, unlockedAreas } from './areas.js';
import { eraProgress } from './eras.js';
import { linksOf, choices, city } from './network.js';
import { tourPath } from './route.js';
import { gateDone } from './missions2.js';
import { capFor } from './capability.js';
import { bestAreaBio } from './arealand.js';
import { crossingReward, crossingWord } from './missionprize.js';
import { payPrize } from './rewards.js';

export const CROSSINGS = [
  { id: 'warsaw-stockholm', a: 'WARSAW', b: 'STOCKHOLM', era: 0, kind: 'frontier' },
  { id: 'khartoum-addis', a: 'KHARTOUM', b: 'ADDIS ABABA', era: 0, kind: 'frontier' },
  { id: 'hanoi-hongkong', a: 'HANOI', b: 'HONG KONG', era: 0, kind: 'frontier' },
  { id: 'jakarta-darwin', a: 'JAKARTA', b: 'DARWIN', era: 0, kind: 'frontier' },
  { id: 'mexico-panama', a: 'MEXICO CITY', b: 'PANAMA', era: 0, kind: 'frontier' },
  { id: 'tasman', a: 'AUCKLAND', b: 'SYDNEY', era: 0, kind: 'frontier' },
  { id: 'patagonia', a: 'PUERTO MADRYN', b: 'BUENOS AIRES', era: 0, kind: 'frontier' },   // Patagonia <-> South America: the Patagonia start's first way out (2026-10-28)   // Aotearoa <-> Australia: the NZ start's first way out (2026-10-28)
  { id: 'north-atlantic', a: 'LISBON', b: 'NEW YORK', era: 1, kind: 'ocean' },
  { id: 'reykjavik-newyork', a: 'REYKJAVIK', b: 'NEW YORK', era: 1, kind: 'ocean' },
  { id: 'arabian-sea', a: 'MUSCAT', b: 'KARACHI', era: 1, kind: 'ocean' },
  { id: 'caribbean', a: 'MIAMI', b: 'CARACAS', era: 1, kind: 'ocean' },
  { id: 'mediterranean', a: 'ROME', b: 'TUNIS', era: 1, kind: 'second' },
  { id: 'silk-road', a: 'TASHKENT', b: 'ULAANBAATAR', era: 1, kind: 'second' },
  { id: 'south-atlantic', a: 'LAGOS', b: 'BELEM', era: 2, kind: 'long' },
  { id: 'north-pacific', a: 'SAPPORO', b: 'ANCHORAGE', era: 2, kind: 'long' },
  { id: 'singapore-perth', a: 'SINGAPORE', b: 'PERTH', era: 2, kind: 'long' },
  { id: 'indian-ocean', a: 'ANTANANARIVO', b: 'PERTH', era: 2, kind: 'long' },
  { id: 'pacific-islands', a: 'LOS ANGELES', b: 'HONOLULU', era: 3, kind: 'long' },
  { id: 'honolulu-tokyo', a: 'HONOLULU', b: 'TOKYO', era: 3, kind: 'long' },
  { id: 'nadi-auckland', a: 'NADI', b: 'AUCKLAND', era: 4, kind: 'long' },
  { id: 'auckland-santiago', a: 'AUCKLAND', b: 'SANTIAGO', era: 4, kind: 'long' },
  { id: 'lap', era: 5, kind: 'lap' },   // from = to = your home city (save.homeArea's start), filled in by available()
];
export const crossingById = id => CROSSINGS.find(c => c.id === id);
// THE LADDER (CROSSINGS V2: 'crossings should always get harder'): every crossing's rung, DECLARED, by era and then the real length of the leg (great circle of its two airports); the lap is the last rung. The game lengths
// are unchanged: this is only the ORDER. The next crossing offered is always above the highest rung already crossed (candidates below).
export const LADDER = ['hanoi-hongkong', 'warsaw-stockholm', 'khartoum-addis', 'patagonia', 'tasman', 'mexico-panama', 'jakarta-darwin', 'mediterranean', 'arabian-sea', 'caribbean', 'silk-road', 'reykjavik-newyork', 'north-atlantic',
  'singapore-perth', 'north-pacific', 'south-atlantic', 'indian-ocean', 'pacific-islands', 'honolulu-tokyo', 'nadi-auckland', 'auckland-santiago', 'lap'];
export const rungOf = c => LADDER.indexOf(typeof c === 'string' ? c : c.id);
export const topRung = save => Math.max(-1, ...(save.crossed || []).map(id => LADDER.indexOf(id)));
export const crossingKm = c => (c.kind === 'lap' ? SEASON.crossingKm.final : SEASON.crossingKm[c.era + 1]);
// The two areas a crossing joins ('ocean' for Honolulu/Nadi, which belong to no area).
export const sides = c => [areaOf(c.a) || 'ocean', areaOf(c.b) || 'ocean'];
// Your home city: where the start choice put you (src/startchoice.js save.homeArea), else where you are.
export const homeCity = save => (save.homeArea && AREAS[save.homeArea] ? AREAS[save.homeArea].start : save.city);

// The crossings you could fly now, from your unlocked areas: one end open, the other not; its era reached. The lap only
// when EVERY area is open (from your home city, back to it). Each comes with the direction to fly it.
export function available(save) {
  const open = new Set(unlockedAreas(save)), era = eraProgress(save).index;
  if ((save.areas || []).includes('ocean')) open.add('ocean');
  const allOthers = Object.keys(AREAS).every(k => open.has(k));
  const out = [];
  for (const c of CROSSINGS) {
    if (c.era > era || c.era > SEASON.maxEra) continue;   // (maxEra: 0.12.0 ends after the 1990s crossings)
    const [sa, sb] = sides(c);
    if (c.kind === 'lap') { if (allOthers && !(save.crossed || []).includes(c.id)) { const h = homeCity(save); out.push({ ...c, a: h, b: h, from: h, to: h, km: crossingKm(c) }); } continue; }
    if (open.has(sa) && !open.has(sb)) out.push({ ...c, from: c.a, to: c.b, opens: sb, km: crossingKm(c) });
    else if (open.has(sb) && !open.has(sa)) out.push({ ...c, from: c.b, to: c.a, opens: sa, km: crossingKm(c) });
  }
  return out;
}

// Every crossing with one end open and the other not, WHATEVER its era (crossings of the eras this release has): the HOME box talks about the next one before its era arrives.
export function upcoming(save) {
  const open = new Set(unlockedAreas(save));
  if ((save.areas || []).includes('ocean')) open.add('ocean');
  const allOthers = Object.keys(AREAS).every(k => open.has(k)), out = [];
  for (const c of CROSSINGS) {
    if (c.era > SEASON.maxEra) continue;
    const [sa, sb] = sides(c);
    if (c.kind === 'lap') { if (allOthers && !(save.crossed || []).includes(c.id)) { const h = homeCity(save); out.push({ ...c, a: h, b: h, from: h, to: h, km: crossingKm(c) }); } continue; }
    if (open.has(sa) && !open.has(sb)) out.push({ ...c, from: c.a, to: c.b, opens: sb, km: crossingKm(c) });
    else if (open.has(sb) && !open.has(sa)) out.push({ ...c, from: c.b, to: c.a, opens: sa, km: crossingKm(c) });
  }
  return out;
}

// READY BY STATUS (the user, 2026-11-09, CROSSINGS V2: 'a crossing becomes available based on status, NOT where you are'): three ticks, none of them about the trial stars or where the player is.
//   era    the era reached is the crossing's era or later;   nature  the best nature meter over every land the player has opened is at the offer's biodiversity;
//   plane  planeReady() below: TODAY's rule (the best landed flight from the departure area, or the hangar's estimate, covers 70 percent of the crossing). It is one function so the sim chat's new factor and
//          pools drop in later without touching the screens.
// The plane's reach, FROM ANY AREA (the user, 2026-11-09: 'status, not location'; a pilot was told to upgrade a plane that only needed a longer landed flight from another land): the best landed flight
// from any area, the longest landed flight of all (save.bestDistance: a flown crossing counts), or the hangar's estimate for the area the player is in. Today's 70 percent rule otherwise.
const reachKm = save => Math.max(0, save.bestDistance || 0, ...Object.values(save.areaBest || {}), capFor(save, areaOf(save.city) || '') || 0);
export const planeReady = (save, c) => reachKm(save) >= SEASON.offer.distanceShare * c.km;
export const planeProgress = (save, c) => { const need = SEASON.offer.distanceShare * c.km; return need ? Math.min(1, reachKm(save) / need) : 1; };
export const natureBest = save => Math.max(0, ...unlockedAreas(save).map(k => bestAreaBio(save, k)));
export function readiness(save, c) {
  const era = eraProgress(save).index >= c.era, plane = planeReady(save, c), nb = natureBest(save), nature = nb >= SEASON.offer.biodiversity;
  return { era, plane, nature, natureHave: Math.round(nb), ready: era && plane && nature };
}

// The era (index) in which the next crossing you could fly opens, when it is later than yours and this release has it; else null.
export function laterEra(save) {
  const open = new Set(unlockedAreas(save)), era = eraProgress(save).index;
  if ((save.areas || []).includes('ocean')) open.add('ocean');
  let best = null;
  for (const c of CROSSINGS) {
    if (c.kind === 'lap' || c.era <= era || c.era > SEASON.maxEra) continue;
    const [sa, sb] = sides(c);
    if (open.has(sa) !== open.has(sb) && (best === null || c.era < best)) best = c.era;
  }
  return best;
}
// The placeholder at the end of this release: you have reached the last era it covers and nothing is left to fly.
export const moreToCome = save => !save.lapDone && eraProgress(save).index >= SEASON.maxEra && available(save).length === 0;   // (after the lap: finished, nothing more to come)

// Season 2 stand-ins for the offer gate (user, 2026-10-26): the best LANDED ordinary flight from each area, kept on the
// save (areaBest[area], game km) by recordAreaBest from GameScene.onFinish; and the area's biodiversity = the meter of the
// land its start city is in.
export function recordAreaBest(save, from, m) {
  const k = areaOf(from);
  if (!k || !(m > 0)) return;
  save.areaBest = save.areaBest || {};
  if (m > (save.areaBest[k] || 0)) save.areaBest[k] = Math.round(m);
}
export function offerCtx(save, c) {
  const k = areaOf(c.from);
  // missionsDone (S3): the area's crossing trial, its 3 starred missions (src/missions2.js), done in THIS area.
  // capabilityKm (M4): the best landed flight OR the hangar's estimate for this area (src/capability.js), whichever is larger.
  return { capabilityKm: Math.max((save.areaBest || {})[k] || 0, k ? capFor(save, k) : 0), bio: k ? bestAreaBio(save, k) : 0,   /* the best of the area's lands (was the start city's land only) */ missionsDone: k ? gateDone(save, k) : false };
}

// Why a crossing is or is not OFFERED (MASTER-PLAN B4): the conditions and the rule from src/season.js.
// `ctx` gives the measured parts the game knows: capabilityKm (here: best flight from the area), bio (the area's
// biodiversity) and, once the area missions exist (M6), missionsDone. A condition whose ctx value is undefined is not asked.
export function offerCheck(c, ctx) {
  const need = { capability: ctx.capabilityKm >= SEASON.offer.distanceShare * c.km, nature: ctx.bio >= SEASON.offer.biodiversity };
  if (ctx.missionsDone !== undefined) need.contrails = !!ctx.missionsDone;
  const met = Object.values(need).filter(Boolean).length, n = Object.keys(need).length;
  return { need, offered: SEASON.offer.rule === '2of3' && n === 3 ? met >= 2 : met === n };
}

// The prize a landed crossing pays: { seeds, crystals } by its difficulty word (src/missionprize.js crossingReward), or null when the crossing is already in save.crossed (paid once only; no back-pay).
export const crossingPrizeDue = (save, c) => ((save.crossed || []).includes(c.id) ? null : crossingReward(crossingWord(c)));
// Landing a crossing: the area on the far side opens (and the ocean stepping stones count as 'ocean'), and the prize is paid ONCE. The sim calls this too (src/sim/progression.js), so the game and the sim pay the same.
// Nothing here on a crash: the callers only come here after a landing. The lap pays only when you land back home.
export function completeCrossing(save, c) {
  const due = crossingPrizeDue(save, c);
  if (c.kind === 'lap') {   // the lap counts only when you land back HOME (the rules already moved save.city there)
    if (save.city !== c.to) return false;
    if (due) payPrize(save, due);
    save.crossed = [...new Set([...(save.crossed || []), c.id])]; save.lapDone = true; return true;
  }
  if (due) payPrize(save, due);
  save.crossed = [...new Set([...(save.crossed || []), c.id])];
  const [sa, sb] = sides(c), open = new Set(save.areas || []);
  for (const s of [sa, sb]) open.add(s);
  save.areas = [...open];   // (the rules already moved save.city to where you landed)
  return true;
}

// The path of a crossing flight: departure, the gateway, then on through the area it opens (the world-tour rule), so
// flying past the gateway carries on there. Landing anywhere after the departure opens that area (completeCrossing).
export function crossingPath(c, count = 60) {
  const k = areaOf(c.to), there = k ? AREAS[k].cities : OCEAN_STONES;   // the lap: home -> home (40,000 km), then on round home
  const L = linksOf([...new Set([c.to, ...there])]), way = choices(c.to, L)[0];
  return [c.from, ...(way ? tourPath(c.to, way.name, count, L) : [c.to])];
}

// WHICH crossings are the next ones (the 'only harder' rule; the user, 2026-11-09: he and a finished player were offered an easy and a medium after crossing several times). From every one-end-open crossing (upcoming):
//   higher     the rung is above the highest rung already crossed: these are the next ones;
//   exception  a LOWER crossing that is the only way to open an area no higher crossing opens (it must stay reachable, e.g. the Patagonia crossing);
//   easier     every other lower one: kept under 'an easier one', never offered as the next goal.
export function ladderSplit(save) {
  const all = upcoming(save), top = topRung(save), higher = all.filter(c => rungOf(c) > top), lower = all.filter(c => rungOf(c) <= top);
  const covered = new Set(higher.map(c => c.opens)), exception = lower.filter(c => !covered.has(c.opens));
  return { higher, exception, easier: lower.filter(c => !exception.includes(c)) };
}
