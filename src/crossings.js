// SEASON 2 crossings (the redesign, M3/M4; research/STORY-ANY-START.md tiers, MASTER-PLAN.md B3/B4): the only way out
// of an area. Each is ONE mission flight, non-stop, from a city of one area to the gateway of the next (either way),
// with a progress bar instead of the distance meter. Lengths are GAME km by era (src/season.js, TBD-SIM).
// era: 0 = 1950s ... 4 = 2030s, 5 = far future (src/eras.js). kind: frontier / ocean / second (frontier) / long / lap.
// The FINAL BOSS (the user, 2026-10-27): a LAP OF THE EARTH from your home city back to it, once every area is open.
// Auckland-Santiago, the old boss, is now an ordinary 2030s crossing (it closes the circle of areas).
import { SEASON } from './season.js';
import { AREAS, OCEAN_STONES, areaOf, unlockedAreas, regionsOpen, regionOfArea, withRegions } from './areas.js';
import { linksOf, choices, city } from './network.js';
import { tourPath } from './route.js';
import { capFor, capForArea } from './capability.js';
import { bestAreaBio } from './arealand.js';
import { crossingReward, crossingWord } from './missionprize.js';
import { payPrize } from './rewards.js';
import { REGION_DATA } from './habitats.js';
import { projectsDone } from './nature.js';

