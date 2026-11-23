// STORY MISSIONS IN THE REAL GAME (src/storyboard.js, src/ui.js showMissions, src/missions2.js onFlight; the user, 2026-11-23). 390x844, a season 2 save in
// LONDON that has flown 25,000 km with Europe and Africa open. Real taps on the MISSIONS screen; the flight's landing is set by hand (as tests/journey.cjs does).
//   1. MISSIONS shows three story cards; exactly one is LOCKED (it needs an upgrade): it has a GET IT button and no ACCEPT; the area ladder's rows are gone.
//   2. Reopening MISSIONS shows the same three offers (nothing is made again).
//   3. ACCEPT: the destination is the story's first stop, and in flight the route strip names it.
//   4. Landing at the first stop (the pickup) moves the destination to the second stop; landing at the second pays that stage
//      (500 seeds and 40 crystals per 15,000 km of it) straight into the bank, and the results list it.
//   5. A crash changes nothing.
// Plants: tools/plants.tsv, test stories-ui. Run: python3 -m http.server 8000 & node tests/stories-ui.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const SAVE = { areas: ['weurope', 'africa'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'],
  freeGiven: true, freeProjectGiven: true, landings: 120, flights: 200, seeds: 300, crystals: 20, bestDistance: 25000, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, SAVE);
  try {
    await p.goto(URL); await ready(p); await p.waitForTimeout(600);
    const save = () => p.evaluate(() => game.registry.get('save'));
    const missions = async () => { await p.evaluate(() => game.registry.get('ui').go('missions')); await p.waitForTimeout(400);
      return p.evaluate(() => ({ cards: [...document.querySelectorAll('#mList .scard')].map(c => ({ title: c.querySelector('.stitle').textContent, locked: c.classList.contains('locked'), accept: !!c.querySelector('[data-saccept]'), getit: !!c.querySelector('[data-sgoto]') })),
        ladder: document.querySelectorAll('#mList .rowc.goal.star').length })); };
    // 1.
    const m1 = await missions();
    check(m1.cards.length === 3, `three story cards: ${JSON.stringify(m1)}`);
    check(m1.cards.filter(c => c.locked).length === 1 && m1.cards.filter(c => c.locked).every(c => c.getit && !c.accept), `exactly one is locked, with GET IT and no ACCEPT: ${JSON.stringify(m1.cards)}`);
    check(m1.cards.filter(c => !c.locked).every(c => c.accept), 'the other two can be accepted');
    check(m1.ladder === 0, 'no starred ladder rows any more');
    // 2.
    const board1 = JSON.stringify((await save()).storyBoard);
    await p.evaluate(() => game.registry.get('ui').go('fly')); await p.waitForTimeout(200);
    await missions();
    check(JSON.stringify((await save()).storyBoard) === board1, 'reopening MISSIONS shows the same three offers');
    // 3.
    await p.click('#mList [data-saccept]'); await p.waitForTimeout(400);
    let s = await save(); const o = s.storyBoard.find(x => x && x.id === s.storyActive);
    check(o && s.aimCity === o.stops[0], `ACCEPT: the destination is the first stop (${s.aimCity} vs ${o && o.stops[0]})`);
    if (!o) throw new Error('no story accepted');
    await p.evaluate(() => game.registry.get('ui').go('fly')); await p.waitForTimeout(300);
    await p.evaluate(() => game.registry.get('ui').start()); await started(p).catch(() => null);
    const strip = await p.waitForFunction(() => { const g = game.scene.getScene('game'); return g && g.state === 'playing' && g.strip && g.strip.shown ? g.strip.name.text : false; }, null, { timeout: 15000 }).then(h => h.jsonValue()).catch(() => null);
    check(strip === o.stops[0] || (o.stops[0] === 'LONDON'), `in flight the route strip names the first stop ${o.stops[0]}: ${strip}`);
    // 5. a crash: nothing changes.
    const before = JSON.stringify({ a: s.storyActive, r: o.reached || 0, aim: s.aimCity });
    await p.evaluate(() => { const g = game.scene.getScene('game'); g.landedAt = null; g.finish({ landed: false }); });
    await p.waitForTimeout(300);
    s = await save();
    const o2 = s.storyBoard.find(x => x && x.id === o.id);
    check(JSON.stringify({ a: s.storyActive, r: o2.reached || 0, aim: s.aimCity }) === before, `a crash changes the story nothing: ${before} -> ${JSON.stringify({ a: s.storyActive, r: o2.reached || 0, aim: s.aimCity })}`);
    // 4. land at the first stop, then the second (the landing set by hand on the banked flight).
    const land = city => p.evaluate(city => { const ui = game.registry.get('ui'), sv = game.registry.get('save'); sv.city = city === sv.city ? sv.city : sv.city;
      const g = game.scene.getScene('game'); g.state = 'playing'; g.landedAt = city; g.airportIndex = 0; g.airportsSkipped = 0; g.finish({ landed: true }); return { result: (g.result.rewards || []).map(r => r.label), seeds: sv.seeds, crystals: sv.crystals }; }, city);
    const r1 = await land(o.stops[0]); s = await save();
    check(s.aimCity === o.stops[1], `after the pickup the destination is the second stop ${o.stops[1]}: ${s.aimCity}`);
    const seeds0 = s.seeds, crystals0 = s.crystals || 0;
    const r2 = await land(o.stops[1]); s = await save();
    const want = { seeds: Math.round(o.stages[0] * 500 / 15000), crystals: Math.round(o.stages[0] * 40 / 15000) };
    check(s.seeds - seeds0 >= want.seeds && (s.crystals || 0) - crystals0 >= want.crystals, `the second stop pays its ${o.stages[0]} km stage (${JSON.stringify(want)}): seeds ${seeds0} -> ${s.seeds}, crystals ${crystals0} -> ${s.crystals}`);
    check(r2.result.some(l => l.includes(o.title) && l.includes(o.stops[1])), `the results list the story stop: ${JSON.stringify(r2.result)}`);
    check(o.stops.length < 3 || s.aimCity === o.stops[2], `and the destination moves on to ${o.stops[2]}: ${s.aimCity}`);
  } catch (e) { check(false, `an exception stopped the run: ${String(e).split('\n')[0].slice(0, 160)}`); }
  check(!errs.length, `no page errors: ${errs.slice(0, 2).join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL stories-ui\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('PASS stories-ui: three fixed story cards (one locked with GET IT), ACCEPT sets the destination and the strip names it, each stop pays its stage and moves the destination on');
})();
