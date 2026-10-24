// Air traffic control (eras stage 6, 2026-10-23): a slightly kinder sky, nothing new to do in flight.
// Gaps wider (x1.03 at level 5+), less bumpy air (x0.85), fewer bird flocks (x0.75, level 6), and the
// "get LOW to land" call comes at 450 m instead of 300 m (level 4+). No ATC = today's game.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/atc.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const fly = async atc => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(a => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
      flights: 20, landings: 6, seeds: 200, flightSeconds: 8000, levels: { trees: 1 }, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: { atc: a }, gadgets: {} } })); }, atc);
    await p.goto(URL); await ready(p); await p.waitForTimeout(300);
    await p.click('#goBtn');
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
    const r = await p.evaluate(() => {
      const s = game.scene.getScene('game'), rnd = Math.random; s.graceUntil = 1e12;
      // Storm gap: same pair count, capture the gap handed to the drawing.
      let gap = null; s.addStormPairAt = (x, y, g) => { gap = g; }; s.addNoFlyAt = (x, y, g) => { gap = g; };
      s.stormCount = 0; s.warmStorms = 0; Math.random = () => 0.99; s.issrs.forEach(i => { i.x = -1e4; }); s.addStormPair();
      // Turbulence and birds: the spawn roll at a fixed 0.45 (turbulence chance 0.5) and 0.5 (birds 0.55).
      const t0 = s.turbs.length; Math.random = () => 0.45; s.nextTurbAt = s.distancePx; s.nextBirdsAt = 1e12; s.nextStormAt = 1e12; s.nextIssrAt = 1e12; s.nextTokenAt = 1e12; s.nextPowerAt = 1e12; s.spawn();
      const turb = s.turbs.length - t0;
      const b0 = s.birds.length; Math.random = () => 0.5; s.nextBirdsAt = s.distancePx; s.nextTurbAt = 1e12; s.spawn();
      const birds = s.birds.length - b0;
      Math.random = rnd;
      // The landing call at 400 m from the runway.
      s.nextAirport.worldX = s.distancePx + 400; s.updateTexts(false);
      return { gap, turb, birds, call: s.nextText.text, kit: [s.kit.gaps, s.kit.gapTurb, s.kit.gapBirds, s.kit.airportEarly] };
    });
    await p.close();
    return r;
  };
  const none = await fly(0), full = await fly(6);
  check(none.gap === 150 && full.gap === Math.round(150 * 1.03), `storm gap 150 -> 155 with ATC 6: ${none.gap} -> ${full.gap}`);
  check(none.turb === 1 && full.turb === 0, `at a roll of 0.45, bumpy air spawns without ATC (chance 0.5) but not with it (0.425): ${none.turb}, ${full.turb}`);
  check(none.birds === 1 && full.birds === 0, `at a roll of 0.5, a flock spawns without ATC (0.55) but not with bird advisories (0.41): ${none.birds}, ${full.birds}`);
  check(!/get LOW/.test(none.call) && /get LOW to land/.test(full.call), `400 m out: the landing call only with ATC: "${none.call}" / "${full.call}"`);
  console.log({ fails, none, full });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
