// Swipe between tabs (src/swipe.js, 0.11.0). Real touch input through the browser's own pipeline (CDP touch events), so
// pointer events, scrolling and "the browser took the gesture over" behave as on a phone.
//   a fixture: a flick left / right calls next / prev; short, slow, mostly-vertical, edge, second-finger, gate, input and
//   data-noswipe gestures do not; a tap with a little jitter is a tap (its button still clicks); a sideways drift during a
//   2.2 s hold does not swipe; vertical scrolling still scrolls.
//   the game: NATURE changes region and HANGAR changes tab on a flick, ALSO when the flick starts on the wild-area picture; the
//   tabs and the picture stay pinned at the top while the lists scroll, leaving room for two rows on a 600 px phone.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/swipe.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.addInitScript(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.clear();
    localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 9, seeds: 500, discovered: { savanna: 1, rainforest: 1 } })); } });
  await p.goto(URL); await ready(p);
  const cdp = await ctx.newCDPSession(p);
  const touch = async (points, ms = 150, steps = 6) => {   // points: [[x0,y0],[x1,y1]] (one finger), or a hold: ms long
    const [a, z] = points; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a[0], y: a[1], id: 1 }] });
    for (let i = 1; i <= steps; i++) { await new Promise(r => setTimeout(r, ms / steps)); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a[0] + (z[0] - a[0]) * i / steps, y: a[1] + (z[1] - a[1]) * i / steps, id: 1 }] }); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(80);
  };

  // ---- the fixture ----
  await p.evaluate(async () => {
    const { onSwipe } = await import('./src/swipe.js');
    // The swiped element sits INSIDE a taller page that scrolls (as #nature and #hFleet do): the vertical scroll belongs to an ancestor.
    const outer = document.createElement('div'); outer.id = 'outer'; outer.style.cssText = 'position:fixed;left:0;top:100px;width:390px;height:520px;overflow-y:auto;z-index:99999;background:#112';
    const d = document.createElement('div'); d.id = 'sw'; d.style.cssText = 'position:relative;width:390px;height:1100px;background:#223'; outer.appendChild(d);
    d.innerHTML = `<button id="tapbtn" style="position:absolute;left:150px;top:10px;width:90px;height:40px">TAP</button>
      <div id="sc" style="position:absolute;left:20px;top:70px;width:350px;height:140px;overflow:auto;background:#335"><div style="height:900px">scroll me</div></div>
      <button class="gate" id="gate" style="position:absolute;left:20px;top:230px;width:150px;height:60px">GATE</button>
      <div data-noswipe id="ns" style="position:absolute;left:200px;top:230px;width:150px;height:60px;background:#533"></div>
      <input id="inp" style="position:absolute;left:20px;top:310px;width:200px;height:40px">
      <div id="row" style="position:absolute;left:20px;top:360px;width:350px;height:20px;overflow-x:auto;white-space:nowrap;background:#553"><div style="width:1200px;height:12px">a row that scrolls sideways</div></div>
      <div id="plain" style="position:absolute;left:20px;top:390px;width:350px;height:110px;background:#355"></div>`;
    document.body.appendChild(outer);
    window.__sw = { next: 0, prev: 0, clicks: 0 };
    document.getElementById('tapbtn').onclick = () => window.__sw.clicks++;
    onSwipe(d, { next: () => window.__sw.next++, prev: () => window.__sw.prev++ });
    window.__reset = () => { window.__sw.next = 0; window.__sw.prev = 0; };
  });
  const sw = () => p.evaluate(() => ({ ...window.__sw }));
  const reset = () => p.evaluate(() => window.__reset());
  const expect = async (label, want, run) => { await reset(); await run(); const g = await sw(); check(g.next === want[0] && g.prev === want[1], `${label}: wanted next ${want[0]} / prev ${want[1]}, got ${g.next} / ${g.prev}`); };
  const Y = 100 + 440;   // a plain spot of the fixture (the #plain box), page coordinates

  await expect('a flick left', [1, 0], () => touch([[300, Y], [160, Y + 8]]));
  await expect('a flick right', [0, 1], () => touch([[100, Y], [250, Y - 8]]));
  await expect('too short (40 px)', [0, 0], () => touch([[200, Y], [160, Y]]));
  await expect('a slow drag (900 ms)', [0, 0], () => touch([[300, Y], [160, Y]], 900, 12));
  await expect('mostly vertical', [0, 0], () => touch([[300, Y - 60], [250, Y + 40]]));
  await expect('diagonal but not sideways enough (dx 80, dy 60)', [0, 0], () => touch([[300, Y - 30], [220, Y + 30]]));
  await expect('starting at the screen edge', [0, 0], () => touch([[10, Y], [160, Y]]));
  await expect('starting on the grown-up gate', [0, 0], () => touch([[150, 100 + 260], [20, 100 + 262]]));
  await expect('starting on a data-noswipe area', [0, 0], () => touch([[340, 100 + 260], [200, 100 + 262]]));
  await expect('starting in an input', [0, 0], () => touch([[200, 100 + 330], [60, 100 + 332]]));
  // a sideways-scrolling row (the region tabs): the touch scrolls the row, it is not a swipe of the screen
  await reset(); const left0 = await p.evaluate(() => document.getElementById('row').scrollLeft);
  await touch([[300, 100 + 370], [100, 100 + 372]], 200, 8);
  const left1 = await p.evaluate(() => document.getElementById('row').scrollLeft), g0 = await sw();
  check(left1 > left0 + 50 && g0.next === 0 && g0.prev === 0, `a sideways-scrolling row scrolls and does not swipe (${left0} -> ${left1}, ${JSON.stringify(g0)})`);
  // a tap with a little jitter: a tap (the button still clicks), not a swipe
  await reset(); const c0 = (await sw()).clicks; await touch([[195, 130], [198, 131]], 60, 2); const tap = await sw();
  check(tap.next === 0 && tap.prev === 0 && tap.clicks === c0 + 1, `a tap with jitter is a tap: ${JSON.stringify(tap)}`);
  // a hold with sideways drift (the press-and-hold buy buttons and gates): 2.2 s, drifting 80 px
  await expect('a 2.2 s hold that drifts sideways', [0, 0], () => touch([[300, Y], [220, Y + 4]], 2200, 22));
  // two fingers
  await expect('two fingers', [0, 0], async () => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: Y, id: 1 }, { x: 320, y: Y + 30, id: 2 }] });
    for (let i = 1; i <= 5; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 300 - i * 30, y: Y, id: 1 }, { x: 320 - i * 30, y: Y + 30, id: 2 }] }); await new Promise(r => setTimeout(r, 25)); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(80); });
  // vertical scrolling of the page the swiped element sits in still works, and does not swipe
  await reset(); const o0 = await p.evaluate(() => document.getElementById('outer').scrollTop);
  await touch([[200, 100 + 440], [205, 100 + 300]], 200, 8);
  const o1 = await p.evaluate(() => document.getElementById('outer').scrollTop), go = await sw();
  check(o1 > o0 + 40 && go.next === 0 && go.prev === 0, `the page around a swiped element still scrolls (${o0} -> ${o1}) and does not swipe (${JSON.stringify(go)})`);
  await p.evaluate(() => { document.getElementById('outer').scrollTop = 0; });
  // an inner box that scrolls still scrolls, and does not swipe
  await reset(); const top0 = await p.evaluate(() => document.getElementById('sc').scrollTop);
  await touch([[200, 100 + 190], [205, 100 + 90]], 200, 8);
  const top1 = await p.evaluate(() => document.getElementById('sc').scrollTop), g1 = await sw();
  check(top1 > top0 + 20 && g1.next === 0 && g1.prev === 0, `vertical scrolling still scrolls (${top0} -> ${top1}) and does not swipe (${JSON.stringify(g1)})`);

  // ---- the game ----
  await p.evaluate(() => { document.getElementById('outer').remove(); });
  await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(500);
  const region = () => p.evaluate(() => (document.querySelector('#wRegions .on') || {}).dataset.region);
  const r0 = await region();
  await touch([[320, 600], [140, 604]]); await p.waitForTimeout(300);
  const r1 = await region();
  check(r1 && r1 !== r0, `NATURE: a flick left opens the next region tab (${r0} -> ${r1})`);
  await touch([[120, 600], [300, 596]]); await p.waitForTimeout(300);
  check(await region() === r0, `NATURE: a flick right goes back (${await region()})`);
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#wRegions [data-region]:not([disabled])')].map(b => b.dataset.region));
  check(tabs.length >= 3, `the test save has several regions open: ${tabs}`);
  // a tap on a region button still switches region and is not a swipe
  const target = tabs[tabs.length - 1];
  const pos = await p.evaluate(t => { const b = document.querySelector(`#wRegions [data-region="${t}"]`); b.scrollIntoView({ inline: 'center', block: 'nearest' }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, target);
  await touch([[pos[0], pos[1]], [pos[0] + 2, pos[1] + 1]], 60, 2); await p.waitForTimeout(300);
  check(await region() === target, `NATURE: a tap on a region button still works (${await region()} vs ${target})`);

  // The user's priority (2026-10-24): swiping must work ON the wild-area picture itself, where people will swipe, and a tap there
  // must do nothing odd. The picture and the tabs stay pinned at the top while the lists scroll.
  await p.evaluate(() => document.querySelector('#wRegions [data-region]:not([disabled])').click()); await p.waitForTimeout(300);   // start from the first region tab
  await p.evaluate(() => { document.getElementById('nature').scrollTop = 0; });
  const scene = await p.evaluate(() => { const r = document.getElementById('wScene').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  check(scene.h > 60 && scene.y > 0 && scene.y < 400, `the NATURE picture is on screen at the top: ${JSON.stringify(scene)}`);
  const rF0 = await region();
  await touch([[scene.x + scene.w * 0.85, scene.y + scene.h / 2], [scene.x + scene.w * 0.2, scene.y + scene.h / 2 + 3]]); await p.waitForTimeout(300);
  const rF1 = await region();
  check(rF1 !== rF0, `NATURE: a swipe that starts ON the picture changes region (${rF0} -> ${rF1})`);
  const sc2 = await p.evaluate(() => { const r = document.getElementById('wScene').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await touch([[sc2.x + sc2.w * 0.2, sc2.y + sc2.h / 2], [sc2.x + sc2.w * 0.85, sc2.y + sc2.h / 2 - 3]]); await p.waitForTimeout(300);
  check(await region() === rF0, `NATURE: and a swipe the other way on the picture goes back (${await region()})`);
  await touch([[sc2.x + sc2.w * 0.5, sc2.y + sc2.h * 0.6], [sc2.x + sc2.w * 0.5 + 3, sc2.y + sc2.h * 0.6 + 2]], 60, 2); await p.waitForTimeout(300);
  check(await region() === rF0, 'NATURE: a tap on the picture changes nothing');
  // pinned: scroll the lists a long way down; the tabs and the picture have not moved and nothing shows above them
  const pin0 = await p.evaluate(() => { const s = document.getElementById('wScene').getBoundingClientRect(); return Math.round(s.top); });
  await p.evaluate(() => { document.getElementById('nature').scrollTop = 700; }); await p.waitForTimeout(300);
  const pin1 = await p.evaluate(() => { const s = document.getElementById('wScene').getBoundingClientRect(), n = document.getElementById('nature'), at = document.elementFromPoint(window.innerWidth / 2, 2);
    return { top: Math.round(s.top), bottom: Math.round(s.bottom), scrolled: n.scrollTop, edge: at && !!at.closest('.wpin'), tabsTop: Math.round(document.getElementById('wRegions').getBoundingClientRect().top) }; });
  check(pin1.scrolled > 300, `the NATURE page scrolled (${pin1.scrolled})`);
  check(pin1.top >= 0 && pin1.top < 60 && pin1.tabsTop >= 0 && pin1.tabsTop < 40 && pin1.bottom > 60, `the tabs and the picture stay pinned at the top while the lists scroll: ${JSON.stringify(pin1)} (was ${pin0})`);
  check(pin1.edge === true, 'nothing scrolls past ABOVE the pinned block');
  const bar = await p.evaluate(() => { const m = document.querySelector('#wMeter .meter'), s = document.getElementById('wScene').getBoundingClientRect(); if (!m) return null; const r = m.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), sceneBottom: Math.round(s.bottom) }; });
  check(bar && bar.top >= 0 && bar.top < 300 && bar.top >= bar.sceneBottom - 2 && bar.bottom > bar.top, `the biodiversity bar stays pinned under the picture while the lists scroll: ${JSON.stringify(bar)}`);
  await p.evaluate(() => { document.getElementById('nature').scrollTop = 0; });
  // a swipe on the list while scrolled still works too
  await p.evaluate(() => game.registry.get('ui').go('hangar')); await p.waitForTimeout(600);
  const ftab = () => p.evaluate(() => (document.querySelector('#hFleet .ftab.on') || {}).dataset.ftab);
  check(await ftab() === 'plane', `HANGAR starts on PLANE (${await ftab()})`);
  await touch([[320, 700], [140, 704]]); await p.waitForTimeout(300);
  check(await ftab() === 'systems', `HANGAR: a flick left goes to SYSTEMS (${await ftab()})`);
  await touch([[320, 700], [140, 704]]); await p.waitForTimeout(300);
  check(await ftab() === 'gadgets', `HANGAR: and on to GADGETS (${await ftab()})`);
  await touch([[320, 700], [140, 704]]); await p.waitForTimeout(300);
  check(await ftab() === 'gadgets', 'HANGAR: no further than the last tab');
  await touch([[120, 700], [300, 696]]); await p.waitForTimeout(300);
  check(await ftab() === 'systems', `HANGAR: a flick right goes back (${await ftab()})`);

  // On a short phone (600 px) the pinned part leaves room for the list: at least two rows.
  const short = await b.newContext({ viewport: { width: 390, height: 600 }, hasTouch: true, isMobile: true }); const q = await short.newPage();
  await q.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await q.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 9, seeds: 500 })); });
  await q.goto(URL); await ready(q); await q.evaluate(() => game.registry.get('ui').go('nature')); await q.waitForTimeout(700);
  await q.evaluate(() => { document.getElementById('nature').scrollTop = 300; }); await q.waitForTimeout(300);   // scrolled: the picture is pinned
  const room = await q.evaluate(() => { const s = document.getElementById('wMeter').getBoundingClientRect(), tab = document.getElementById('tabbar').getBoundingClientRect();   // (the pinned part now ends at the biodiversity bar)
    const rows = [...document.querySelectorAll('#wProjects .upgrade, #wProjects > *')].find(e => e.getBoundingClientRect().height > 30); return { pinnedBottom: Math.round(s.bottom + 8), listRoom: Math.round(tab.top - (s.bottom + 8)), rowH: rows ? Math.round(rows.getBoundingClientRect().height) : null }; });
  check(room.listRoom >= 320, `on a 600 px phone the pinned part takes at most about 40% and leaves 320 px+ for the list (3 rows or more): ${JSON.stringify(room)}`);
  console.log('600 px phone: pinned part ends at', room.pinnedBottom, 'px, list room', room.listRoom, 'px');
  await short.close();

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS swipe');
})();
