// The capability estimate's HAZARD POOL (M4, 2026-10-28): per plane era, how far the s 0.9 careful player gets with
// crashes ON and heat OFF (storms, no-fly zones, birds, the twists only), over N skies, on that era's plane with every
// system and gadget. The hangar combines it with a cheap live heat number (src/capability.js). Kit effects on hazards
// were measured smaller than the sky-to-sky spread (12 skies: bare twin 13.7k, full 15.6k, ranges 9.6k-39.7k), hence
// one pool per era. Run: node tools/sim/cap-pool.mjs <era> <N>  -> prints the sorted km list (seeds 101..100+N).
const [era, n] = process.argv.slice(2).map(Number);
const S = await import('../../src/sim/simulate.js'), F = await import('../../src/fleet.js');
const plane = F.PLANES.find(p => p.era === era), full = l => Object.fromEntries(l.map(g => [g.id, g.levels.length]));
const lines = Object.fromEntries(Object.keys(F.PLANE_LINES).map(l => [l, plane.lines[l].length]));
const save = { tutorialDone: true, muted: true, seenTips: ['*'], landings: 0,
  fleet: { plane: plane.id, planes: { comet: {}, [plane.id]: lines }, systems: full(F.SYSTEMS), gadgets: full(F.GADGETS) } };
const off = { CLIMATE: { co2ToHeat: 0, heatTrappedPerCol: 0, sunBlockedPerCol: 0 } };
const runs = [];
for (let s = 101; s <= 100 + n; s++) runs.push(S.simulate(save, { pilot: 'player', crashes: true, skill: 0.9, careful: true, seed: s, maxKm: 60000, overrides: off }).km);
console.log(JSON.stringify({ era, plane: plane.id, runs: runs.sort((a, b) => a - b) }));
