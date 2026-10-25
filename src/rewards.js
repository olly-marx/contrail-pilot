// Prizes. Missions (src/missions.js) and badge tiers (src/badges.js) are never paid automatically:
// a finished one goes into save.unclaimed, and pays only when the player taps CLAIM (claim()).
// The seeds you carry home are not a prize: GameScene.onFinish() banks those straight away.
// Kid wording; numbers tuned against hangar prices (a level costs 5-70 seeds and 1-5 crystals).
import { ROUTE } from './route.js';
import { earnBadges } from './badges.js';

// Mission i (0-based, in MISSIONS order) pays more as they get harder.
export const missionReward = i => ({ seeds: 15 + 20 * i, crystals: 1 + 2 * i });
// Kept for src/restore.js, which rebuilds old saves from flight history: once-off prizes the game
// used to pay for a new city and a lap. New cities and laps now count towards the Globetrotter badge.
export const NEW_CITY = { seeds: 15, crystals: 1 };
export const LAP = { seeds: 300, crystals: 25 };

// After a flight (not flight school): record what it earned as claimable prizes. Returns the
// prizes it added, [{ key, kind, label, seeds, crystals, id, tier }], for the results screen.
export function addPrizes(save, r, mission, missionIndex) {
  save.unclaimed = save.unclaimed || [];
  const added = [];
  const add = p => { if (!save.unclaimed.some(u => u.key === p.key)) { save.unclaimed.push(p); added.push(p); } };
  if (r.landed && r.landedAt) {                 // count the city first, so Globetrotter sees this landing
    save.visited = save.visited || [];
    if (!save.visited.includes(r.landedAt)) save.visited.push(r.landedAt);
  }
  if (mission) add({ key: `mission:${mission.id}`, kind: 'mission', id: mission.id, label: mission.title, ...missionReward(missionIndex) });
  for (const b of earnBadges(save, r)) add({ key: `badge:${b.id}:${b.tier}`, kind: 'badge', id: b.id, tier: b.tier, label: b.name, seeds: b.seeds, crystals: b.crystals });
  return added;
}

// Tap CLAIM: pay one prize (by key) or all of them. Returns what was paid, { seeds, crystals }.
export function claim(save, key = null) {
  const list = save.unclaimed || [];
  const take = key ? list.filter(u => u.key === key) : list.slice();
  const paid = take.reduce((a, u) => ({ seeds: a.seeds + u.seeds, crystals: a.crystals + u.crystals }), { seeds: 0, crystals: 0 });
  save.seeds += paid.seeds;
  save.crystals = (save.crystals || 0) + paid.crystals;
  save.unclaimed = list.filter(u => !take.includes(u));
  return paid;
}
export const unclaimedCount = save => (save.unclaimed || []).length;
export const CITY_COUNT = ROUTE.length;   // every airport in the world network (src/cities.js)