// CROSSINGS V3 (the user, 2026-11-13: '22 crossings is obscene ... 6 regions, 5 crossings plus the lap is perfect. Each one harder than the last'): EIGHT famous routes join the
// six REGIONS (src/areas.js); you choose which way to go next. A route has no era of its own: the n-th crossing you make (n = regions open - 1) is era n and takes era n's length
// (SEASON.crossingKm), so every crossing is harder than the last whichever route you take. Five crossings open the world; then the lap. Old ids (save.crossed) are kept as they were.
// CROSSINGS V5 (Oliver, 2026-11-23: 'each crossing needs to be harder than the last ... it picks a crossing ... the first one that you unlock and the other just never
// gets a crossing'): many routes between the six regions, each with a FIXED tier from its real great-circle distance (`real`, km; tier 0 Easy < 2,000, 1 Medium < 4,500,
// 2 Hard < 7,500, 3 Harder < 10,000, 4 Very hard), made by scratch/balance-audit/routes.mjs from the city table (the shortest pair of each region pair in each band; the 8 named
// routes of V3/V4 keep their ids, so old saves' save.crossed still reads). The game length of a tier is SEASON.step.km.
const ROUTES = [
  { id: 'mediterranean', a: 'ROME', b: 'TUNIS', real: 577, tier: 0 },
  { id: 'arabian-sea', a: 'KARACHI', b: 'MUSCAT', real: 912, tier: 0 },
  { id: 'miami-panama', a: 'MIAMI', b: 'PANAMA', real: 1862, tier: 0 },
  { id: 'istanbul-tehran', a: 'ISTANBUL', b: 'TEHRAN', real: 2053, tier: 1 },
  { id: 'karachi-riyadh', a: 'KARACHI', b: 'RIYADH', real: 2061, tier: 1 },
  { id: 'caribbean', a: 'MIAMI', b: 'CARACAS', real: 2193, tier: 1 },
  { id: 'reykjavik-iqaluit', a: 'REYKJAVIK', b: 'IQALUIT', real: 2202, tier: 1 },
  { id: 'jakarta-darwin', a: 'JAKARTA', b: 'DARWIN', real: 2746, tier: 1 },
  { id: 'singapore-perth', a: 'SINGAPORE', b: 'PERTH', real: 3912, tier: 1 },
  { id: 'istanbul-karachi', a: 'ISTANBUL', b: 'KARACHI', real: 3972, tier: 1 },
  { id: 'dublin-niamey', a: 'DUBLIN', b: 'NIAMEY', real: 4503, tier: 2 },
  { id: 'new-york-quito', a: 'NEW YORK', b: 'QUITO', real: 4557, tier: 2 },
  { id: 'hanoi-darwin', a: 'HANOI', b: 'DARWIN', real: 4635, tier: 2 },
  { id: 'north-pacific', a: 'ANCHORAGE', b: 'SAPPORO', real: 4833, tier: 2 },
  { id: 'iqaluit-casablanca', a: 'IQALUIT', b: 'CASABLANCA', real: 5308, tier: 2 },
  { id: 'north-atlantic', a: 'LISBON', b: 'NEW YORK', real: 5420, tier: 2 },
  { id: 'south-atlantic', a: 'LAGOS', b: 'BELEM', real: 5850, tier: 2 },
  { id: 'lisbon-belem', a: 'LISBON', b: 'BELEM', real: 6006, tier: 2 },
  { id: 'antananarivo-perth', a: 'ANTANANARIVO', b: 'PERTH', real: 6926, tier: 2 },
  { id: 'niamey-caracas', a: 'NIAMEY', b: 'CARACAS', real: 7505, tier: 3 },
  { id: 'london-dar-es-salaam', a: 'LONDON', b: 'DAR ES SALAAM', real: 7507, tier: 3 },
  { id: 'atlanta-sao-paulo', a: 'ATLANTA', b: 'SAO PAULO', real: 7510, tier: 3 },
  { id: 'bangkok-sydney', a: 'BANGKOK', b: 'SYDNEY', real: 7516, tier: 3 },
  { id: 'anchorage-taipei', a: 'ANCHORAGE', b: 'TAIPEI', real: 7519, tier: 3 },
  { id: 'lisbon-bogota', a: 'LISBON', b: 'BOGOTA', real: 7528, tier: 3 },
  { id: 'maputo-perth', a: 'MAPUTO', b: 'PERTH', real: 7939, tier: 3 },
  { id: 'auckland-santiago', a: 'SANTIAGO', b: 'AUCKLAND', real: 9653, tier: 3 },
  { id: 'kinshasa-bogota', a: 'KINSHASA', b: 'BOGOTA', real: 10002, tier: 4 },
  { id: 'barcelona-lima', a: 'BARCELONA', b: 'LIMA', real: 10005, tier: 4 },
  { id: 'madrid-hanoi', a: 'MADRID', b: 'HANOI', real: 10009, tier: 4 },
  { id: 'dublin-cape-town', a: 'DUBLIN', b: 'CAPE TOWN', real: 10009, tier: 4 },
  { id: 'los-angeles-beijing', a: 'LOS ANGELES', b: 'BEIJING', real: 10038, tier: 4 },
  { id: 'athens-dallas', a: 'ATHENS', b: 'DALLAS', real: 10051, tier: 4 },
  { id: 'ulaanbaatar-sydney', a: 'ULAANBAATAR', b: 'SYDNEY', real: 10111, tier: 4 },
  { id: 'los-angeles-rio', a: 'LOS ANGELES', b: 'RIO', real: 10139, tier: 4 },
  { id: 'buenos-aires-auckland', a: 'BUENOS AIRES', b: 'AUCKLAND', real: 10312, tier: 4 },
  { id: 'los-angeles-auckland', a: 'LOS ANGELES', b: 'AUCKLAND', real: 10487, tier: 4 },
  { id: 'karachi-belem', a: 'KARACHI', b: 'BELEM', real: 12647, tier: 4 },
];
// A plain name for a route with no sea name of its own ('Istanbul to Tehran'; at most 22 letters: tests/pickcity.cjs).
const title = n => n.toLowerCase().replace(/(^|[\s-])\S/g, m => m.toUpperCase());
const routeName = r => { const a = title(r.a), b = title(r.b), n = `${a} to ${b}`; return n.length <= 22 ? n : `${a} - ${b}`.length <= 22 ? `${a} - ${b}` : b; };
export const CROSSINGS = [
  ...ROUTES.map(r => ({ ...r, kind: 'route', name: routeName(r) })),
  { id: 'lap', era: 5, kind: 'lap' },   // from = to = your home city (save.homeArea's start), filled in by available()
];
export const crossingById = id => CROSSINGS.find(c => c.id === id);
// CROSSINGS V4 (Oliver, 2026-11-22/23: 'in Africa, crossing to Rome is easy but crossing to Sao Paulo is really hard and far'; 'judge it on the distance the plane can fly
// ... not on the era'; 'only one crossing offered at a time'): every route has its OWN difficulty, ranked by its real great-circle distance (approximate km in the comment),
// as a tier 0-4 (the word: Easy ... Very hard) with that tier's game length (SEASON.step.km). No era gate; it is offered when your RANGE reaches its length.
export const ROUTE_TIER = Object.fromEntries(ROUTES.map(r => [r.id, r.tier]));
// A route as the n-th crossing (era n and its length): what available() hands out when n crossings are made. Tests and screens that list every route at a given step use it.
export const asNext = (c, n) => (c.kind === 'lap' ? { ...c, km: crossingKm(c) } : { ...c, era: ROUTE_TIER[c.id] ?? n, km: crossingKm({ era: ROUTE_TIER[c.id] ?? n }) });   // (V4: a route's tier is its own; n only for an unknown id)
// The route order (CROSSINGS V3: only a stable order for lists; difficulty comes from how many crossings you have made, crossingsMade).
export const LADDER = CROSSINGS.map(c => c.id);
export const rungOf = c => LADDER.indexOf(typeof c === 'string' ? c : c.id);
// How many region crossings this save has made: the regions open, less the home region.
export const crossingsMade = save => Math.max(0, regionsOpen(unlockedAreas(save)).length - 1);
export const topRung = save => crossingsMade(save) - 1;
export const crossingKm = c => (c.kind === 'lap' ? SEASON.crossingKm.final : (SEASON.step && SEASON.step.km[c.era]) || SEASON.crossingKm[c.era + 1]);
// The nature meter a crossing needs: offer.biodiversity x SEASON.step.bioMul by crossing number (the lap and anything else: offer.biodiversity).
export const natureNeed = c => Math.round(SEASON.offer.biodiversity * (c && c.kind !== 'lap' && SEASON.step && Number.isFinite(SEASON.step.bioMul[c.era]) ? SEASON.step.bioMul[c.era] : 1));
// The two areas a crossing joins ('ocean' for Honolulu/Nadi, which belong to no area).
export const sides = c => [areaOf(c.a) || 'ocean', areaOf(c.b) || 'ocean'];
// Your home city: where the start choice put you (src/startchoice.js save.homeArea), else where you are.
export const homeCity = save => (save.homeArea && AREAS[save.homeArea] ? AREAS[save.homeArea].start : save.city);

