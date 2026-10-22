// Every leg, every stretch (the art session's idea after the sea freeze, 2026-10-22): with projects
// done in EVERY region (so the land-cooling code runs), put the plane in the middle of each run of
// each leg's strip (src/geo.js: land, sea, ice) and let the real game loop run a moment. The flight
// must keep going, with no page errors, and the region below must be the one the strip says.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/everyleg.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const errs = [], fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(k => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear();
    localStorage.setItem(k, JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 9, priceVersion: 2, seeds: 50 })); } }, KEY);
  await p.goto(URL); await ready(p);
  // Every region: its first two projects done (the UK's too), so every region's cooling and animals are live.
  await p.evaluate(async () => { const h = await import('./src/habitats.js'), s = game.registry.get('save');
    s.habitat = Object.fromEntries(Object.entries(h.REGION_DATA).map(([r, d]) => [r, d.projects.slice(0, 2).map(x => x.id)])); });
  await p.click('#goBtn'); await started(p);
  for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);

  const runs = await p.evaluate(async () => {
    const { ROUTE, cityAt, legKm } = await import('./src/route.js'), g = await import('./src/geo.js'), s = game.scene.getScene('game');
    const out = [];
    for (let i = 0; i < ROUTE.length; i++) for (const run of g.legStrip(cityAt(i), cityAt(i + 1))) {
      // Put the plane mid-run on leg i (as if it had taken off from city i).
      s.startCity = i; s.airportIndex = 0; s.nextAirport = { worldX: legKm(i), name: cityAt(i + 1).name, spawned: true };
      s.distancePx = legKm(i) * (run.from + run.to) / 2; s.updateScenery(1);
      const t0 = s.gameTime; await new Promise(r => setTimeout(r, 250));
      out.push({ leg: `${cityAt(i).name}>${cityAt(i + 1).name}`, want: run.region, got: s.regionNow, ran: s.gameTime - t0, state: s.state });
    }
    return out; });
  for (const r of runs) {
    check(r.got === r.want, `${r.leg}: over ${r.want} the game thinks ${r.got}`);
    check(r.ran > 50, `${r.leg}: the game froze over ${r.want} (${Math.round(r.ran)} ms of game time in 250 ms)`);   // (the flight may END while we jump about: that is fine; FREEZING is not)
  }
  const kinds = [...new Set(runs.map(r => r.want))];
  check(kinds.includes('ocean') && kinds.includes('ice'), `the route must cross sea and ice for this test to mean anything: ${kinds}`);
  check(errs.length === 0, `page errors: ${[...new Set(errs)].join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.slice(0, 15).join('\n- ')); process.exit(1); }
  console.log(`PASS everyleg (${runs.length} stretches over ${kinds.length} kinds of land and sea)`);
})();
