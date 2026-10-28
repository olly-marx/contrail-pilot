// Lesson L4 ("skip one airport, land at the next"): the HUD never says "get LOW to land!" at the first airport of an
// L4 flight (it contradicted the lesson's "Fly PAST this airport" strip); it says to fly past. With L4 done, the landing
// call is back. (The airport is moved 200 m ahead: this checks the HUD line, not flying.) Plant: skipThis off -> FAIL.
// Run: python3 -m http.server 8000 & node tests/l4hint.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const hud = async done => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); },
      { areas: ['easia'], homeArea: 'easia', city: 'SEOUL', tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true,
        missionsDone: done, landings: 4, flights: 5, fleet: { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} } });
    await p.goto(URL); await ready(p); await p.waitForTimeout(500); await p.click('#goBtn'); await started(p); await p.mouse.move(195, 460); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up();   // (hold to take off)
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
    await p.evaluate(() => { const s = game.scene.getScene('game'); s.hitsStorm = () => false; s.hitBird = () => false; s.nextAirport.worldX = s.distancePx + 200; });
    await p.waitForTimeout(300);
    const t = await p.evaluate(() => game.scene.getScene('game').nextText.text);
    check(!p.errs.length, `page errors: ${p.errs}`); await p.close(); return t;
  };
  const l4 = await hud(['L1', 'L2', 'L3']);
  check(!/get LOW to land|glide down/i.test(l4) && /PAST/i.test(l4), `an L4 flight's first airport says fly past, never land ("${l4}")`);
  const after = await hud(['L1', 'L2', 'L3', 'L4']);
  check(/get LOW to land/i.test(after), `with L4 done the landing call is back ("${after}")`);
  await b.close();
  console.log(fails.length ? `FAIL l4hint:\n - ${fails.join('\n - ')}` : `PASS l4hint: L4 flight "${l4}"; after L4 "${after}"`);
  process.exit(fails.length ? 1 : 0);
})();
