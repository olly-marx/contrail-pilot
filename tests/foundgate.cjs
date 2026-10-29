// Nothing is FOUND before the NATURE lesson (the user's playtest, 2026-10-29: "I already found cows and sheep on my second flight,
// but that's supposed to be the third"). Flight 2 (L1 done, L2 next): cows and sheep may graze as scenery, but save.found stays
// empty (wild animals may be DRAWN from flight 2, the rails; they are not counted); flight 3 (L2 done): animals are found. Real flights, kept safe; ?preview=1.
// Run: python3 -m http.server 8000 & node tests/foundgate.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const run = async done => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); });
    await p.goto(URL + '?preview=1'); await ready(p); await p.waitForTimeout(800);
    await p.click('#startChoice [data-area="weurope"]').catch(() => {}); await p.click('#startChoice [data-city]').catch(() => {}); await p.waitForTimeout(1200);
    await p.evaluate(done => { const s = game.registry.get('save'); Object.assign(s, { tutorialDone: true, freeGiven: true, freeUpgrade: false, missionsDone: done, found: {},
      tours: ['hangar', 'name', 'r-boards', 'r-bonus', 'r-free', 'r-nature', 'r-parcels', 'r-res1', 'r-res2', 'r-school', 'r-systems', 'r-takeoff1', 'r-takeoff2'] });
      game.scene.getScene('game').wildOK0 = null;   /* (the menu backdrop cached it before this test seeded the lessons) */
      const t = document.getElementById('tour'); if (t) t.hidden = true; const ui = game.registry.get('ui'); ui.tour.busy = true; ui.showTitle(); }, done);
    await p.waitForTimeout(600);
    await p.click('#goBtn'); await started(p);
    for (let i = 0; i < 4 && await p.evaluate(() => game.scene.getScene('game').state !== 'playing'); i++) { await p.mouse.move(195, 420); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up(); }
    await p.evaluate(() => { const s = game.scene.getScene('game'); Object.assign(s, { graceUntil: 1e12, hitsStorm: () => false, hitBird: () => false }); s.nextAirport.worldX = s.distancePx + 1e7; });
    let farm = 0, wild = 0;
    for (let i = 0; i < 60; i++) { await p.waitForTimeout(250);
      const v = await p.evaluate(() => { const s = game.scene.getScene('game'); s.heat = 0; if (s.plane.y > 300) s.applyFlap(); const l = (s.life || []).filter(x => x.kind);
        return { farm: l.filter(x => /animal-(cow|sheep)/.test(x.kind)).length, wild: l.filter(x => !/animal-(cow|sheep)/.test(x.kind)).length }; });
      farm = Math.max(farm, v.farm); wild = Math.max(wild, v.wild); }
    const found = await p.evaluate(() => Object.keys(game.registry.get('save').found || {}));
    await p.close();
    return { farm, wild, found, errs };
  };
  const f2 = await run(['L1']);
  check(f2.found.length === 0, `flight 2: nothing found before the NATURE lesson (found ${f2.found})`);
  check(f2.farm > 0, `flight 2: the farm scenery still shows cows or sheep (${f2.farm}; else this test proves nothing)`);
  const f3 = await run(['L1', 'L2']);
  check(f3.found.length > 0, `flight 3: animals are found after the NATURE lesson (${f3.found})`);
  check(!f2.errs.length && !f3.errs.length, `page errors ${f2.errs} ${f3.errs}`);
  await b.close();
  console.log(fails.length ? `FAIL foundgate:\n - ${fails.join('\n - ')}` : `PASS foundgate: flight 2 finds nothing (${f2.farm} farm animals drawn), flight 3 finds ${f3.found.join(', ')}`);
  process.exit(fails.length ? 1 : 0);
})();
