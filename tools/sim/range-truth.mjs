// The RANGE's truth (tests/range-truth.json, 0.73.0): how far each kit flies before the planet overheats, crashes OFF (the careful pilot), over 20 skies
// (seeds 101-120, none of which the estimate's own 3 heat skies use). The estimate (src/capability.js, heat only since 0.73.0) must sit near their median.
// Run: node tools/sim/range-truth.mjs . <kit>   (kits as tools/sim/cap-validate.mjs: fresh cometMid jumboMid twinBare twinFull); regenerate after an engine or kit change.
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
const runs = [];
for (let s = 101; s <= 120; s++) runs.push(S.simulate(save, { pilot: 'careful', seed: s, maxKm: 60000 }).km);
runs.sort((a, b) => a - b);
console.log(JSON.stringify({ kit, median: runs[runs.length >> 1], runs }));
