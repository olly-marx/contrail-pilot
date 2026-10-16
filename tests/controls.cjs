// Controls check: take-off is press-and-hold (tapping or waiting does nothing, letting go just
// slows down, never fails), mid-run tips close only with their OK button, and a dropped parcel lands on the ground spot under the aim X from any height.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/controls.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const scene = (fn, a) => p.evaluate(fn, a);
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], landings: 5, levels: { trees: 4 } })); });
  await p.goto(URL); await p.waitForTimeout(800); await p.click('#goBtn');

  // 1. Waiting and tapping do not take off.
  for (let i = 0; i < 6; i++) { await p.mouse.click(195, 300); await p.waitForTimeout(300); }
  let s1 = await scene(() => { const s = game.scene.getScene('game'); return { state: s.state, airborne: s.airborne, hint: s.holdText.text }; });
  check(s1.state === 'takeoff' && !s1.airborne, `taps alone should not take off: ${JSON.stringify(s1)}`);
  check(/HOLD/.test(s1.hint), `a HOLD hint should show on the runway, got "${s1.hint}"`);
  // 2. Holding speeds up; letting go before lift-off slows down without failing.
  await p.mouse.move(195, 400); await p.mouse.down(); await p.waitForTimeout(300); await p.mouse.up();
  const r1 = await scene(() => game.scene.getScene('game').rollSpeed);
  await p.waitForTimeout(500);
  const r2 = await scene(() => { const s = game.scene.getScene('game'); return { roll: s.rollSpeed, state: s.state }; });
  check(r1 > 10, `holding should speed the plane up (roll ${r1})`);
  check(r2.roll < r1 && r2.state === 'takeoff', `letting go should slow down, not fail: ${r1} -> ${JSON.stringify(r2)}`);
  // 3. Holding long enough takes off, then normal flight.
  await p.mouse.down(); await p.waitForTimeout(2500); await p.mouse.up();
  const s3 = await scene(() => game.scene.getScene('game').state);
  check(s3 === 'playing', `holding should take off, state ${s3}`);

  // 4. Aim: the parcel lands on the bit of ground under the X, from any height.
  await scene(() => { const s = game.scene.getScene('game'); s.finish = () => {}; setInterval(() => { if (s.plane.y > 380) s.plane.vy = -150; }, 50); });
  for (const hy of [100, 250, 400]) {
    const r = await scene(hy => new Promise(res => { const s = game.scene.getScene('game');
      s.plane.y = hy; s.plane.vy = -10;
      const aim = s.predictLanding(), d0 = s.distancePx, orig = s.parcelLanded.bind(s);
      s.parcelLanded = (x, k) => { s.parcelLanded = orig; res({ hy, miss: Math.round((x + s.distancePx) - (aim + d0)) }); };
      setTimeout(() => res({ hy, miss: 'never landed' }), 6000);
      s.dropParcel();
    }), hy);
    check(typeof r.miss === 'number' && Math.abs(r.miss) <= 6, `parcel from y=${hy} should land under the X, missed by ${r.miss} px`);
    await p.waitForTimeout(200);
  }
  // 5. A mid-run tip closes only with its OK button: taps on the game (meant for the plane) don't.
  await scene(() => { const s = game.scene.getScene('game'); s.save.seenTips = s.save.seenTips.filter(t => t !== '*'); s.explain('test-tip', 'Test tip'); });
  await p.mouse.click(195, 700); await p.mouse.click(195, 700);
  const tip1 = await scene(() => ({ ex: game.scene.getScene('game').explaining, okDisabled: document.getElementById('coachOk').disabled }));
  check(tip1.ex, 'tapping the game should not close a tip');
  check(tip1.okDisabled, 'the OK button should wait a moment before it works');
  await p.waitForTimeout(800); await p.click('#coachOk');
  const tip2 = await scene(() => ({ ex: game.scene.getScene('game').explaining, frozen: game.scene.getScene('game').frozen }));
  check(!tip2.ex && !tip2.frozen, `the OK button should close the tip and resume: ${JSON.stringify(tip2)}`);
  check(errs.length === 0, `page errors: ${errs}`);
  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
