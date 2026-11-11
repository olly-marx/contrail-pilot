// The aimed route (the user, 2026-11-02, research/ROUTE-BUGS.md: a mission said "Land at BERLIN" and the route never went
// there; routing "feels random"). While a city mission is open, the flight's path is the SHORTEST way to its city, then the
// normal tour (src/route.js continueTour). Display and route only: no random numbers, no per-flight state (everything is
// derived from the save, so a crash-retry aims the same way: the save's city does not move on a crash).
// The sim chat's hooks: ROUTE_AIM.on (an A/B switch flippable in Node) and aimTarget(save) (the SAME choice routeFor uses).
import { visible } from './missions2.js';
import { flightPath, continueTour, pathTo, wayTo, linksFor, MAX_LEGS } from './route.js';
import { choices, city as cityOf } from './network.js';
import { DEFAULT_DEST, defaultChain, defaultTargetFrom, nearestUnvisited } from './destination.js';
import { SEASON2_ON } from './cities.js';

export const ROUTE_AIM = { on: true };   // shipping state: on
export { MAX_LEGS };                     // a city mission's target is at most 3 stops away (route.js; fillFor offers only those)
// The missions that name a city, and which city they need NOW (declared, not inferred: tests/missionreach.cjs uses this list).
// chain: its first city, then (once landed there: save.prevLanded) its second. route ("fly to C without stopping") needs at
// least one airport passed on the way, so it aims at a 2-stop way when C is next door (see routeTo).
export const CITY_TEMPLATES = {
  'land-city': (f) => f.city,
  // chain: the NEXT leg of three (src/missionplan.js; progress = save.missionProgress[key]); an old two-city chain (rule 'old') keeps save.prevLanded.
  chain: (f, s) => (f.rule === 'old' || !f.cityC ? (s.prevLanded === f.city ? f.cityB : f.city) : [f.city, f.cityB, f.cityC][Math.min(2, (s.missionProgress || {})[f.key] || 0)]),
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
// ROUTE DEFAULT = THE ACTIVE MISSION UNLESS EXPLORE IS CHOSEN (research/ROUTE-DEFAULT-MISSION-PLAN.md; the user, 2026-11-10). The flight's steer, in this order:
//   1. 'chosen'  the destination the player set (save.aimCity: GO TO, a tapped city, a mission's GO THERE);
//   2. 'mission' the ACTIVE city mission's city: the FIRST open city mission in the MISSIONS screen's order (activeMission), unless the player chose EXPLORE (save.routeMode);
//   3. 'explore' / 'nearest' the nearest unvisited city (src/destination.js): in EXPLORE mode (restricted to one land by save.stayLand, EXPLORE HERE on NATURE), or when no city mission is open.
// It is VISIBLE (the chip says 'Mission: PARIS' / 'Explore: AMSTERDAM' / 'Next: AMSTERDAM', the FLY TO sheet says MISSION / EXPLORING / NEXT) and ONE switch (save.routeMode), not the hidden aimKey plus a skip chip that 0.48.0 retired.
// STEER.mission = false is the sim's A/B switch: exactly 0.48.0 (only a chosen destination steers).
export const STEER = { mission: true };
export const routeMode = save => (save && save.routeMode === 'explore' ? 'explore' : 'mission');
export function activeMission(save) {
  if (!ROUTE_AIM.on || !save || !save.tutorialDone || save.flyCrossing) return null;
  const L = linksFor(save); if (!L[save.city]) return null;
  for (const m of visible(save)) {
    const pick = m.def && CITY_TEMPLATES[m.def.id]; if (!pick || !m.fill) continue;
    const t = pick(m.fill, save);
    if (t && t !== save.city && pathTo(save.city, t, L)) return { city: t, mission: m };
  }
  return null;
}
const landOf = name => { const c = cityOf(name); return c ? c.region : null; };
// Cities of a land that are open, reachable and not visited yet (EXPLORE HERE counts them; 'Done here' when none).
export const stayLandLeft = (save, land = save && save.stayLand) => { if (!save || !land) return 0; const L = linksFor(save); if (!L[save.city]) return 0; const seen = new Set([...(save.visited || []), save.city]); return Object.keys(L).filter(c => landOf(c) === land && !seen.has(c) && pathTo(save.city, c, L)).length; };
export function steerOf(save) {
  const none = { city: null, why: null };
  if (!save || !save.tutorialDone || save.flyCrossing) return none;
  const L = linksFor(save); if (!L[save.city]) return none;
  const g = gotoTarget(save, L); if (g) return { city: g, why: 'chosen' };
  const mode = routeMode(save);
  if (STEER.mission && mode === 'mission') { const a = activeMission(save); if (a) return { city: a.city, why: 'mission', mission: a.mission }; }
  const seen = new Set([...(save.visited || []), save.city]);
  if (mode === 'explore' && save.stayLand) { const t = nearestUnvisited(L, save.city, seen, c => landOf(c) === save.stayLand); if (t) return { city: t, why: 'explore', land: save.stayLand }; }
  const t = nearestUnvisited(L, save.city, seen);
  return t ? { city: t, why: mode === 'explore' ? 'explore' : 'nearest' } : none;
}
export function aimOpen(save) {
  if (!ROUTE_AIM.on || !save || !save.tutorialDone || save.flyCrossing) return null;
  const L = linksFor(save);
  if (!L[save.city]) return null;
  const g = gotoTarget(save, L); if (g) return g;   // the player's GO TO first
  // The first open city mission (ROUTING V2 step 3: this NO LONGER steers a flight; the player taps GO THERE on a mission row, which sets save.aimCity; aimOpen only says which city the first open mission names).
  const list = visible(save);
  for (const m of list) {
    const pick = m.def && CITY_TEMPLATES[m.def.id];
    if (!pick || !m.fill) continue;
    const t = pick(m.fill, save);
    if (t && t !== save.city && pathTo(save.city, t, L)) return t;
  }
  return null;
}
// ROUTING V2 step 3 (2026-11-10): the silent mission aim and the per-trip skip are RETIRED. A flight is steered only by a destination the player chose (save.aimCity: GO TO, a mission's GO THERE, a tapped city) or, with none, by the default destination
// (src/destination.js). The aim of a flight is therefore exactly the player's GO TO.
export const aimTarget = save => gotoTarget(save);
// Old saves: an 'AIM HERE' choice (save.aimKey) becomes a standing destination if its mission still names a city and nothing else is set; the per-trip skip (save.skipAim) is dropped. Idempotent.
export function migrateAim(save) {
  if (!save || typeof save !== 'object') return false;
  const had = 'aimKey' in save || 'skipAim' in save;
  if (save.aimKey && !save.aimCity) { const m = visible(save).find(x => x.key === save.aimKey), pick = m && m.def && CITY_TEMPLATES[m.def.id], c = pick && m.fill ? pick(m.fill, save) : null; if (c && c !== save.city) save.aimCity = c; }
  delete save.aimKey; delete save.skipAim;
  return had;
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
  return SEASON2_ON && save.tutorialDone && DEFAULT_DEST.on ? defaultChain(L, save.visited, count, pathTo, way, (p, n) => continueTour(p, n, L)) : continueTour(way, count, L);   // (after an aimed way, the default destination chain: src/destination.js)
}

// What every path builder in the game uses (hub, menu, loader, GameScene, the rules): the aimed route, or today's tour.
export function routeFor(save, count = 60) {
  const st = STEER.mission ? steerOf(save) : (t => ({ city: t, why: t ? 'chosen' : null }))(aimTarget(save));   // (null before the tutorial is done, and for flight school's save)
  if (st.city && (st.why === 'chosen' || st.why === 'mission' || (st.why === 'explore' && st.land))) return routeTo(save, st.city, templateOf(save, st.city), count);
  return flightPath(save, count);
}
