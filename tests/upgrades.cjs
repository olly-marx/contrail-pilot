// Upgrade trees (src/upgrades.js): branches open only after the line they grow from; every new
// line's levels change the flight settings (loadout) AND the game (landing bonus, fall speed,
// crystals per dodge, dodges per night, tree growth, landing window, take-off CO2).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/upgrades.cjs
const { chromium } = require('playwright-core');
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
  const reload = async () => { await p.reload(); await p.waitForTimeout(800); };
  await p.goto(URL);

  // 1. Branches: Long Wings needs Lighter Plane 1, which needs Better Engines 1.
  await setSave({ ...base, seeds: 500, crystals: 50, levels: { engine: 1 } }); await reload();
  await p.click('[data-go=hangar]'); await p.waitForTimeout(300);
  const row = name => p.evaluate(n => [...document.querySelectorAll('#hUpgrades .line')].find(e => e.textContent.includes(n))?.textContent.replace(/\s+/g, ' ') || '', name);
  check(/Needs Lighter Plane 1/.test(await row('Long Wings')) && !(await p.$('[data-buy=wings]')), `Long Wings should be locked with "Needs Lighter Plane 1": "${await row('Long Wings')}"`);
  await p.click('[data-buy=airframe]'); await p.waitForTimeout(300);
  check(!!(await p.$('[data-buy=wings]')), 'buying Lighter Plane 1 should open Long Wings');
  const pure = await p.evaluate(async () => { const { LINES, unlocked } = await import('./src/upgrades.js');
    return LINES.filter(l => l.requires).map(l => ({ id: l.id, before: unlocked({ levels: {}, landings: 99, planted: { spruce: 9 } }, l),
      after: unlocked({ levels: { [l.requires.line]: l.requires.level }, landings: 99, planted: { spruce: 9 } }, l) })); });
  check(pure.length >= 6 && pure.every(x => !x.before && x.after), `every branch: locked before its parent level, open after: ${JSON.stringify(pure)}`);

  // 2. Loadout values for every level of every new line.
  const kit = await p.evaluate(async () => { const { loadout } = await import('./src/upgrades.js');
    const k = lv => loadout({ levels: lv, fuel: 'kerosene' });
    return { none: k({}), air3: k({ airframe: 3 }), wings2: k({ wings: 2 }), gear2: k({ gear: 2 }), hold3: k({ hold: 3 }), lens2: k({ lens: 2 }), fc2: k({ forecast: 2 }), nur2: k({ nursery: 2 }), eng5: k({ engine: 5 }), soil3: k({ soil: 3 }), radar4: k({ radar: 4 }) }; });
  check(Math.abs(kit.air3.co2Takeoff / kit.none.co2Takeoff - 0.6) < 1e-6 && kit.air3.co2Cruise === kit.none.co2Cruise, `Lighter Plane 3: take-off CO2 x0.6, cruise unchanged: ${kit.none.co2Takeoff} -> ${kit.air3.co2Takeoff}`);
  check(Math.abs(kit.wings2.co2Cruise / kit.none.co2Cruise - 0.9) < 1e-6 && kit.gear2.flare === 1.5 && kit.hold3.perSkip === 0.8 && kit.none.perSkip === 0.5, `wings / gear / hold values: ${JSON.stringify([kit.wings2.co2Cruise, kit.gear2.flare, kit.hold3.perSkip, kit.none.perSkip])}`);
  check(kit.none.dodgeCrystals === 1 && kit.lens2.dodgeCrystals === 3 && kit.none.dodgesPerNight === 3 && kit.fc2.dodgesPerNight === 8 && kit.nur2.grow === 0.5, `lens / forecast / nursery values: ${JSON.stringify([kit.lens2.dodgeCrystals, kit.fc2.dodgesPerNight, kit.nur2.grow])}`);
  check(Math.abs(kit.eng5.co2Cruise / kit.none.co2Cruise - 0.55) < 1e-6 && kit.soil3.plotW === 96 && kit.radar4.revealPx === 300, `deeper levels: engine 5, soil 3, radar 4: ${[kit.eng5.co2Cruise, kit.soil3.plotW, kit.radar4.revealPx]}`);

  // 3. In the game: fly with all of them and measure.
  await setSave({ ...base, levels: { engine: 1, airframe: 3, wings: 2, gear: 2, magnet: 1, hold: 3, radar: 1, lens: 2, forecast: 2, trees: 2, nursery: 2 } }); await reload();
  await p.click('#goBtn'); for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
  const g = await p.evaluate(() => new Promise(res => { const s = game.scene.getScene('game');
    s.graceUntil = 0; s.storms = []; s.nextStormAt = 1e9; s.heat = 0; s.airportsSkipped = 2;
    const mult = s.multiplier();
    s.plane.y = 100; s.plane.vy = 0; const t0 = s.gameTime;
    setTimeout(() => { const fall = s.plane.vy / ((s.gameTime - t0) / 1000);   // px/s^2
      s.trees.push({ sprite: { active: false, setTexture() {} }, kind: 'spruce', plantedAt: s.elapsed - 5, stage: 0 });   // 5 s old
      setTimeout(() => { res({ mult, fall, stage: s.trees[s.trees.length - 1].stage, kit: { dc: s.kit.dodgeCrystals, dpn: s.kit.dodgesPerNight } }); s.finish = () => {}; }, 100);
    }, 150); }));
  check(Math.abs(g.mult - 2.6) < 1e-6, `Bigger Hold 3: 2 airports passed should be x2.6, got x${g.mult}`);
  check(Math.abs(g.fall - 900) < 60, `no upgrade changes the controls: the plane should fall at normal gravity (900) even with Long Wings, got ${Math.round(g.fall)} px/s^2`);
  check(g.stage >= 1, `Tree Nursery 2: a 5 s old tree should be young (stage 1), got stage ${g.stage}`);

  // 4. An old save (before trees of upgrades) still loads and shows the hangar without errors.
  await setSave({ tutorialDone: true, muted: true, seenTips: ['*'], seeds: 5, levels: { radar: 3, engine: 3, trees: 4, species: 4 }, planted: { oak: 2 } }); await reload();
  await p.click('[data-go=hangar]'); await p.waitForTimeout(300); await p.click('[data-go=nature]'); await p.waitForTimeout(300);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS upgrades');
})();
