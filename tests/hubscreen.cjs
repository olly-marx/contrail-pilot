// The season 2 hub on screen (S2 of research/PROPOSAL-HOME-MISSIONS.md): no tab bar, a BIG world you can spin, NEXT and
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
  // 1. A new-ish pilot (lesson 1 done): hub, no tab bar, big globe, NEXT, TAKE OFF, the MISSIONS and HANGAR tiles.
  let p = await open(['L1']);   // season 2 lessons (S3): L1 reveals MISSIONS and HANGAR
  const st = await p.evaluate(() => ({ hub: document.getElementById('title').classList.contains('hub'), bar: !document.getElementById('tabbar').hidden,
    next: document.getElementById('hubNext').innerText, tiles: [...document.querySelectorAll('#hubTiles [data-go]')].map(t => t.dataset.go) }));
  const globe = await box(p, '#hubGlobe'), go = await box(p, '#goBtn');
  check(st.hub && !st.bar, `season 2 shows the hub and no tab bar: ${JSON.stringify(st)}`);
  check(globe && globe.w >= 390 * 0.5 && globe.h >= 844 * 0.25, `the world is BIG: ${JSON.stringify(globe)}`);
  check(/NEXT/.test(st.next) && /icy air in daytime/.test(st.next), `NEXT names the next lesson (L2): "${st.next}"`);
  check(go && go.y + go.h <= 844, `TAKE OFF is on screen without scrolling: ${JSON.stringify(go)}`);
  check(st.tiles.join() === 'missions,hangar', `after lesson 1: MISSIONS and HANGAR only: ${st.tiles}`);
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
  // 3. A tile opens its screen; HOME comes back.
  await p.click('#hubTiles [data-go="hangar"]'); await p.waitForTimeout(400);
  const inH = await p.evaluate(() => ({ hangar: !document.getElementById('hangar').hidden, back: !document.getElementById('hubBack').hidden, bar: !document.getElementById('tabbar').hidden }));
  check(inH.hangar && inH.back && !inH.bar, `the HANGAR tile opens the hangar with a HOME button: ${JSON.stringify(inH)}`);
  await p.click('#hubBack'); await p.waitForTimeout(300);
  check(await p.evaluate(() => !document.getElementById('title').hidden && document.getElementById('hubBack').hidden), 'HOME goes back to the hub');
  check(!p.errs.length, `page errors: ${p.errs}`);
  await p.close();
  // 4. Brand new (no lesson done): no tiles at all.
  p = await open([]);
  check(await p.evaluate(() => document.querySelectorAll('#hubTiles [data-go]').length === 0), 'a brand-new pilot sees no tiles');
  await p.close(); await b.close();
  console.log(fails.length ? `FAIL hubscreen:\n - ${fails.join('\n - ')}` : 'PASS hubscreen: hub, no tab bar, big spinnable world, NEXT, TAKE OFF on screen, tiles by reveal, HOME back');
  process.exit(fails.length ? 1 : 0);
})();
