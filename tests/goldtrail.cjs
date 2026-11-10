// THE GOLDEN CONTRAIL (src/goldtrail.js, src/GameScene.js showContrail; research/LAP-REWARDS-SPEC.md L3). Plain Node. (1) the colour: gold for a save with lapDone, white otherwise. (2) COSMETIC ONLY: the sim engine flies identical flights
// (every step's chain hash, the final heat and CO2) with lapDone on and off. (3) the engine imports nothing from src/goldtrail.js. Plants: tools/plants.tsv, test `goldtrail` (the engine plant makes the flag change the CO2 and must be caught by (2)).
// Run: node tests/goldtrail.cjs
const fs = require('fs'), path = require('path');
const DT_MS = 16.67;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const G = await import('../src/goldtrail.js'), { createWorld } = await import('../src/sim/world.js'), { pilotTarget } = await import('../src/sim/pilots.js'), { traceFlight } = await import('../src/sim/trace.js');
  check(G.trailColour({ lapDone: true }) === G.GOLD && G.GOLD !== G.PLAIN, 'a save with lapDone draws a gold contrail');
  check(G.trailColour({}) === G.PLAIN && G.trailColour({ lapDone: false }) === G.PLAIN && G.trailColour(null) === G.PLAIN, 'a save without lapDone (or no save) draws the plain white contrail');
  const gold = JSON.parse(fs.readFileSync(path.join(__dirname, 'sim-golden.json'), 'utf8')), keys = Object.keys(gold.flights).filter((_, i) => i % 6 === 0);
  const SAVES = { none: {}, jumboFull: { fuel: 'kerosene', priceVersion: 2, fleet: { plane: 'jumbo', planes: { jumbo: { engines: 3, body: 3, cabin: 3 } }, systems: { forecast: 4, atc: 4, ops: 4 }, gadgets: { magnet: 4, hold: 4, gear: 4, sensors: 4, autopilot: 4 } } } };
  const fly = (plane, pilot, seed, lap) => {
    const stored = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 30, mission: 99, planted: { oak: 5, birch: 5, rowan: 5, spruce: 5, orchard: 5 }, ...SAVES[plane], simSeed: seed, ...(lap ? { lapDone: true, crossed: ['lap'] } : {}) };
    const w = createWorld(stored, seed);
    for (let i = 0; i < 2000 && w.state !== 'playing'; i++) w.step(DT_MS / 1000);
    const t = traceFlight(w, () => w.step(Math.min(DT_MS, 50) / 1000), pilotTarget, pilot, 6000, 1e9);
    return { steps: t.steps, chain: t.chain.join(','), heat: w.heat, co2: w.totalCo2, contrails: w.contrails.length };
  };
  check(keys.length >= 3, `power: ${keys.length} recorded flights compared`);
  for (const k of keys) { const [pl, pi, se] = k.split('/'), off = fly(pl, pi, Number(se), false), on = fly(pl, pi, Number(se), true);
    check(off.steps > 500, `power: ${k} flew ${off.steps} steps`);
    check(on.steps === off.steps && on.chain === off.chain && on.heat === off.heat && on.co2 === off.co2 && on.contrails === off.contrails, `${k}: cooling, heat and CO2 are identical with lapDone on and off (steps ${on.steps}/${off.steps}, heat ${on.heat}/${off.heat}, co2 ${on.co2}/${off.co2})`); }
  const dir = path.join(__dirname, '../src/sim'), bad = fs.readdirSync(dir).filter(f => f.endsWith('.js') && /goldtrail|trailColour/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
  check(bad.length === 0, `the sim engine does not import the trail colour: ${bad}`);
  if (fails.length) { console.log('FAIL goldtrail:'); fails.forEach(f => console.log(' - ' + f)); process.exit(1); }
  console.log(`PASS goldtrail: the contrail is gold only with lapDone, and ${keys.length} recorded flights come out identical (every step, heat, CO2) with the flag on and off; the engine does not import the colour`);
})().catch(e => { console.log('FAIL goldtrail:\n - ' + e.stack); process.exit(1); });
