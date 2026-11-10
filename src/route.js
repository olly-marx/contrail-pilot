// The journey (the user, 2026-10-22: ~100 cities, any direction). You take off from the city you last
// landed in (save.city, a NAME) and choose one of three directions (save.heading: the first city that
// way; network.js choices()). The flight's whole path then follows the WORLD TOUR rule: keep going
// roughly the same way, to cities not yet seen on this flight, the hard-to-reach ones first, so a
// long enough flight would see every city before repeating one (tourPath). Legs are balanced game
// lengths, not real ones (network.js legGameKm: 1,800-2,600 game km).
import { CITIES } from './cities.js';
import { LINKS, city, bearing, choices, legGameKm, linksOf } from './network.js';
import { SEASON2_ON, CROSSING_BRIDGES } from './cities.js';
import { AREAS, unlockedAreas, citiesOf } from './areas.js';
import { realKm } from './geo.js';
export { realKm };

export const ROUTE = CITIES;   // every airport (name, lat, lon, region)
export const cityIndex = name => CITIES.findIndex(c => c.name === name);
// The first flights and flight school: LONDON towards PARIS (the old first leg).
export const HOME = 'LONDON', FIRST_HOP = 'PARIS';
// What flight school and the first flights are flown FROM: classic = LONDON (towards PARIS); season 2 = the player's own save
// (the city and area chosen in src/startchoice.js, so a start in Africa is taught over Africa, not London > Paris).
export const schoolSave = save => (SEASON2_ON ? save : { city: HOME });
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
export function tourPath(start, first, count = 60, LINKS = WORLD) { return continueTour([start, first], count, LINKS); }
// The tour rule above, continued from a path already flown (the aimed route, src/aim.js: the shortest way to a mission's
// city, THEN the normal tour from there). tourPath(start, first) === continueTour([start, first]).
export function continueTour(start, count = 60, LINKS = WORLD) {
  const path = [...start];
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
// The shortest way (fewest airports) from `a` to `b` in a network: [a, ..., b], or null if b cannot be reached from a.
// Ties: the order of LINKS (deterministic; no random numbers).
export function pathTo(a, b, LINKS = WORLD) {
  if (a === b) return [a];
  const prev = { [a]: null }, q = [a];
  while (q.length) {
    const x = q.shift();
    for (const n of LINKS[x] || []) if (!(n in prev)) { prev[n] = x; if (n === b) { const out = [b]; let s = b; while (prev[s] !== null) { s = prev[s]; out.unshift(s); } return out; } q.push(n); }
  }
  return null;
}
// A city mission's city is at most this many stops away on the route (src/aim.js aims there; src/missions2.js fillFor only
// offers cities within it: the guarantee, research/ROUTE-BUGS.md).
export const MAX_LEGS = 3;
// The way the aimed route takes from `here` to `target`: the shortest; but when an airport must be PASSED on the way (a
// "fly to C without stopping" mission) and C is next door, the shortest way round that does not use the direct link.
export function wayTo(here, target, LINKS = WORLD, needPass = false) {
  const way = pathTo(here, target, LINKS);
  if (!needPass || !way || way.length !== 2) return way;
  const round = pathTo(here, target, { ...LINKS, [here]: (LINKS[here] || []).filter(n => n !== target) });
  return round && round.length - 1 <= MAX_LEGS ? round : way;
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
export const linksFor = save => (SEASON2_ON ? linksOf(citiesOf(unlockedAreas(save)), ((save && save.crossed) || []).flatMap(id => CROSSING_BRIDGES[id] || [])) : WORLD);   // (a flown crossing can add a bridge: cities.js CROSSING_BRIDGES)
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
