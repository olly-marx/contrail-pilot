// SEASON 2 settings (the redesign): every tuning number of the areas / crossings / tanker system lives HERE and
// nowhere else, so the sim work can fill them in without touching game code. TBD-SIM = a placeholder until the
// sim engine measures it (research/MASTER-PLAN.md Parts B, C, L; STORY-ANY-START.md; PROPOSAL-REFUELLING.md).
export const TBD_SIM = 'TBD-SIM';
export const SEASON = {
  // When a crossing is OFFERED (MASTER-PLAN B4): 'all3' = capability AND biodiversity AND the area's contrail
  // missions; '2of3' = any two. The user has not picked; 'all3' is the coordinator's default.
  // 0.12.0 (user): until the sim capability estimate and the area missions exist, 'capability' = the BEST landed flight
  // from this area >= distanceShare of the crossing's km, and the missions condition is not asked (ctx.missionsDone undefined).
  offer: { rule: 'all3', biodiversity: 30, distanceShare: 1 },   // distanceShare 1 since 0.73.0 (V4: the range must reach the whole crossing; 0.7 before). biodiversity: no longer asked by crossings (V4)
  // The last era whose crossings this release offers (0 = 1950s ... 2 = 1990s); later ones need era 4-6 planes.
  maxEra: 5,   // the era 6 release: the far future, the hydrogen plane and THE LAP (40,000 km, home to home): the end of the game
  // Crossing mission lengths in GAME km by era (PROPOSAL-10, all TBD-SIM: to re-size from the crashes-on player at s~0.9).
  // 4 / 5 / final SIZED by the sim chat (research/BALANCE-ERAS-4-6.md, user-approved 2026-10-28): expert ~10% / ~3% / <1 in 40.
  // final = the LAP OF THE EARTH (the Earth is 40,075 km round). Still behind maxEra until the era 4-6 releases.
  crossingKm: { 1: 6500, 2: 13000, 3: 18000, 4: 27000, 5: 30000, final: 40000 },
  // CROSSINGS V3 PACING LEVERS (2026-11-13; the user: 'balance is key ... the other yardsticks are too easy'): per crossing number n (0 = the first), its length and the nature meter it needs.
  // The 5th and the lap keep their lengths (the user: no shortening). crossingKm above stays for anything that is not a V3 route.
  // 0.73.0 (V4, range only): Easy 12,000 (was 7,000), so a fresh Comet (range ~10,800 km, tests/range-truth.json) needs a few upgrades first; Medium 16,000 ~ a 747 at mid kit.
  step: { km: [12000, 16000, 22000, 30000, 36000], bioMul: [15 / 30, 35 / 30, 50 / 30, 65 / 30, 80 / 30], natureRule: 'departure', crossStart: true },   // PLAN B (Oliver, 2026-11-24; no era gate, his 2026-11-22 rule): range AND the nature of the departure land, rising per tier: 15 / 35 / 50 / 65 / 80 (offer.biodiversity 30 x bioMul; the lap asks 80); the top two tiers longer (were 27,000 / 32,000): he had the last crossing by the 2010s.
  // Measured 2026-11-24 (season-2 progression sim, skill 0.9, careful, start AMSTERDAM, a player who funds the departure land, seeds 1-3 x 400 flights; scratch/planb/aim2-*):
  // crossings at flights 16-48 / 40-57 / 88-111 / 173-196 / 268-294 (eras open ~15 / ~52 / ~110 / ~200 / ~330), the lap not by 400 (home land 30-69 of 80); fares 26-31% of seeds.
  // 0.75.1 (range only) in the same sim: all five by flight 123-130 (the 2010s), the lap by 128-298, fares 40-53% of seeds. Range stopped mattering by flight ~130 (40,000+ km).
  // (was: km [12000, 16000, 22000, 27000, 32000], bioMul all 1, natureRule 'weakest', and V4 asked range only)   // PACING A2 (2026-11-18, research/PACING-2026-11-18-RESULTS.md): crossing 1 before the 1970s in 14/14 sim runs, crossing 2 a median 43 flights later. Was km[0] 9000, bioMul[0] 38/30, natureRule 'best' (P3b).   // bioMul x offer.biodiversity (30): the first crossing needs 38. (A multiplier, so offer.biodiversity stays THE base bar the tests' lever sets.)   // SHIPPED 2026-11-16 (the user: 'ship this out'): arm P3b, research/rt-P3b-report*.txt: crossings at about flights 32 / 127 / 164 / 217; bio 38 is under the weakest land's plateau (~40)
  // step.natureRule (Oliver, 2026-11-18: 'I flew the crossing to Muscat and then immediately had the crossing to Rome'): which nature a crossing reads.
  //   'best'     the best land of any land you have opened (lands a crossing just opened count at once);
  //   'weakest'  per opened REGION its best land, and the crossing reads the weakest region: after a crossing, a land in the new region must grow first. src/crossings.js natureHave.
  //   'departure' (Plan B, 2026-11-24) the land the crossing leaves from (its departure city's land; the lap: your home city's).
  // The tanker (PROPOSAL-REFUELLING option A): rendezvous marks on the mission bar per refuelling-gadget level.
  tanker: { marks: [[], [0.5], [1 / 3, 2 / 3], [1 / 3, 2 / 3], [0.25, 0.5, 0.75]], holdS: [0, 8, 6, 5, 4], boxPx: [0, 24, 30, 36, 40] },
};
