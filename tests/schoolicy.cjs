// Flight school, the daytime-contrail step ('school-icy'), in the SHIPPED game: a clean pass through the icy air must always be enough.
// The user (2026-11-04) flew through the patch and got 'You missed it, that's fine!' again and again: the step set madeDay only when MORE THAN 25
// contrail puffs were alive at once, and how many are alive depends on the frame rate and the fuel (one puff per frame at most, every `contrailEvery`
// ms, gone when they scroll off the left edge): at 24 fps even normal fuel peaked at 22 and the step never ended (tools: ~/.ux0/icyprobe.cjs).
// This test makes the puffs SLOW (kit.contrailEvery 70 ms = about 14 puffs a second, the same shortfall as a 20 fps phone), flies LEVEL through the
// middle of the patch (the best case for the player), and requires: the patch is not 'missed', and the step finishes (flight school moves on).
// Plant (tools/plants.tsv): the count rule only, `if (s.contrails.length > 25) this.madeDay = true;` back in place of the time-in-patch rule.
// Run: python3 -m http.server 8000 & node tests/schoolicy.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  for (const [W, H] of [[390, 844], [375, 667]]) {
    const p = await b.newPage({ viewport: { width: W, height: H } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(() => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); sessionStorage.setItem('fresh', '1'); } });
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    await p.click('#startChoice [data-area="easia"]'); await p.click('#startChoice [data-city="SEOUL"]'); await p.waitForTimeout(1200); await ready(p);
    await p.click('#goBtn'); await p.waitForTimeout(500); await p.click('#howClose'); await p.waitForTimeout(500);
    let flying = false;
    for (let i = 0; i < 200 && !flying; i++) {   // take off the way the captain says: press and hold until the plane is flying
      const st = await p.evaluate(() => { const s = game.scene.getScene('game'), c = document.getElementById('coach'); return { state: s.state, school: !!s.school, waiting: !c.hidden && c.classList.contains('waiting') }; });
      if (st.state === 'playing' && st.school) { flying = true; break; }
      if (st.waiting) { await p.click((await p.isVisible('#coachOk')) ? '#coachOk' : '#coach').catch(() => {}); await p.waitForTimeout(120); continue; }
      if (st.state === 'takeoff' || st.state === 'idle') { await p.mouse.move(W / 2, H * 0.55); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up(); }
      await p.waitForTimeout(100);
    }
    check(flying, `${W}x${H}: flight school gets the plane flying`);
    if (!flying) { await p.close(); continue; }
    const r = await p.evaluate(() => new Promise(res => {
      const s = game.scene.getScene('game'), sc = s.school;
      s.kit.contrailEvery = 70;   // about 14 puffs a second: the shortfall of a slow phone
      sc.i = 8; sc.next(); s.frozen = false;   // step 9: the daytime icy air
      const at = sc.i; let first = sc.issr, missed = 0, maxLive = 0; const t0 = performance.now();
      const tick = () => {
        if (sc.issr !== first) { missed++; first = sc.issr; }
        const is = sc.issr; s.plane.y = is.y + is.height / 2 - 11; s.plane.vy = 0;   // LEVEL through the middle of the patch
        if (s.contrails.length > maxLive) maxLive = s.contrails.length;
        if (sc.i !== at) return res({ moved: true, missed, maxLive, ms: Math.round(performance.now() - t0), made: !!sc.madeDay });
        if (performance.now() - t0 > 25000) return res({ moved: false, missed, maxLive, ms: 25000, made: !!sc.madeDay, text: document.getElementById('coachText').textContent });
        requestAnimationFrame(tick);
      }; requestAnimationFrame(tick);
    }));
    check(r.maxLive <= 25, `${W}x${H}: the test really is the slow-puff case (at most 25 puffs alive; saw ${r.maxLive})`);
    check(r.missed === 0, `${W}x${H}: a clean level pass through the icy air is never 'missed' (the patch was replaced ${r.missed} times: "You missed it" again and again)`);
    check(r.moved, `${W}x${H}: flight school moves on after the daytime contrail (stuck: ${JSON.stringify(r)})`);
    check(!errs.length, `${W}x${H}: page errors ${errs}`);
    await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL schoolicy:\n - ${fails.join('\n - ')}` : 'PASS schoolicy: a clean pass through the daytime icy air finishes the step even with slow puffs (390x844 and 375x667)');
  process.exit(fails.length ? 1 : 0);
})();
