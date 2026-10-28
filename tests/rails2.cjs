// The rails, part 2 (Coordinator, 2026-10-28). Real taps; the save is seeded, the screen only read.
//   R14: at landing 3, on the hub, the rails point at the BOARDS tab (MY RECORDS): exactly ONE tappable thing on the whole
//        screen (a hit test every 16 px), ring + bubble fully on screen, the tap opens MY RECORDS, the step shows once.
//   The results' "tap to skip" hint (audit item 5): on a small phone (375x667) it is fully on screen during the reveal and
//        ABOVE the button (it sat under it, cut off).
// Run: python3 -m http.server 8000 & SHOTS=/tmp/r2 node tests/rails2.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const fs = require('fs');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/', SHOTS = process.env.SHOTS || '';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const fleet = { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} };
  const save = x => ({ areas: ['easia'], homeArea: 'easia', city: 'SEOUL', tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['x-bars'], shownLines: [],
    freeGiven: true, freeProjectGiven: true, fleet, seeds: 40, crystals: 2, flights: 4, missionsDone: ['L1', 'L2'], unclaimed: [],
    tours: ['r-school', 'r-free', 'r-takeoff1', 'r-res1', 'r-takeoff2', 'r-res2', 'r-nature', 'name'], ...x });
  const open = async (s, vp, touch = false) => {
    const p = await b.newPage({ viewport: vp, hasTouch: touch }); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('seeded', '1'); } }, s);
    await p.goto(URL); await ready(p); await p.waitForTimeout(1200); return p; };
  const audit = p => p.evaluate(() => {
    const tour = document.getElementById('tour'), up = tour && !tour.hidden, reach = new Map();
    for (let y = 8; y < innerHeight; y += 16) for (let x = 8; x < innerWidth; x += 16) {
      const el = document.elementFromPoint(x, y); if (!el || el.closest('#tour .tdim')) continue;
      const c = el.closest('button, a, input, select, [data-go], [data-project], [data-fbuy], [data-area], [data-city], canvas');
      if (c && !c.disabled && getComputedStyle(c).pointerEvents !== 'none') reach.set(c, `${c.id || c.className}|${(c.textContent || '').trim().slice(0, 20)}`);
    }
    const inView = r => r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1;
    const ring = up && tour.querySelector('.tring').getBoundingClientRect(), bub = up && tour.querySelector('.tbubble').getBoundingClientRect();
    return { up, text: up ? tour.querySelector('.tbubble p').textContent : '', reach: [...reach.values()], inView: !!up && inView(ring) && inView(bub), ring: ring && { x: ring.left + ring.width / 2, y: ring.top + ring.height / 2 } };
  });

  // R14: landing 3.
  let p = await open(save({ landings: 3 }), { width: 390, height: 844 });
  let a = null; for (let i = 0; i < 40; i++) { a = await audit(p); if (a.up) break; await p.waitForTimeout(150); }
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/R14-boards.png` });
  check(a.up && /records/i.test(a.text), `R14: at landing 3 the rails point at MY RECORDS ("${a.text}")`);
  check(a.reach.length === 1 && /tabBoards/.test(a.reach[0] || ''), `R14: exactly ONE thing can be tapped, the BOARDS tab (${a.reach.length}: ${a.reach.join(' / ')})`);
  check(a.inView, 'R14: the target and the sentence are fully on screen');
  if (a.ring) { await p.mouse.click(a.ring.x, a.ring.y); await p.waitForTimeout(800); }
  check(await p.evaluate(() => !document.getElementById('boards').hidden), 'R14: the tap opens MY RECORDS');
  check(await p.evaluate(() => (JSON.parse(localStorage.getItem('contrailPilot.v2')).tours || []).includes('r-boards')), 'R14: the step is remembered (shown once)');
  check(!p.errs.length, `R14 page errors: ${p.errs}`); await p.close();
  // Not before landing 3.
  p = await open(save({ landings: 2 }), { width: 390, height: 844 }); await p.waitForTimeout(800);
  a = await audit(p); check(!(a.up && /records/i.test(a.text)), `R14: no records step before landing 3 ("${a.text}")`); await p.close();

  // L5 parcels (audit #3): NEXT says the parcels are free; NATURE opens on the tab that sells them even after viewing
  // another land; the rails point at the FREE button (one target); the tap gives them free.
  const l5 = { landings: 4, missionsDone: ['L1', 'L2', 'L3', 'L4'], seeds: 0, crystals: 0, discovered: { savanna: true, desert: true, steppe: true, rainforest: true } };
  p = await open(save({ ...l5, shownLines: ['trees'], tours: [...save({}).tours, 'r-systems', 'r-boards', 'r-bonus', 'r-parcels', 'nature-lead'] }), { width: 390, height: 844 });   // (phase A: every guide seen, to test the tab alone)
  check(/Free tree parcels/.test(await p.evaluate(() => document.getElementById('hubNext').innerText)), `L5: NEXT says the tree parcels are free (${await p.evaluate(() => document.getElementById('hubNext').innerText)})`);
  await p.click('#tabNature'); await p.waitForTimeout(500);
  const other = await p.$('#wRegions [data-region]:not([disabled]):not(.on)');
  check(!!other, 'L5: another land tab to view (the trap: NATURE kept the last-viewed tab)');
  if (other) { await other.click(); await p.waitForTimeout(400); }
  await p.click('#tabFly'); await p.waitForTimeout(400); await p.click('#hubNext'); await p.waitForTimeout(700);
  check(await p.evaluate(() => !document.getElementById('nature').hidden && !document.getElementById('wTrees').hidden && !!document.querySelector('#wTrees [data-buy="trees"]')), 'L5: NEXT opens NATURE on the tab that sells the parcels, after viewing another land');
  await p.close();
  p = await open(save({ ...l5, tours: [...save({}).tours, 'r-systems', 'r-boards', 'r-bonus'] }), { width: 390, height: 844 });   // (the earlier rails already shown, as in play)
  { let h = null; for (let i = 0; i < 20; i++) { h = await audit(p); if (h.up) break; await p.waitForTimeout(150); }   // the hub's 'Something NEW!' lights NATURE: tap what is lit
    if (h.up && h.ring) await p.mouse.click(h.ring.x, h.ring.y); else await p.click('#tabNature'); await p.waitForTimeout(600); }
  // A player taps what is lit (the 'NEW: Tree Planting! Tap i' spotlight first, closing its info card) until the parcels step.
  a = null; for (let i = 0; i < 60; i++) { a = await audit(p); if (a.up && /parcels/i.test(a.text)) break;
    if (await p.isVisible('#iClose')) await p.click('#iClose');
    else if (a.up) { const ok = await p.$('#tour .tbubble .btn:not([hidden])'); if (ok && await ok.isVisible()) await ok.click(); else if (a.ring) await p.mouse.click(a.ring.x, a.ring.y); }
    await p.waitForTimeout(250); }
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/L5-free-parcels.png` });
  // The bubble holds still while the FREE button pulses (the user's live bug, 2026-10-28: it jumped above/below): 3 s of samples.
  const tops = []; for (let i = 0; i < 20; i++) { tops.push(await p.evaluate(() => { const b = document.querySelector('#tour .tbubble').getBoundingClientRect(), r = document.querySelector('#tour .tring').getBoundingClientRect(); return { top: Math.round(b.top), below: b.top > r.top }; })); await p.waitForTimeout(150); }
  const sides = new Set(tops.map(t => t.below)), spread = Math.max(...tops.map(t => t.top)) - Math.min(...tops.map(t => t.top));
  check(sides.size === 1 && spread <= 2, `L5: over 3 s of the pulse the bubble keeps its side and place (sides ${sides.size}, moved ${spread} px)`);
  check(a.up && /parcels/i.test(a.text) && a.reach.length === 1 && /FREE/.test(a.reach[0] || '') && a.inView, `L5: the rails point at the FREE parcels, the only tappable thing, on screen ("${a.text}"; ${a.reach.join(' / ')})`);
  if (a.ring) { await p.mouse.click(a.ring.x, a.ring.y); await p.waitForTimeout(700); }
  const sv = await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));
  check((sv.levels || {}).trees === 1 && sv.seeds === 0 && sv.freeParcelsGiven, `L5: the tap gives the first parcels free (${JSON.stringify(sv.levels)}, seeds ${sv.seeds})`);
  check(!p.errs.length, `L5 page errors: ${p.errs}`); await p.close();

  // Scrolling under a rails step (the user's live report, 2026-10-28: "I can't scroll down or click the bottom"): on a
  // 375x667 phone, during the parcels step on NATURE, a wheel and a finger drag on the dim layer scroll the screen, and taps
  // still reach only the target.
  p = await open(save({ ...l5, tours: [...save({}).tours, 'r-systems', 'r-boards', 'r-bonus'], shownLines: ['trees'] }), { width: 375, height: 667 }, true);   // (a touch phone: the drag is real touch events)
  { let h = null; for (let i = 0; i < 20; i++) { h = await audit(p); if (h.up) break; await p.waitForTimeout(150); } if (h.up && h.ring) await p.mouse.click(h.ring.x, h.ring.y); else await p.click('#tabNature'); await p.waitForTimeout(700); }
  for (let i = 0; i < 40; i++) { const x = await audit(p); if (x.up && /parcels/i.test(x.text)) break; await p.waitForTimeout(150); }
  const sc0 = await p.evaluate(() => document.getElementById('nature').scrollTop);
  await p.mouse.move(20, 120); await p.mouse.wheel(0, 200); await p.waitForTimeout(400);
  const sc1 = await p.evaluate(() => document.getElementById('nature').scrollTop);
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 20, y: 200 }] });
  for (let y = 200; y <= 360; y += 20) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 20, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(400);
  const sc2 = await p.evaluate(() => document.getElementById('nature').scrollTop);
  await p.waitForTimeout(2000);   // (the target comes back into view 1.5 s after the player stops scrolling)
  a = await audit(p);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/scroll-under-rails-375x667.png` });
  check(sc1 !== sc0 && sc2 !== sc1, `under a rails step the wheel and a drag on the dim layer scroll the screen (scrollTop ${sc0} -> wheel ${sc1} -> drag ${sc2})`);
  check(a.up && a.reach.length === 1 && a.inView, `after scrolling, the target is back in view and taps still reach only it (${a.reach.length}: ${a.reach.join(' / ')})`);
  check(!p.errs.length, `scroll page errors: ${p.errs}`); await p.close();

  // An empty missions list says what is missing (audit #8): every easia mission done, no crossing offered yet.
  p = await open(save({ landings: 12, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], tours: ['*'] }), { width: 390, height: 844 });
  await p.evaluate(async () => { const M = await import('./src/missions2.js'), s = game.registry.get('save');   // (setup on the live save: the page's localStorage is season 2's wrapper)
    for (let i = 0; i < 10 && M.visible(s).length; i++) s.missionsDone = [...s.missionsDone, ...M.visible(s).map(m => m.key)]; s.daily = null; });
  await p.click('#tabMissions'); await p.waitForTimeout(600);
  const ml = await p.evaluate(() => document.getElementById('mList').innerText);
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/missions-empty.png` });
  check(/All done here/.test(ml) && !/Fly a crossing to a new area/.test(ml) && /Needs:|Ready!|new eras|crossing/i.test(ml), `an empty missions list says what a crossing still needs, not "fly a crossing" (${JSON.stringify(ml.slice(0, 160))})`);
  check(!p.errs.length, `missions page errors: ${p.errs}`); await p.close();

  // "tap to skip" on a small phone, during the results reveal.
  p = await open(save({ landings: 3, tours: ['*'] }), { width: 375, height: 667 });
  await p.click('#goBtn'); await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 }).catch(() => {});
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.landedAt = s.path[1]; s.finish({ landed: true }); });   // (a landing, forced: this checks the card's layout)
  let hint = null;
  for (let i = 0; i < 40; i++) { hint = await p.evaluate(() => { const h = document.getElementById('rSkip'), r = h.getBoundingClientRect(), bt = document.getElementById('againBtn').getBoundingClientRect();
    return { shown: !h.hidden && !document.getElementById('results').hidden && r.height > 0, top: Math.round(r.top), bottom: Math.round(r.bottom), btnTop: Math.round(bt.top), H: innerHeight }; }); if (hint.shown) break; await p.waitForTimeout(100); }
  if (SHOTS) await p.screenshot({ path: `${SHOTS}/skip-hint-small-phone.png` });
  check(hint.shown && hint.top >= 0 && hint.bottom <= hint.H && hint.bottom <= hint.btnTop, `"tap to skip" on a small phone: fully on screen and above the button during the reveal (${JSON.stringify(hint)})`);
  check(!p.errs.length, `results page errors: ${p.errs}`);
  await b.close();
  console.log(fails.length ? `FAIL rails2:\n - ${fails.join('\n - ')}` : 'PASS rails2: R14 points at MY RECORDS at landing 3 (one target, on screen, opens it, once; not before); "tap to skip" sits on screen above the button on a 375x667 phone');
  process.exit(fails.length ? 1 : 0);
})();
