// Storm gaps always keep a clear lane: no icy air filling a gap (so a contrail-free night is
// possible) and no flock of birds sitting in a gap as the plane goes through it. Flies a long
// stretch with birds and icy air turned up to always spawn, checking every frame.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/lanes.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready, started } = require('./lib/ready.js');
const { throttle } = require('./lib/throttle.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await throttle(p);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9 })); });
  // A direct check of the OTHER half of the rule (found by planting: the long run below never has a storm ahead of a new icy
  // patch, so it could not see the guard in addIssr go missing): with a storm already ahead, 200 icy patches must never fill its gap.
  {
    const q = await b.newPage({ viewport: { width: 390, height: 844 } });
    await q.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await q.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9 })); });
    await q.goto(URL); await ready(q); await q.click('#goBtn');
    for (let i = 0; i < 60 && await q.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await q.waitForTimeout(100);
    const g = await q.evaluate(async () => {
      const s = game.scene.getScene('game'), { ISSR } = await import('./src/config.js');
      s.hitsStorm = () => false; s.hitBird = () => false; s.finish = () => {};
      s.storms.forEach(st => st.rects.forEach(r => { r.x = -999; })); s.issrs.forEach(i => { i.x = -999; });
      s.addStormPairAt(400, 230, 130);   // a storm just off the right edge, gap 165..295
      const st = s.storms[s.storms.length - 1], r = st.rects[0]; let blocked = 0, made = 0;
      for (let i = 0; i < 200; i++) { const n = s.issrs.length; s.addIssr(); if (s.issrs.length > n) made++; if (!s.laneClear(r.x, r.width, r.height, st.rects[1].y)) blocked++; }
      return { blocked, made };
    });
    check(g.made > 20, `the guard check placed icy air (${g.made} of 200 tries): the test would prove nothing otherwise`);
    check(g.blocked === 0, `icy air filled the gap of a storm that was already ahead ${g.blocked} times in 200 tries`);
    await q.close();
  }
  await p.goto(URL); await ready(p); await p.waitForTimeout(800); await p.click('#goBtn');
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
          const inGap = s.birds.some(f => f.birds.some(bd => bd.x < s.plane.x + PLANE.w + 20 && bd.x + 12 > s.plane.x - 10 && bd.y < gBot && bd.y + 10 > gTop));
          if (inGap) L.birdBlocked.push({ d: Math.round(s.distancePx), gTop, gBot });
        }
      }
    });
  });
  // Run until the game has SHOWN enough storms, flocks and icy patches (1.5x the pass marks below), not for a fixed
  // 60 s: a busy machine fits fewer frames into a minute and the counts came up short (2026-10-22). If it never gets
  // there in 4 minutes the run is stuck, and the "plenty" check below reports the counts.
  await p.waitForFunction(() => { const L = window.__lane; return L.gapsSeen >= 30 && L.flocks >= 12 && L.issrs >= 22; }, null, { timeout: 240000, polling: 250 }).catch(() => {});
  const L = await p.evaluate(() => window.__lane);
  check(L.gapsSeen >= 20 && L.flocks >= 8 && L.issrs >= 15, `the run should see plenty of storms, flocks and icy air: ${JSON.stringify({ gaps: L.gapsSeen, flocks: L.flocks, issrs: L.issrs })}`);
  check(L.issrBlocked.length === 0, `icy air filled a storm gap ${L.issrBlocked.length} frames, e.g. ${JSON.stringify(L.issrBlocked[0])}`);
  check(L.birdBlocked.length === 0, `birds sat in a storm gap as the plane went through ${L.birdBlocked.length} times, e.g. ${JSON.stringify(L.birdBlocked[0])}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS lanes (${L.gapsSeen} gaps, ${L.flocks} flocks, ${L.issrs} icy patches)`);
})();
