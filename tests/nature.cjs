// Nature check: variety beats quantity on the Biodiversity meter, parcels rotate through your tree
// species, rewilding waits for the meter, bought projects appear in the world, and the first
// planting pauses the game to explain the meter.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/nature.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const setSave = v => p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, v]);
  const getSave = () => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const scene = (fn, a) => p.evaluate(fn, a);
  const base = { tutorialDone: true, autoTakeoff: true, muted: true, landings: 3 };
  await p.goto(URL); await p.waitForTimeout(500);

  // 1. Variety beats quantity: 9 spruce < 3 different native trees.
  const bio = await p.evaluate(async () => {
    const n = await import('./src/nature.js');
    return { mono: n.biodiversity({ planted: { spruce: 9 } }), mixed: n.biodiversity({ planted: { birch: 1, oak: 1, rowan: 1 } }),
      firstOak: n.plantGain({ planted: {} }, 'oak'), tenthOak: n.plantGain({ planted: { oak: 9 } }, 'oak') };
  });
  check(bio.mixed > bio.mono, `3 different native trees (${bio.mixed}) should beat 9 spruce (${bio.mono})`);
  check(bio.firstOak > 3 * bio.tenthOak, `first oak (${bio.firstOak}) should add much more than the tenth (${bio.tenthOak})`);

  // 2. Parcels rotate through owned species: spruce, birch, oak.
  await setSave({ ...base, seenTips: ['*'], levels: { trees: 2, species: 2 } }); await p.reload(); await p.waitForTimeout(600);
  await p.click('#goBtn'); await p.waitForTimeout(2400);
  const kinds = await scene(() => { const s = game.scene.getScene('game'); const out = []; for (let i = 0; i < 3; i++) { out.push(s.treeKind()); s.speciesIdx++; } s.speciesIdx = 0; return out; });
  check(JSON.stringify(kinds) === '["spruce","birch","oak"]', `parcels should rotate spruce, birch, oak; got ${kinds}`);

  // 3. Rewilding waits for the meter: meadow needs Biodiversity 3.
  await setSave({ ...base, seenTips: ['*'], seeds: 200, crystals: 5, planted: {} }); await p.reload(); await p.waitForTimeout(600);
  await p.click('#hangarBtn');
  await p.click('[data-tab="nature"]');   // rewilding lives on the NATURE tab
  check(await p.$('[data-buy="rewild"]') === null, 'rewilding should be locked before any tree is planted');
  await setSave({ ...base, seenTips: ['*'], seeds: 200, crystals: 5, planted: { spruce: 1 } }); await p.reload(); await p.waitForTimeout(600);
  await p.click('#hangarBtn');
  await p.click('[data-tab="nature"]');   // rewilding lives on the NATURE tab
  check((await p.textContent('#hUpgrades')).includes('needs Biodiversity 3'), 'meadow should wait for Biodiversity 3');
  await setSave({ ...base, seenTips: ['*'], seeds: 200, crystals: 5, planted: { birch: 2 } }); await p.reload(); await p.waitForTimeout(600);
  await p.click('#hangarBtn');
  await p.click('[data-tab="nature"]');   // rewilding lives on the NATURE tab
  const before = await p.evaluate(async () => (await import('./src/nature.js')).biodiversity(JSON.parse(localStorage.getItem('contrailPilot.v2'))));
  await p.click('[data-buy="rewild"]');
  const save = await getSave();
  const after = await p.evaluate(async () => (await import('./src/nature.js')).biodiversity(JSON.parse(localStorage.getItem('contrailPilot.v2'))));
  check(save.levels.rewild === 1 && save.seeds === 180 && save.crystals === 3, `meadow should cost 20 seeds + 2 crystals and be bought, got ${JSON.stringify(save.levels)} seeds ${save.seeds} crystals ${save.crystals}`);
  check(after - before === 8, `meadow should add 8 Biodiversity, added ${after - before}`);

  // 4. The meadow shows up in the world as flowers in the grass.
  await p.click('#hGoTop'); await p.waitForTimeout(800);
  check(await scene(() => !!game.scene.getScene('game').flowers), 'meadow flowers should appear on the ground');

  // 5. Tree school: the first planted tree pauses to explain what trees do for the climate (CO2,
  // and that a cleaner plane + contrails matter more), then, once calm, the Biodiversity meter.
  await setSave({ ...base, seenTips: ['x-bars', 'x-plots', 'tree-1'], levels: { trees: 1 } }); await p.reload(); await p.waitForTimeout(600);
  await p.click('#goBtn'); await p.waitForTimeout(2400);
  await scene(() => { const s = game.scene.getScene('game'); s.storms = []; s.nextStormAt = 1e9; s.plane.y = 200; s.plane.vy = 0; s.addPlot(100); s.parcelLanded(110, 'spruce'); });
  const ex = await scene(() => { const s = game.scene.getScene('game'); return { explaining: s.explaining, frozen: s.frozen, text: document.getElementById('coachText').textContent }; });
  check(ex.explaining && ex.frozen && /CO2/.test(ex.text) && /cleaner plane/.test(ex.text), `first planting should pause and explain trees and CO2: ${JSON.stringify(ex)}`);
  await p.waitForTimeout(800); await p.click('#coachOk');
  check(await scene(() => !game.scene.getScene('game').frozen), 'OK should carry on');
  await scene(() => { const s = game.scene.getScene('game'); s.nextStormAt = 1e9; s.storms = []; s.birds = []; s.turbs = []; s.heat = 0; });
  let bioTip = '';
  for (let i = 0; i < 40 && !/Biodiversity/.test(bioTip); i++) { await p.waitForTimeout(200); await scene(() => { const s = game.scene.getScene('game'); s.plane.y = 200; s.plane.vy = 0; s.heat = 0; }); bioTip = await scene(() => game.scene.getScene('game').explaining ? document.getElementById('coachText').textContent : ''); }
  check(/Biodiversity/.test(bioTip), `then the Biodiversity step should follow: "${bioTip}"`);

  console.log({ fails, errs, bio, kinds });
  if (errs.length) fails.push('page errors');
  console.log(fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
