// Missions check: the title shows the current mission; landing at PARIS completes mission 1 and
// moves on; a crash doesn't; the mission line shows during a flight; passing an airport shows a
// "Passed X. Next: Y" sign; a mission that needs an upgrade says so.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/missions.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const scene = (fn, a) => p.evaluate(fn, a);
  const setSave = v => p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, v]);
  const getSave = () => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const base = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'] };
  const hold = () => scene(() => { const s = game.scene.getScene('game'); s.plane.y = 200; s.plane.vy = 0; s.heat = 0; });
  const calm = () => scene(() => { const s = game.scene.getScene('game'); s.storms.forEach(st => st.parts.forEach(q => q.destroy())); s.storms = []; s.nextStormAt = 1e9; });

  // 1. Title card: mission 1 of N.
  await p.goto(URL); await setSave(base); await p.reload(); await p.waitForTimeout(600);
  const card = await p.textContent('#tMission');
  check(/MISSION 1\//.test(card) && /Land in PARIS/.test(card), `title should show mission 1 Land in PARIS: ${card}`);

  // 2. Crash before PARIS: mission not done, stays at 0.
  await p.click('#goBtn'); await p.waitForTimeout(2300); await calm();
  const line = await scene(() => game.scene.getScene('game').missionText.text);
  check(/PARIS: \d+ m/.test(line), `the mission line should show PARIS distance, got "${line}"`);
  await scene(() => { const s = game.scene.getScene('game'); s.graceUntil = 0; s.plane.y = 600; }); await p.waitForTimeout(2500);
  let r = await scene(() => game.scene.getScene('game').result);
  check(r && r.mission && !r.mission.done, `a crash should not complete the mission: ${JSON.stringify(r && r.mission)}`);
  check((await getSave()).mission === 0, 'mission index should stay 0 after a crash');
  check(/Not this time/.test(await p.textContent('#rMission')), 'results should say Not this time');

  // 3. Land at PARIS: mission done, index 1, results say MISSION DONE and the next one.
  await p.click('#againBtn'); await p.waitForTimeout(2300); await calm();
  await scene(() => { const s = game.scene.getScene('game'); s.heat = 0; s.distancePx = s.nextAirport.worldX - 250; });
  for (let i = 0; i < 150; i++) {
    const st = await scene(() => { const s = game.scene.getScene('game'); s.heat = 0; const toA = s.nextAirport.worldX - s.distancePx; if (toA > -20) { s.plane.y = 300; s.plane.vy = 0; } return s.state; });
    if (st === 'over') break;
    await p.waitForTimeout(40);
  }
  r = await scene(() => game.scene.getScene('game').result);
  check(r && r.landed && r.mission && r.mission.done, `landing at PARIS should complete mission 1: ${JSON.stringify(r && r.mission)}`);
  check((await getSave()).mission === 1, 'mission index should be 1 after mission 1');
  await p.waitForTimeout(1800);   // the results reveal starts 900 ms after landing
  const rm = await p.textContent('#rMission');
  check(/MISSION DONE/.test(rm) && /Land with 5 seeds/.test(rm), `results should say MISSION DONE and name the next: ${rm}`);

  // 3b. Landing at AMSTERDAM (past PARIS) does not count as Land in PARIS.
  await setSave({ ...base, mission: 0 }); await p.reload(); await p.waitForTimeout(600);
  await p.click('#goBtn'); await p.waitForTimeout(2300); await calm();
  await scene(() => { const s = game.scene.getScene('game'); s.airportsSkipped = 1; s.heat = 0; s.distancePx = s.nextAirport.worldX - 250; });
  for (let i = 0; i < 150; i++) {
    const st = await scene(() => { const s = game.scene.getScene('game'); s.heat = 0; const toA = s.nextAirport.worldX - s.distancePx; if (toA > -20) { s.plane.y = 300; s.plane.vy = 0; } return s.state; });
    if (st === 'over') break;
    await p.waitForTimeout(40);
  }
  r = await scene(() => game.scene.getScene('game').result);
  check(r && r.landed && r.mission && !r.mission.done && /FIRST airport/.test(r.mission.fail), `landing past PARIS should not complete Land in PARIS: ${JSON.stringify(r && r.mission)}`);

  // 4. Passing an airport shows where the next one is.
  await p.click('#againBtn'); await p.waitForTimeout(2300); await calm();
  await scene(() => { const s = game.scene.getScene('game'); s.distancePx = s.nextAirport.worldX + 230; });
  for (let i = 0; i < 6; i++) { await hold(); await p.waitForTimeout(60); }
  const sign = await scene(() => game.scene.getScene('game').nextText.text);
  check(/Passed PARIS\. Next: AMSTERDAM/.test(sign), `after passing PARIS the sign should name AMSTERDAM, got "${sign}"`);

  // 5. A mission needing an upgrade says so on the card.
  await setSave({ ...base, mission: 6 }); await p.reload(); await p.waitForTimeout(600);
  const c7 = await p.textContent('#tMission');
  check(/Plant a tree/.test(c7) && /Needs:/.test(c7) && /Tree parcels/.test(c7), `mission 7 should say it needs Tree parcels: ${c7}`);
  await setSave({ ...base, mission: 6, levels: { trees: 1 } }); await p.reload(); await p.waitForTimeout(600);
  check(!/Needs:/.test(await p.textContent('#tMission')), 'with Tree parcels owned the card should not say Needs');
  // 6. All done.
  await setSave({ ...base, mission: 10 }); await p.reload(); await p.waitForTimeout(600);
  check(/ALL MISSIONS DONE/.test(await p.textContent('#tMission')), 'after the last mission the card should say all done');

  check(errs.length === 0, `page errors: ${errs}`);
  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
