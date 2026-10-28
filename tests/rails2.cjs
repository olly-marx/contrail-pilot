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
  const open = async (s, vp) => {
    const p = await b.newPage({ viewport: vp }); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
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
