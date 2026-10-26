// The gap-flying player plants (sim engine, 2026-10-26): with a save that owns Tree Planting, a single simulated
// flight must drop parcels onto soil and get cooling from the trees. Before this, simulate() never dropped one, so
// the era probes (tools: era456) had trees = 0 whatever the save owned. Comet, Tree Planting 2 (3 parcels), Soil 1,
// s = 0.9, heat off, 8 skies to 6,000 km: every sky plants >= 2 trees and its breakdown.trees > 0.
// Plain Node. PLANT=nodrop: the old simulate() (no drops): must FAIL.  Run: node tests/sim-trees.cjs
(async () => {
  const S = await import('../src/sim/simulate.js');
  if (process.env.PLANT === 'nodrop') S.NO_DROP.on = true;
  const save = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, levels: { trees: 2, soil: 1 }, planted: {},
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const fails = [], got = [];
  for (let seed = 1; seed <= 8; seed++) {
    const r = S.simulate({ ...save, simSeed: seed }, { pilot: 'player', skill: 0.9, careful: true, budget: 0.5, seed, crashes: true, maxKm: 6000, overrides: { CLIMATE: { dangerLine: Infinity } } });
    got.push(`${r.planted}/${r.breakdown.trees}`);
    if (!(r.planted >= 2 && r.breakdown.trees > 0)) fails.push(`seed ${seed}: planted ${r.planted}, tree cooling ${r.breakdown.trees} (want >= 2 and > 0; ${r.km} km)`);
  }
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: every sky planted and its trees cooled (planted/cooling per sky: ${got.join(' ')})`);
})();
