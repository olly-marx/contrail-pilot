// THE "CHOOSE WHERE TO FLY" LESSON, hands on, with real touch input at 390x844 and 320x568 (the owner, 2026-11-18: a lesson on the FLY globe: drag it, tap a city, pick MISSION or EXPLORE).
// The School's 'map' lesson (src/lessons.js, after L3) runs the 'r-map' rails on HOME (src/tour.js): 5 steps, each waiting for the real action. Named lines:
//   1. the first step is up on the globe and has NO OK button; a plain tap on the globe does not pass it (control: only a drag does);
//   2. a real touch DRAG of the globe passes it: step 2 asks for a city;
//   3. a real tap on a city dot opens its card (#hubCard): step 3 points at the card's X (the card lit as its subject); FLY is not tappable;
//   4. tapping X: step 4 points at the route chip (#hubRoute); tapping it opens the FLY TO sheet: step 5 points at MISSION / EXPLORE;
//   5. tapping EXPLORE sets the route mode, the sheet closes, r-map is done and the board moves to the next lesson (L4). Each step passes the spotlight audit (tests/lib/spotlight.js).
// Run: python3 -m http.server 8000 & node tests/maplesson.cjs   (plants in tools/plants.tsv)
require('./lib/shipped.js');
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js'), { audit } = require('./lib/spotlight.js');
const URL = process.env.URL || 'http://localhost:8000/';
const SAVE = { school2: true, tutorialDone: true, muted: true, priceVersion: 99, freeGiven: true, freeProjectGiven: true, goodLandings: 1, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} },
  missionsDone: ['L1', 'L2', 'L3'], flights: 5, landings: 5, areas: ['sasia', 'easia'], homeArea: 'sasia', city: 'KOLKATA',
  tours: ['hangar', 'r-school', 'r-free', 'r-takeoff1', 'r-res1', 'r-takeoff2', 'r-res2', 'r-nature', 'r-systems', 'nature-lead'] };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  for (const [W, H] of [[390, 844], [320, 568]]) {
    const tag = `${W}x${H}`;
    const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true }); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); }, SAVE);
    await p.goto(URL); await ready(p); await p.waitForTimeout(900);
    const spot = () => p.evaluate(() => { const t = game.registry.get('ui').tour, ok = t.el.querySelector('.tbubble .btn'); return t.el.hidden ? { key: null } : { key: t.spot().key, ok: !ok.hidden }; });
    const waitKey = async k => { let s = null; for (let i = 0; i < 30; i++) { s = await spot(); if (s.key === k) break; await p.waitForTimeout(200); } return s; };
    const shot = async n => { if (process.env.SHOTS && W === 390) await p.screenshot({ path: `${process.env.SHOTS}/maplesson-${n}.png` }); };
    const audited = async n => { await p.waitForTimeout(400); for (const prob of await audit(p)) fails.push(`${tag} step ${n}: ${prob}`); await shot(n); };
    const lesson = await p.evaluate(async () => { const L = await import('./src/lessons.js'); return (L.current(game.registry.get('save')) || {}).id; });
    check(lesson === 'map', `${tag}: the save stands at the map lesson: ${lesson}`);
    // 1. On the globe, no OK; a plain tap does not pass it.
    let st = await waitKey('r-map#1');
    check(st.key === 'r-map#1' && !st.ok, `${tag} 1: the first step is up on the globe with no OK button: ${JSON.stringify(st)}`);
    if (st.key !== 'r-map#1') { fails.push(`${tag}: the lesson never started`); await p.close(); continue; }
    await audited(1);
    const g = await p.evaluate(() => { const r = document.getElementById('hubGlobe').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
    await p.touchscreen.tap(g.x + g.w * 0.4, g.y + g.w * 0.4); await p.waitForTimeout(700);   // (a corner: a tap, not a drag)
    st = await spot();
    check(st.key === 'r-map#1', `${tag} 1: a tap on the globe does not pass the drag step: ${JSON.stringify(st)}`);
    await p.evaluate(() => { const c = document.getElementById('hubCard'); if (c && !c.hidden) game.registry.get('ui').closeCityRow(); });   // (that tap may have hit a city: put HOME back)
    // 2. A real touch drag.
    const cdp = await p.context().newCDPSession(p), dx = Math.round(g.w * 0.25);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.x - dx, y: g.y }] });
    for (let x = -dx; x <= dx; x += 6) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.x + x, y: g.y }] }); await p.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    st = await waitKey('r-map#2');
    check(st.key === 'r-map#2', `${tag} 2: a real drag of the globe passes the first step: ${JSON.stringify(st)}`);
    if (st.key !== 'r-map#2') { fails.push(`${tag}: stopping this size (no step 2)`); await p.close(); continue; }   // (fail by name, not by a timeout)
    await audited(2);
    await p.waitForTimeout(1500); st = await spot();
    check(st.key === 'r-map#2', `${tag} 2: with no city tapped the city step stays up: ${JSON.stringify(st)}`);
    // 3. A real tap on a city dot.
    const pick = () => p.evaluate(async () => { const { CITIES } = await import('./src/cities.js'), gl = document.getElementById('hubGlobe').__globe, r = document.getElementById('hubGlobe').getBoundingClientRect();
      const ok = q => q && q.x > r.left + r.width * 0.25 && q.x < r.right - r.width * 0.25 && q.y > r.top + r.height * 0.15 && q.y < r.bottom - r.height * 0.2;
      const dots = CITIES.map(c => ({ n: c.name, ...(gl.cityPos(c.name) || {}) })).filter(d => d.x != null);
      // a city with no other dot within 14 px (a tap picks the NEAREST dot: a lonely one is the one that opens)
      for (const d of dots) if (ok(d) && !dots.some(e => e !== d && Math.hypot(e.x - d.x, e.y - d.y) < 14)) return d; return null; });
    let c = null; for (let i = 0; i < 20; i++) { await p.waitForTimeout(250); const a = await pick(); await p.waitForTimeout(150); const b2 = await pick(); if (a && b2 && a.n === b2.n && Math.hypot(a.x - b2.x, a.y - b2.y) < 0.5) { c = b2; break; } }   // (the globe coasts a little after the drag: wait until it is still; the city away from the spin buttons at the globe's sides)
    check(!!c, `${tag} 3: a city dot clear of its neighbours is on the globe to tap`);
    if (c) { await p.touchscreen.tap(c.x, c.y); }
    st = await waitKey('r-map#3');
    const card = await p.evaluate(() => { const h = document.getElementById('hubCard'); return h && !h.hidden ? h.innerText.replace(/\s+/g, ' ') : null; });
    check(st.key === 'r-map#3' && card && c && card.includes(c.n), `${tag} 3: a tap on ${c && c.n} opens its card and the step points at its X: ${JSON.stringify(st)} ${card}`);
    await audited(3);
    const flyBlocked = await p.evaluate(() => { const f = document.getElementById('ccFly'); if (!f) return true; const r = f.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(top && top.closest('#tour')); });
    check(flyBlocked, `${tag} 3: the card's FLY cannot be tapped during the step`);
    // 4. X, then the route chip.
    if (!card) { fails.push(`${tag}: no city card to close (stopping this size)`); await p.close(); continue; }
    await p.tap('#ccX');
    st = await waitKey('r-map#4');
    check(st.key === 'r-map#4', `${tag} 4: X closes the card; the step points at the route chip: ${JSON.stringify(st)}`);
    await audited(4);
    if (st.key !== 'r-map#4') { await p.close(); continue; }
    await p.tap('#hubRoute');
    st = await waitKey('r-map#5');
    const chips = await p.evaluate(() => [...document.querySelectorAll('#sheet .ds-actions .chip')].map(x => x.textContent));
    check(st.key === 'r-map#5' && chips.includes('EXPLORE'), `${tag} 4: the chip opens the FLY TO sheet; the step points at MISSION / EXPLORE: ${JSON.stringify(st)} ${chips}`);
    await audited(5);
    // 5. EXPLORE.
    if (st.key !== 'r-map#5') { await p.close(); continue; }
    await p.tap('#dsExplore'); await p.waitForTimeout(900);
    const end = await p.evaluate(async () => { const L = await import('./src/lessons.js'), s = game.registry.get('save'); return { mode: s.routeMode, map: (s.tours || []).includes('r-map'), now: (L.current(s) || {}).id, sheet: !!document.getElementById('sheet') }; });
    check(end.mode === 'explore' && end.map && end.now === 'L4' && !end.sheet, `${tag} 5: EXPLORE is chosen, the sheet closes, the lesson is done and the next one is L4: ${JSON.stringify(end)}`);
    check(!p.errs.length, `${tag}: page errors: ${p.errs}`);
    await p.close();
  }
  await b.close();
  if (fails.length) { console.log('FAIL maplesson\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1); }
  console.log('PASS maplesson: drag the globe, tap a city, close its card, open the route chip, pick EXPLORE: each step waits for the real action, at 390x844 and 320x568');
})();
