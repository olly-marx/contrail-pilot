// A teaching strip never sits over the plane, even on a slow phone (the 0.21.0 gate: onrails@375x667 once saw a strip cover the
// plane for 25 frames). The strip's side was chosen once, at open (GameScene.showTip); now keepStripClear re-checks it every frame.
// Here, with the CPU throttled 6x: a tip opens with the plane low (strip at the TOP), then the plane climbs into the top band and
// stays there; then it dives to the bottom. The strip must get out of the way (at most 3 covered frames per move) and not flicker.
// Run: python3 -m http.server 8000 & node tests/stripclear.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 375, height: 667 }, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(800);
  await p.click('#startChoice [data-area="weurope"]').catch(() => {}); await p.click('#startChoice [data-city]').catch(() => {}); await p.waitForTimeout(1200);
  await p.evaluate(() => { const s = game.registry.get('save'); Object.assign(s, { tutorialDone: true, freeGiven: true, freeUpgrade: false, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'] }); game.registry.get('ui').showTitle(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { const t = document.getElementById('tour'); if (t && !t.hidden) { t.hidden = true; game.registry.get('ui').tour.busy = false; } });   /* (a hub tour's dim layer; not what this test checks) */
  await p.click('#goBtn'); await started(p);
  for (let i = 0; i < 4 && await p.evaluate(() => game.scene.getScene('game').state !== 'playing'); i++) { await p.mouse.move(187, 360); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up(); }   /* hold to take off */
  await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const r = await p.evaluate(() => new Promise(done => {
    const s = game.scene.getScene('game'), coach = document.getElementById('coach'), cv = document.querySelector('#game canvas');
    Object.assign(s, { graceUntil: 1e12, hitsStorm: () => false, hitBird: () => false }); s.nextAirport.worldX = s.distancePx + 1e7;
    s.plane.y = 380; s.plane.vy = 0; s.showTip('A test tip: the strip must never hide your plane, wherever it flies.', null);
    const startLow = coach.classList.contains('strip-low');
    const out = { startLow, frames: 0, covered: [0, 0], flips: 0 }; let last = startLow, phase = 0; const t0 = performance.now();
    const tick = () => {
      const t = performance.now() - t0; phase = t < 2500 ? 0 : 1;
      s.plane.y = phase === 0 ? 40 : 440; s.plane.vy = 0; s.closeTip = s.closeTip; if (!s.explaining) { done({ ...out, closed: true }); return; }
      const k = cv.getBoundingClientRect(), sx = k.width / 288, sy = k.height / 512, cr = coach.getBoundingClientRect();
      const pr = { l: k.left + s.plane.x * sx, t: k.top + (s.plane.y - 8) * sy, r: k.left + (s.plane.x + 58) * sx, b: k.top + (s.plane.y + 22) * sy };
      if (!coach.hidden && cr.left < pr.r && pr.l < cr.right && cr.top < pr.b && pr.t < cr.bottom) out.covered[phase]++;
      const low = coach.classList.contains('strip-low'); if (low !== last) { out.flips++; last = low; }
      out.frames++;
      if (t < 5000) requestAnimationFrame(tick); else done(out);
    };
    requestAnimationFrame(tick);
  }));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  check(!r.startLow, `the tip opened with the plane low, so the strip starts at the top: ${JSON.stringify(r)}`);
  check(!r.closed && r.frames > 20, `the tip stayed up through the test (${r.frames} frames): ${JSON.stringify(r)}`);
  check(r.covered[0] <= 3, `the plane climbs into the top strip: it moves away (covered ${r.covered[0]} frames)`);
  check(r.covered[1] <= 3, `the plane dives to the bottom: the strip moves back (covered ${r.covered[1]} frames)`);
  check(r.flips === 2, `one flip per move, no flicker: ${r.flips} flips for 2 moves`);
  check(!errs.length, `page errors: ${errs}`);
  await b.close();
  console.log(fails.length ? `FAIL stripclear:\n - ${fails.join('\n - ')}` : `PASS stripclear: CPU x6, ${r.frames} frames; the strip moves off the plane (covered ${r.covered}), ${r.flips} flips`);
  process.exit(fails.length ? 1 : 0);
})();
