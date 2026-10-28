// The capability estimate's TRUTH (tests/capability-truth.json): 20 crashes-on flights (s 0.9 careful player, seeds 1-20) per kit.
// Run: node tools/sim/cap-validate.mjs . <kit>   (kits: fresh cometMid jumboMid twinBare twinFull); regenerate after an engine change.
const [root, kit] = process.argv.slice(2);
const S = await import(root + '/src/sim/simulate.js'), F = await import(root + '/src/fleet.js');
const full = (l, n) => Object.fromEntries(l.map(g => [g.id, Math.min(n, g.levels.length)]));
const lines = (id, n) => { const p = F.PLANES.find(q => q.id === id); return Object.fromEntries(Object.keys(F.PLANE_LINES).map(l => [l, Math.min(n, p.lines[l].length)])); };
const kits = {
  fresh: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} },
  cometMid: { plane: 'comet', planes: { comet: lines('comet', 2) }, systems: full(F.SYSTEMS, 2), gadgets: full(F.GADGETS, 2) },
  jumboMid: { plane: 'jumbo', planes: { comet: {}, jumbo: lines('jumbo', 2) }, systems: full(F.SYSTEMS, 3), gadgets: full(F.GADGETS, 3) },
  twinBare: { plane: 'twin', planes: { comet: {}, twin: {} }, systems: full(F.SYSTEMS, 4), gadgets: full(F.GADGETS, 4) },
  twinFull: { plane: 'twin', planes: { comet: {}, twin: lines('twin', 4) }, systems: full(F.SYSTEMS, 6), gadgets: full(F.GADGETS, 6) },
};
const save = { tutorialDone: true, muted: true, seenTips: ['*'], landings: 0, fleet: kits[kit] };
const truth = [], heat = [];
for (let s = 1; s <= 20; s++) truth.push(S.simulate(save, { pilot: 'player', crashes: true, skill: 0.9, careful: true, seed: s, maxKm: 60000 }).km);
const t0 = Date.now();
for (let s = 1; s <= 3; s++) heat.push(S.simulate(save, { pilot: 'careful', seed: s, maxKm: 60000 }).km);
console.log(JSON.stringify({ kit, era: F.PLANES.find(p => p.id === kits[kit].plane).era, truth: truth.sort((a, b) => a - b), heat, heatMs: Date.now() - t0 }));
