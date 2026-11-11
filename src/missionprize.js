// What the area missions and the crossings PAY (the user, 2026-11-11: mission prizes keep today's total per tier and are split by effort; crossings pay at full scale by difficulty word).
// Pure: no DOM, no clock, no random numbers. The game (src/missions2.js visible/finish) and the sim engine call the same two functions, so a sim run and the game pay the same.
// The numbers are the sim chat's FINAL tables: research BLOCK1-MISSION-REWARDS-AND-GATES.md A.8.3 (missions) and A.8.4 (crossings). [measured] E for land2, chain, streak2, stretch, streak3;
// [derived] or [guess] E for the rest (A.8.3 says which); the table is recomputed by the sim chat when the effort survey (A.8.5) has run, and only THIS file changes then.
// Dailies, steady goals, lessons and firsts keep their numbers (src/missions2.js).

// Base pay at stage factor k = 1: [seeds, crystals]. Pay = base x k (k = 1, 2, 3 as today: src/missions2.js HARDER).
// `rescue` and `golden` are INTERIM rows (not in the sim chat's list): release A keeps those two templates in the ladder; release B replaces them by streak2 and streak3.
// They carry the pay of the slot they hold (16 and 31 seeds, no crystals) so that every tier total stays EXACTLY today's (60 / 90 / 105 seeds at k = 1) in every release.
export const PRIZE_BASE = {
  // tier 1: 6 x 10 = 60
  land2: [10, 0], shade: [10, 0], 'plant-tree': [10, 0], 'clean-gaps': [10, 0], bring: [10, 0], project: [10, 0],
  // tier 2: 18 + 16 + 4 x 14 = 90 (release A: chain + rescue + dodge, spot, hazard, system; release B: chain + streak2 + the same four)
  chain: [18, 0], rescue: [16, 0], streak2: [16, 1], dodge: [14, 0], spot: [14, 0], hazard: [14, 0], system: [14, 0],
  // tier 3: 6 + 31 + 4 x 17 = 105 (release A: stretch + golden + night, shade10, kinds3, tier; release B: stretch + streak3 + the same four)
  stretch: [6, 1], golden: [31, 0], streak3: [31, 2], night: [17, 0], shade10: [17, 0], kinds3: [17, 0], tier: [17, 0],
};
// The template id (src/missions2.js TEMPLATES) -> the kind in the table above. land-city is the land2 rule; route is the stretch slot.
export const PRIZE_KIND = { 'land-city': 'land2', route: 'stretch' };
export const kindOf = templateId => PRIZE_KIND[templateId] || templateId;
// The ladder of each release, by tier (for the tier-total check in tests/missionprize.cjs).
export const LADDER_A = { 1: ['land2', 'shade', 'plant-tree', 'clean-gaps', 'bring', 'project'], 2: ['chain', 'rescue', 'dodge', 'spot', 'hazard', 'system'], 3: ['stretch', 'golden', 'night', 'shade10', 'kinds3', 'tier'] };
// Release B: the streaks are EXTRA missions (the user, 2026-11-11): rescue and golden STAY, streak2 and streak3 are new template ids. The sim chat re-balances the table for one more kind per tier;
// TODO-SIM: until its numbers arrive the streak rows keep the sim's A.8 values (16 + 1 crystal, 31 + 2) and tests/missionprize.cjs does NOT assert the tier totals of this ladder.
export const LADDER_B = { 1: LADDER_A[1], 2: [...LADDER_A[2], 'streak2'], 3: [...LADDER_A[3], 'streak3'] };

// { seeds, crystals } for a mission kind at stage factor k. `plane` is reserved and ignored in this version (the effort of the distance kinds at later planes is not measured).
export function missionPrize(kind, k = 1, plane = null) {
  const b = Object.prototype.hasOwnProperty.call(PRIZE_BASE, kind) ? PRIZE_BASE[kind] : null;
  if (!b) throw new Error(`missionPrize: unknown mission kind '${kind}'`);
  return { seeds: b[0] * k, crystals: b[1] * k };
}

// The crossing prize by difficulty word (the full scale; paid once, in completeCrossing, only when the crossing is not yet in save.crossed: release C wires it; no back-pay).
export const CROSSING_PRIZE = { Easy: [100, 12], Medium: [200, 25], Hard: [400, 50], Harder: [700, 87], 'Very hard': [1100, 137], 'The lap': [2000, 250] };
export function crossingReward(word) {
  const b = Object.prototype.hasOwnProperty.call(CROSSING_PRIZE, word) ? CROSSING_PRIZE[word] : null;
  if (!b) throw new Error(`crossingReward: unknown difficulty word '${word}'`);
  return { seeds: b[0], crystals: b[1] };
}
