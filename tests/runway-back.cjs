// Esc while parked on the runway (TAKE OFF pressed, not yet rolling) takes you back to the title with
// no crash and no flight counted. While rolling it does nothing. A real lift-off counts a flight.
// (2026-10-23: the on-screen MENU button was removed; the FLY screen is reached by FLY ON or the tab bar.)
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/runway-back.cjs
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
  const st = () => p.evaluate(() => { const s = game.scene.getScene('game'); return { state: s.state, airborne: s.airborne, roll: s.rollSpeed, flights: s.save.flights, saved: JSON.parse(localStorage.getItem('contrailPilot.v2')).flights || 0 }; });
  const title = () => p.evaluate(() => !document.getElementById('title').hidden);
  await p.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], landings: 5, flights: 3 })); } });
  await p.goto(URL); await ready(p); await p.waitForTimeout(800);

  await p.click('#goBtn'); await started(p); await p.waitForTimeout(400);
  check(await p.evaluate(() => !document.getElementById('runwayBack')), 'the MENU button should be gone');

  // 2. Esc goes back to the title: no flight, no crash, no roll.
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  let s = await st();
  check(await title(), 'Esc should show the title screen');
  check(s.state === 'idle', `scene should be idle after Esc, got ${s.state}`);
  check(s.flights === 3 && s.saved === 3, `going back should not count a flight: ${JSON.stringify(s)}`);

  // 3. Again, and check the title.
  await p.click('#goBtn'); await started(p); await p.waitForTimeout(400);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  s = await st();
  check(await title() && s.state === 'idle', `Esc should go back to the title: ${JSON.stringify(s)}`);

  // 4. Hidden while rolling; Esc then does nothing.
  await p.click('#goBtn'); await started(p); await p.waitForTimeout(400);
  await p.mouse.move(195, 400); await p.mouse.down(); await p.waitForTimeout(400);
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  check((await st()).state === 'takeoff', 'Esc while rolling should not leave the runway');

  // 5. A real lift-off counts one flight.
  for (let i = 0; i < 40 && !(await st()).airborne; i++) await p.waitForTimeout(100);
  await p.mouse.up();
  s = await st();
  check(s.airborne && s.flights === 4 && s.saved === 4, `lift-off should count one flight: ${JSON.stringify(s)}`);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS runway-back');
})();
