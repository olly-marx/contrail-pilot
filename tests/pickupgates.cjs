// Pick-ups follow the eras (0.10.2, user): no free SAF cans before the 2010s (SAF began in 2009), and no
// autopilot pick-ups until the Autopilot gadget is bought. Checked at the spawn roll the game uses.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/pickupgates.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const roll = async (secs, gadgets, r) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', x => x.abort());
    await p.addInitScript(([sec, g]) => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
      flights: 20, landings: 6, priceVersion: 2, flightSeconds: sec, levels: {}, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: g } })); }, [secs, gadgets]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(300);
    await p.click('#goBtn');
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
    const out = await p.evaluate(rr => { const s = game.scene.getScene('game'), rnd = s.rng, got = [];
      s.addPower = k => got.push(k); s.graceUntil = 1e12;
      s.nextStormAt = s.nextIssrAt = s.nextBirdsAt = s.nextTurbAt = s.nextTokenAt = 1e12;
      s.rng = () => rr; s.safOffered = true; s.nextPowerAt = s.distancePx; s.spawn(); s.rng = rnd;
      return got; }, r);
    await p.close();
    return out;
  };
  // A roll of 0.01 picks SAF (chance 0.1...), a roll of 0.99 picks autopilot (top 6-9%).
  check(JSON.stringify(await roll(0, {}, 0.01)) === '[]', 'the 1950s: no SAF can');
  check(JSON.stringify(await roll(0, {}, 0.99)) === '[]', 'no Autopilot gadget: no autopilot pick-up');
  check(JSON.stringify(await roll(0, { autopilot: 1 }, 0.99)) === '["auto"]', 'with Height hold: autopilot pick-ups');
  check(JSON.stringify(await roll(4 * 3600, {}, 0.01)) === '["saf"]', 'the 2010s (4 h of flying): SAF cans come back');
  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
