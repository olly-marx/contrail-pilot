// Controls check: take-off is press-and-hold (tapping or waiting does nothing, letting go just
// slows down, never fails), mid-run tips close only with their OK button, icy air is lumpy (not a box), and a dropped parcel lands on the ground spot under the aim X from any height.
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
  // Parked on the runway the engines idle: the Earth must not heat up while a child reads.
  const parked = await scene(() => { const s = game.scene.getScene('game'); const f = s.hud.co2Fill.getBounds(), frame = s.hud.co2Fill.y;
    return { heat: s.heat, fillBottom: Math.round(f.bottom), frame }; });
  check(Math.abs(parked.heat) < 0.01, `the Earth heated up while parked on the runway (${parked.heat})`);
  // While rolling the gauge shows take-off CO2: it must grow UP from the bottom of its frame.
  await p.mouse.move(195, 400); await p.mouse.down(); await p.waitForTimeout(200);
  const g = await scene(() => { const s = game.scene.getScene('game'), r = s.hud.co2Fill.getBounds(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), base: s.hud.co2Fill.y, h: r.height, dispOrigin: s.hud.co2Fill.displayOriginY, geomH: s.hud.co2Fill.geom.height }; });
  await p.mouse.up();
  check(g.h > 0 && g.dispOrigin === g.h && g.geomH === g.h && g.bottom === Math.round(g.base), `the CO2 gauge should grow upwards from its base: ${JSON.stringify(g)}`);
  // 2. Holding speeds up; letting go before lift-off slows down without failing.
  await p.mouse.move(195, 400); await p.mouse.down(); await p.waitForTimeout(300); await p.mouse.up();
  const r1 = await scene(() => game.scene.getScene('game').rollSpeed);
  await p.waitForTimeout(500);
  const r2 = await scene(() => { const s = game.scene.getScene('game'); return { roll: s.rollSpeed, state: s.state }; });
  check(r1 > 10, `holding should speed the plane up (roll ${r1})`);
  check(r2.roll < r1 && r2.state === 'takeoff', `letting go should slow down, not fail: ${r1} -> ${JSON.stringify(r2)}`);
  // 3. Holding long enough takes off, then normal flight.
  await p.mouse.down();
  for (let i = 0; i < 40 && await scene(() => game.scene.getScene('game').state) === 'takeoff'; i++) await p.waitForTimeout(100);
  await p.mouse.up();
  const s3 = await scene(() => game.scene.getScene('game').state);
  check(s3 === 'playing', `holding should take off, state ${s3}`);
  // A child who doesn't tap straight away gets a breather, not an instant crash.
  await p.waitForTimeout(900);
  const s4 = await scene(() => game.scene.getScene('game').state);
  check(s4 === 'playing', `0.9 s after take-off with no tap the plane should still be flying, state ${s4}`);
  // Glide assist: "stop tapping and glide down" from 300 m out, from cruise height, must land.
  const glide = await scene(() => new Promise(res => { const s = game.scene.getScene('game');
    s.storms.forEach(st => st.parts.forEach(q => q.destroy())); s.storms = []; s.nextStormAt = 1e9; s.graceUntil = 0;
    s.plane.y = 150; s.plane.vy = 0; s.heat = 0; s.distancePx = s.nextAirport.worldX - 300;
    const iv = setInterval(() => { s.heat = 0; if (s.state === 'over') { clearInterval(iv); res({ landed: s.result.landed, reason: s.result.reason }); } }, 30);
    setTimeout(() => { clearInterval(iv); res({ landed: false, reason: 'still flying' }); }, 8000); }));
  check(glide.landed, `a no-tap glide from 300 m out should land, got ${glide.reason}`);
  await p.goto(URL); await p.waitForTimeout(800); await p.click('#goBtn');
  await p.mouse.move(195, 400); await p.mouse.down();
  for (let i = 0; i < 40 && await scene(() => game.scene.getScene('game').state) === 'takeoff'; i++) await p.waitForTimeout(100);
  await p.mouse.up(); await p.mouse.click(195, 300);

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
  // ...then a breather: the plane hovers and a storm right on it doesn't end the flight; a tap ends it.
  const gr = await scene(() => new Promise(res => { const s = game.scene.getScene('game'); const y0 = s.plane.y, f = s.finish; let crashed = false;
    s.finish = () => { crashed = true; }; s.addStormPairAt(s.plane.x, s.plane.y - 100, 40);
    setTimeout(() => { const r = { grace: s.inGrace(), drop: Math.round(s.plane.y - y0), crashed };
      s.storms.pop().parts.forEach(q => q.destroy()); s.applyFlap(); r.afterTap = s.inGrace(); s.finish = f; res(r); }, 700); }));
  check(gr.grace && Math.abs(gr.drop) <= 2 && !gr.crashed, `after a tip the plane should hover safely for a moment: ${JSON.stringify(gr)}`);
  check(!gr.afterTap, 'a tap should end the breather');
  // 6. Icy air is lumpy, not a box: the box's corner is outside it, the middle line inside.
  const shape = await scene(() => { const s = game.scene.getScene('game');
    const i = s.addIssrAt(100, 100, 240, 100), hb = (x, y) => ({ x, y: y - 6, w: 4, h: 12 });
    const r = { corner: s.inIssrShape(i, hb(101, 102)), middle: s.inIssrShape(i, hb(220, 150)) };
    s.issrs = s.issrs.filter(z => z !== i); i.maskGfx.destroy(); i.destroy(); return r; });
  check(!shape.corner, 'the corner of an icy-air box should be outside its lumpy shape');
  check(shape.middle, 'the middle of an icy-air patch should be inside it');
  check(errs.length === 0, `page errors: ${errs}`);
  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
