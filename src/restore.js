// Rebuild a save from a pilot's flight history (the online flights table), for the temporary
// RESTORE button (2026-10-22: a phone's browser wiped its storage). Exact from the history: flights,
// landings, best landed distance, missions done, laps, kinds of tree planted, crystals earned in
// flight. Estimated: seeds grabbed in the sky (fitted to tools/income.cjs campaigns: seeds per landed
// flight ~ 0.42 d + 0.85 d^2, d in 1000 km; ~300 at 17,000 km matches the user's own flights), plus
// challenge and city prizes. Mission and lap prizes use the game's own rules (src/rewards.js).
// The money is then spent like a player would: the cheapest thing on offer, again and again.
import { LINES, nextLevel, unlocked, level } from './upgrades.js';
import { PROJECTS, biodiversity } from './nature.js';
import { MISSIONS } from './missions.js';
import { missionReward, LAP, NEW_CITY } from './rewards.js';
import { earnBadges } from './badges.js';
import { ROUTE } from './route.js';

export const skySeeds = km => { const d = km / 1000; return Math.round(0.42 * d + 0.847 * d * d); };
const CHALLENGE = { seeds: 26, crystals: 2 };   // average challenge prize per landed flight (income campaigns)

export function rebuildSave(flights, keep = {}) {
  const landed = flights.filter(f => f.landed);
  const missions = Math.min(MISSIONS.length, flights.filter(f => f.mission_done).length);
  const laps = landed.filter(f => f.lap).length;
  const cities = Math.min(ROUTE.length - 1, landed.length);
  const planted = {};
  for (const f of flights) for (const k of f.species || []) planted[k] = (planted[k] || 0) + 1;
  let seeds = landed.reduce((a, f) => a + skySeeds(f.distance_m) + CHALLENGE.seeds, 0) + laps * LAP.seeds + cities * NEW_CITY.seeds;
  let crystals = flights.reduce((a, f) => a + (f.crystals || 0), 0) + landed.length * CHALLENGE.crystals + laps * LAP.crystals + cities * NEW_CITY.crystals;
  for (let i = 0; i < missions; i++) { seeds += missionReward(i).seeds; crystals += missionReward(i).crystals; }
  const worth = { seeds, crystals };
  const save = {
    ...keep, seeds, crystals, levels: {}, habitat: { woodland: [] }, planted, priceVersion: 2,
    tutorialDone: true, freeGiven: landed.length > 0, freeUpgrade: false,
    flights: flights.length, landings: landed.length, mission: missions, laps,
    bestDistance: landed.reduce((a, f) => Math.max(a, f.distance_m), 0),
    city: 0, visited: ROUTE.slice(0, cities + 1).map(c => c.name),
    missionsDone: MISSIONS.slice(0, missions).map(m => m.id), unclaimed: [],
    tours: [...new Set([...(keep.tours || []), 'name', 'hangar'])],
  };
  // Spend: the cheapest upgrade level or habitat project on offer, until nothing is affordable.
  for (;;) {
    const offers = [
      ...LINES.filter(l => nextLevel(save, l) && unlocked(save, l) && !(nextLevel(save, l).needsBio && biodiversity(save) < nextLevel(save, l).needsBio))
        .map(l => ({ kind: 'line', id: l.id, ...nextLevel(save, l) })),
      ...PROJECTS.filter(p => !save.habitat.woodland.includes(p.id) && biodiversity(save) >= p.needs).map(p => ({ kind: 'project', ...p })),
    ].filter(o => o.cost <= save.seeds && (o.crystals || 0) <= save.crystals).sort((a, b) => a.cost - b.cost);
    const o = offers[0];
    if (!o) break;
    save.seeds -= o.cost; save.crystals -= o.crystals || 0;
    if (o.kind === 'line') { save.levels[o.id] = level(save, o.id) + 1; if (o.fuel) save.fuel = o.fuel; }
    else save.habitat.woodland.push(o.id);
  }
  // Badges from the rebuilt history (landings, cities, trees, hydrogen...), already paid: the
  // seeds above already include what the flights earned. (2026-10-22: badges are src/badges.js.)
  save.badgeTiers = {};
  earnBadges(save, { landed: false, distance: 0, cargo: -1 });
  return { save, worth };
}
