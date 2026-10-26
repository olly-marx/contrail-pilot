// Upgrades: tree-line branches open only after the line they grow from; the fleet (src/fleet.js:
// plane lines, systems, gadgets) and the tree lines change the flight settings (loadout) AND the
// game (landing bonus, fall speed, tree growth). The controls never change.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/upgrades.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const base = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, freeGiven: true, mission: 99 };
  const setSave = s => p.evaluate(s => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(s)); }, s);
  const reload = async () => { await p.reload(); await ready(p); await p.waitForTimeout(800); };
  await p.goto(URL);

  const fl = (plane, planes, systems = {}, gadgets = {}) => ({ plane, planes, systems, gadgets });
  // 1. Branches (tree lines; the old plane lines were retired by the eras reset, 2026-10-23).
  const pure = await p.evaluate(async () => { const { LINES, unlocked, retired } = await import('./src/upgrades.js');
    return LINES.filter(l => l.requires && !retired(l)).map(l => ({ id: l.id, before: unlocked({ levels: {}, landings: 99, planted: { spruce: 9 } }, l),
      after: unlocked({ levels: { [l.requires.line]: l.requires.level }, landings: 99, planted: { spruce: 9 } }, l) })); });
  check(pure.length >= 1 && pure.every(x => !x.before && x.after), `every branch: locked before its parent level, open after: ${JSON.stringify(pure)}`);

  // 2. Loadout values from the fleet (src/fleet.js): plane lines, systems and gadgets.
  const kit = await p.evaluate(async F => { const { loadout } = await import('./src/upgrades.js');
    const k = (fleet, lv = {}) => loadout({ levels: lv, fuel: 'kerosene', fleet });
    return { none: k(F.none), twin: k(F.twin), twinTake: k(F.twinTake), gad: k(F.gad), sys: k(F.sys), nur2: k(F.none, { nursery: 2 }), soil3: k(F.none, { soil: 3 }) }; },
    { none: fl('comet', { comet: {} }), twin: fl('twin', { twin: {} }), twinTake: fl('twin', { twin: { body: 1 } }, { ops: 6 }),
      gad: fl('comet', { comet: {} }, {}, { magnet: 6, hold: 6, gear: 6, sensors: 6, autopilot: 6 }), sys: fl('jumbo', { jumbo: { engines: 3 } }, { forecast: 6 }) });
  check(Math.abs(kit.twin.co2Cruise / kit.none.co2Cruise - 0.8 / 1.1) < 1e-6, `the twin makes x0.8 CO2 vs the Comet's x1.1: ${kit.none.co2Cruise} -> ${kit.twin.co2Cruise}`);
  check(Math.abs(kit.twinTake.co2Takeoff / kit.twin.co2Takeoff - 0.92 * 0.82 * 0.88) < 1e-6, `composite tail x0.92 and weight-saving x0.88 cruise, x0.82 take-off: ${kit.twin.co2Takeoff} -> ${kit.twinTake.co2Takeoff}`);
  check(kit.gad.pickup === 34 && kit.gad.perSkip === 0.8 && kit.gad.flare === 1.6 && kit.gad.dodgeCrystals === 3 && kit.gad.dodgesPerNight === 8 && kit.gad.autoSecs === 13 && kit.gad.autoChance === 0.09,
    `gadgets at level 6: ${JSON.stringify([kit.gad.pickup, kit.gad.perSkip, kit.gad.flare, kit.gad.dodgeCrystals, kit.gad.dodgesPerNight, kit.gad.autoSecs, kit.gad.autoChance])}`);
  check(kit.none.perSkip === 0.5 && kit.none.pickup === 12 && kit.none.dodgeCrystals === 1 && kit.none.dodgesPerNight === 3, 'nothing bought: today\'s values');
  check(Math.abs(kit.sys.co2Cruise / kit.none.co2Cruise - 0.8 / 1.1) < 1e-6 && kit.sys.revealPx === 200, `747 next-gen engines x0.8, forecasting 6 sees 200 px: ${[kit.sys.co2Cruise, kit.sys.revealPx]}`);
  check(kit.nur2.grow === 0.5 && kit.soil3.plotW === 96, `tree lines unchanged: nursery 2, soil 3: ${[kit.nur2.grow, kit.soil3.plotW]}`);

  // 3. In the game: fly with them and measure.
  await setSave({ ...base, levels: { trees: 2, nursery: 2 }, fleet: fl('comet', { comet: {} }, {}, { hold: 6, gear: 6, magnet: 6 }) }); await reload();
  await p.click('#goBtn'); for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
  const g = await p.evaluate(() => new Promise(res => { const s = game.scene.getScene('game');
    s.graceUntil = 0; s.storms = []; s.nextStormAt = 1e9; s.heat = 0; s.airportsSkipped = 2;
    const mult = s.multiplier();
    s.plane.y = 100; s.plane.vy = 0; const t0 = s.gameTime;
    setTimeout(() => { const fall = s.plane.vy / ((s.gameTime - t0) / 1000);   // px/s^2
      s.trees.push({ sprite: { active: false, setTexture() {} }, kind: 'spruce', plantedAt: s.elapsed - 5, stage: 0 });   // 5 s old
      setTimeout(() => { res({ mult, fall, stage: s.trees[s.trees.length - 1].stage, kit: { dc: s.kit.dodgeCrystals, dpn: s.kit.dodgesPerNight } }); s.finish = () => {}; }, 100);
    }, 150); }));
  check(Math.abs(g.mult - 2.6) < 1e-6, `Cargo hold 6 (+0.8): 2 airports passed should be x2.6, got x${g.mult}`);
  check(Math.abs(g.fall - 900) < 60, `no upgrade changes the controls: the plane should fall at normal gravity (900) with every gadget, got ${Math.round(g.fall)} px/s^2`);
  check(g.stage >= 1, `Tree Nursery 2: a 5 s old tree should be young (stage 1), got stage ${g.stage}`);

  // 4. An old save (before trees of upgrades) still loads and shows the hangar without errors.
  await setSave({ tutorialDone: true, muted: true, seenTips: ['*'], seeds: 5, levels: { radar: 3, engine: 3, trees: 4, species: 4 }, planted: { oak: 2 } }); await reload();
  await p.click('[data-go=hangar]'); await p.waitForTimeout(300); await p.click('[data-go=nature]'); await p.waitForTimeout(300);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS upgrades');
})();
