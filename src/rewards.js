// Prizes. Missions (src/missions.js) and badge tiers (src/badges.js) are paid THE MOMENT they are earned (R8, 2026-11-03; the
// Coordinator and the sim chat's rule): a flight mission or badge when the flight is banked (RULES.bankFlight), a mission done by
// a purchase or a project (src/missions2.js onSave) at the buy itself. There is no CLAIM step. `save.unclaimed` is only read once,
// by migrateClaims, to pay what an older save was still holding.
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

// Pay one prize into the bank, now.
export function payPrize(save, p) {
  save.seeds = (save.seeds || 0) + (p.seeds || 0);
  save.crystals = (save.crystals || 0) + (p.crystals || 0);
}
// What a list of prizes is worth, { seeds, crystals } (the results card's prize line; the sim's per-flight stat).
export const sumPrizes = list => (list || []).reduce((a, p) => ({ seeds: a.seeds + (p.seeds || 0), crystals: a.crystals + (p.crystals || 0) }), { seeds: 0, crystals: 0 });

// After a flight (not flight school): PAY what it earned. Returns the prizes it paid,
// [{ key, kind, label, seeds, crystals, id, tier }], for the results screen.
export function addPrizes(save, r, mission, missionIndex) {
  const added = [];
  const add = p => { payPrize(save, p); added.push(p); };
  if (r.landed && r.landedAt) {                 // count the city first, so Globetrotter sees this landing
    save.visited = save.visited || [];
    if (!save.visited.includes(r.landedAt)) save.visited.push(r.landedAt);
  }
  if (mission) add({ key: `mission:${mission.id}`, kind: 'mission', id: mission.id, label: mission.title, ...missionReward(missionIndex) });
  for (const b of earnBadges(save, r)) add({ key: `badge:${b.id}:${b.tier}`, kind: 'badge', id: b.id, tier: b.tier, label: b.name, seeds: b.seeds, crystals: b.crystals });
  return added;
}

// The one-time migration (R8): an older save may still hold prizes nobody tapped CLAIM on. Pay them all, empty the list, return what
// was paid ({ seeds, crystals }) or null when there was nothing. Idempotent by construction (the list is empty afterwards): no flag,
// so no new save field for the engine comparison (tests/sim-bank.cjs) to trip over.
export function migrateClaims(save) {
  const list = save.unclaimed || [];
  if (!list.length) return null;
  const paid = sumPrizes(list);
  list.forEach(p => payPrize(save, p));
  save.unclaimed = [];
  return paid;
}
export const CITY_COUNT = ROUTE.length;   // every airport in the world network (src/cities.js)
