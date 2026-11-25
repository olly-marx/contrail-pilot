// THE APPROACH MARKER (0.79.0 call, made SMALL in 0.79.1; Oliver: 'the countdown to an airport should be much more bold when you're getting close' (2026-11-24), then on the
// 16 px full-width call: 'don't block the whole view. Also on explore mode no airport gets highlighted' (2026-11-25); src/GameScene.js approachCall, src/config.js APPROACH).
// 390x844, a story accepted, in flight; the route view pinned (target or not, next airport the end or not):
//   1. 2,000 px out: no marker;  2. 1,100 px out: the small line under the route bar reads '<name> 1,100 m' in gold, and the runway arrow is on;
//   3. 400 px out: red (flashing);  4. the next airport is one to fly PAST on the way to the target: no marker;  5. FREE FLIGHT (no target): the next airport gets the marker;
//   6. nothing big in the sky: no game text wider than half the screen at 16 px;  7. after landing: no marker.
// Plants (tools/plants.tsv): the marker never shows; free flight left out. Run: python3 -m http.server 8000 & node tests/approach-ui.cjs
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
    const at = (left, nextIsEnd = true, target = true) => p.evaluate(async ([left, nextIsEnd, target]) => { const g = game.scene.getScene('game'); g.graceUntil = 1e12;
      if (!g._rv0) g._rv0 = g.routeView.bind(g); const rv = g._rv0(); g.routeView = () => ({ ...g._rv0(), nextIsEnd: g._end, target: g._tgt }); g._end = nextIsEnd; g._tgt = target;
      g.nextAirport.worldX = g.distancePx + left; g.nextAirport.name = rv.name;
      await new Promise(r => setTimeout(r, 300)); const t = g.nextText;
      const big = g.children.list.filter(o => o.type === 'Text' && o.visible && o.text && parseInt(o.style.fontSize) >= 16 && o.width > 144).map(o => o.text);
      return { name: rv.name, on: !!g.approachOn, text: t.text, color: t.style.color, big }; }, [left, nextIsEnd, target]);
    const far = await at(2000), mid = await at(1100), near = await at(400), other = await at(1100, false), free = await at(1100, true, false);
    check(!far.on, `1. 2,000 px out: no marker yet: ${JSON.stringify(far)}`);
    check(mid.on && new RegExp(`^${mid.name} 1,\\d{3} m$`).test(mid.text) && mid.color === '#ffe15a', `2. 1,100 px out: the small gold countdown and the arrow: ${JSON.stringify(mid)}`);
    check(near.on && ['#ff6b5a', '#ffe15a'].includes(near.color) && / m$/.test(near.text), `3. 400 px out: red, flashing: ${JSON.stringify(near)}`);
    check(!other.on, `4. the next airport is on the way, not the target: no marker: ${JSON.stringify(other)}`);
    check(free.on && free.text.startsWith(free.name), `5. free flight: the next airport gets the marker: ${JSON.stringify(free)}`);
    check([mid, near, free].every(v => !v.big.some(t => /LAND|\d m/.test(t))), `6. no big call across the sky: ${JSON.stringify([mid.big, near.big, free.big])}`);
    const landed = await p.evaluate(async () => { const g = game.scene.getScene('game'); g._end = true; g._tgt = true; g.state = 'landing'; g.landedAt = 'X'; await new Promise(r => setTimeout(r, 200)); return !!g.approachOn; });
    check(!landed, '7. no marker once landed');
  } catch (e) { check(false, `an exception stopped the run: ${String(e).split('\n')[0].slice(0, 160)}`); }
  check(!errs.length, `no page errors: ${errs.slice(0, 2).join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL approach-ui\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('PASS approach-ui: a small countdown and a runway arrow from 1,500 px before the airport to land at (the target, or in free flight the next one), red near it; nothing big in the sky');
})();
