// The journey (the user, 2026-10-22: ~100 cities, any direction). You take off from the city you last
// landed in (save.city, a NAME) and choose one of three directions (save.heading: the first city that
// way; network.js choices()). The flight's whole path then follows the WORLD TOUR rule: keep going
// roughly the same way, to cities not yet seen on this flight, the hard-to-reach ones first, so a
// long enough flight would see every city before repeating one (tourPath). Legs are balanced game
// lengths, not real ones (network.js legGameKm: 1,800-2,600 game km).
import { CITIES } from './cities.js';
import { LINKS, city, bearing, choices, legGameKm, linksOf } from './network.js';
import { SEASON2_ON } from './cities.js';
import { AREAS, unlockedAreas, citiesOf } from './areas.js';
import { realKm } from './geo.js';
export { realKm };

export const ROUTE = CITIES;   // every airport (name, lat, lon, region)
export const cityIndex = name => CITIES.findIndex(c => c.name === name);
// The first flights and flight school: LONDON towards PARIS (the old first leg).
export const HOME = 'LONDON', FIRST_HOP = 'PARIS';
// One trip round the Earth (its real size): "times round the Earth" counts flownKm against it.
export const EARTH_KM = 40075;
// The old 16-city loop was 32,060 game km: the non-stop badge (badges.js) keeps that distance.
export const LAP_KM = 32060;

const WORLD = LINKS;
const gap = (x, y) => { const d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; };
const turn = (p, c, n) => gap(bearing(city(c), city(n)), (bearing(city(c), city(p)) + 180) % 360);
// The first step on the shortest (fewest airports) way from c to the nearest city not in `seen`.
function toward(c, seen, LINKS) {
  const prev = { [c]: null }, q = [c];
  while (q.length) {
    const x = q.shift();
    if (!seen.has(x)) { let s = x; while (prev[s] !== c) s = prev[s]; return s; }
    for (const n of LINKS[x]) if (!(n in prev)) { prev[n] = x; q.push(n); }
  }
  return LINKS[c][0];
}
// The path of a flight from `start` whose first hop is `first`: `count` cities after the start.
// Next city: among neighbours not yet seen this flight, the one that turns least, counting a city with
// few unseen neighbours as better (it would be hard to come back for: Warnsdorff's rule). Measured
// 2026-10-22: every city seen in a median of 108 legs (104 cities), against 127 for "turn least" alone.
// Once the whole world has been seen, the tour starts again.
export function tourPath(start, first, count = 60, LINKS = WORLD) {
  const path = [start, first];
  let seen = new Set(path);
  while (path.length < count + 1) {
    if (seen.size >= Object.keys(LINKS).length) seen = new Set([path[path.length - 1]]);
    const p = path[path.length - 2], c = path[path.length - 1], fresh = LINKS[c].filter(n => !seen.has(n));
    const next = fresh.length
      ? fresh.map(n => ({ n, s: turn(p, c, n) / 45 + 2 * LINKS[n].filter(m => !seen.has(m)).length })).sort((a, b) => a.s - b.s)[0].n
      : toward(c, seen, LINKS);
    path.push(next); seen.add(next);
  }
  return path;
}
// The flight from a save: where you are and the direction you chose (a valid one, or the first offered).
export function flightPath(save, count = 60) {
  const LINKS = linksFor(save);
  const name = typeof save.city === 'number' ? OLD_LOOP[save.city] : save.city;   // (a save not migrated yet)
  const here = city(name) && LINKS[name] ? name : SEASON2_ON ? AREAS[unlockedAreas(save)[0]].start : HOME;
  const opts = choices(here, LINKS).map(o => o.name);
  const first = here === HOME && !save.tutorialDone ? FIRST_HOP : opts.includes(save.heading) ? save.heading : opts[0];
  return tourPath(here, first, count, LINKS);
}
// The network a save flies in: the world, or (season 2) only its unlocked areas.
export const linksFor = save => (SEASON2_ON ? linksOf(citiesOf(unlockedAreas(save))) : WORLD);
// Game km of the leg from city a to city b (names).
export const legBetween = (a, b) => legGameKm(realKm(city(a), city(b)));
export { city, choices };

// Saves from before 2026-10-22: save.city was an index into the old 16-city loop.
export const OLD_LOOP = ['LONDON', 'PARIS', 'BERLIN', 'ROME', 'ATHENS', 'CAIRO', 'DUBAI', 'DELHI', 'BANGKOK', 'BEIJING', 'TOKYO',
  'ANCHORAGE', 'VANCOUVER', 'CHICAGO', 'NEW YORK', 'REYKJAVIK'];
export function migrateCity(save) {
  let changed = false;
  if (typeof save.city === 'number') { save.city = OLD_LOOP[save.city] || HOME; changed = true; }
  if (!save.city) { save.city = HOME; changed = true; }
  if (!save.flownKm && save.laps) { save.flownKm = save.laps * LAP_KM; changed = true; }   // (0 comes from the defaults)
  return changed;
}
