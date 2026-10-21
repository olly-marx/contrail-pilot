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

// Stages, from how many upgrade levels you own (53 in all): each has its own challenges, and you
// are offered ones from your stage and the stage below. Prizes grow with the stage.
export const STAGES = [
  { at: 0, name: 'Learner' }, { at: 5, name: 'Cleaner plane' }, { at: 15, name: 'Long haul' },
  { at: 30, name: 'Nature builder' }, { at: 45, name: 'Round the world' },
];
export const stageOf = save => { const n = Object.values(save.levels || {}).reduce((a, x) => a + x, 0); return STAGES.filter(st => n >= st.at).length; };   // 1-5

// `stage`: 1-5. `can(save)`: only offered when it is possible with what you own. `check(r)`: the flight result.
const has = (line, n = 1) => s => ((s.levels || {})[line] || 0) >= n;
export const CHALLENGES = [
  // 1 Learner
  { id: 'seeds-8', stage: 1, text: 'Land with 8 seeds on board', seeds: 25, crystals: 1, check: r => r.landed && r.cargo >= 8 },
  { id: 'pass-1', stage: 1, text: 'Fly past an airport, then land', seeds: 30, crystals: 1, check: r => r.landed && r.airportsSkipped >= 1 },
  { id: 'far-2000', stage: 1, text: 'Fly 2000 km and land', seeds: 25, crystals: 1, check: r => r.landed && r.distance >= 2000 },
  { id: 'cool-landing', stage: 1, text: 'Land with the Earth bar under half', seeds: 20, crystals: 1, check: r => r.landed && r.heat < 50 },
  { id: 'crystals-3', stage: 1, text: 'Earn 3 ice crystals in one flight', seeds: 15, crystals: 2, check: r => r.crystals >= 3 },
  { id: 'exactly-7', stage: 1, text: 'Land with EXACTLY 7 seeds. Not 6, not 8!', seeds: 30, crystals: 1, check: r => r.landed && r.cargo === 7 },
  { id: 'zero-seeds', stage: 1, text: 'Land with no seeds at all. Dodge them!', seeds: 25, crystals: 1, check: r => r.landed && r.cargo === 0 },
  // 2 Cleaner plane
  { id: 'land-cooler', stage: 2, text: 'Land with the Earth cooler than at take-off', seeds: 40, crystals: 2, check: r => r.landed && r.heat < 0 },
  { id: 'dodge-3', stage: 2, text: 'Dodge icy air 3 times at night', seeds: 30, crystals: 3, check: r => r.dodges >= 3 },
  { id: 'shade-15', stage: 2, text: 'Make 15 shade in one flight', seeds: 35, crystals: 2, check: r => r.sunBlocked >= 15 },
  { id: 'pass-2', stage: 2, text: 'Fly past 2 airports, then land', seeds: 50, crystals: 2, check: r => r.landed && r.airportsSkipped >= 2 },
  { id: 'seeds-15', stage: 2, text: 'Land with 15 seeds on board', seeds: 45, crystals: 2, check: r => r.landed && r.cargo >= 15 },
  { id: 'far-4000', stage: 2, text: 'Fly 4000 km and land', seeds: 50, crystals: 2, check: r => r.landed && r.distance >= 4000 },
  { id: 'night-owl', stage: 2, text: 'Fly a whole night with no contrail', seeds: 40, crystals: 3, check: r => r.nightOwl },
  { id: 'no-trap', stage: 2, text: 'Land without trapping any heat', seeds: 35, crystals: 2, check: r => r.landed && r.heatTrapped < 0.5 },
  { id: 'day-and-night', stage: 2, text: 'Make 5 shade AND dodge icy air at night', seeds: 40, crystals: 2, check: r => r.sunBlocked >= 5 && r.dodges >= 1 },
  { id: 'plant-2', stage: 2, text: 'Plant 2 trees in one flight', seeds: 30, crystals: 1, can: has('trees'), check: r => r.planted >= 2 },
  { id: 'kinds-2', stage: 2, text: 'Plant 2 different kinds of tree', seeds: 40, crystals: 2, can: has('species'), check: r => r.kinds >= 2 },
  { id: 'runway-parcel', stage: 2, text: 'Oops! Drop a tree parcel onto a runway', seeds: 30, crystals: 1, can: has('trees'), check: r => r.onRunway },
  // 3 Long haul
  { id: 'far-8000', stage: 3, text: 'Fly 8,000 km and land', seeds: 120, crystals: 4, check: r => r.landed && r.distance >= 8000 },
  { id: 'pass-4', stage: 3, text: 'Fly past 4 airports, then land', seeds: 120, crystals: 4, check: r => r.landed && r.airportsSkipped >= 4 },
  { id: 'bumpy-landing', stage: 3, text: 'Get bumped by turbulence, then land', seeds: 90, crystals: 3, check: r => r.landed && r.bumped },
  { id: 'golden-2', stage: 3, text: 'Grab 2 golden seeds in one flight', seeds: 90, crystals: 3, check: r => r.goldens >= 2 },
  { id: 'dodge-6', stage: 3, text: 'Dodge icy air 6 times at night', seeds: 100, crystals: 5, check: r => r.dodges >= 6 },
  { id: 'seeds-40', stage: 3, text: 'Land with 40 seeds on board', seeds: 110, crystals: 4, check: r => r.landed && r.cargo >= 40 },
  // 4 Nature builder
  { id: 'kinds-4', stage: 4, text: 'Plant 4 kinds of tree in one flight', seeds: 180, crystals: 6, can: has('species', 3), check: r => r.kinds >= 4 },
  { id: 'plant-6', stage: 4, text: 'Plant 6 trees in one flight', seeds: 180, crystals: 6, can: has('trees', 4), check: r => r.planted >= 6 },
  { id: 'forest-full', stage: 4, text: 'Fill your forest right up with carbon', seeds: 160, crystals: 6, can: has('trees'), check: r => r.forestFull },
  { id: 'shade-40', stage: 4, text: 'Make 40 shade in one flight', seeds: 160, crystals: 6, check: r => r.sunBlocked >= 40 },
  { id: 'far-12000', stage: 4, text: 'Fly 12,000 km and land', seeds: 200, crystals: 7, check: r => r.landed && r.distance >= 12000 },
  // 5 Round the world
  { id: 'far-20000', stage: 5, text: 'Fly 20,000 km and land', seeds: 350, crystals: 12, check: r => r.landed && r.distance >= 20000 },
  { id: 'pass-8', stage: 5, text: 'Fly past 8 airports, then land', seeds: 350, crystals: 12, check: r => r.landed && r.airportsSkipped >= 8 },
  { id: 'kinds-5', stage: 5, text: 'Plant all 5 kinds of tree in one flight', seeds: 300, crystals: 10, can: s => has('species', 4)(s) && has('trees', 4)(s), check: r => r.kinds >= 5 },
  { id: 'seeds-100', stage: 5, text: 'Land with 100 seeds on board', seeds: 300, crystals: 10, check: r => r.landed && r.cargo >= 100 },
  { id: 'cool-long', stage: 5, text: 'Fly 15,000 km and land with the Earth cooler than at take-off', seeds: 400, crystals: 14, check: r => r.landed && r.distance >= 15000 && r.heat < 0 },
];
const byId = id => CHALLENGES.find(c => c.id === id);

