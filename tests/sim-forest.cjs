// Trees on long flights (Node port of tests/forest.cjs, test-speed batch 2): from FOREST.from km grown trees get an old-wood boost, the
// full boost only with all 5 kinds planted this flight; a forest (and rewilded land) can only soak up so much CO2 per flight, then stops
// (without that limit a careful pilot with a forest flew for ever, measured 2026-10-21). Runs on the sim engine (the game's own rules).
// PLANTS (each must FAIL this test; the browser forest.cjs must fail the same ones before it is retired):
//   no cap:     sed -i 's/const cool = forestFull ? 0 : /const cool = /' src/sim/rules.js
//   no land cap: sed -i 's/const land = landFull ? 0 : /const land = /' src/sim/rules.js
//   no boost:   sed -i 's/(stage === 2 ? 1 + oldWood : 1)/1/' src/sim/rules.js
//   kinds:      sed -i 's/FOREST.power);/0);/' src/sim/physics.js
//   store:      sed -i 's/FOREST.storePower)/0)/' src/sim/physics.js
// Plain Node, seconds. Run: node tests/sim-forest.cjs
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const { FOREST } = await import('../src/config.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, fuel: 'kerosene', priceVersion: 2,
    levels: { trees: 4, species: 4 }, habitat: { woodland: ['deadwood', 'meadow', 'margins', 'hedgerow', 'pond', 'woodland', 'voles', 'beavers', 'rewet', 'storks', 'martens'] },
    planted: { oak: 9, birch: 9, rowan: 9, spruce: 9, orchard: 9 } };
  const w = createWorld(save, 1);
  for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(16.67 / 1000);
  w.explain = () => false; w.hitsStorm = () => false; w.hitBird = () => false; w.nextAirport.worldX = 1e12;
  const kinds = n => { w.speciesPlanted = new Set(['spruce', 'birch', 'oak', 'rowan', 'orchard'].slice(0, n)); };
  const r = {};
  w.distancePx = 5000; kinds(5); r.boost5k = w.oldWood();
  w.distancePx = 25000; r.boost25k = w.oldWood(); r.store5 = w.forestStore();
  kinds(4); r.boost25k4 = w.oldWood(); r.store4 = w.forestStore();
  kinds(1); r.store1 = w.forestStore();
  // Fly with 6 grown trees of all 5 kinds, far into a flight, until well past the limit (50 ms frames, the game's largest step).
  kinds(5); w.distancePx = 25000;
  for (const k of ['spruce', 'birch', 'oak', 'rowan', 'orchard', 'oak']) w.trees.push({ sprite: { active: false, setTexture() {}, setScale() {} }, kind: k, plantedAt: w.elapsed - 60, stage: 2 });
  const step = n => { for (let i = 0; i < n; i++) { w.heat = 0; if (w.plane.y > 220 && w.plane.vy > -40) w.applyFlap(); w.step(0.05); } };
  step(20); r.rateEarly = w.breakdown.trees;   // ~1 s of cooling at full strength
  step(20 * 130);   // 130 s: the forest (80) and land (30) are both full well before
  r.forestStored = w.forestStored; r.landStored = w.landStored; r.said = w.forestFullSaid;
  const before = w.breakdown.trees; step(200); r.after = w.breakdown.trees - before; r.state = w.state;
  const F = FOREST, near = (a, b) => Math.abs(a - b) < 1e-6;
  check(r.boost5k === 0, `no old-wood boost before ${F.from} km: ${r.boost5k}`);
  check(r.boost25k >= 1, `long flights must make grown trees at least twice as strong: boost ${r.boost25k}`);
  check(near(r.boost25k, F.boost), `full boost at 25,000 km with all 5 kinds: ${r.boost25k}`);
  check(near(r.boost25k4, F.boost * Math.pow(4 / 5, F.power)), `4 kinds get less boost: ${r.boost25k4}`);
  check(near(r.store5, F.store) && r.store4 < F.store / 2 && r.store1 === F.storeMin, `the forest holds the most with all 5 kinds: 5=${r.store5} 4=${r.store4} 1=${r.store1}`);
  check(r.rateEarly > 0.3, `a grown, old forest cools quickly before it is full: ${r.rateEarly.toFixed(2)} in 1 s`);
  check(Math.abs(r.forestStored - F.store) < 1.5, `the forest stops at its limit (${F.store}): ${Number(r.forestStored).toFixed(1)}`);
  check(r.landStored <= F.landStore + 0.1 && r.landStored > F.landStore - 1, `rewilded land stops at its limit (${F.landStore}): ${Number(r.landStored).toFixed(1)}`);
  check(r.after === 0, `no more cooling once both are full: ${r.after}`);
  check(r.said, 'the "forest is full" message should have shown');
  check(r.state === 'playing', `the flight should still be going: ${r.state}`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS sim-forest (stored ${r.forestStored.toFixed(1)} + land ${r.landStored.toFixed(1)})`);
})();
