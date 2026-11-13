// The background city row in the GAME (src/GameScene.js updateScenery -> src/sim/rules.js cityRowAlpha; the user, 2026-11-13: buildings only within one storm gap of a city).
// A real take-off from LONDON; the flight is held still and its distance set: just after the city (row shown), mid-leg (row hidden), just before the next city (row shown).
// The strip's alpha is read after a few frames. tests/cityrow.cjs proves the rule in Node; this proves the game draws it. Run: python3 -m http.server 8000 & node tests/cityrowui.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const base = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, tours: ['*'], seenTips: ['*'],
  freeUpgrade: false, freeGiven: true, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); }, base);
    await p.goto(URL); await ready(p); await p.waitForTimeout(500);
    await p.evaluate(() => game.registry.get('ui').start()); await started(p);
    for (let i = 0; i < 80 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
    const look = where => p.evaluate(async w => {
      const s = game.scene.getScene('game'); s.hitsStorm = () => false; s.hitBird = () => false; s.explain = () => false;
      const ahead = s.nextAirport.worldX, behind = ahead - s.legKm(s.airportIndex);
      s.distancePx = w === 'after' ? behind + 100 : w === 'mid' ? (behind + ahead) / 2 : ahead - 100;
      await new Promise(r => setTimeout(r, 250));
      return { alpha: s.city.alpha, state: s.state, rule: s.cityRowAlpha() };
    }, where);
    const a = await look('after'), m = await look('mid'), n = await look('before');
    check(a.state === 'playing' && m.state === 'playing' && n.state === 'playing', `FIXTURE: the flight was playing for all three looks: ${JSON.stringify([a, m, n])}`);
    check(a.alpha > 0.9 && n.alpha > 0.9, `1: the buildings show just after the city and just before the next: ${a.alpha}, ${n.alpha}`);
    check(m.alpha < 0.1, `2: mid-leg the buildings are hidden: ${m.alpha}`);
    check(!p.errs.length, `page errors ${p.errs.slice(0, 2)}`);
    await ctx.close();
  } catch (e) { fails.push('exception: ' + String(e).split('\n')[0]); }
  await b.close();
  console.log(fails.length ? `FAIL cityrowui:\n - ${fails.join('\n - ')}` : 'PASS cityrowui: the game draws the city row only near a city');
  process.exit(fails.length ? 1 : 0);
})();
