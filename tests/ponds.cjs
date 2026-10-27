// Ponds (and storks) keep scrolling with the ground for the whole flight. Bug found 2026-10-20:
// flight-setup lines had slipped into the per-frame tree-cooling code, so each time planted
// trees added up another unit of cooling the pond list was emptied: ponds already on screen
// stopped moving ("they follow the plane") and a burst of new ones appeared.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/ponds.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, levels: { rewild: 9 }, planted: { oak: 9, birch: 9, rowan: 9, spruce: 9, orchard: 9 } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(800); await p.click('#goBtn');
  for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
  // Plant a small forest so the "from your forest" cooling fires often, and fly on.
  await p.evaluate(() => { const s = game.scene.getScene('game');
    s.hitsStorm = () => false; s.hitBird = () => false; s.finish = () => {};
    for (let k = 0; k < 20; k++) s.trees.push({ sprite: { active: false, setTexture() {} }, kind: 'orchard', plantedAt: s.elapsed - 20, stage: 2 });
    window.__ponds = { frozen: 0, fires: 0, maxOnScreen: 0 };
    const last = new Map();
    s.events.on('postupdate', () => {
      s.heat = 0; if (s.plane.y > 220 && s.plane.vy > -40) s.applyFlap();
      if (s.treeFeedback === 0) window.__ponds.fires++;
      // Every pond picture still in the scene must move left with the ground each frame.
      const imgs = s.decorLayer.list.filter(o => o.texture && o.texture.key === 'pond');
      window.__ponds.maxOnScreen = Math.max(window.__ponds.maxOnScreen, imgs.filter(o => o.x > -30 && o.x < 300).length);
      if (s.speed > 0) for (const o of imgs) { if (last.has(o) && last.get(o) === o.x && o.x > -30 && o.x < 300) window.__ponds.frozen++; last.set(o, o.x); }
    });
  });
  await p.waitForTimeout(25000);
  const r = await p.evaluate(() => window.__ponds);
  check(r.fires >= 3, `the forest cooling should have fired a few times: ${JSON.stringify(r)}`);
  check(r.frozen === 0, `ponds stopped scrolling ${r.frozen} frames (they follow the plane): ${JSON.stringify(r)}`);
  check(r.maxOnScreen <= 2, `too many ponds on screen at once (${r.maxOnScreen}): they are 500-900 km apart`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS ponds (${r.fires} forest coolings)`);
})();