// CROSSINGS V5 (0.73.2). THE LADDER: your n-th crossing (n = crossings made, from 0) is tier n: Easy, then Medium, Hard, Harder, Very hard, then the lap; never the
// same tier twice and never lower. When no route out of your regions has tier n, the next tier up that has one stands in.
// upcoming(save): every route at that tier from an open region to a closed one (best chance first: range from its departure area over its length).
// available(save): ONE: the route already picked (save.crossPick), else the first ready one, else the one with the best chance (not ready yet). pickCrossing(save) stores
// the first ready one in save.crossPick: from then on the others at that tier are never offered (Oliver: 'the other just never gets a crossing').
export function available(save) { return routes(save, true); }
export function upcoming(save) { return routes(save, false); }
export function nextTier(save, all = allOpen(save).filter(c => c.kind !== 'lap')) {
  const n = Math.max(crossingsMade(save), (save.crossTierLast ?? -1) + 1), tiers = [...new Set(all.map(c => c.era))].sort((a, b) => a - b);   // never the tier flown last, nor lower
  const up = tiers.find(t => t >= n);
  return up ?? (tiers.length ? tiers[tiers.length - 1] : null);
}
function allOpen(save) {
  const open = new Set(unlockedAreas(save));
  if ((save.areas || []).includes('ocean')) open.add('ocean');
  const allOthers = Object.keys(AREAS).every(k => open.has(k)), out = [];
  for (const c of CROSSINGS) {
    if (c.kind === 'lap') {
      if (allOthers && !(save.crossed || []).includes(c.id) && c.era <= SEASON.maxEra) { const h = homeCity(save); out.push({ ...c, a: h, b: h, from: h, to: h, km: crossingKm(c) }); }
      continue;
    }
    const [sa, sb] = sides(c), x = { ...c, era: c.tier };
    if (open.has(sa) && !open.has(sb)) out.push({ ...x, from: c.a, to: c.b, opens: sb, region: regionOfArea(sb), km: crossingKm(x) });
    else if (open.has(sb) && !open.has(sa)) out.push({ ...x, from: c.b, to: c.a, opens: sa, region: regionOfArea(sa), km: crossingKm(x) });
  }
  return out;
}
const chance = (save, c) => (c.km ? reachFrom(save, c) / c.km : 0);
function routes(save, one) {
  const all = allOpen(save), lap = all.filter(c => c.kind === 'lap'), rs = all.filter(c => c.kind !== 'lap');
  if (!rs.length) return lap;
  const t = nextTier(save, rs), here = rs.filter(c => c.era === t).sort((a, b) => chance(save, b) - chance(save, a));
  if (!one) return here;
  const picked = save.crossPick && here.find(c => c.id === save.crossPick);
  if (picked) return [picked];
  const ready = here.find(c => planeReady(save, c));
  return ready ? [ready] : here.slice(0, 1);
}
// Fix the pick: the first route at the next tier that is ready. The game calls this when it shows HOME and after a landing; returns the id picked (or null).
export function pickCrossing(save) {
  const here = routes(save, false), valid = save.crossPick && here.some(c => c.id === save.crossPick);
  if (valid) return save.crossPick;
  const ready = here.find(c => c.kind !== 'lap' && planeReady(save, c));
  save.crossPick = ready ? ready.id : null;
  return save.crossPick;
}

