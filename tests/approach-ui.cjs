// THE APPROACH CALL (0.79.0; Oliver, 2026-11-24: 'I forgot to land. I just missed the airport ... the countdown to an airport should be much more bold when you're getting close';
// src/GameScene.js approachCall, src/config.js APPROACH). 390x844, a story accepted, in flight with the target as the next airport (the route view pinned to say so):
//   1. 2,000 px out: no call;  2. 1,100 px out: 'LAND AT <target>' and the metres, 16 px, gold;  3. 300 px out: the call turns red (it flashes);
//   4. a target that is NOT the next airport: no call;  5. after landing (state 'landing'): no call.
// Plants (tools/plants.tsv): the call never shows. Run: python3 -m http.server 8000 & node tests/approach-ui.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const SAVE = { areas: ['weurope', 'africa'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], shownLines: ['*'],
  freeGiven: true, freeProjectGiven: true, landings: 120, flights: 200, seeds: 300, crystals: 20, bestDistance: 25000, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(s => { if (!sessionStorage.getItem('set')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('set', '1'); } }, SAVE);
  try {
    await p.goto(URL); await ready(p); await p.waitForTimeout(600);
    await p.evaluate(() => game.registry.get('ui').go('missions')); await p.waitForTimeout(400); await p.click('#mList [data-saccept]'); await p.waitForTimeout(300);
    await p.evaluate(() => game.registry.get('ui').go('fly')); await p.waitForTimeout(300); await p.evaluate(() => game.registry.get('ui').start());
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
    const at = (left, nextIsEnd = true) => p.evaluate(async ([left, nextIsEnd]) => { const g = game.scene.getScene('game'); g.graceUntil = 1e12;
      if (!g._rv0) g._rv0 = g.routeView.bind(g); const rv = g._rv0(); g.routeView = () => ({ ...g._rv0(), nextIsEnd: g._end }); g._end = nextIsEnd;
      g.nextAirport.worldX = g.distancePx + left; g.nextAirport.name = rv.name;
      await new Promise(r => setTimeout(r, 300)); const t = g.approachText; return { name: rv.name, shown: t.visible, text: t.text, size: t.style.fontSize, color: t.style.color }; }, [left, nextIsEnd]);
    const far = await at(2000), mid = await at(1100), near = await at(300), other = await at(1100, false);
    check(!far.shown, `1. 2,000 px out: no call yet: ${JSON.stringify(far)}`);
    check(mid.shown && mid.text.startsWith(`LAND AT ${mid.name}`) && /\d m$/.test(mid.text) && mid.size === '16px' && mid.color === '#ffe15a', `2. 1,100 px out: the big gold call: ${JSON.stringify(mid)}`);
    check(near.shown && ['#ff6b5a', '#ffffff'].includes(near.color), `3. 300 px out: the call is red / flashing: ${JSON.stringify(near)}`);
    check(!other.shown, `4. the target is not the next airport: no call: ${JSON.stringify(other)}`);
    const landed = await p.evaluate(async () => { const g = game.scene.getScene('game'); g._end = true; g.state = 'landing'; g.landedAt = 'X'; await new Promise(r => setTimeout(r, 200)); return g.approachText.visible; });
    check(!landed, '5. no call once landed');
  } catch (e) { check(false, `an exception stopped the run: ${String(e).split('\n')[0].slice(0, 160)}`); }
  check(!errs.length, `no page errors: ${errs.slice(0, 2).join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL approach-ui\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('PASS approach-ui: the big LAND AT call shows 1,500 px before the target, turns red near it, and not for another airport or after landing');
})();
