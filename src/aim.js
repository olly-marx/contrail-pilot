// The aimed route (the user, 2026-11-02, research/ROUTE-BUGS.md: a mission said "Land at BERLIN" and the route never went
// there; routing "feels random"). While a city mission is open, the flight's path is the SHORTEST way to its city, then the
// normal tour (src/route.js continueTour). Display and route only: no random numbers, no per-flight state (everything is
// derived from the save, so a crash-retry aims the same way: the save's city does not move on a crash).
// The sim chat's hooks: ROUTE_AIM.on (an A/B switch flippable in Node) and aimTarget(save) (the SAME choice routeFor uses).
import { visible } from './missions2.js';
import { flightPath, continueTour, pathTo, wayTo, linksFor, MAX_LEGS } from './route.js';
import { choices } from './network.js';
import { DEFAULT_DEST, defaultChain, defaultTargetFrom } from './destination.js';
import { SEASON2_ON } from './cities.js';

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

// The city the mission asks for (aimOpen), or null: the FIRST open mission (MISSIONS screen order) that names a city which is not
// here and can be reached in the current network. Lessons, dailies and steady goals name no city: they never aim.
// A target in a network the player cannot reach yet (another area) is skipped: the mission waits until you are there.
// GO TO (CROSSINGS V2 step 3, research/DESIGN-CROSSINGS-V2.md): a standing aim at a city the PLAYER chose (save.aimCity, e.g. a crossing's departure airport). It is the same aimed route as a mission's
// (the shortest way over the open network, then the normal tour; no stop limit: pathTo is a plain shortest path and MAX_LEGS belongs to the mission offer code only), so the player still flies
// THROUGH the hops and lands where an ordinary flight lands. It survives landings and is cleared on arrival (arrivedGoto, called where HOME is drawn) or by the player (clearGoto).
// The 'skip the mission route this trip' button does not drop it: the player chose it.
const gotoLive = save => !!(ROUTE_AIM.on && save && save.tutorialDone && !save.flyCrossing);
export const gotoTarget = (save, L = null) => {
  if (!gotoLive(save) || !save.aimCity || save.aimCity === save.city) return null;
  const links = L || linksFor(save);
  return links[save.city] && pathTo(save.city, save.aimCity, links) ? save.aimCity : null;
};
export const gotoHops = save => { const t = gotoTarget(save); return t ? pathTo(save.city, t, linksFor(save)).length - 1 : 0; };
export const setGoto = (save, city) => { save.aimCity = city; return save.aimCity; };
export const clearGoto = save => { delete save.aimCity; };
export const arrivedGoto = save => { if (save && save.aimCity && save.aimCity === save.city) { delete save.aimCity; return true; } return false; };
export function aimOpen(save) {
  if (!ROUTE_AIM.on || !save || !save.tutorialDone || save.flyCrossing) return null;
  const L = linksFor(save);
  if (!L[save.city]) return null;
  const g = gotoTarget(save, L); if (g) return g;   // the player's GO TO first
  // The player's own choice first (R4: 'AIM HERE' on the MISSIONS screen sets save.aimKey to a mission key), then the first open city mission.
  const list = visible(save), chosen = save.aimKey && list.find(m => m.key === save.aimKey);
  for (const m of chosen ? [chosen, ...list.filter(x => x !== chosen)] : list) {
    const pick = m.def && CITY_TEMPLATES[m.def.id];
    if (!pick || !m.fill) continue;
    const t = pick(m.fill, save);
    if (t && t !== save.city && pathTo(save.city, t, L)) return t;
  }
  return null;
}
// The per-trip choice (the sim chat's spec, research/BALANCE-AIMED-ROUTE.md; the Coordinator, 2026-11-02): 'Skip the mission route this trip'
// flies the normal tour while the mission stays OPEN. save.skipAim is kept by a crash and cleared by the next landing (rules.js, beside
// save.heading), so aimTarget is aimOpen unless the player skipped. The button words are data (tests/textbudget2.cjs: <= 29 chars at 320).
export const SKIP_TEXT = { skip: 'Skip mission route this trip', undo: 'Mission route skipped: undo' };
export const aimTarget = save => (save && save.skipAim ? gotoTarget(save) : aimOpen(save));
export const toggleSkip = save => { save.skipAim = !save.skipAim; return save.skipAim; };
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
  return SEASON2_ON && save.tutorialDone && DEFAULT_DEST.on ? defaultChain(L, save.visited, count, pathTo, way, (p, n) => continueTour(p, n, L)) : continueTour(way, count, L);   // (after an aimed way, the default destination chain: src/destination.js)
}

// What every path builder in the game uses (hub, menu, loader, GameScene, the rules): the aimed route, or today's tour.
export function routeFor(save, count = 60) {
  const t = aimTarget(save);   // (null before the tutorial is done, and for flight school's save)
  return t ? routeTo(save, t, templateOf(save, t), count) : flightPath(save, count);
}
