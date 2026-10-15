// Progression check: trees are saved, the hangar sells upgrades, upgrades change the flight,
// tree parcels plant and cool, and the results screen adds up.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/progression.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v1';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());
  const fails = [];
  const check = (cond, msg) => { if (!cond) fails.push(msg); };
  const scene = fn => p.evaluate(fn);

  // 1. A crash with no landing keeps distance trees only.
  await p.goto(URL); await p.evaluate(k => localStorage.removeItem(k), KEY); await p.reload(); await p.waitForTimeout(600);
  await p.click('#goBtn'); await p.waitForTimeout(400);
  await scene(() => { const s = game.scene.getScene('game'); s.distancePx = 1200; });
  await p.waitForTimeout(6000);   // no taps: falls and crashes
  let r = await scene(() => game.scene.getScene('game').result);
  check(r && !r.landed, 'expected a crash');
  check(r && r.gained === 2, `crash at ~1200m should keep 2 distance trees, got ${r && r.gained}`);
  check(await p.isVisible('#results'), 'results screen not shown');

  // 2. Give trees, buy SAF and parcels in the hangar, and check the save.
  await p.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.trees = 30; localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await p.reload(); await p.waitForTimeout(600);
  await p.click('#hangarBtn');
  await p.click('[data-buy="saf"]');
  await p.click('[data-buy="parcels"]');
  let save = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  check(save.trees === 12, `30 - 10 - 8 should leave 12 trees, got ${save.trees}`);
  check(save.owned.includes('saf') && save.owned.includes('parcels'), 'purchases not saved');
  check(save.fuel === 'saf', 'SAF not equipped after buying');
  check(await p.isDisabled('[data-buy="sensor"]') === false, 'sensor (6) should be affordable with 12');
  check(await p.isDisabled('[data-buy="hydrogen"]'), 'hydrogen (35) should be unlocked by SAF but unaffordable with 12');
  check(await p.$('[data-buy="forecast"]') === null, 'forecast should be locked until the sensor is bought');

  // 3. Fly with SAF: cruise CO2 is lower than kerosene's 1.0; plant a tree and see it cool.
  await p.click('#hBackBtn'); await p.click('#goBtn'); await p.waitForTimeout(2600);
  const co2 = await scene(() => game.scene.getScene('game').co2Rate);
  check(Math.abs(co2 - 0.6) < 1e-9, `SAF cruise CO2 should be 0.6, got ${co2}`);
  await scene(() => { const s = game.scene.getScene('game'); s.storms.forEach(st => st.parts.forEach(r => r.destroy())); s.storms = []; s.nextStormAt = 1e9; });
  const hold = () => scene(() => { const s = game.scene.getScene('game'); s.plane.y = 200; s.plane.vy = 0; });
  await hold();
  await p.mouse.click(195, 740);   // tap the ground strip (canvas spans y 75..768 here)
  for (let i = 0; i < 26; i++) { await scene(() => { const s = game.scene.getScene('game'); s.plane.y = 200; s.plane.vy = 0; }); await p.waitForTimeout(100); }
  const t = await scene(() => { const s = game.scene.getScene('game'); return { planted: s.planted, parcels: s.parcels, treeCool: s.breakdown.trees, trees: s.trees.length, state: s.state, tweens: s.tweens.getTweens().length, paused: s.scene.isPaused() }; });
  check(t.planted === 1 && t.parcels === 2, `tap on ground should plant 1 of 3 parcels, got ${JSON.stringify(t)}`);
  check(t.treeCool > 0, 'planted tree is not cooling ' + JSON.stringify(t));

  // 4. The breakdown (CO2 + night contrails - day contrails - trees) adds up to the heating bar.
  const m = await scene(() => { const s = game.scene.getScene('game'); const d = s.breakdown; return { heat: s.heat, sum: d.co2 + d.night - d.sun - d.trees }; });
  check(Math.abs(m.heat - m.sum) < 1e-6, `breakdown ${m.sum} != heat ${m.heat}`);

  console.log({ fails, errs });
  if (errs.length) fails.push('page errors');
  console.log(fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
