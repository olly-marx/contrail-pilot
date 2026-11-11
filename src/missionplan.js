// Which city each CITY mission names (the harder city missions, release A; research MISSIONS-HARDER-SPEC.md 1.1 to 1.5 and BLOCK1-PLAYABILITY-NUMBERS.md), and what a planting mission NEEDS (the asterisk).
// Pure: no DOM, no clock, no random numbers (ties by list order). The rules, by template id (the ids stay, so old save.missionsDone keys stay valid):
//   land-city  tier 1  the nearest UNVISITED city that is at least 2 stops away (visited ones after them); fallback: at least 1 stop
//   chain      tier 2  three legs A, B, C: A at least 2 stops from the start, B at least 2 from A, C at least 2 from B; a revisit is allowed, never the city just left
//   route      tier 3  the STRETCH where the area's own network offers 3+ stops: the candidate with the longest route that is at most 0.90 x reach and at least 3 stops;
//                      floor: the FARTHEST candidate (at least 2 stops); no reach information: 3 stops. In a small area (SMALL_AREAS) with no other area open, `route` stays 'Nonstop to <CITY>'.
//   rescue     tier 2  unchanged rule (frozen once shown); the planting needs get the asterisk
// Candidates: any city of an OPENED area, never the home city, never the city the leg starts from.
// STORED: the first time a city mission is shown its cities are written to save.missionCities[key] and never change until the mission is done (fixed until completed). A save
// WITHOUT save.missionCities is an old one: the cities it shows today are stored as they are (rule 'old'), nothing changes under the player; missions shown later use the new rules.
import { AREAS, unlockedAreas, citiesOf } from './areas.js';
import { linksFor, pathTo, legBetween } from './route.js';
import { capFor } from './capability.js';
import { LINES } from './upgrades.js';

// DECLARED, not inferred: the areas whose OWN network offers fewer than 3 stops (the sim chat's M-CITY v3: Oceania 2, East Asia 2, Patagonia 1). Used only while that area is the only one open.
// TODO-SIM: the sim chat to confirm the table (and that no other starter area is small).
export const SMALL_AREAS = { oceania: 2, easia: 2, patagonia: 1 };
export const CITY_IDS = ['land-city', 'chain', 'rescue', 'route'];

export const stopsOf = (L, a, b) => {
  if (!a || !b || a === b || !L[a] || !L[b]) return Infinity;
  const w = pathTo(a, b, L);
  return w ? w.length - 1 : Infinity;
};
export const routeKm = (L, a, b) => {
  const w = pathTo(a, b, L);
  if (!w) return Infinity;
  let km = 0;
  for (let i = 0; i + 1 < w.length; i++) km += legBetween(w[i], w[i + 1]);
  return km;
};
export function candidates(save, from, exclude = []) {
  const open = unlockedAreas(save), home = save.homeCity || (AREAS[open[0]] || {}).start;
  return [...new Set(citiesOf(open))].filter(c => c !== from && c !== home && !exclude.includes(c));
}
// The nearest candidate with at least `min` stops from `from`; unvisited before visited, then fewer stops, then list order.
export function nearestWith(save, L, from, min, exclude = []) {
  const seen = new Set(save.visited || []);
  const list = candidates(save, from, exclude).map((c, i) => ({ c, i, n: stopsOf(L, from, c), v: seen.has(c) ? 1 : 0 })).filter(x => Number.isFinite(x.n) && x.n >= min);
  list.sort((p, q) => p.v - q.v || p.n - q.n || p.i - q.i);
  return list.length ? list[0].c : null;
}
export const farCity = (save, L, from, exclude = []) => nearestWith(save, L, from, 2, exclude) || nearestWith(save, L, from, 1, exclude);

export function chain3(save, L, from) {
  const A = farCity(save, L, from); if (!A) return null;
  const B = farCity(save, L, A, [A]); if (!B) return null;
  const C = farCity(save, L, B, [B]); if (!C) return null;
  return { city: A, cityB: B, cityC: C };
}

