// SEASON 2 settings (the redesign): every tuning number of the areas / crossings / tanker system lives HERE and
// nowhere else, so the sim work can fill them in without touching game code. TBD-SIM = a placeholder until the
// sim engine measures it (research/MASTER-PLAN.md Parts B, C, L; STORY-ANY-START.md; PROPOSAL-REFUELLING.md).
export const TBD_SIM = 'TBD-SIM';
export const SEASON = {
  // When a crossing is OFFERED (MASTER-PLAN B4): 'all3' = capability AND biodiversity AND the area's contrail
  // missions; '2of3' = any two. The user has not picked; 'all3' is the coordinator's default.
  offer: { rule: 'all3', biodiversity: 30 },
  // Crossing mission lengths in GAME km by era (PROPOSAL-10, all TBD-SIM: to re-size from the crashes-on player at s~0.9).
  crossingKm: { 1: 7000, 2: 12000, 3: 17000, 4: 21000, 5: 26000, final: 30000 },
  // The tanker (PROPOSAL-REFUELLING option A): rendezvous marks on the mission bar per refuelling-gadget level.
  tanker: { marks: [[], [0.5], [1 / 3, 2 / 3], [1 / 3, 2 / 3], [0.25, 0.5, 0.75]], holdS: [0, 8, 6, 5, 4], boxPx: [0, 24, 30, 36, 40] },
};
