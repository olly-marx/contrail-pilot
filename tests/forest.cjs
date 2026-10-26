// Trees on long flights (FOREST in src/config.js): trees cool a little on short flights; from
// 10,000 km grown trees get an old-wood boost, the full boost only with all 5 kinds planted this
// flight; and a forest (and rewilded land) can only soak up so much CO2 per flight, then stops.
// Without that limit a careful pilot with a forest flew for ever (measured 2026-10-21).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/forest.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9,
    levels: { trees: 4, species: 4 }, habitat: { woodland: ['deadwood', 'meadow', 'margins', 'hedgerow', 'pond', 'woodland', 'voles', 'beavers', 'rewet', 'storks', 'martens'] }, planted: { oak: 9, birch: 9, rowan: 9, spruce: 9, orchard: 9 } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(800); await p.click('#goBtn');
  for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
  const r = await p.evaluate(async () => {
    const { FOREST } = await import('./src/config.js');
    const s = game.scene.getScene('game'), out = { FOREST: { ...FOREST } };
    game.loop.sleep();
    s.hitsStorm = () => false; s.hitBird = () => false; s.explain = () => false; s.nextAirport.worldX = 1e12;
    const kinds = n => { s.speciesPlanted = new Set(['spruce', 'birch', 'oak', 'rowan', 'orchard'].slice(0, n)); };
    // The old-wood boost and the forest's limit, by distance and kinds.
    s.distancePx = 5000; kinds(5); out.boost5k = s.oldWood();
    s.distancePx = 25000; out.boost25k = s.oldWood(); out.store5 = s.forestStore();
    kinds(4); out.boost25k4 = s.oldWood(); out.store4 = s.forestStore();
    kinds(1); out.store1 = s.forestStore();
    // Fly with 6 grown trees of all 5 kinds, far into a flight, until well past the limit.
    kinds(5); s.distancePx = 25000;
    for (const k of ['spruce', 'birch', 'oak', 'rowan', 'orchard', 'oak']) s.trees.push({ sprite: { active: false, setTexture() {}, setScale() {} }, kind: k, plantedAt: s.elapsed - 60, stage: 2 });
    let t = game.loop.now || performance.now();
    // 50 ms frames (the game's own largest step): a third of the frames for the same game time (CI speed).
    const step = n => { for (let i = 0; i < n; i++) { t += 50; s.heat = 0; if (s.plane.y > 220 && s.plane.vy > -40) s.applyFlap(); game.step(t, 50); } };
    step(20); out.rateEarly = s.breakdown.trees;   // ~1 s of cooling at full strength
    step(20 * 130);   // 130 s: the forest (80) and land (30) are both full well before
    out.forestStored = s.forestStored; out.landStored = s.landStored; out.said = s.forestFullSaid;
    const before = s.breakdown.trees; step(200); out.after = s.breakdown.trees - before;
    out.state = s.state;
    return out;
  });
  const F = r.FOREST, near = (a, b) => Math.abs(a - b) < 1e-6;
  check(r.boost5k === 0, `no old-wood boost before ${F.from} km: ${r.boost5k}`);
  check(r.boost25k >= 1, `long flights must make grown trees at least twice as strong: boost ${r.boost25k}`);
  check(near(r.boost25k, F.boost), `full boost at 25,000 km with all 5 kinds: ${r.boost25k}`);
  check(near(r.boost25k4, F.boost * Math.pow(4 / 5, F.power)), `4 kinds get less boost: ${r.boost25k4}`);
  check(near(r.store5, F.store) && r.store4 < F.store / 2 && r.store1 === F.storeMin, `the forest holds the most with all 5 kinds: 5=${r.store5} 4=${r.store4} 1=${r.store1}`);
  check(r.rateEarly > 0.3, `a grown, old forest cools quickly before it is full: ${r.rateEarly.toFixed(2)} in 1 s`);
  check(Math.abs(r.forestStored - F.store) < 1.5, `the forest stops at its limit (${F.store}): ${r.forestStored.toFixed(1)}`);
  check(r.landStored <= F.landStore + 0.1 && r.landStored > F.landStore - 1, `rewilded land stops at its limit (${F.landStore}): ${r.landStored.toFixed(1)}`);
  check(r.after === 0, `no more cooling once both are full: ${r.after}`);
  check(r.said, 'the "forest is full" message should have shown');
  check(r.state === 'playing', `the flight should still be going: ${r.state}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS forest (stored ${r.forestStored.toFixed(1)} + land ${r.landStored.toFixed(1)})`);
})();