export const stretchOK = (save, a) => !(unlockedAreas(save).length === 1 && Object.prototype.hasOwnProperty.call(SMALL_AREAS, a));
export function stretchFor(save, L, from, a) {
  const reach = Math.max(capFor(save, a) || 0, save.bestDistance || 0), cap = 0.9 * reach;
  const list = candidates(save, from).map((c, i) => ({ c, i, n: stopsOf(L, from, c) })).filter(x => Number.isFinite(x.n) && x.n >= 2);
  if (!list.length) return null;
  for (const x of list) x.km = routeKm(L, from, x.c);
  let pick = null;
  if (reach > 0) { const within = list.filter(x => x.n >= 3 && x.km <= cap); if (within.length) pick = within.slice().sort((p, q) => q.km - p.km || p.i - q.i)[0]; }
  else pick = list.filter(x => x.n === 3).sort((p, q) => p.i - q.i)[0] || null;   // no reach information: 3 stops
  if (!pick) pick = list.slice().sort((p, q) => q.n - p.n || p.i - q.i)[0];        // the floor: the farthest candidate
  return { city: pick.c, stops: pick.n, km: pick.km };
}

// The overrides for one city template: what the NEW rules name from this start, or null when they name nothing (then the old fill stands).
export function newRule(save, a, startCity, id) {
  const L = linksFor(save);
  if (id === 'land-city') { const c = farCity(save, L, startCity); return c ? { city: c } : null; }
  if (id === 'chain') return chain3(save, L, startCity);
  if (id === 'route') { if (!stretchOK(save, a)) return null; const s = stretchFor(save, L, startCity, a); return s ? { cityC: s.city, stretch: { stops: s.stops, km: s.km } } : null; }
  return null;   // rescue: the old rule, frozen by oldRule
}
// What today's fill names for this template (the city the player sees now); frozen for old saves and where the new rule names nothing.
export function oldRule(id, f) {
  if (id === 'land-city') return { city: f.city };
  if (id === 'chain') return { city: f.city, cityB: f.cityB };
  if (id === 'rescue') return { cityB: f.cityB };
  if (id === 'route') return { cityC: f.cityC };
  return {};
}
// The entry to STORE for a template shown for the first time: { ...overrides, rule: 'new' | 'old', from, at }.
export function entryFor(save, a, startCity, id, f, legacy) {
  const nw = legacy ? null : newRule(save, a, startCity, id);
  return { ...(nw || oldRule(id, f)), rule: nw ? 'new' : 'old', from: startCity, at: save.flights || 0 };
}
// The fill of ONE city mission: the stored entry if there is one, else what the rules name now (not stored: visible() stays pure).
export function ownFill(save, a, startCity, id, f, key) {
  const st = (save.missionCities || {})[key];
  let own;
  if (st) { const { rule, from, at, ...o } = st; own = { ...f, ...o, rule }; }
  else { const nw = newRule(save, a, startCity, id); own = nw ? { ...f, ...nw, rule: 'new' } : { ...f, ...oldRule(id, f), rule: 'old' }; }
  own.key = key;
  if (id === 'chain') own.progress = Math.min(2, (save.missionProgress || {})[key] || 0);
  return own;
}

// ---------- the asterisk: what a planting mission needs ----------
// Tree Planting is the only purchase that gates a mission (src/upgrades.js 'trees': parcels per flight 2, 3, 4, 6 at levels 1 to 4).
export const levelForParcels = n => {
  const lv = (LINES.find(l => l.id === 'trees') || { levels: [] }).levels, i = lv.findIndex(x => (x.parcels || 0) >= n);
  return i < 0 ? lv.length : i + 1;
};
const PARCELS_ASKED = { 'plant-tree': () => 1, rescue: f => 2 * f.k, kinds3: f => f.kinds, 'd-plant': f => f.k + 1 };
// null when the player can do it; else { line, level, parcels, name, text, tab } (text: at most 20 characters, the row's how-line).
export function needsOf(id, f, save) {
  const ask = PARCELS_ASKED[id], line = LINES.find(l => l.id === 'trees');
  if (!ask || !line) return null;
  const lv = levelForParcels(ask(f));
  if (((save.levels || {}).trees || 0) >= lv) return null;
  const L = line.levels[lv - 1];
  return { line: 'trees', level: lv, parcels: L.parcels, name: L.name, text: `Needs ${L.parcels} parcels`, tab: 'nature' };
}
