// THE CROSSING CARDS on MISSIONS and THE CROSSINGS LESSON, with real taps at 390x844 and 320x568 (the owner, 2026-11-18: the crossing lines were "a wall of centered grey text ... I don't understand it,
// and it's ugly"; and "the game teaching should never end until everything about the game you care about is understood"). Data rules: tests/crosscard.cjs. Named lines:
//   (Oliver, 2026-11-20: three cards repeating the same rows became ONE card, '3 WAYS TO CROSS', and FLY A CROSSING asks 'Where would you like to go?')
//   A. NOT READY (an Asia pilot, every mission done, 3,000 km landed): MISSIONS shows ONE card (V4, 0.73.0: one crossing on offer, Asia's shortest, KARACHI > MUSCAT), the land it opens, the one
//      row Range with a bar, and one next line; none of the old text ("CROSSING:", "Needs:", "CROSSING TO"); no card wider than the screen; no FLY button.
//   B. READY: every row ticked, FLY A CROSSING; a REAL tap opens 'Where would you like to go?' with one button per crossing (no flight starts); KARACHI > MUSCAT opens the CROSSINGS screen
//      (CROSS TO MUSCAT at its departure), SINGAPORE > PERTH offers GO TO SINGAPORE.
//   C. THE LESSON: a School player with every other lesson done (Asia: two areas, the case the old rule marked done): HOME's step points at SCHOOL; a real tap there starts the 'r-cross' rails on
//      MISSIONS: 3 steps (the card, Range, the next line; 5 with Era and Nature before 0.73.0) on the FIRST card, each passing the spotlight audit (tests/lib/spotlight.js); OK through them: the lesson is done.
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
  // Every mission of both areas done and N monsoon projects funded (pacing A2, LAND_EVEN on: 5 = nature 24 of 30, 9 = 47).
  const SETUP = { arg: 0, fn: async n => { const M2 = await import('./src/missions2.js'), H = await import('./src/habitats.js'), s = game.registry.get('save');
    for (const a of ['sasia', 'easia']) for (const t of M2.TEMPLATES) s.missionsDone.push(`${a}:${t.id}`);
    s.habitat = { monsoon: H.REGION_DATA.monsoon.projects.slice(0, n).map(p => p.id) }; } };
  const cardsOf = p => p.evaluate(() => [...document.querySelectorAll('#mCross .xcard')].map(c => ({ text: c.innerText.replace(/\s+/g, ' ').trim(), route: c.querySelector('.xc-route').textContent, opens: c.querySelector('.xc-opens').textContent,
    rows: [...c.querySelectorAll('.xc-row')].map(r => ({ k: r.dataset.k, tick: !!r.querySelector('.xc-tick'), bar: !!r.querySelector('.xc-bar'), v: (r.querySelector('.xc-v') || {}).textContent || '' })),
    next: (c.querySelector('.xc-next') || {}).textContent || '', fly: !!c.querySelector('[data-cross], [data-pick]'), right: c.getBoundingClientRect().right, left: c.getBoundingClientRect().left })));
  const list = p => p.evaluate(() => document.getElementById('mList').innerText);

  for (const [W, H] of [[390, 844], [320, 568]]) {
    const tag = `${W}x${H}`;
    // A. Not ready.
    let p = await open({ ...BASE, tours: ['*'], seenTips: ['*'], crossMomentTest: true, bestDistance: 3000 }, W, H, { ...SETUP, arg: 5 });
    await p.tap('#tabMissions'); await p.waitForTimeout(600);
    let cards = await cardsOf(p), text = await list(p);
    check(cards.length === 1 && cards[0].route === 'KARACHI > MUSCAT', `${tag} A: ONE card, the one crossing on offer: ${JSON.stringify(cards.map(c => c.route))}`);
    check(cards.length && cards[0].opens === 'Opens Africa & the Middle East', `${tag} A: the card names the land it opens: ${cards.length && cards[0].opens}`);
    check(cards.length && cards.every(c => c.rows.map(r => r.k).join() === 'plane' && c.rows[0].bar && !c.rows[0].tick),
      `${tag} A: the one Range row with a bar: ${JSON.stringify(cards.map(c => c.rows))}`);
    check(cards.length && cards.every(c => /HANGAR/.test(c.next) && !c.fly), `${tag} A: one next line naming where to go, no FLY button: ${JSON.stringify(cards.map(c => [c.next, c.fly]))}`);
    check(!/CROSSING:|Needs:|CROSSING TO/.test(text), `${tag} A: none of the old crossing text on MISSIONS: ${JSON.stringify(text.match(/.{0,30}(CROSSING:|Needs:|CROSSING TO).{0,30}/))}`);
    check(cards.every(c => c.left >= 0 && c.right <= W), `${tag} A: every card fits the screen: ${JSON.stringify(cards.map(c => [c.left, c.right]))}`);
    if (W === 390) { await p.evaluate(() => (document.querySelector('#mCross') || document.body).scrollIntoView()); await p.waitForTimeout(200); await p.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/crosscard-notready.png` : '/dev/null' }).catch(() => {}); }
    check(!p.errs.length, `${tag} A: page errors: ${p.errs}`);
    await p.close();

    // B. Ready.
    p = await open({ ...BASE, tours: ['*'], seenTips: ['*'], crossMomentTest: true, bestDistance: 99999 }, W, H, { ...SETUP, arg: 9 });
    if (await p.evaluate(() => !!document.getElementById('crossUnlock'))) { await p.waitForTimeout(2800); await p.tap('#cuLater'); await p.waitForTimeout(300); }   // (V4: ready on load, so the moment comes first)
    await p.tap('#tabMissions'); await p.waitForTimeout(600);
    const sheetUp = await p.evaluate(() => !!document.getElementById('sheet'));
    if (sheetUp) { await p.tap('#sheet .sheet-ok'); await p.waitForTimeout(300); }   // (the one-time moment may come by itself: it is not this test's subject)
    if (await p.evaluate(() => !!document.getElementById('crossUnlock'))) { await p.waitForTimeout(2800); await p.tap('#cuLater'); await p.waitForTimeout(300); }   // (since 0.69.0 the moment is the full-screen Crossing unlocked! card)
    cards = await cardsOf(p);
    check(cards.length === 1 && cards.every(c => c.rows.every(r => r.tick && !r.bar) && c.fly && /^Ready!/.test(c.next)), `${tag} B: ready: one card, every row ticked, Ready! and FLY A CROSSING: ${JSON.stringify(cards.map(c => [c.rows.map(r => r.tick), c.next, c.fly]))}`);
    const flyBtn = await p.$('#mCross .xcard [data-cross], #mCross .xcard [data-pick]');
    if (!flyBtn) { fails.push(`${tag} B: no FLY button on the ready card (stopping this size)`); await p.close(); continue; }   // (fail by name, not by a timeout)
    await flyBtn.tap(); await p.waitForTimeout(500);
    // V4 (0.73.0): ONE crossing on offer, no 'Where would you like to go?': the tap opens its CROSSINGS screen (CROSS TO MUSCAT at its departure), no flight starts.
    let sh = await p.evaluate(() => (document.getElementById('sheet') || {}).innerText || '');
    check(/CROSS TO MUSCAT/.test(sh) && !/Where would you like to go/.test(sh) && !(await p.evaluate(() => !!game.registry.get('save').flyCrossing)), `${tag} B: FLY on the ready card opens the CROSSINGS screen with CROSS TO MUSCAT: ${sh.replace(/\s+/g, ' ')}`);
    if (W === 390) { if (sh) { await p.tap('#sheet .sheet-ok'); await p.waitForTimeout(300); } await p.evaluate(() => (document.querySelector('#mCross') || document.body).scrollIntoView()); await p.waitForTimeout(200); await p.screenshot({ path: process.env.SHOTS ? `${process.env.SHOTS}/crosscard-ready.png` : '/dev/null' }).catch(() => {}); }
    check(!p.errs.length, `${tag} B: page errors: ${p.errs}`);
    await p.close();

    // C. The lesson.
    const TOURS = ['hangar', 'name', 'r-boards', 'r-free', 'r-nature', 'r-map', 'r-earth', 'r-school', 'r-takeoff1', 'r-takeoff2', 'r-res1', 'r-res2', 'r-systems', 'r-bonus', 'r-trees', 'r-parcels', 'r-practice', 'r-plant1', 'r-plant2', 'nature-lead', 'globe-hint'];
    p = await open({ ...BASE, school2: true, tours: TOURS, bestDistance: 5500, flights: 12, landings: 10 }, W, H, null);
    const spot = () => p.evaluate(() => { const t = game.registry.get('ui').tour; return t.el.hidden ? { key: null } : { key: t.spot().key, text: t.el.querySelector('.tbubble p').textContent }; });
    const lesson = () => p.evaluate(async () => { const L = await import('./src/lessons.js'); return (L.current(game.registry.get('save')) || {}).id || null; });
    if (await p.evaluate(() => !!document.getElementById('crossUnlock'))) { await p.waitForTimeout(2800); await p.tap('#cuLater'); await p.waitForTimeout(300); }   // (a School save: the moment may come first)
    check(await lesson() === 'crossings', `${tag} C: an Asia pilot (two areas) with every other lesson done stands at the crossings lesson: ${await lesson()}`);
    let st = null; for (let i = 0; i < 30 && !(st = await spot()).key; i++) await p.waitForTimeout(200);
    check(st.key === 'r-crosshint#1', `${tag} C: HOME points at SCHOOL: ${JSON.stringify(st)}`);
    await p.tap('#tabMissions');
    for (let n = 1; n <= 3; n++) {   // (V4, 0.73.0: the card, Range, the next line)
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
    check(after.done && after.tour, `${tag} C: after the 3 steps the lesson is done and the guide is gone: ${JSON.stringify(after)}`);
    check(!p.errs.length, `${tag} C: page errors: ${p.errs}`);
    await p.close();
  }
  await b.close();
  if (fails.length) { console.log('FAIL crosscard-ui\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1); }
  console.log('PASS crosscard-ui: MISSIONS shows ONE card, the crossing on offer (the land it opens, Range, next line; FLY opens its CROSSINGS screen) and the crossings lesson walks it in 3 steps, at 390x844 and 320x568');
})();
