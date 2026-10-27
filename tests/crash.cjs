// Crash catcher (src/crash.js, 2026-10-22): an error mid-flight shows a card (message + where the
// plane was) instead of a silent freeze; so does the browser taking away the WebGL graphics; a missing
// picture does NOT; RESTART writes the save first, then reloads.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/crash.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const page = async () => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(() => { if (sessionStorage.i) return; sessionStorage.i = 1; localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true,
      seenTips: ['*'], tours: ['name', 'hangar', 'nature', 'wild'], freeGiven: true, priceVersion: 2, seeds: 10 })); });
    await p.goto(URL); await ready(p); await p.waitForTimeout(400);
    return p;
  };
  const card = p => p.evaluate(() => { const c = document.getElementById('crashCard'); return c ? c.textContent.replace(/\s+/g, ' ') : ''; });

  // A missing picture is not a crash.
  let p = await page();
  await p.evaluate(() => { const i = new Image(); i.src = 'assets/no-such-picture.png'; document.body.appendChild(i); });
  await p.waitForTimeout(500);
  if (await card(p)) { console.log('FAIL\n- a missing picture shows the crash card'); await b.close(); process.exit(1); }
  // An error in the middle of a flight: the card, with the message and where the plane was.
  await p.click('#goBtn');
  await p.waitForFunction(() => ['takeoff', 'playing'].includes(game.scene.getScene('game').state), null, { timeout: 20000 });
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.events.once('preupdate', () => { throw new Error('planted crash 42'); }); });
  await p.waitForTimeout(800);
  const t = await card(p);
  check(/planted crash 42/.test(t) && /km \| next/.test(t) && /region/.test(t), `an error shows the card with the message and where: "${t.slice(0, 200)}"`);
  // RESTART: the save is written first (a change only in memory is kept), then the page reloads.
  if (t) {   // (no card: already a failure above; the RESTART checks need one)
    await p.evaluate(() => { game.registry.get('save').seeds = 777; });
    await Promise.all([p.waitForNavigation({ timeout: 10000 }).catch(() => {}), p.click('#crashCard button')]);
    await ready(p);
    const seeds = await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')).seeds);
    check(seeds === 777, `RESTART writes the save before reloading: seeds ${seeds}`);
    check(!(await card(p)), 'after RESTART the game runs again (no card)');
  }
  await p.close();

  // The browser takes the WebGL graphics away: the card says so.
  p = await page();
  await p.evaluate(() => { const gl = game.renderer.gl; const ext = gl && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); });
  await p.waitForTimeout(800);
  const g = await card(p);
  check(/Graphics lost/.test(g), `losing the graphics shows the card: "${g.slice(0, 120)}"`);

  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
