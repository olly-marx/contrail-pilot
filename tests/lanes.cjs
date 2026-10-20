// Storm gaps always keep a clear lane: no icy air filling a gap (so a contrail-free night is
// possible) and no flock of birds sitting in a gap as the plane goes through it. Flies a long
// stretch with birds and icy air turned up to always spawn, checking every frame.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/lanes.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9 })); });
  await p.goto(URL); await p.waitForTimeout(800); await p.click('#goBtn');
  for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
  // Jump to just before birds start, crank spawns up, and watch.
  await p.evaluate(async () => {
    const { HAZARDS, ISSR, PLANE } = await import('./src/config.js');
    const s = game.scene.getScene('game');
    s.distancePx = 9800; s.nextBirdsAt = 9900; s.nextIssrAt = 9800; s.nextStormAt = 9800 + 100; s.nextAirport.worldX = 1e9;
    HAZARDS.birds.chance = 1; HAZARDS.birds.every = 250; ISSR.spawnChance = 1;
    s.hitsStorm = () => false; s.hitBird = () => false; s.finish = () => {};
    window.__lane = { frames: 0, gapsSeen: 0, issrBlocked: [], birdBlocked: [], flocks: 0, issrs: 0 };
    const seenFlocks = new Set(), seenIssrs = new Set(), passed = new Set();
    s.events.on('postupdate', () => {
      const L = window.__lane; L.frames++;
      s.heat = 0;
      if (s.plane.y > 220 && s.plane.vy > -40) s.applyFlap();
      s.birds.forEach(f => seenFlocks.add(f)); s.issrs.forEach(i => seenIssrs.add(i)); L.flocks = seenFlocks.size; L.issrs = seenIssrs.size;
      for (const st of s.storms) {
        const r = st.rects[0], gTop = r.height, gBot = st.rects[1].y;
        if (r.x > 390) continue;
        if (!s.laneClear(r.x, r.width, gTop, gBot)) L.issrBlocked.push({ d: Math.round(s.distancePx), gTop, gBot });
        // The moment the plane is inside this storm column: any bird in the gap right there?
        if (r.x < s.plane.x + PLANE.w && r.x + r.width > s.plane.x && !passed.has(st)) {
          passed.add(st); L.gapsSeen++;
          const inGap = s.birds.some(f => f.birds.some(bd => bd.img.x < s.plane.x + PLANE.w + 20 && bd.img.x + 12 > s.plane.x - 10 && bd.img.y < gBot && bd.img.y + 10 > gTop));
          if (inGap) L.birdBlocked.push({ d: Math.round(s.distancePx), gTop, gBot });
        }
      }
    });
  });
  await p.waitForTimeout(Number(process.env.SECONDS || 60) * 1000);
  const L = await p.evaluate(() => window.__lane);
  check(L.gapsSeen >= 20 && L.flocks >= 8 && L.issrs >= 15, `the run should see plenty of storms, flocks and icy air: ${JSON.stringify({ gaps: L.gapsSeen, flocks: L.flocks, issrs: L.issrs })}`);
  check(L.issrBlocked.length === 0, `icy air filled a storm gap ${L.issrBlocked.length} frames, e.g. ${JSON.stringify(L.issrBlocked[0])}`);
  check(L.birdBlocked.length === 0, `birds sat in a storm gap as the plane went through ${L.birdBlocked.length} times, e.g. ${JSON.stringify(L.birdBlocked[0])}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS lanes (${L.gapsSeen} gaps, ${L.flocks} flocks, ${L.issrs} icy patches)`);
})();