// READY BY STATUS (the user, 2026-11-09, CROSSINGS V2: 'a crossing becomes available based on status, NOT where you are'): three ticks, none of them about the trial stars or where the player is.
//   era    the era reached is the crossing's era or later;   nature  the best nature meter over every land the player has opened is at the offer's biodiversity;
//   plane  planeReady() below: TODAY's rule (the best landed flight from the departure area, or the hangar's estimate, covers 70 percent of the crossing). It is one function so the sim chat's new factor and
//          pools drop in later without touching the screens.
// The plane's reach, FROM ANY AREA (the user, 2026-11-09: 'status, not location'; a pilot was told to upgrade a plane that only needed a longer landed flight from another land): the best landed flight
// from any area, the longest landed flight of all (save.bestDistance: a flown crossing counts), or the hangar's estimate for the area the player is in. Today's 70 percent rule otherwise.
const reachKm = save => Math.max(0, save.bestDistance || 0, ...Object.values(save.areaBest || {}), capFor(save, areaOf(save.city) || '') || 0);
// V5 (Oliver, 2026-11-23: 'the unlock is for plane + rainforest nature'): a route is judged on the range FROM ITS DEPARTURE AREA (the plane over that land) or the best
// landed flight from there. The lap is judged the same way, from its departure (your home city) area.
export const reachFrom = (save, c) => Math.max(0, (save.areaBest || {})[areaOf(c.from)] || 0, capForArea(save, areaOf(c.from)));   // the lap too (Oliver, 2026-11-23: offered LAGOS to LAGOS while in another area, then gone on landing in LAGOS: it read the range of the area he stood in)
// V4 (Oliver, 2026-11-23: 'when it's unlocked, you should only just be able to get there in theory'): the RANGE (src/capability.js: how far this plane and nature fly before the
// planet overheats) or a landed flight reaches the WHOLE crossing (SEASON.offer.distanceShare is 1).
export const reachOf = save => reachKm(save);
export const planeReady = (save, c) => reachFrom(save, c) >= SEASON.offer.distanceShare * c.km;
export const planeProgress = (save, c) => { const need = SEASON.offer.distanceShare * c.km; return need ? Math.min(1, reachFrom(save, c) / need) : 1; };
export const natureBest = save => Math.max(0, ...unlockedAreas(save).map(k => bestAreaBio(save, k)));
// The nature a crossing reads (SEASON.step.natureRule, src/season.js): 'best' = natureBest; 'weakest' = the weakest opened region's best land.
export const regionNature = save => { const by = {}; for (const k of unlockedAreas(save)) { const r = regionOfArea(k); if (r) by[r] = Math.max(by[r] ?? 0, bestAreaBio(save, k)); } return by; };
// The region a 'weakest' crossing waits on (null under 'best', or with one region open): the opened region whose best land is lowest (src/crossingview.js names it on the card).
export const weakestRegion = save => { if (!(SEASON.step && SEASON.step.natureRule === 'weakest')) return null; const by = regionNature(save), ks = Object.keys(by); return ks.length > 1 ? ks.reduce((a, b) => (by[b] < by[a] ? b : a)) : null; };
export const natureHave = save => { if (!(SEASON.step && SEASON.step.natureRule === 'weakest')) return natureBest(save); const v = Object.values(regionNature(save)); return v.length ? Math.min(...v) : natureBest(save); };
export function readiness(save, c) {
  // V4: the plane's range only. era and nature stay in the answer (always true) so the screens that tick them still read.
  const plane = planeReady(save, c), nb = natureHave(save);
  return { era: true, plane, nature: true, natureHave: Math.round(nb), ready: plane };
}

