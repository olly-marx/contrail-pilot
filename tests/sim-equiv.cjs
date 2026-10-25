// The sim engine is the game (2026-10-25): src/sim/world.js runs the game's own rules (src/sim/rules.js) in
// plain Node, and must fly exactly the flights the real game flew. tests/sim-golden.json holds the game's
// per-step trace fingerprints (every 100th step and the last) for 18 flights: 2 planes x 3 pilots x 3 seeds,
// recorded in a browser with tools/sim/trace.cjs. Here the engine flies the same flights and must match at
// every mark. Then a planted defect (CO2 one part in a million higher, engine only) must be caught.
// Plain Node, no browser. Run: node tests/sim-equiv.cjs
// After a deliberate physics change, re-record the golden from the GAME (not the engine) on a test turn:
//   PLANE=none node tools/sim/trace.cjs > a.json; PLANE=jumboFull node tools/sim/trace.cjs > b.json; then rebuild
//   tests/sim-golden.json from them (marks = chain[i] for i % 100 === 99, plus the last).
const fs = require('fs');
const path = require('path');
const DT_MS = 16.67;

(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const { pilotTarget } = await import('../src/sim/pilots.js');
  const { traceFlight } = await import('../src/sim/trace.js');
  const gold = JSON.parse(fs.readFileSync(path.join(__dirname, 'sim-golden.json'), 'utf8'));
  const SAVES = {
    none: {},
    jumboFull: { fuel: 'kerosene', priceVersion: 2, fleet: { plane: 'jumbo', planes: { jumbo: { engines: 3, body: 3, cabin: 3 } }, systems: { forecast: 4, atc: 4, ops: 4 }, gadgets: { magnet: 4, hold: 4, gear: 4, sensors: 4, autopilot: 4 } } },
  };
  const fly = (plane, pilot, seed, plant) => {
    const stored = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 30, mission: 99,
      planted: { oak: 5, birch: 5, rowan: 5, spruce: 5, orchard: 5 }, ...SAVES[plane], simSeed: seed };
    const w = createWorld(stored, seed);
    for (let i = 0; i < 2000 && w.state !== 'playing'; i++) w.step(DT_MS / 1000);
    if (plant) w.kit = { ...w.kit, co2Cruise: w.kit.co2Cruise * 1.000001 };
    const t = traceFlight(w, () => w.step(Math.min(DT_MS, 50) / 1000), pilotTarget, pilot, 6000, 1e9);
    return { steps: t.steps, marks: t.chain.filter((_, i) => i % 100 === 99 || i === t.chain.length - 1) };
  };
  const firstBad = (g, n) => g.steps !== n.steps ? `ran ${n.steps} steps, the game ${g.steps}` : (i => i < 0 ? null : `differs by step ${Math.min((i + 1) * 100, g.steps)}`)(g.marks.findIndex((m, i) => m !== n.marks[i]));
  const fails = [], t0 = Date.now();
  let steps = 0;
  for (const [key, g] of Object.entries(gold.flights)) {
    const [plane, pilot, seed] = key.split('/');
    const n = fly(plane, pilot, Number(seed)); steps += n.steps;
    const bad = firstBad(g, n); if (bad) fails.push(`${key}: ${bad}`);
  }
  const ms = Date.now() - t0;
  // A gate that cannot fail is not a gate.
  const [k0, g0] = Object.entries(gold.flights)[0], [pl, pi, se] = k0.split('/');
  if (!firstBad(g0, fly(pl, pi, Number(se), true))) fails.push('a planted CO2 change was NOT caught');
  if (Object.keys(gold.flights).length < 18) fails.push(`only ${Object.keys(gold.flights).length} golden flights`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: the engine flies all ${Object.keys(gold.flights).length} of the game's recorded flights identically (${steps} steps in ${ms} ms); a planted CO2 change is caught`);
})();
