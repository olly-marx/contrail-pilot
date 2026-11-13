// SEASON 2 crossings (the redesign, M3/M4; research/STORY-ANY-START.md tiers, MASTER-PLAN.md B3/B4): the only way out
// of an area. Each is ONE mission flight, non-stop, from a city of one area to the gateway of the next (either way),
// with a progress bar instead of the distance meter. Lengths are GAME km by era (src/season.js, TBD-SIM).
// era: 0 = 1950s ... 4 = 2030s, 5 = far future (src/eras.js). kind: frontier / ocean / second (frontier) / long / lap.
// The FINAL BOSS (the user, 2026-10-27): a LAP OF THE EARTH from your home city back to it, once every area is open.
// Auckland-Santiago, the old boss, is now an ordinary 2030s crossing (it closes the circle of areas).
import { SEASON } from './season.js';
import { AREAS, OCEAN_STONES, areaOf, unlockedAreas, regionsOpen, regionOfArea, withRegions } from './areas.js';
import { eraProgress } from './eras.js';
import { linksOf, choices, city } from './network.js';
import { tourPath } from './route.js';
import { gateDone } from './missions2.js';
import { capFor } from './capability.js';
import { bestAreaBio } from './arealand.js';
import { crossingReward, crossingWord } from './missionprize.js';
import { payPrize } from './rewards.js';

// CROSSINGS V3 (the user, 2026-11-13: '22 crossings is obscene ... 6 regions, 5 crossings plus the lap is perfect. Each one harder than the last'): EIGHT famous routes join the
// six REGIONS (src/areas.js); you choose which way to go next. A route has no era of its own: the n-th crossing you make (n = regions open - 1) is era n and takes era n's length
// (SEASON.crossingKm), so every crossing is harder than the last whichever route you take. Five crossings open the world; then the lap. Old ids (save.crossed) are kept as they were.
export const CROSSINGS = [
  { id: 'mediterranean', a: 'ROME', b: 'TUNIS', kind: 'route' },             // Europe <-> Africa & the Middle East
  { id: 'north-atlantic', a: 'LISBON', b: 'NEW YORK', kind: 'route' },       // Europe <-> North America
  { id: 'arabian-sea', a: 'MUSCAT', b: 'KARACHI', kind: 'route' },           // Africa & the Middle East <-> Asia
  { id: 'singapore-perth', a: 'SINGAPORE', b: 'PERTH', kind: 'route' },      // Asia <-> Oceania
  { id: 'caribbean', a: 'MIAMI', b: 'CARACAS', kind: 'route' },              // North America <-> South America
  { id: 'south-atlantic', a: 'LAGOS', b: 'BELEM', kind: 'route' },           // Africa & the Middle East <-> South America
  { id: 'north-pacific', a: 'SAPPORO', b: 'ANCHORAGE', kind: 'route' },      // Asia <-> North America
  { id: 'auckland-santiago', a: 'AUCKLAND', b: 'SANTIAGO', kind: 'route' },  // Oceania <-> South America
  { id: 'lap', era: 5, kind: 'lap' },   // from = to = your home city (save.homeArea's start), filled in by available()
];
export const crossingById = id => CROSSINGS.find(c => c.id === id);
// A route as the n-th crossing (era n and its length): what available() hands out when n crossings are made. Tests and screens that list every route at a given step use it.
export const asNext = (c, n) => (c.kind === 'lap' ? { ...c, km: crossingKm(c) } : { ...c, era: n, km: crossingKm({ era: n }) });
// The route order (CROSSINGS V3: only a stable order for lists; difficulty comes from how many crossings you have made, crossingsMade).
export const LADDER = CROSSINGS.map(c => c.id);
export const rungOf = c => LADDER.indexOf(typeof c === 'string' ? c : c.id);
// How many region crossings this save has made: the regions open, less the home region.
export const crossingsMade = save => Math.max(0, regionsOpen(unlockedAreas(save)).length - 1);
export const topRung = save => crossingsMade(save) - 1;
export const crossingKm = c => (c.kind === 'lap' ? SEASON.crossingKm.final : SEASON.crossingKm[c.era + 1]);
// The two areas a crossing joins ('ocean' for Honolulu/Nadi, which belong to no area).
export const sides = c => [areaOf(c.a) || 'ocean', areaOf(c.b) || 'ocean'];
// Your home city: where the start choice put you (src/startchoice.js save.homeArea), else where you are.
export const homeCity = save => (save.homeArea && AREAS[save.homeArea] ? AREAS[save.homeArea].start : save.city);

// The crossings you could fly now, from your unlocked areas: one end open, the other not; its era reached. The lap only
// when EVERY area is open (from your home city, back to it). Each comes with the direction to fly it.
export function available(save) { return routes(save, true); }
// Every route with one side open and the other not, WHATEVER the era (the HOME box talks about the next one before its era arrives).
export function upcoming(save) { return routes(save, false); }
// Each comes as the NEXT crossing: era n = crossingsMade(save) and that era's length, with the direction to fly it and the region it opens. The lap only when EVERY area is open.
function routes(save, eraGate) {
  const open = new Set(unlockedAreas(save)), era = eraProgress(save).index, n = crossingsMade(save);
  if ((save.areas || []).includes('ocean')) open.add('ocean');
  const allOthers = Object.keys(AREAS).every(k => open.has(k)), out = [];
  for (const c of CROSSINGS) {
    if (c.kind === 'lap') {
      if (allOthers && !(save.crossed || []).includes(c.id) && (!eraGate || c.era <= era) && c.era <= SEASON.maxEra) { const h = homeCity(save); out.push({ ...c, a: h, b: h, from: h, to: h, km: crossingKm(c) }); }
      continue;
    }
    if (n > SEASON.maxEra - 1 || (eraGate && n > era)) continue;
    const [sa, sb] = sides(c), x = { ...c, era: n };
    if (open.has(sa) && !open.has(sb)) out.push({ ...x, from: c.a, to: c.b, opens: sb, region: regionOfArea(sb), km: crossingKm(x) });
    else if (open.has(sb) && !open.has(sa)) out.push({ ...x, from: c.b, to: c.a, opens: sa, region: regionOfArea(sa), km: crossingKm(x) });
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
  const n = crossingsMade(save), era = eraProgress(save).index;
  return n > era && n <= SEASON.maxEra - 1 && upcoming(save).some(c => c.kind !== 'lap') ? n : null;
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
// What a FINISHED crossing flight puts in result.crossing (GameScene.finish calls this; tests/crossreward.cjs reads it): landed = the crossing was completed (the lap: only at home), prize = what was paid, shown only when it was.
export function finishCrossing(save, c, landed) {
  const due = landed ? crossingPrizeDue(save, c) : null, done = landed && completeCrossing(save, c);
  return { id: c.id, kind: c.kind, landed: !!done, opens: c.opens, to: c.to, prize: done ? due : null };
}
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
  const [sa, sb] = sides(c);
  save.areas = withRegions([...(save.areas || []), sa, sb]);   // CROSSINGS V3: the whole region on the far side opens   // (the rules already moved save.city to where you landed)
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
export function ladderSplit(save) { return { higher: upcoming(save), exception: [], easier: [] }; }   // (CROSSINGS V3: every route on offer is the next crossing, at the same difficulty)