// The era (index) in which the next crossing you could fly opens, when it is later than yours and this release has it; else null.
export function laterEra() { return null; }   // V4: no crossing waits for an era
// The placeholder at the end of this release: you have reached the last era it covers and nothing is left to fly.
export const moreToCome = save => !save.lapDone && upcoming(save).length === 0 && !Object.keys(AREAS).every(k => unlockedAreas(save).includes(k));   // V4: nothing left to fly and the world not open   // (after the lap: finished, nothing more to come)

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
  return { capabilityKm: reachFrom(save, c), bio: k ? bestAreaBio(save, k) : 0 };   // V4: range from anywhere; no nature or mission condition (Oliver, 2026-11-23)
}

// Why a crossing is or is not OFFERED (MASTER-PLAN B4): the conditions and the rule from src/season.js.
// `ctx` gives the measured parts the game knows: capabilityKm (here: best flight from the area), bio (the area's
// biodiversity) and, once the area missions exist (M6), missionsDone. A condition whose ctx value is undefined is not asked.
export function offerCheck(c, ctx) {
  const need = { capability: ctx.capabilityKm >= SEASON.offer.distanceShare * c.km };   // V4: range only
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
  save.crossPick = null;   // (V5) the next tier picks afresh
  if (c.kind !== 'lap' && Number.isInteger(c.era)) save.crossTierLast = Math.max(save.crossTierLast ?? -1, c.era);
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
  crossingStart(save);
  return true;
}
// A HEAD START in the new region (Oliver, 2026-11-18: a home region far from the next crossing must not make the game harder; SEASON.step.crossStart): the land you landed in gets
// its first tier 1 project free (as the home land's free project), and your flights stay in that land (save.stayLand, src/aim.js) so the next nature climb starts where you are.
// Recorded as save.crossStart = { land, project } for the ending screen (src/crossingend.js).
export function crossingStart(save) {
  if (!(SEASON.step && SEASON.step.crossStart)) return null;
  const land = (city(save.city) || {}).region, P = land && REGION_DATA[land] ? REGION_DATA[land].projects : null;
  if (!P) return null;
  const done = projectsDone(save, land).map(p => p.id), p = P.find(x => x.tier === 1 && !done.includes(x.id));
  if (p && SEASON.step.crossStart !== 'stay') { save.habitat = save.habitat || {}; save.habitat[land] = [...(save.habitat[land] || []), p.id]; }   // ('stay': no free project, only the stay)
  save.stayLand = land; save.routeMode = 'explore';
  const given = p && SEASON.step.crossStart !== 'stay'; save.crossStart = { land, project: given ? p.id : null, name: given ? p.name : null };
  return save.crossStart;
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
export function ladderSplit(save) { return { higher: available(save), exception: [], easier: [] }; }   // (V4: the one on offer)   // (CROSSINGS V3: every route on offer is the next crossing, at the same difficulty)
