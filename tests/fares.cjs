// Passenger fares (eras, 2026-10-23): a LANDED flight pays seeds per 1,000 km by plane (Comet 2,
// 747 3, twin 4) x the Cabin upgrades; a crash pays none. The results tally shows a fares row.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/fares.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const fly = async (fleet, landed) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(f => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
      flights: 20, landings: 6, seeds: 200, flightSeconds: 8000, levels: { trees: 1 }, fleet: f, mission: 99 })); }, fleet);
    await p.goto(URL); await ready(p); await p.waitForTimeout(300);
    await p.click('#goBtn');
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
    const r = await p.evaluate(async l => { const { WORLD } = await import('/src/config.js'); const s = game.scene.getScene('game');
      s.graceUntil = 0; s.distancePx = 5000000 * WORLD.pxPerMetre; s.landedAt = s.path[1]; s.finish(l ? { landed: true } : { reason: 'Bird strike!\nYou hit a bird.' });
      return s.result.earned.filter(e => e.label === 'Passenger fares').map(e => e.n); }, landed);
    let row = null;
    if (landed) { await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 10000 }); await p.click('#results'); await p.waitForTimeout(800);
      row = await p.evaluate(() => !document.getElementById('rFareRow').hidden && document.getElementById('rFare').textContent); }
    await p.close();
    return { fares: r, row };
  };
  const comet = await fly({ plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, true);
  const jumbo = await fly({ plane: 'jumbo', planes: { comet: {}, jumbo: { cabin: 3 } }, systems: {}, gadgets: {} }, true);
  const crash = await fly({ plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, false);
  check(JSON.stringify(comet.fares) === '[10]' && comet.row === '+10', `Comet, 5,000 km landed: 2 x 5 = 10 seeds, shown: ${JSON.stringify(comet)}`);
  check(JSON.stringify(jumbo.fares) === '[20]', `747 with business class (x1.35): 3 x 5 x 1.35 = 20: ${JSON.stringify(jumbo)}`);
  check(JSON.stringify(crash.fares) === '[]', `a crash pays no fares: ${JSON.stringify(crash)}`);
  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
