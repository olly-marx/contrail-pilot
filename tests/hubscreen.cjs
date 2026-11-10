// The season 2 hub on screen (S2 of research/PROPOSAL-HOME-MISSIONS.md): the bottom bar (back since a tester asked, 2026-10-27), a BIG world you can spin, NEXT and
// TAKE OFF, tiles that open their screen with a HOME button back. Phone size.
// Run: python3 -m http.server 8000 & node tests/hubscreen.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  const open = async missionsDone => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); },   // season 2 keeps its save under s2:
      { areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], priceVersion: 2, landings: 5, flights: 6, seeds: 80, missionsDone, fleet });
    await p.goto(URL); await ready(p); await p.waitForTimeout(500);
    return p;
  };
  const box = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e || e.offsetParent === null) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
  // 1. A new-ish pilot (lesson 1 done): hub, the bottom bar, big globe, NEXT, TAKE OFF, the MISSIONS and HANGAR tiles.
  let p = await open(['L1']);   // season 2 lessons (S3): L1 reveals MISSIONS and HANGAR
  const st = await p.evaluate(() => ({ hub: document.getElementById('title').classList.contains('hub'), bar: !document.getElementById('tabbar').hidden,
    next: document.getElementById('hubNext').innerText, tabs: [...document.querySelectorAll('#tabbar [data-go]')].filter(b => !b.hidden).map(b => b.dataset.go), tiles: document.querySelectorAll('#hubTiles').length }));   // R3: the tiles are gone; the bar is the navigation
  const globe = await box(p, '#hubGlobe'), go = await box(p, '#goBtn');
  check(st.hub && st.bar, `season 2 shows the hub with the bottom bar: ${JSON.stringify(st)}`);
  const barTop = await p.evaluate(() => document.getElementById('tabbar').getBoundingClientRect().top);
  check(globe && globe.w >= 390 * 0.5 && globe.h >= 844 * 0.25, `the world is BIG: ${JSON.stringify(globe)}`);
  check(/UP NEXT/.test(st.next) && /icy air in daytime/i.test(st.next), `UP NEXT names the next lesson (L2): "${st.next}"`);
  check(go && go.y + go.h <= barTop, `TAKE OFF is on screen above the bottom bar, not under it: ${JSON.stringify({ go, barTop })}`);
  check(st.tiles === 0 && st.tabs.join() === 'fly,missions,hangar,pilot,boards', `after lesson 1: no tiles any more, and the bar shows HOME, MISSIONS, HANGAR (+PILOT and BOARDS after 3 landings): ${JSON.stringify([st.tiles, st.tabs])}`);
  // 2. Spin: the globe turns.
  const f0 = await p.evaluate(() => JSON.stringify(document.getElementById('hubGlobe').__globe.frame()));
  await p.click('#hubSpinR'); await p.waitForTimeout(200);
  const f1 = await p.evaluate(() => JSON.stringify(document.getElementById('hubGlobe').__globe.frame()));
  check(f0 !== f1, 'the spin button turns the world');
  // nudge(dx) turns by exactly what a drag of dx would (globe.js turn) and stops any coast (the bug-fix chat's check):
  // fling the globe, nudge at once, and the frame must sit exactly at turn(frame before nudge, dx) a moment later.
  const g = await box(p, '#hubGlobe');
  await p.mouse.move(g.x + g.w * 0.3, g.y + g.h / 2); await p.mouse.down();
  for (let i = 1; i <= 6; i++) { await p.mouse.move(g.x + g.w * (0.3 + 0.07 * i), g.y + g.h / 2); await p.waitForTimeout(8); }
  await p.mouse.up();
  const nudged = await p.evaluate(async () => { const G = await import('./src/globe.js'), c = document.getElementById('hubGlobe'), o = c.__globe;
    const before = o.frame(), want = G.turn(before, 30, 0, c.width / 2 - 1); o.nudge(30);
    await new Promise(r => setTimeout(r, 400)); return { want: JSON.stringify(want), got: JSON.stringify(o.frame()) }; });
  check(nudged.want === nudged.got, `nudge turns by dx and stops the coast: want ${nudged.want.slice(0, 60)} got ${nudged.got.slice(0, 60)}`);
  // 3. A bar tab opens its screen; HOME comes back.
  await p.click('#tabHangar'); await p.waitForTimeout(400);   // R3: the bar's tab (the tiles are gone)
  // The bottom bar is back on every menu screen (a tester, 2026-10-27), showing only what is revealed: after lesson 1,
  // HOME, MISSIONS and HANGAR; not NATURE (lesson 2), PILOT or BOARDS (they come with the 3rd landing).
  const inH = await p.evaluate(() => ({ hangar: !document.getElementById('hangar').hidden, bar: !document.getElementById('tabbar').hidden,
    tabs: [...document.querySelectorAll('#tabbar [data-go]')].filter(b => !b.hidden).map(b => b.dataset.go) }));
  const barH = await p.evaluate(() => { document.querySelectorAll('#tabbar [data-go]').forEach(b => { b.hidden = false; }); return Math.round(document.getElementById('tabbar').getBoundingClientRect().height); });   // all 6 tabs showing (HOME MISSIONS HANGAR NATURE PILOT BOARDS)
  check(barH <= 66, `the bottom bar is ONE row even with the PILOT tab (it wrapped to 2 rows and covered the buttons above it): ${barH} px high with all 6 tabs`);
  check(inH.hangar && inH.bar && inH.tabs.join() === 'fly,missions,hangar,pilot,boards', `the hangar shows the bottom bar with the revealed tabs only (BOARDS appears after the 3rd landing: this save has 5; PILOT comes with it): ${JSON.stringify(inH)}`);
  await p.click('#tabFly'); await p.waitForTimeout(300);
  check(await p.evaluate(() => !document.getElementById('title').hidden && !document.getElementById('tabbar').hidden), 'HOME (on the bar) goes back to the hub, the bar stays');
  const lab = await p.evaluate(() => ({ tab: document.getElementById('tabFly').innerText.trim(), dot: document.getElementById('dFly').textContent }));
  check(lab.tab === 'FLY' && lab.dot === '', `the first tab says FLY and its news dot holds no text (the word HOME once sat in the dot and bled out of the tab's corner): ${JSON.stringify(lab)}`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await p.close();
  // 4. Brand new (no lesson done): none of the lesson-revealed tabs.
  p = await open([]);
  check(await p.evaluate(() => ![...document.querySelectorAll('#tabbar [data-go]')].some(b => !b.hidden && ['missions', 'hangar', 'nature'].includes(b.dataset.go))), 'a brand-new pilot sees no MISSIONS, HANGAR or NATURE tab yet');
  await p.close(); await b.close();
  console.log(fails.length ? `FAIL hubscreen:\n - ${fails.join('\n - ')}` : 'PASS hubscreen: hub + bottom bar (revealed tabs only), big spinnable world, UP NEXT, TAKE OFF on screen, no tiles, HOME back');
  process.exit(fails.length ? 1 : 0);
})();
