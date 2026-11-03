// SEASON 2 settings (the redesign): every tuning number of the areas / crossings / tanker system lives HERE and
// nowhere else, so the sim work can fill them in without touching game code. TBD-SIM = a placeholder until the
// sim engine measures it (research/MASTER-PLAN.md Parts B, C, L; STORY-ANY-START.md; PROPOSAL-REFUELLING.md).
export const TBD_SIM = 'TBD-SIM';
export const SEASON = {
  // When a crossing is OFFERED (MASTER-PLAN B4): 'all3' = capability AND biodiversity AND the area's contrail
  // missions; '2of3' = any two. The user has not picked; 'all3' is the coordinator's default.
  // 0.12.0 (user): until the sim capability estimate and the area missions exist, 'capability' = the BEST landed flight
  // from this area >= distanceShare of the crossing's km, and the missions condition is not asked (ctx.missionsDone undefined).
  offer: { rule: 'all3', biodiversity: 30, distanceShare: 0.7 },
  // The last era whose crossings this release offers (0 = 1950s ... 2 = 1990s); later ones need era 4-6 planes.
  maxEra: 5,   // the era 6 release: the far future, the hydrogen plane and THE LAP (40,000 km, home to home): the end of the game
  // Crossing mission lengths in GAME km by era (PROPOSAL-10, all TBD-SIM: to re-size from the crashes-on player at s~0.9).
  // 4 / 5 / final SIZED by the sim chat (research/BALANCE-ERAS-4-6.md, user-approved 2026-10-28): expert ~10% / ~3% / <1 in 40.
  // final = the LAP OF THE EARTH (the Earth is 40,075 km round). Still behind maxEra until the era 4-6 releases.
  crossingKm: { 1: 6500, 2: 13000, 3: 18000, 4: 27000, 5: 30000, final: 40000 },
  // The tanker (PROPOSAL-REFUELLING option A): rendezvous marks on the mission bar per refuelling-gadget level.
  tanker: { marks: [[], [0.5], [1 / 3, 2 / 3], [1 / 3, 2 / 3], [0.25, 0.5, 0.75]], holdS: [0, 8, 6, 5, 4], boxPx: [0, 24, 30, 36, 40] },
};