// Keep 3 active challenges, never two the same, only ones you can do, from your stage or the one
// below. Random fill. (Ones already active stay even after you move up a stage.)
// `not`: ids that must not be drawn (e.g. the ones just completed, so they don't come straight back).
export function fillChallenges(save, rand = Math.random, not = []) {
  const active = (save.challenges || []).filter(id => byId(id));
  const st = stageOf(save), fits = c => c.stage === st || c.stage === st - 1;
  const pool = CHALLENGES.filter(c => fits(c) && !active.includes(c.id) && !not.includes(c.id) && (!c.can || c.can(save)));
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
  const done = [];
  for (const c of fillChallenges(save)) {
    if (c.check(r)) { pay('challenge', c.text, c); done.push(c.id); save.challenges = save.challenges.filter(id => id !== c.id); }
  }
  fillChallenges(save, Math.random, done);   // a challenge just done never comes straight back
  if (r.landed && r.landedAt) {
    save.visited = save.visited || [];
    if (!save.visited.includes(r.landedAt)) { save.visited.push(r.landedAt); pay('city', `New city: ${r.landedAt}`, NEW_CITY); }
  }
  if (r.lap) pay('lap', 'ROUND THE WORLD! Back in LONDON', LAP);
  return paid;
}
export const CITY_COUNT = ROUTE.length;
