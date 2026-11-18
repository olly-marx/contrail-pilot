// THE CROSSING CARDS on MISSIONS and THE CROSSINGS LESSON, with real taps at 390x844 and 320x568 (the owner, 2026-11-18: the crossing lines were "a wall of centered grey text ... I don't understand it,
// and it's ugly"; and "the game teaching should never end until everything about the game you care about is understood"). Data rules: tests/crosscard.cjs. Named lines:
//   A. NOT READY (an Asia pilot, every mission done, 3,000 km landed, nature 33): MISSIONS shows one card per crossing (3), each with its route, the land it opens, the rows Era / Plane / Nature
//      (Era ticked, Plane and Nature with a bar, nature "33 / 38") and one next line; none of the old text ("CROSSING:", "Needs:", "CROSSING TO"); no card wider than the screen; no FLY button.
//   B. READY: every row ticked, FLY THE CROSSING on each card; a REAL tap on the first one opens the crossing sheet (no flight starts); once told, the tap opens the CROSSINGS screen (CROSS TO at the
//      departure, GO TO elsewhere).
//   C. THE LESSON: a School player with every other lesson done (Asia: two areas, the case the old rule marked done): HOME's step points at SCHOOL; a real tap there starts the 'r-cross' rails on
//      MISSIONS: 5 steps (the card, Era, Plane, Nature, the next line) on the FIRST card, each passing the spotlight audit (tests/lib/spotlight.js); OK through them: the lesson is done.
// Run: python3 -m http.server 8000 & node tests/crosscard-ui.cjs   (plants in tools/plants.tsv)
require('./lib/shipped.js');
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js'), { audit } = require('./lib/spotlight.js');
const URL = process.env.URL || 'http://localhost:8000/';
const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
const BASE = { tutorialDone: true, muted: true, priceVersion: 99, fleet, freeGiven: true, freeProjectGiven: true, goodLandings: 3, pilotNamed: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, treePractice: true,
  flights: 40, landings: 30, tourToday: 999, areas: ['sasia', 'easia'], homeArea: 'sasia', city: 'KARACHI' };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const open = async (save, W, H, setup) => {
    const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: true }); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); }, save);
    await p.goto(URL); await ready(p); await p.waitForTimeout(900);
    if (setup) await p.evaluate(setup.fn, setup.arg);
    return p;
  };
  // Every mission of both areas done and N monsoon projects funded (8 = nature 33 of 38, 9 = 39).
  const SETUP = { arg: 0, fn: async n => { const M2 = await import('./src/missions2.js'), H = await import('./src/habitats.js'), s = game.registry.get('save');
    for (const a of ['sasia', 'easia']) for (const t of M2.TEMPLATES) s.missionsDone.push(`${a}:${t.id}`);
    s.habitat = { monsoon: H.REGION_DATA.monsoon.projects.slice(0, n).map(p => p.id) }; } };
  const cardsOf = p => p.evaluate(() => [...document.querySelectorAll('#mCross .xcard')].map(c => ({ text: c.innerText.replace(/\s+/g, ' ').trim(), route: c.querySelector('.xc-route').textContent, opens: c.querySelector('.xc-opens').textContent,
    rows: [...c.querySelectorAll('.xc-row')].map(r => ({ k: r.dataset.k, tick: !!r.querySelector('.xc-tick'), bar: !!r.querySelector('.xc-bar'), v: (r.querySelector('.xc-v') || {}).textContent || '' })),
    next: (c.querySelector('.xc-next') || {}).textContent || '', fly: !!c.querySelector('[data-cross]'), right: c.getBoundingClientRect().right, left: c.getBoundingClientRect().left })));
  const list = p => p.evaluate(() => document.getElementById('mList').innerText);

  for (const [W, H] of [[390, 844], [320, 568]]) {
    const tag = `${W}x${H}`;
    // A. Not ready.
    let p = await open({ ...BASE, tours: ['*'], seenTips: ['*'], bestDistance: 3000 }, W, H, { ...SETUP, arg: 8 });
    await p.tap('#tabMissions'); await p.waitForTimeout(600);
    let cards = await cardsOf(p), text = await list(p);
    check(cards.length === 3 && cards.map(c => c.route).join('|') === 'KARACHI > MUSCAT|SINGAPORE > PERTH|SAPPORO > ANCHORAGE', `${tag} A: one card per crossing, each with its route: ${JSON.stringify(cards.map(c => c.route))}`);
    check(cards.length && cards[0].opens === 'Opens Africa & the Middle East', `${tag} A: the card names the land it opens: ${cards.length && cards[0].opens}`);
    check(cards.length && cards.every(c => c.rows.map(r => r.k).join() === 'era,plane,nature' && c.rows[0].tick && !c.rows[0].bar && c.rows[1].bar && !c.rows[1].tick && c.rows[2].bar && c.rows[2].v === '33 / 38'),
      `${tag} A: Era ticked, Plane and Nature with a bar, nature "33 / 38": ${JSON.stringify(cards.map(c => c.rows))}`);
    check(cards.length && cards.every(c => /NATURE|HANGAR/.test(c.next) && !c.fly), `${tag} A: one next line naming where to go, no FLY button: ${JSON.stringify(cards.map(c => [c.next, c.fly]))}`);
    check(!/CROSSING:|Needs:|CROSSING TO/.test(text), `${tag} A: none of the old crossing text on MISSIONS: ${JSON.stringify(text.match(/.{0,30}(CROSSING:|Needs:|CROSSING TO).{0,30}/))}`);
    check(cards.every(c => c.left >= 0 && c.right <= W), `${tag} A: every card fits the screen: ${JSON.stringify(cards.map(c => [c.left, c.right]))}`);
    if (W === 390) { await p.evaluate(() => document.querySelector('#mCross').scrollIntoView()); await p.waitForTimeout(200); await p.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/crosscard-notready.png` : '/dev/null' }).catch(() => {}); }
    check(!p.errs.length, `${tag} A: page errors: ${p.errs}`);
    await p.close();

    // B. Ready.
    p = await open({ ...BASE, tours: ['*'], seenTips: ['*'], bestDistance: 99999 }, W, H, { ...SETUP, arg: 9 });
    await p.tap('#tabMissions'); await p.waitForTimeout(600);
    const sheetUp = await p.evaluate(() => !!document.getElementById('sheet'));
    if (sheetUp) { await p.tap('#sheet .sheet-ok'); await p.waitForTimeout(300); }   // (the one-time moment sheet may come by itself: it is not this test's subject)
    cards = await cardsOf(p);
    check(cards.length === 3 && cards.every(c => c.rows.every(r => r.tick && !r.bar) && c.fly && /^Ready!/.test(c.next)), `${tag} B: ready: every row ticked, Ready! and FLY THE CROSSING on each card: ${JSON.stringify(cards.map(c => [c.rows.map(r => r.tick), c.next, c.fly]))}`);
    await p.evaluate(() => { const s = game.registry.get('save'); s.crossingTold = []; });
    await p.tap('#mCross .xcard:first-child [data-cross]'); await p.waitForTimeout(500);
    let sh = await p.evaluate(() => ({ text: (document.getElementById('sheet') || {}).innerText || '', flying: !!game.registry.get('save').flyCrossing }));
    check(/MUSCAT is within reach/.test(sh.text) && !sh.flying, `${tag} B: a real tap on FLY THE CROSSING opens the crossing sheet and starts no flight: ${JSON.stringify(sh)}`);
    if (sh.text) { await p.tap('#sheet .sheet-ok'); await p.waitForTimeout(300); }
    await p.tap('#mCross .xcard:first-child [data-cross]'); await p.waitForTimeout(500);
    sh = await p.evaluate(() => (document.getElementById('sheet') || {}).innerText || '');
    check(/CROSS TO MUSCAT/.test(sh), `${tag} B: once told, at KARACHI the tap opens the CROSSINGS screen with CROSS TO MUSCAT: ${sh.replace(/\s+/g, ' ')}`);
    if (sh) { await p.tap('#sheet .sheet-ok'); await p.waitForTimeout(300); }
    await p.evaluate(() => { game.registry.get('save').crossingTold = ['arabian-sea', 'singapore-perth', 'north-pacific']; });
    await p.tap('#mCross .xcard:nth-child(2) [data-cross]'); await p.waitForTimeout(500);
    sh = await p.evaluate(() => (document.getElementById('sheet') || {}).innerText || '');
    check(/GO TO SINGAPORE/.test(sh), `${tag} B: away from its departure the card's button offers GO TO SINGAPORE: ${sh.replace(/\s+/g, ' ')}`);
    if (W === 390) { if (sh) { await p.tap('#sheet .sheet-ok'); await p.waitForTimeout(300); } await p.evaluate(() => document.querySelector('#mCross').scrollIntoView()); await p.waitForTimeout(200); await p.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/crosscard-ready.png` : '/dev/null' }).catch(() => {}); }
    check(!p.errs.length, `${tag} B: page errors: ${p.errs}`);
    await p.close();

    // C. The lesson.
    const TOURS = ['hangar', 'name', 'r-boards', 'r-free', 'r-nature', 'r-map', 'r-earth', 'r-school', 'r-takeoff1', 'r-takeoff2', 'r-res1', 'r-res2', 'r-systems', 'r-bonus', 'r-trees', 'r-parcels', 'r-practice', 'r-plant1', 'r-plant2', 'nature-lead', 'globe-hint'];
    p = await open({ ...BASE, school2: true, tours: TOURS, bestDistance: 5500, flights: 12, landings: 10 }, W, H, null);
    const spot = () => p.evaluate(() => { const t = game.registry.get('ui').tour; return t.el.hidden ? { key: null } : { key: t.spot().key, text: t.el.querySelector('.tbubble p').textContent }; });
    const lesson = () => p.evaluate(async () => { const L = await import('./src/lessons.js'); return (L.current(game.registry.get('save')) || {}).id || null; });
    check(await lesson() === 'crossings', `${tag} C: an Asia pilot (two areas) with every other lesson done stands at the crossings lesson: ${await lesson()}`);
    let st = null; for (let i = 0; i < 30 && !(st = await spot()).key; i++) await p.waitForTimeout(200);
    check(st.key === 'r-crosshint#1', `${tag} C: HOME points at SCHOOL: ${JSON.stringify(st)}`);
    await p.tap('#tabMissions');
    for (let n = 1; n <= 5; n++) {
      st = null; for (let i = 0; i < 30; i++) { st = await spot(); if (st.key === `r-cross#${n}`) break; await p.waitForTimeout(200); }
      check(st.key === `r-cross#${n}`, `${tag} C: step ${n} of the crossings lesson is up: ${JSON.stringify(st)}`);
      if (st.key !== `r-cross#${n}`) break;
      await p.waitForTimeout(500);
      const inFirst = await p.evaluate(() => { const t = game.registry.get('ui').tour.target, c = document.querySelector('#mCross .xcard'); return !!(t && c && c.contains(t)); });
      check(inFirst, `${tag} C: step ${n} points inside the first crossing card`);
      for (const prob of await audit(p)) fails.push(`${tag} C: ${prob}`);
      if (process.env.SHOTS && W === 390) await p.screenshot({ path: `${process.env.SHOTS}/crosslesson-${n}.png` });
      await p.tap('#tour .tbubble .btn'); await p.waitForTimeout(400);
    }
    await p.waitForTimeout(500);
    const after = await p.evaluate(async () => { const L = await import('./src/lessons.js'), s = game.registry.get('save'); return { done: L.lessonDone(s, L.BOARD.find(l => l.id === 'crossings')), tour: !document.getElementById('tour') || document.getElementById('tour').hidden }; });
    check(after.done && after.tour, `${tag} C: after the 5 steps the lesson is done and the guide is gone: ${JSON.stringify(after)}`);
    check(!p.errs.length, `${tag} C: page errors: ${p.errs}`);
    await p.close();
  }
  await b.close();
  if (fails.length) { console.log('FAIL crosscard-ui\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1); }
  console.log('PASS crosscard-ui: MISSIONS shows one card per crossing (route, land, Era/Plane/Nature, next line; FLY THE CROSSING when ready) and the crossings lesson walks the first card in 5 steps, at 390x844 and 320x568');
})();
