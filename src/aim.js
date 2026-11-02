// The aimed route (the user, 2026-11-02, research/ROUTE-BUGS.md: a mission said "Land at BERLIN" and the route never went
// there; routing "feels random"). While a city mission is open, the flight's path is the SHORTEST way to its city, then the
// normal tour (src/route.js continueTour). Display and route only: no random numbers, no per-flight state (everything is
// derived from the save, so a crash-retry aims the same way: the save's city does not move on a crash).
// The sim chat's hooks: ROUTE_AIM.on (an A/B switch flippable in Node) and aimTarget(save) (the SAME choice routeFor uses).
import { visible } from './missions2.js';
import { flightPath, continueTour, pathTo, wayTo, linksFor, MAX_LEGS } from './route.js';
import { choices } from './network.js';

export const ROUTE_AIM = { on: true };   // shipping state: on
export { MAX_LEGS };                     // a city mission's target is at most 3 stops away (route.js; fillFor offers only those)
// The missions that name a city, and which city they need NOW (declared, not inferred: tests/missionreach.cjs uses this list).
// chain: its first city, then (once landed there: save.prevLanded) its second. route ("fly to C without stopping") needs at
// least one airport passed on the way, so it aims at a 2-stop way when C is next door (see routeTo).
export const CITY_TEMPLATES = {
  'land-city': (f) => f.city,
  chain: (f, s) => (s.prevLanded === f.city ? f.cityB : f.city),
  rescue: (f) => f.cityB,
  route: (f) => f.cityC,
};

// The city the route aims at, or null: the FIRST open mission (MISSIONS screen order) that names a city which is not
// here and can be reached in the current network. Lessons, dailies and steady goals name no city: they never aim.
// A target in a network the player cannot reach yet (another area) is skipped: the mission waits until you are there.
export function aimTarget(save) {
  if (!ROUTE_AIM.on || !save || !save.tutorialDone || save.flyCrossing) return null;
  const L = linksFor(save);
  if (!L[save.city]) return null;
  for (const m of visible(save)) {
    const pick = m.def && CITY_TEMPLATES[m.def.id];
    if (!pick || !m.fill) continue;
    const t = pick(m.fill, save);
    if (t && t !== save.city && pathTo(save.city, t, L)) return t;
  }
  return null;
}
const templateOf = (save, target) => { for (const m of visible(save)) { const pick = m.def && CITY_TEMPLATES[m.def.id]; if (pick && m.fill && pick(m.fill, save) === target) return m.def.id; } return null; };

// The path from the save's city to `target` (then the normal tour). A heading the player CHOSE on the world map is kept: the
// first hop is theirs, the rest goes the shortest way on from there. `tid` 'route' needs >= 2 stops (one airport passed).
export function routeTo(save, target, tid = null, count = 60) {
  const L = linksFor(save), here = save.city;
  if (!ROUTE_AIM.on || !target || !L[here]) return flightPath(save, count);
  const opts = choices(here, L).map(o => o.name);
  const way = save.heading && opts.includes(save.heading) && save.heading !== target
    ? (p => p && [here, ...p])(pathTo(save.heading, target, L)) : wayTo(here, target, L, tid === 'route');   // (route.js wayTo: round when an airport must be passed)
  if (!way) return flightPath(save, count);
  return continueTour(way, count, L);
}

// What every path builder in the game uses (hub, menu, loader, GameScene, the rules): the aimed route, or today's tour.
export function routeFor(save, count = 60) {
  const t = aimTarget(save);   // (null before the tutorial is done, and for flight school's save)
  return t ? routeTo(save, t, templateOf(save, t), count) : flightPath(save, count);
}
