// The contrail margin (eras stage 4, 2026-10-23): the Comet makes contrails only deep inside icy air,
// the 747 inside it (today's game), the 1990s twin right up to and a little past its drawn edge.
// Probed with the real scene's icy-air test at points 0.5, 0.9 and 1.1 of a blob's radius.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/margin.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
    flights: 20, landings: 6, seeds: 200, flightSeconds: 8000, levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: {}, jumbo: {}, twin: {} }, systems: {}, gadgets: {} } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(500);
  await p.click('#goBtn');
  await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });

  // A patch with one round blob filling its box (radius 50) centred at (200, 200), so 1.1 is outside the box; a 4 px box placed along its middle.
  const probe = await p.evaluate(() => {
    const s = game.scene.getScene('game'), i = { blobs: [{ cx: 50, cy: 50, rx: 50, ry: 50 }], x: 150, y: 150, width: 100, height: 100 };
    const at = f => ({ x: 200 + 50 * f - 2, y: 198, w: 4, h: 4 });   // box centre at f x radius to the right
    const out = {};
    for (const m of ['deep', 'inside', 'edge']) { s.kit.margin = m; out[m] = [0.5, 0.9, 1.1].map(f => s.inIssrShape(i, at(f))); }
    return out;
  });
  check(JSON.stringify(probe.deep) === '[true,false,false]', `Comet (deep): only deep inside: ${probe.deep}`);
  check(JSON.stringify(probe.inside) === '[true,true,false]', `747 (inside): the drawn shape, as today: ${probe.inside}`);
  check(JSON.stringify(probe.edge) === '[true,true,true]', `1990s twin (edge): a little past the edge: ${probe.edge}`);
  // The planes carry their margins.
  const m = await p.evaluate(async () => { const F = await import('/src/fleet.js'); return F.PLANES.map(x => x.margin).join(); });
  check(m === 'deep,inside,edge', `Comet deep, 747 inside, twin edge: ${m}`);

  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
