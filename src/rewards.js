// Rewards beyond the seeds you carry: missions, challenges, new cities and laps of the world.
// payRewards() runs once when a flight ends (not flight school) and adds seeds + ice crystals to
// the save; the results screen lists what it paid. Kid wording; numbers tuned against hangar
// prices (a level costs 5-70 seeds and 1-5 crystals).
import { ROUTE } from './route.js';

// Mission i (0-based, in MISSIONS order) pays more as they get harder.
export const missionReward = i => ({ seeds: 15 + 20 * i, crystals: 1 + 2 * i });
export const NEW_CITY = { seeds: 15, crystals: 1 };
export const LAP = { seeds: 300, crystals: 25 };
export const ACTIVE_CHALLENGES = 3;

// `can(save)`: only offered when it is possible with what you own. `check(r)`: the flight result.
export const CHALLENGES = [
  { id: 'land-cooler', text: 'Land with the Earth cooler than at take-off', seeds: 30, crystals: 2, check: r => r.landed && r.heat < 0 },
  { id: 'dodge-3', text: 'Dodge icy air 3 times at night', seeds: 20, crystals: 3, check: r => r.dodges >= 3 },
  { id: 'shade-15', text: 'Make 15 shade in one flight', seeds: 25, crystals: 2, check: r => r.sunBlocked >= 15 },
  { id: 'pass-1', text: 'Fly past an airport, then land', seeds: 30, crystals: 1, check: r => r.landed && r.airportsSkipped >= 1 },
  { id: 'pass-2', text: 'Fly past 2 airports, then land', seeds: 50, crystals: 2, check: r => r.landed && r.airportsSkipped >= 2 },
  { id: 'seeds-8', text: 'Land with 8 seeds on board', seeds: 25, crystals: 1, check: r => r.landed && r.cargo >= 8 },
  { id: 'seeds-15', text: 'Land with 15 seeds on board', seeds: 45, crystals: 2, check: r => r.landed && r.cargo >= 15 },
  { id: 'crystals-3', text: 'Earn 3 ice crystals in one flight', seeds: 15, crystals: 2, check: r => r.crystals >= 3 },
  { id: 'plant-2', text: 'Plant 2 trees in one flight', seeds: 20, crystals: 1, can: s => (s.levels || {}).trees > 0, check: r => r.planted >= 2 },
  { id: 'kinds-2', text: 'Plant 2 different kinds of tree', seeds: 30, crystals: 2, can: s => (s.levels || {}).species > 0, check: r => r.kinds >= 2 },
  { id: 'far-2000', text: 'Fly 2000 km and land', seeds: 25, crystals: 1, check: r => r.landed && r.distance >= 2000 },
  { id: 'far-4000', text: 'Fly 4000 km and land', seeds: 50, crystals: 2, check: r => r.landed && r.distance >= 4000 },
  { id: 'night-owl', text: 'Fly a whole night with no contrail', seeds: 30, crystals: 3, check: r => r.nightOwl },
  { id: 'no-trap', text: 'Land without trapping any heat', seeds: 25, crystals: 2, check: r => r.landed && r.heatTrapped < 0.5 },
  { id: 'day-and-night', text: 'Make 5 shade AND dodge icy air at night', seeds: 30, crystals: 2, check: r => r.sunBlocked >= 5 && r.dodges >= 1 },
  { id: 'cool-landing', text: 'Land with the Earth bar under half', seeds: 20, crystals: 1, check: r => r.landed && r.heat < 50 },
];
const byId = id => CHALLENGES.find(c => c.id === id);

// Keep 3 active challenges, never two the same, only ones you can do. Random fill.
export function fillChallenges(save, rand = Math.random) {
  const active = (save.challenges || []).filter(id => byId(id));
  const pool = CHALLENGES.filter(c => !active.includes(c.id) && (!c.can || c.can(save)));
  while (active.length < ACTIVE_CHALLENGES && pool.length) active.push(pool.splice(Math.floor(rand() * pool.length), 1)[0].id);
  save.challenges = active;
  return active.map(byId);
}
export const activeChallenges = save => fillChallenges(save);

// Pay everything this flight earned. `missionIndex` is the mission just completed, or null.
// Returns [{ kind, label, seeds, crystals }] for the results screen.
export function payRewards(save, r, missionIndex, missionTitle) {
  const paid = [];
  const pay = (kind, label, x) => { save.seeds += x.seeds; save.crystals = (save.crystals || 0) + x.crystals; paid.push({ kind, label, seeds: x.seeds, crystals: x.crystals }); };
  if (missionIndex !== null && missionIndex !== undefined) pay('mission', missionTitle, missionReward(missionIndex));
  for (const c of fillChallenges(save)) {
    if (c.check(r)) { pay('challenge', c.text, c); save.challenges = save.challenges.filter(id => id !== c.id); }
  }
  fillChallenges(save);
  if (r.landed && r.landedAt) {
    save.visited = save.visited || [];
    if (!save.visited.includes(r.landedAt)) { save.visited.push(r.landedAt); pay('city', `New city: ${r.landedAt}`, NEW_CITY); }
  }
  if (r.lap) pay('lap', 'ROUND THE WORLD! Back in LONDON', LAP);
  return paid;
}
export const CITY_COUNT = ROUTE.length;
