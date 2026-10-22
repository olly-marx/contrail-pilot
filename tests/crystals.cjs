// Ice crystals + seeds check: old saves' 'trees' become seeds; dodging icy air you saw coming at
// night earns a crystal, and is kept even after a crash; daytime dodges and night contrails earn
// none; rewilding needs crystals as well as seeds; the hangar splits PLANE and NATURE tabs.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/crystals.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], errs = [];
  const check = (c, m) => { if (!c) fails.push(m); };

  async function page(save) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(([k, s]) => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); sessionStorage.setItem('seeded', '1'); } }, [KEY, save]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(700);
    return p;
  }
  const base = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'] };

  // 1. An old save's 'trees' money becomes seeds.
  let p = await page({ ...base, trees: 7 });
  const mig = await p.evaluate(() => { const s = game.registry.get('save'); return { seeds: s.seeds, trees: s.trees }; });
  check(mig.seeds === 7 && mig.trees === undefined, `old 'trees' should become 7 seeds: ${JSON.stringify(mig)}`);
  await p.close();

  // 2-4. Fly past icy air: night dodge = +1; day dodge = 0; night contrail = 0. Crystals kept on a crash.
  async function pass({ night, through, dive = false }) {
    const p = await page({ ...base, crystals: 0 });
    await p.click('#goBtn'); await started(p); await p.waitForTimeout(2300);
    const r = await p.evaluate(({ night, through, dive }) => new Promise(res => { const s = game.scene.getScene('game');
      s.storms.forEach(st => st.parts.forEach(q => q.destroy())); s.storms = []; s.nextStormAt = 1e9; s.nextIssrAt = 1e9; s.nextTurbAt = 1e9;
      s.issrs.forEach(i => { i.maskGfx.destroy(); i.destroy(); }); s.issrs = [];
      s.clock = night ? 15 + 4 : 2; s.heat = 0;
      const y = 250, h = 60;
      // through: flies the middle. dive: icy air level with the plane, which dives under it at the
      // last moment. Otherwise: passes 25 px above, never in the plane's path.
      const i = s.addIssrAt(s.plane.x + 160, through || dive ? y - h / 2 : y - h - 25, 120, h);
      let most = 0, py = y - 6; const iv = setInterval(() => { most = Math.max(most, s.contrails.length);
        if (dive && i.x - (s.plane.x + 50) < 40) py = y + h / 2 + 4;   // duck under it
        s.plane.y = py; s.plane.vy = 0; s.heat = 0; s.clock = night ? 15 + 4 : 2; }, 10);
      setTimeout(() => { clearInterval(iv); res({ crystals: s.crystals, contrails: most }); }, 4500);
    }), { night, through, dive });
    // Crash: crystals are still banked.
    await p.evaluate(() => { const s = game.scene.getScene('game'); s.plane.y = 600; });
    await p.waitForTimeout(800);
    r.saved = await p.evaluate(k => JSON.parse(localStorage.getItem(k)).crystals, KEY);
    await p.close();
    return r;
  }
  const nightDodge = await pass({ night: true, through: false, dive: true });
  const nightNear = await pass({ night: true, through: false });
  const dayDodge = await pass({ night: false, through: false, dive: true });
  const nightThrough = await pass({ night: true, through: true });
  check(nightDodge.crystals === 1, `dodging icy air at night should earn 1 crystal: ${JSON.stringify(nightDodge)}`);
  check(nightDodge.saved === 1, `crystals should be kept after a crash, saved ${nightDodge.saved}`);
  check(nightNear.crystals === 0, `icy air that was never in your path should earn none: ${JSON.stringify(nightNear)}`);
  check(dayDodge.crystals === 0, `dodging icy air by day should earn none: ${JSON.stringify(dayDodge)}`);
  check(nightThrough.contrails > 0 && nightThrough.crystals === 0, `a night contrail should earn none: ${JSON.stringify(nightThrough)}`);

  // 5. Rewilding costs seeds AND crystals.
  p = await page({ ...base, seeds: 500, crystals: 0, landings: 3, planted: { birch: 3, oak: 3 } });
  // (Habitat projects on the NATURE screen since 2026-10-21: the meadow's button is grey without crystals.)
  const buy = await p.evaluate(() => { const ui = game.registry.get('ui'), s = ui.save; ui.go('nature');
    const without = !document.querySelector('[data-project="meadow"]').disabled; s.crystals = 2; ui.wild.render();
    const withC = !document.querySelector('[data-project="meadow"]').disabled; return { without, withC }; });
  check(!buy.without && buy.withC, `the meadow should need 2 crystals as well as seeds: ${JSON.stringify(buy)}`);

  // 6. The hangar is the plane; trees and habitat projects are on the NATURE screen (the user, 2026-10-21).
  const tabs = await p.evaluate(() => { const ui = game.registry.get('ui'); ui.showHangar();
    const plane = document.getElementById('hUpgrades').textContent; ui.go('nature');
    return { plane, nature: document.getElementById('nature').textContent }; });
  check(!/Tree Planting|meadow/i.test(tabs.plane) && /Engines|Radar/.test(tabs.plane), 'the hangar should show plane lines, not trees or habitats');
  check(/Wildflower meadow/.test(tabs.nature) && /Tree Planting/.test(tabs.nature) && !/Engines/.test(tabs.nature), 'NATURE should show habitats and trees, not engines');
  await p.close();

  check(errs.length === 0, `page errors: ${errs}`);
  console.log({ mig, nightDodge, dayDodge, nightThrough, buy });
  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
