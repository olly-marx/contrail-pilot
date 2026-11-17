// TAPS STILL FLY AFTER A SWIPE ON NATURE (Oliver, 2026-11-16, recurring: "I bought a nature project and then I can't fly anymore without a page
// refresh ... taps do nothing", only autopilot distance). Real touches through Chrome's touch input, each finger with its OWN identifier
// (as on a phone; Playwright's touchscreen.tap reuses one identifier, which hides the bug). The path:
//   0. control: a swipe between NATURE lands redraws the screen under the finger, so its touchend never reaches the window (the
//      test checks this happened: without it the test would prove nothing);
//   1. then HOME, TAKE OFF (held), and taps in flight: every tap must reach the game (the plane climbs, autopilot is off).
// Same again for a swipe between HANGAR tabs. src/touchfree.js is the guard. Plants: tools/plants.tsv, test `stucktouch`.
// Run: python3 -m http.server 8000 & node tests/stucktouch.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
// A late-game save with several lands and hangar tabs to swipe between (tests/fixtures/ladder-save.json), tours off, money to spend.
const SAVE = { ...require('./fixtures/ladder-save.json'), muted: true, seenTips: ['*'], tours: ['*'], seeds: 50000, crystals: 5000,
  discovered: { mediterranean: 1793622169954, boreal: 1793630367384, tundra: 1793631233538 } };   // other lands to swipe to
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const runs = [['NATURE', '#tabNature'], ['HANGAR', '#tabHangar']];
  for (const [where, tab] of runs) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { if (sessionStorage.i) return; sessionStorage.i = 1; localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); }, SAVE);
    // Which touches lost their touchend (their element left the page before the finger lifted)?
    await p.addInitScript(() => { window.__lost = 0; window.addEventListener('touchstart', e => { for (const t of e.changedTouches) { const el = t.target; el.addEventListener('touchend', () => { if (!el.isConnected) window.__lost++; }, { once: true }); } }, true); });
    await p.goto(URL); await ready(p); await p.waitForTimeout(600);
    const cdp = await p.context().newCDPSession(p);
    let id = 10;
    const touch = async (x, y, x2 = x, y2 = y, holdMs = 60) => { const i = id++; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: i }] });
      for (let k = 1; x2 !== x && k <= 5; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (x2 - x) * k / 5, y: y + (y2 - y) * k / 5, id: i }] }); await p.waitForTimeout(20); }
      await p.waitForTimeout(holdMs); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
    const tapEl = async sel => { const r = await p.evaluate(s => { const e = document.querySelector(s); if (!e || !e.offsetParent) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
      check(r, `${where}: ${sel} is on the screen`); if (r) await touch(r.x, r.y); await p.waitForTimeout(500); };
    await tapEl(tab); if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT + where + '.png' });
    // a swipe left (the next land / tab), starting on a row of the list (not the land picture, which swipe.js skips)
    const sy = await p.evaluate(() => { const e = document.querySelector('#wProjects .project, #hangar .rowc'); if (!e) return 520; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return b.y + b.height / 2; });
    await touch(300, sy, 110, sy + 5); await p.waitForTimeout(500);
    const lost = await p.evaluate(() => window.__lost);
    check(lost >= 1, `${where} control: the swipe redraws the screen under the finger (lost touchends ${lost}); if not, this test no longer covers the path`);
    await tapEl('#tabFly');
    await tapEl('#goBtn'); await started(p);
    // TAKE OFF is held (window pointer events, which the bug never touched): hold until airborne.
    const i = id++; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 400, id: i }] });
    await p.waitForFunction(() => game.scene.getScene('game').state !== 'takeoff', null, { timeout: 15000 }).catch(() => {});
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(400);
    const y0 = await p.evaluate(() => game.scene.getScene('game').plane.y);
    for (let k = 0; k < 6; k++) { await touch(195, 300); await p.waitForTimeout(120); }
    const r = await p.evaluate(() => { const s = game.scene.getScene('game'); return { y: Math.round(s.plane.y), state: s.state, auto: s.autoText.visible, held: game.input.pointers.slice(1).filter(q => q.active).length }; });
    check(r.state === 'playing' && r.y < y0 - 40, `${where}: after the swipe, 6 taps in flight climb the plane (y ${Math.round(y0)} -> ${r.y}, ${JSON.stringify(r)}); a stuck touch pointer drops every tap`);
    check(!r.auto, `${where}: the taps took the plane off autopilot`);
    check(!errs.length, `${where}: page errors: ${errs.join(' | ')}`);
    await p.close();
  }
  await b.close();
  if (fails.length) { console.log('FAIL stucktouch:\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS stucktouch: a swipe on NATURE or HANGAR redraws under the finger, and taps still fly the plane');
})();
