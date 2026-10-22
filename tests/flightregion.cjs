// The region below the plane in flight (the user, 2026-10-22: real geography decides it; src/geo.js):
// the ground and hills fade to that region's strips, its animals take over, the land below is the one
// that soaks up CO2, the first visit DISCOVERS the region (its NATURE tab opens), and the new strips
// get the same night tint as the old ones.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/flightregion.cjs
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
  // In ATHENS (route index 4): the leg to CAIRO is Mediterranean, then sea, then desert.
  const save = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 9, priceVersion: 2, seeds: 50,
    city: 4, visited: ['LONDON', 'PARIS', 'BERLIN', 'ROME', 'ATHENS'], habitat: { woodland: ['meadow', 'hedgerow', 'pond'], desert: ['reserve'] } };
  await p.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem(k, JSON.stringify(v)); } }, [KEY, save]);
  await p.goto(URL); await ready(p); await p.waitForTimeout(500);
  await p.click('#goBtn'); await started(p);
  for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);

  // 1. Taking off from Athens: the Mediterranean is below; its strips; no UK meadow flowers or hedge.
  const start = await p.evaluate(() => { const s = game.scene.getScene('game');
    return { r: s.regionNow, ground: s.terrain && s.terrain.ground, flowers: s.flowers && s.flowers.visible, hedge: s.hedge && s.hedge.visible, wild: s.wildlife.region }; });
  check(start.r === 'mediterranean' && start.ground === 'ground-mediterranean' && start.wild === 'mediterranean', `start over the Mediterranean: ${JSON.stringify(start)}`);
  check(start.flowers === false && start.hedge === false, `UK meadow flowers and hedges stay in the UK: ${JSON.stringify(start)}`);

  // 2. 85% of the way to Cairo: the desert. Its ground fades in, its animals and cooling take over, it is discovered.
  const mid = await p.evaluate(async () => { const s = game.scene.getScene('game'), n = await import('./src/nature.js');
    s.distancePx = s.nextAirport.worldX - 0.15 * (s.nextAirport.worldX - 0);   // the first leg starts at 0
    s.updateScenery(1);
    return { r: s.regionNow, fading: s.fading && s.fading.ground, wild: s.wildlife.region, kinds: s.wildlife.wildKinds,
      cool: n.natureCooling(s.save, s.regionNow), coolUk: n.natureCooling(s.save), disc: !!(s.save.discovered || {}).desert }; });
  check(mid.r === 'desert' && mid.fading === 'ground-desert', `near Cairo the desert is below and fading in: ${JSON.stringify(mid)}`);
  check(mid.wild === 'desert' && mid.kinds.includes('animal-camel') && !mid.kinds.includes('animal-rabbit'), `desert animals, not UK ones: ${JSON.stringify(mid.kinds)}`);
  check(Math.abs(mid.cool - 0.04) < 1e-9 && Math.abs(mid.coolUk - 0.12) < 1e-9, `only the land below soaks up CO2 (1 desert project, not 3 UK ones): ${mid.cool} vs ${mid.coolUk}`);
  check(mid.disc, 'flying over the desert discovers it');
  await p.waitForTimeout(1900);
  const after = await p.evaluate(() => { const s = game.scene.getScene('game'); return { ground: s.terrain.ground, hills: s.terrain.hills, a: s.ground2.alpha }; });
  check(after.ground === 'ground-desert' && after.hills === 'hills-desert' && after.a === 0, `after the fade the desert strips stay: ${JSON.stringify(after)}`);

  // 3. At night the fading strip gets the same tint as the ground (or it would glow).
  const tint = await p.evaluate(() => { const s = game.scene.getScene('game');
    s.ground2.setAlpha(0.5); s.nightAmount = () => 1; s.drawSky(s.gameTime);   // full night
    return { g: s.ground.tintTopLeft, g2: s.ground2.tintTopLeft, h: s.hills.tintTopLeft, h2: s.hills2.tintTopLeft }; });
  check(tint.g !== 0xffffff, `night really tints the ground (else this check proves nothing): ${tint.g}`);
  check(tint.g === tint.g2 && tint.h === tint.h2, `the fading strips share the tint: ${JSON.stringify(tint)}`);
  await p.screenshot({ path: '/tmp/flightregion.png' });

  // 4. After the flight the desert tab is open on NATURE (discovered in flight, never landed there).
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.finish({ landed: false }); });
  await p.waitForTimeout(1500);
  await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(300);
  const tab = await p.evaluate(() => { const e = document.querySelector('[data-region="desert"]'); return e && !e.disabled; });
  check(tab, 'the desert tab opens after flying over it');

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS flightregion');
})();
