// ISSR visibility check: hidden until within revealPx, clearly visible once inside.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/issr-reveal.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready, started } = require('./lib/ready.js');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  // Fresh progress for every load (so upgrades don't change the physics), flight school already done.
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'] })); });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(process.env.URL || 'http://localhost:8000/'); await ready(p); await p.click('#goBtn'); await started(p);   // (it used to sleep 800 ms and click: a slow start threw 'undefined tutorialDone')
  // Always put one ISSR across the plane's path after take-off, so the "visible from inside" check
  // doesn't depend on a random ISSR happening to cross the autopilot's route.
  await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 60000 });   // flying, not taking off
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.addIssrAt(300, s.plane.y - 60, 320, 140); });
  let farVisible = 0, nearVisible = 0, insideSeen = 0, maxC = 0, shot = false;
  for (let i = 0; i < 300; i++) {
    // Storm gaps now keep a lane clear of icy air, so the gap-following autopilot can miss the
    // patch above. Halfway with nothing seen from inside: put another right on its path.
    if (i === 150 && insideSeen === 0) await p.evaluate(() => { const s = game.scene.getScene('game'); s.addIssrAt(200, s.plane.y - 60, 320, 140); });
    const r = await p.evaluate(() => { const s = game.scene.getScene('game');
      const next = s.storms.find(st => st.rects[0].x + 44 > s.plane.x);
      const target = next ? next.rects[0].height + (next.rects[1].y - next.rects[0].height) / 2 - 2 : 230;
      const b = s.hitbox();
      const issr = s.issrs.map(i => { const gx = Math.max(0, i.x - (b.x + b.w), b.x - (i.x + i.width));
        const gy = Math.max(0, i.y - (b.y + b.h), b.y - (i.y + i.height)); return { d: Math.max(gx, gy), a: i.alpha * (i.fillAlpha ?? 1), entered: !!i.entered }; });
      return { tap: s.state === 'playing' && s.plane.y > target && s.plane.vy > -50, state: s.state, issr, c: s.contrails.length }; });
    for (const i of r.issr) {
      if (!i.entered && i.d >= 50 && i.a > 0) farVisible++;
      if (i.d < 25 && i.a > 0) nearVisible++;
      if (i.d === 0 && i.a >= 0.5) insideSeen++;
    }
    maxC = Math.max(maxC, r.c);
    if (r.c > 30 && !shot) { shot = true; }
    if (r.tap) await p.mouse.click(195, 400);
    if (r.state === 'over') break;
    await p.waitForTimeout(50);
  }
  console.log({ farVisible, nearVisible, insideSeen, maxC, errs });
  const ok = farVisible === 0 && insideSeen > 0 && errs.length === 0;
  console.log(ok ? 'PASS' : 'FAIL'); process.exitCode = ok ? 0 : 1;
  await b.close();
})();
