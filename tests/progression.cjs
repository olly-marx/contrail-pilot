// Progression check: trees are only banked on landing (with the long-flight multiplier),
// the hangar sells levelled upgrades with info pop-ups, upgrades change the flight, and
// planted trees cool.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/progression.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());
  const fails = [];
  const check = (cond, msg) => { if (!cond) fails.push(msg); };
  const scene = (fn, arg) => p.evaluate(fn, arg);
  const setSave = s => p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, s]);
  const getSave = () => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  // '*' = skip the captain's explanations. Missions all done, every city visited and challenges this
  // test can't finish: so only the flight's own seeds are banked (rewards are tested in rewards.cjs).
  const ALL = ['LONDON', 'PARIS', 'BERLIN', 'ROME', 'ATHENS', 'CAIRO', 'DUBAI', 'DELHI', 'BANGKOK', 'BEIJING', 'TOKYO', 'ANCHORAGE', 'VANCOUVER', 'CHICAGO', 'NEW YORK', 'REYKJAVIK'];
  const base = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], mission: 99, visited: ALL, challenges: ['far-4000', 'night-owl', 'dodge-3'] };
  const noStorms = () => scene(() => { const s = game.scene.getScene('game'); s.storms.forEach(st => st.parts.forEach(r => r.destroy())); s.storms = []; s.nextStormAt = 1e9; s.tokens.forEach(t => t.img.destroy()); s.tokens = []; s.nextTokenAt = 1e9; });
  const hold = (y = 200) => scene(y => { const s = game.scene.getScene('game'); s.plane.y = y; s.plane.vy = 0; }, y);
  const grab = n => scene(n => { const s = game.scene.getScene('game'); for (let i = 0; i < n; i++) s.addToken(s.plane.x + 20 + i * 3, s.plane.y - 2, false); }, n);

  // 1. Grab trees, then crash: nothing is banked.
  await p.goto(URL); await setSave({ ...base, seeds: 5 }); await p.reload(); await p.waitForTimeout(600);
  await p.click('#goBtn'); await p.waitForTimeout(2300);
  await noStorms(); await hold(); await grab(3);
  for (let i = 0; i < 8; i++) { await hold(); await p.waitForTimeout(60); }
  const carried = await scene(() => game.scene.getScene('game').cargo);
  check(carried === 3, `should carry 3 trees after grabbing 3, got ${carried}`);
  await p.waitForTimeout(3500);   // no taps: falls and crashes
  let r = await scene(() => game.scene.getScene('game').result);
  check(r && !r.landed && r.gained === 0, `crash should bank 0 trees, got ${r && r.gained}`);
  check((await getSave()).seeds === 5, 'seeds in the bank changed after a crash');
  await p.waitForTimeout(1300); await p.click('#results');   // results reveal; a tap skips to the end
  await p.waitForTimeout(300);
  check(await p.isVisible('#rLost'), 'results should say the trees were lost');

  // 2. Grab 4, skip one airport, land: 4 x 1.5 = 6 trees banked.
  await p.click('#againBtn'); await p.waitForTimeout(2300);
  await noStorms(); await hold(); await grab(4);
  for (let i = 0; i < 8; i++) { await hold(); await p.waitForTimeout(60); }
  await scene(() => { const s = game.scene.getScene('game'); s.airportsSkipped = 1; s.heat = 20; s.distancePx = s.nextAirport.worldX - 250; });
  for (let i = 0; i < 150; i++) {
    const st = await scene(() => { const s = game.scene.getScene('game'); s.heat = Math.max(s.heat, 20);
      const toA = s.nextAirport.worldX - s.distancePx; if (toA > -20) { s.plane.y = 300; s.plane.vy = 0; } return s.state; });
    if (st === 'over') break;
    await p.waitForTimeout(40);
  }
  r = await scene(() => game.scene.getScene('game').result);
  check(r && r.landed, 'did not land');
  check(r && r.gained === 6, `4 trees x1.5 should bank 6, got ${r && r.gained}`);
  check((await getSave()).seeds === 11, `bank should be 5 + 6 = 11, got ${(await getSave()).seeds}`);

  // 3. Hangar: lines unlock as you progress. A new player sees Fuel as locked.
  await setSave({ ...base, seeds: 50 }); await p.reload(); await p.waitForTimeout(600);
  await p.click('#tabHangar');
  check(await p.$('[data-buy="fuel"]') === null, 'fuel should be locked before 3 landings');
  check((await p.textContent('#hUpgrades')).includes('Unlocks after 3 landings'), 'locked lines should say how to unlock them');
  check(await p.$('[data-buy="species"]') === null, 'tree species should be locked before planting a tree');
  // Levelled lines, prices, info pop-up.
  await setSave({ ...base, seeds: 50, crystals: 2, landings: 3 }); await p.reload(); await p.waitForTimeout(600);
  await p.click('#tabHangar');
  await p.click('[data-buy="radar"]');     // 10 seeds + 1 crystal
  await p.click('[data-buy="fuel"]');      // 15 seeds + 1 crystal
  const save = await getSave();
  check(save.seeds === 25 && save.crystals === 0, `50 - 10 - 15 should leave 25 seeds and 2 - 1 - 1 = 0 crystals, got ${save.seeds}, ${save.crystals}`);
  check(save.levels.radar === 1 && save.levels.fuel === 1, 'levels not saved');
  check(save.fuel === 'saf25', `new fuel should be equipped, got ${save.fuel}`);
  check(await p.isDisabled('[data-buy="engine"]'), 'engine (20 seeds + 1 crystal) should be unaffordable with 25 seeds but no crystals');
  check(/^30\D+2$/.test((await p.textContent('[data-buy="radar"]')).trim()), 'radar level 2 should cost 30 seeds + 2 crystals');
  await p.click('[data-info="fuel"]');
  check(await p.isVisible('#info'), 'info pop-up did not open');
  check((await p.textContent('#iWhat')).length > 20, 'info pop-up has no text');
  check((await p.$$('#iLinks a, #iLinks span')).length > 0, 'info pop-up has no links');
  await p.click('#iClose');

  // 4. The flight uses the upgrades: SAF 25% = 0.9 CO2 (raised 2026-10-21 for balance); radar reveals icy air from 100 px.
  await p.click('#tabFly'); await p.click('#goBtn'); await p.waitForTimeout(2400);
  const kit = await scene(() => { const s = game.scene.getScene('game'); return { co2: s.co2Rate, reveal: s.kit.revealPx }; });
  check(Math.abs(kit.co2 - 0.9) < 1e-9, `SAF 25% cruise CO2 should be 0.9, got ${kit.co2}`);
  check(kit.reveal === 100, `radar 1 should reveal at 100, got ${kit.reveal}`);

  // 5. Planting: a parcel dropped so it lands on a soil plot plants a tree that cools; one that
  //    lands on bare ground is missed.
  await setSave({ ...base, levels: { trees: 1 } }); await p.reload(); await p.waitForTimeout(600);
  await p.click('#goBtn'); await p.waitForTimeout(2400);
  await noStorms(); await hold();
  check(await scene(() => game.scene.getScene('game').dropShown), 'DROP button should show while carrying parcels');
  // Miss: no plots anywhere.
  await scene(() => { const s = game.scene.getScene('game'); s.plots.forEach(pl => pl.parts.forEach(x => x.destroy())); s.plots = []; s.nextPlotAt = 1e9; });
  await p.mouse.click(340, 740);   // the DROP button in the ground strip (game x 218-282, y 476-508)
  for (let i = 0; i < 25; i++) { await hold(); await p.waitForTimeout(100); }
  let t = await scene(() => { const s = game.scene.getScene('game'); return { planted: s.planted, parcels: s.parcels }; });
  check(t.planted === 0 && t.parcels === 1, `a parcel with no soil below should miss, got ${JSON.stringify(t)}`);
  // Hit: put a plot where the parcel will land, then drop.
  // The X (predictLanding) already allows for the ground scrolling while the parcel falls,
  // so a plot centred under the X must be hit with no correction.
  await scene(() => { const s = game.scene.getScene('game'); s.addPlot(s.predictLanding() - s.kit.plotW / 2); });
  await p.mouse.click(340, 740);   // the DROP button in the ground strip (game x 218-282, y 476-508)
  for (let i = 0; i < 30; i++) { await hold(); await p.waitForTimeout(100); }
  t = await scene(() => { const s = game.scene.getScene('game'); return { planted: s.planted, parcels: s.parcels, cool: s.breakdown.trees, state: s.state }; });
  check(t.planted === 1 && t.parcels === 0, `a parcel aimed at a plot should plant a tree, got ${JSON.stringify(t)}`);
  check(t.cool > 0, 'planted tree is not cooling ' + JSON.stringify(t));
  check(!(await scene(() => game.scene.getScene('game').dropShown)), 'DROP button should hide with no parcels left');

  // 6. The breakdown (CO2 + night - day - trees) adds up to the heating bar.
  const m = await scene(() => { const s = game.scene.getScene('game'); const d = s.breakdown; return { heat: s.heat, sum: d.co2 + d.night - d.sun - d.trees }; });
  check(Math.abs(m.heat - m.sum) < 1e-6, `breakdown ${m.sum} != heat ${m.heat}`);

  console.log({ fails, errs });
  if (errs.length) fails.push('page errors');
  console.log(fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
