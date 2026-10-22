// Missions check (2026-10-22: missions are the lessons): the title shows the current mission;
// landing at an airport completes mission 1 and moves on, even past PARIS (Lola flew past it); a
// crash doesn't; the mission line shows during a flight; passing an airport shows a "Passed X.
// Next: Y" sign; a mission that needs an upgrade says so; a bird crash earns the secret badge.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/missions.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
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
  // Until the plane is really flying (fixed 2.3 s waits failed under load).
  const flying = () => p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 15000 });
  const calm = () => scene(() => { const s = game.scene.getScene('game'); s.storms.forEach(st => st.parts.forEach(q => q.destroy())); s.storms = []; s.nextStormAt = 1e9; });

  // 1. Title card: mission 1 of N.
  await p.goto(URL); await setSave(base); await p.reload(); await ready(p); await p.waitForTimeout(600);
  const card = await p.textContent('#tMission');
  check(/MISSION 1\//.test(card) && /Land at an airport/.test(card), `title should show mission 1 Land at an airport: ${card}`);

  // 2. Crash before PARIS: mission not done, stays at 0.
  await p.click('#goBtn'); await flying(); await calm();
  const line = await scene(() => game.scene.getScene('game').missionText.text), first = await scene(() => game.scene.getScene('game').path[1]);
  check(new RegExp(`${first}: [\\d,]+ km`).test(line), `the mission line should show the next airport (${first}) and its distance, got "${line}"`);
  await scene(() => { const s = game.scene.getScene('game'); s.graceUntil = 0; s.plane.y = 600; });
  // Wait for the crash and the results text, not a fixed time (it failed under load).
  await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s.result && document.getElementById('rMission').textContent.trim(); }, null, { timeout: 15000 }).catch(() => {});
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
  check(((await getSave()).unclaimed || []).some(u => u.key === 'mission:land'), 'its prize waits to be claimed');
  check((await getSave()).mission === 1, 'mission index should be 1 after mission 1');
  await p.waitForTimeout(1800);   // the results reveal starts 900 ms after landing
  const rm = await p.textContent('#rMission');
  check(/MISSION DONE/.test(rm) && /Land with 5 seeds/.test(rm), `results should say MISSION DONE and name the next: ${rm}`);

  // 3b. Lola's flight: past PARIS, landed in BERLIN. Mission 1 is done anyway (it was stuck before).
  await setSave({ ...base, mission: 0 }); await p.reload(); await ready(p); await p.waitForTimeout(600);
  await p.click('#goBtn'); await flying(); await calm();
  await scene(() => { const s = game.scene.getScene('game'); s.airportIndex = 1; s.airportsSkipped = 1; s.heat = 0; s.nextAirport = { ...s.airportAhead(1), worldX: s.distancePx + 250 }; });   // BERLIN, just ahead
  for (let i = 0; i < 150; i++) {
    const st = await scene(() => { const s = game.scene.getScene('game'); s.heat = 0; const toA = s.nextAirport.worldX - s.distancePx; if (toA > -20) { s.plane.y = 300; s.plane.vy = 0; } return s.state; });
    if (st === 'over') break;
    await p.waitForTimeout(40);
  }
  r = await scene(() => game.scene.getScene('game').result);
  check(r && r.landed && r.mission && r.mission.done, `landing past PARIS must still complete mission 1: ${JSON.stringify(r && r.mission)}`);

  // 4. Passing an airport shows where the next one is (the next two on this flight's path).
  await setSave({ ...base, mission: 0, city: 0 }); await p.reload(); await ready(p); await p.waitForTimeout(600);
  await p.click('#goBtn'); await flying(); await calm();
  await scene(() => { const s = game.scene.getScene('game'); s.distancePx = s.nextAirport.worldX + 230; });
  for (let i = 0; i < 6; i++) { await hold(); await p.waitForTimeout(60); }
  const sign = await scene(() => game.scene.getScene('game').nextText.text), two = await scene(() => game.scene.getScene('game').path.slice(1, 3));
  check(sign.includes(`Passed ${two[0]}. Next: ${two[1]}`), `after passing ${two[0]} the sign should name ${two[1]}, got "${sign}"`);

  // 5. A mission needing an upgrade says so on the card.
  const first5 = ['land', 'seeds-5', 'shade-10', 'clean-night', 'pass-1'];
  await setSave({ ...base, missionsDone: first5 }); await p.reload(); await ready(p); await p.waitForTimeout(600);
  const c7 = await p.textContent('#tMission');
  check(/MISSION 6\//.test(c7) && /Plant a tree/.test(c7) && /Needs:/.test(c7) && /Tree parcels/.test(c7), `mission 6 should say it needs Tree parcels: ${c7}`);
  await setSave({ ...base, missionsDone: first5, levels: { trees: 1 } }); await p.reload(); await ready(p); await p.waitForTimeout(600);
  check(!/Needs:/.test(await p.textContent('#tMission')), 'with Tree parcels owned the card should not say Needs');
  // 6. The later missions: the wildlife one needs a habitat project; the World tour needs every land discovered.
  const later = await p.evaluate(async () => { const M = await import('./src/missions.js'); const m = id => M.MISSIONS.find(x => x.id === id);
    return { n: M.MISSIONS.length, ids: M.MISSIONS.map(x => x.id),
      rewild: [M.blocked({ habitat: { woodland: [] } }, m('rewild')), M.blocked({ habitat: { woodland: ['pond'] } }, m('rewild'))],
      world: [m('world').check({ landed: true }, { discovered: { mediterranean: 1, desert: 1, monsoon: 1, eastasia: 1, boreal: 1, plains: 1, tundra: 1, savanna: 1, rainforest: 1 } }),
        m('world').check({ landed: true, lap: true }, { discovered: { desert: 1 } })] }; });
  check(later.n === 13, `13 lesson missions: ${later.ids}`);
  check(String(later.rewild) === 'true,false', `Bring wildlife back needs a habitat project: ${later.rewild}`);
  check(String(later.world) === 'true,false', `the World tour needs every land discovered (a lap is not enough): ${later.world}`);
  // 6b. In a real flight: a bird crash is counted and earns the secret Bird Strike badge to claim.
  await setSave({ ...base, missionsDone: first5, landings: 9 }); await p.reload(); await ready(p); await p.waitForTimeout(600);
  await p.click('#goBtn'); await flying();
  await scene(() => { const s = game.scene.getScene('game'); s.graceUntil = 0; s.finish({ reason: 'Bird strike!\nYou hit a bird.' }); });
  await p.waitForTimeout(3500);
  const sv = await getSave();
  check(sv.crashes && sv.crashes.bird === 1 && (sv.unclaimed || []).some(u => u.key === 'badge:birdstrike:1'), `a bird crash is counted and earns Bird Strike: crashes ${JSON.stringify(sv.crashes)}, ${JSON.stringify(sv.unclaimed)}`);
  check(/NEW BADGE/.test(await p.textContent('#rBadges')) && /Bird Strike/.test(await p.textContent('#rBadges')), `results show the new badge: ${await p.textContent('#rBadges')}`);
  await p.screenshot({ path: '/tmp/mission-birds.png' });
  // 7. All done.
  await setSave({ ...base, missionsDone: later.ids }); await p.reload(); await ready(p); await p.waitForTimeout(600);
  check(/ALL MISSIONS DONE/.test(await p.textContent('#tMission')), 'after the last mission the card should say all done');

  check(errs.length === 0, `page errors: ${errs}`);
  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
