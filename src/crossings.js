// SEASON 2 crossings (the redesign, M3/M4; research/STORY-ANY-START.md tiers, MASTER-PLAN.md B3/B4): the only way out
// of an area. Each is ONE mission flight, non-stop, from a city of one area to the gateway of the next (either way),
// with a progress bar instead of the distance meter. Lengths are GAME km by era (src/season.js, TBD-SIM).
// era: 0 = 1950s ... 4 = 2030s (src/eras.js). kind: frontier / ocean / second (frontier) / long / boss.
import { SEASON } from './season.js';
import { AREAS, OCEAN_STONES, areaOf, unlockedAreas } from './areas.js';
import { eraProgress } from './eras.js';
import { linksOf, choices, city } from './network.js';
import { tourPath } from './route.js';
import { biodiversity } from './nature.js';
import { gateDone } from './missions2.js';

export const CROSSINGS = [
  { id: 'warsaw-stockholm', a: 'WARSAW', b: 'STOCKHOLM', era: 0, kind: 'frontier' },
  { id: 'khartoum-addis', a: 'KHARTOUM', b: 'ADDIS ABABA', era: 0, kind: 'frontier' },
  { id: 'hanoi-hongkong', a: 'HANOI', b: 'HONG KONG', era: 0, kind: 'frontier' },
  { id: 'jakarta-darwin', a: 'JAKARTA', b: 'DARWIN', era: 0, kind: 'frontier' },
  { id: 'mexico-panama', a: 'MEXICO CITY', b: 'PANAMA', era: 0, kind: 'frontier' },
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
  { id: 'final', a: 'AUCKLAND', b: 'SANTIAGO', era: 4, kind: 'boss' },
];
export const crossingById = id => CROSSINGS.find(c => c.id === id);
export const crossingKm = c => (c.kind === 'boss' ? SEASON.crossingKm.final : SEASON.crossingKm[c.era + 1]);
// The two areas a crossing joins ('ocean' for Honolulu/Nadi, which belong to no area).
export const sides = c => [areaOf(c.a) || 'ocean', areaOf(c.b) || 'ocean'];

// The crossings you could fly now, from your unlocked areas: one end open, the other not; its era reached. The boss only
// when every other area is open (it closes the circle, from any start). Each comes with the direction to fly it.
export function available(save) {
  const open = new Set(unlockedAreas(save)), era = eraProgress(save).index;
  if ((save.areas || []).includes('ocean')) open.add('ocean');
  const allOthers = Object.keys(AREAS).every(k => open.has(k));
  const out = [];
  for (const c of CROSSINGS) {
    if (c.era > era || c.era > SEASON.maxEra) continue;   // (maxEra: 0.12.0 ends after the 1990s crossings)
    const [sa, sb] = sides(c);
    if (c.kind === 'boss') { if (allOthers && !(save.crossed || []).includes(c.id)) out.push({ ...c, from: c.a, to: c.b, km: crossingKm(c) }); continue; }
    if (open.has(sa) && !open.has(sb)) out.push({ ...c, from: c.a, to: c.b, opens: sb, km: crossingKm(c) });
    else if (open.has(sb) && !open.has(sa)) out.push({ ...c, from: c.b, to: c.a, opens: sa, km: crossingKm(c) });
  }
  return out;
}

// The era (index) in which the next crossing you could fly opens, when it is later than yours and this release has it; else null.
export function laterEra(save) {
  const open = new Set(unlockedAreas(save)), era = eraProgress(save).index;
  if ((save.areas || []).includes('ocean')) open.add('ocean');
  let best = null;
  for (const c of CROSSINGS) {
    if (c.kind === 'boss' || c.era <= era || c.era > SEASON.maxEra) continue;
    const [sa, sb] = sides(c);
    if (open.has(sa) !== open.has(sb) && (best === null || c.era < best)) best = c.era;
  }
  return best;
}
// The placeholder at the end of this release: you have reached the last era it covers and nothing is left to fly.
export const moreToCome = save => eraProgress(save).index >= SEASON.maxEra && available(save).length === 0;

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
  const k = areaOf(c.from), home = k && city(AREAS[k].start);
  // missionsDone (S3): the area's crossing trial, its 3 starred missions (src/missions2.js), done in THIS area.
  return { capabilityKm: (save.areaBest || {})[k] || 0, bio: home ? biodiversity(save, home.region) : 0, missionsDone: k ? gateDone(save, k) : false };
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

// Landing a crossing: the area on the far side opens (and the ocean stepping stones count as 'ocean').
export function completeCrossing(save, c) {
  save.crossed = [...new Set([...(save.crossed || []), c.id])];
  const [sa, sb] = sides(c), open = new Set(save.areas || []);
  for (const s of [sa, sb]) open.add(s);
  save.areas = [...open];   // (the rules already moved save.city to where you landed)
}

// The path of a crossing flight: departure, the gateway, then on through the area it opens (the world-tour rule), so
// flying past the gateway carries on there. Landing anywhere after the departure opens that area (completeCrossing).
export function crossingPath(c, count = 60) {
  const k = areaOf(c.to), there = k ? AREAS[k].cities : OCEAN_STONES;   // the boss lands in an open area: fly on there
  const L = linksOf([...new Set([c.to, ...there])]), way = choices(c.to, L)[0];
  return [c.from, ...(way ? tourPath(c.to, way.name, count, L) : [c.to])];
}
