// Golden per-step traces (sim engine, 2026-10-25). Flies a flight with a fixed simSeed and a test pilot
// (src/sim/pilots.js), crashes switched off, and records the physics of every step (src/sim/trace.js: distance,
// plane, heat and its parts, every storm / icy-air patch / contrail / seed / flock, and storm or bird touches).
// Each step is hashed into a chain, so two traces agree only if every step agrees.
//   game:    node tools/sim/trace.cjs > golden.json                (the real game in a browser, frame-stepped, no drawing)
//   engine:  ENGINE=1 node tools/sim/trace.cjs > engine.json       (src/sim/world.js in plain Node: no browser)
//   compare: COMPARE=golden.json [ENGINE=1] node tools/sim/trace.cjs   (exit 1 + the first differing step)
// Env: URL (default http://localhost:8000/), SEEDS=1,2,3  PILOTS=straight,careful,smart  STEPS=6000  PLANE=jumboFull|none
//      EVERY=100 (keep every EVERY-th step's full line; 1 finds the differing field)
// The game needs the game served and playwright-core, and a test turn.
const fs = require('fs');
const URL = process.env.URL || 'http://localhost:8000/';
const SEEDS = (process.env.SEEDS || '1,2,3').split(',').map(Number);
const PILOTS = (process.env.PILOTS || 'straight,careful,smart').split(',');
const STEPS = Number(process.env.STEPS || 6000);
const EVERY = Number(process.env.EVERY || 100);
const ENGINE = !!Number(process.env.ENGINE || 0);
const SAVES = {
  none: {},
  jumboFull: { fuel: 'kerosene', priceVersion: 2, fleet: { plane: 'jumbo', planes: { jumbo: { engines: 3, body: 3, cabin: 3 } }, systems: { forecast: 4, atc: 4, ops: 4 }, gadgets: { magnet: 4, hold: 4, gear: 4, sensors: 4, autopilot: 4 } } },
};
const PLANE = process.env.PLANE || 'jumboFull';
// The stored save both sides start from (the game reads it from localStorage, the engine is handed it).
const stored = seed => ({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 30, mission: 99,
  planted: { oak: 5, birch: 5, rowan: 5, spruce: 5, orchard: 5 }, ...SAVES[PLANE], simSeed: seed });
const DT_MS = 16.67;

async function flyGame(b, pilot, seed) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(save => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(save)); }, stored(seed));
  await p.goto(URL);
  await p.waitForFunction(() => window.game && game.scene.getScene('game') && game.registry.get('ui'), null, { timeout: 60000 });
  const out = await p.evaluate(async ([pilot, STEPS, EVERY, DT_MS]) => {
    const { pilotTarget } = await import('/src/sim/pilots.js');
    const { traceFlight } = await import('/src/sim/trace.js');
    game.loop.sleep(); game.scene.render = () => {};
    let t = game.loop.now || performance.now();
    game.scene.getScene('game').scene.restart({ go: true });
    const s = game.scene.getScene('game');
    for (let i = 0; i < 3 || !(s.nextAirport && s.sys.isActive()); i++) { if (i > 3) await new Promise(r => setTimeout(r, 20)); t += DT_MS; game.step(t, DT_MS); if (i > 3000) throw new Error('scene never started'); }
    game.registry.get('ui').showOnly(null);
    for (let i = 0; i < 2000 && s.state !== 'playing'; i++) { t += DT_MS; game.step(t, DT_MS); }
    return traceFlight(s, () => { t += DT_MS; game.step(t, DT_MS); }, pilotTarget, pilot, STEPS, EVERY);
  }, [pilot, STEPS, EVERY, DT_MS]);
  await p.close();
  return out;
}

async function flyEngine(pilot, seed) {
  const { createWorld } = await import('../../src/sim/world.js');
  const { pilotTarget } = await import('../../src/sim/pilots.js');
  const { traceFlight } = await import('../../src/sim/trace.js');
  const w = createWorld(stored(seed), seed);
  for (let i = 0; i < 2000 && w.state !== 'playing'; i++) w.step(DT_MS / 1000);
  if (process.env.PLANT === 'co2') w.kit = { ...w.kit, co2Cruise: w.kit.co2Cruise * 1.000001 };   // a planted defect, engine only
  return traceFlight(w, () => w.step(Math.min(DT_MS, 50) / 1000), pilotTarget, pilot, STEPS, EVERY);
}

(async () => {
  const traces = {};
  if (ENGINE) {
    for (const pilot of PILOTS) for (const seed of SEEDS) traces[`${PLANE}/${pilot}/${seed}`] = await flyEngine(pilot, seed);
  } else {
    const { chromium } = require('playwright-core');
    const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
    for (const pilot of PILOTS) for (const seed of SEEDS) traces[`${PLANE}/${pilot}/${seed}`] = await flyGame(b, pilot, seed);
    await b.close();
  }
  if (!process.env.COMPARE) { console.log(JSON.stringify(traces)); return; }
  const gold = JSON.parse(fs.readFileSync(process.env.COMPARE, 'utf8')), bad = [];
  for (const [k, g] of Object.entries(gold)) {
    const n = traces[k]; if (!n) { bad.push(`${k}: not flown`); continue; }
    const i = g.chain.findIndex((x, j) => x !== n.chain[j]);
    if (i >= 0 || g.steps !== n.steps) {
      const at = i >= 0 ? i : Math.min(g.steps, n.steps), si = Math.floor(at / EVERY);
      bad.push(`${k}: first differs at step ${at} (golden ${g.steps} steps, now ${n.steps})\n    nearest golden sample: ${(g.samples[si] || '').slice(0, 300)}\n    nearest now sample:    ${(n.samples[si] || '').slice(0, 300)}`);
    }
  }
  if (bad.length) { console.log('DIFFERENT\n- ' + bad.join('\n- ')); process.exit(1); }
  console.log(`IDENTICAL: ${Object.keys(gold).length} flights, every step (${Object.values(gold).map(g => g.steps).join(', ')} steps)`);
})();
