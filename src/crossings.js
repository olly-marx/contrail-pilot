// SEASON 2 crossings (the redesign, M3/M4; research/STORY-ANY-START.md tiers, MASTER-PLAN.md B3/B4): the only way out
// of an area. Each is ONE mission flight, non-stop, from a city of one area to the gateway of the next (either way),
// with a progress bar instead of the distance meter. Lengths are GAME km by era (src/season.js, TBD-SIM).
// era: 0 = 1950s ... 4 = 2030s (src/eras.js). kind: frontier / ocean / second (frontier) / long / boss.
import { SEASON } from './season.js';
import { AREAS, OCEAN_STONES, areaOf, unlockedAreas } from './areas.js';
import { eraProgress } from './eras.js';
import { linksOf, choices } from './network.js';
import { tourPath } from './route.js';

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
    if (c.era > era) continue;
    const [sa, sb] = sides(c);
    if (c.kind === 'boss') { if (allOthers && !(save.crossed || []).includes(c.id)) out.push({ ...c, from: c.a, to: c.b, km: crossingKm(c) }); continue; }
    if (open.has(sa) && !open.has(sb)) out.push({ ...c, from: c.a, to: c.b, opens: sb, km: crossingKm(c) });
    else if (open.has(sb) && !open.has(sa)) out.push({ ...c, from: c.b, to: c.a, opens: sa, km: crossingKm(c) });
  }
  return out;
}

// Why a crossing is or is not OFFERED (MASTER-PLAN B4): the three conditions and the rule from src/season.js.
// `ctx` gives the measured parts the game knows: capabilityKm (plane + nature), bio (this area's biodiversity),
// missionsDone (this area's contrail missions). Until those systems exist (M4/M6) the caller passes what it has.
export function offerCheck(c, ctx) {
  const need = { capability: ctx.capabilityKm >= c.km, nature: ctx.bio >= SEASON.offer.biodiversity, contrails: !!ctx.missionsDone };
  const met = Object.values(need).filter(Boolean).length;
  return { need, offered: SEASON.offer.rule === '2of3' ? met >= 2 : met === 3 };
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
