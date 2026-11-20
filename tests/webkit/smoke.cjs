// WEBKIT SMOKE (2026-11-20, Oliver: web, iOS and Android "should all ship together"): every other browser test runs in Chrome, but an iPhone runs the game in
// WebKit (Safari, and the app's web view). This walks the game the way a player does, in WebKit, at an iPhone size. Kept OUT of tests/*.cjs (tools/test.sh
// runs those in Chrome); CI runs it in its own job (.github/workflows/tests.yml `webkit`). Named lines:
//   A. A NEW PLAYER: the page loads with no page error; the start choice appears; a real tap on Western Europe, then LONDON, reaches the game.
//   B. A PLAYING SAVE (an Asia pilot with a crossing ready): MISSIONS shows the crossing card; NATURE, HANGAR, PILOT and BOARDS each open; a flight takes off and
//      covers ground for 3 s; the save in localStorage still reads as JSON; no page error anywhere.
// Run: python3 -m http.server 8000 & node tests/webkit/smoke.cjs     (needs a WebKit for playwright-core: `npx playwright install webkit`)
const { webkit } = require('playwright-core');
const { ready, started } = require('../lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  let b;
  try { b = await webkit.launch(); } catch (e) { console.log(`FAIL webkit-smoke: WebKit did not start (${String(e).split('\n')[0]})`); process.exit(1); }
  const errs = [];   // every page error, from every page: a thrown step still reports them by name
  process.on('unhandledRejection', e => { console.log(`FAIL webkit-smoke:\n - ${[...fails, `a step could not finish: ${String(e && e.message || e).split('\n')[0]}`, ...errs.map(x => `page error: ${x}`)].join('\n - ')}`); process.exit(1); });
  const page = async () => { const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); p.errs = []; p.on('pageerror', e => { p.errs.push(String(e)); errs.push(String(e)); });
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort()); return p; };

  // A. A new player.
  let p = await page();
  await p.goto(URL);
  await p.waitForFunction(() => /Where do you start\?/.test(document.body.innerText), null, { timeout: 60000 }).catch(() => {});
  const choice = await p.evaluate(() => /Where do you start\?/.test(document.body.innerText));
  check(choice, 'A: the start choice ("Where do you start?") never appeared');
  if (choice) {
    const tap = (t, k) => p.getByText(t, { exact: true }).first().tap({ timeout: 20000 }).then(() => true).catch(async () => { check(false, `A: could not tap ${t}${await p.$('#crashCard') ? ' (the crash card is up)' : ''}`); return false; });
    if (await tap('Western Europe')) { await p.waitForTimeout(600); if (await tap('LONDON')) { await ready(p); await p.waitForTimeout(800); } }
    const at = await p.evaluate(() => { const s = window.game && game.registry && game.registry.get('save'); return s ? { city: s.city, home: s.homeArea } : null; });
    check(at && at.city === 'LONDON' && at.home === 'weurope', `A: a new player who picks Western Europe and LONDON starts there: ${JSON.stringify(at)}`);
  }
  check(!p.errs.length, `A: page errors: ${p.errs.slice(0, 3)}`);
  await p.close();

  // B. A playing save.
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  const save = { tutorialDone: true, muted: true, priceVersion: 99, fleet, freeGiven: true, freeProjectGiven: true, goodLandings: 3, pilotNamed: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 },
    treePractice: true, flights: 40, landings: 30, tourToday: 999, areas: ['sasia', 'easia'], homeArea: 'sasia', city: 'KARACHI', tours: ['*'], seenTips: ['*'], bestDistance: 3000 };
  p = await page();
  await p.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('seeded', '1'); } }, save);
  await p.goto(URL); await ready(p); await p.waitForTimeout(800);
  for (const [tab, what] of [['#tabMissions', '#mCross .xcard'], ['#tabNature', null], ['#tabHangar', null], ['#tabPilot', null], ['#tabBoards', null]]) {
    const btn = await p.$(`${tab}:not([hidden])`); if (!btn) { check(false, `B: the ${tab} tab is not on the bar`); continue; }
    await btn.tap(); await p.waitForTimeout(700);
    const shown = await p.evaluate(sel => ({ screens: [...document.querySelectorAll('.overlay.screen:not([hidden])')].map(e => e.id), want: sel ? !!document.querySelector(sel) : true }), what);
    check(shown.screens.length >= 1 && shown.want, `B: ${tab} opens its screen${what ? ` with ${what}` : ''}: ${JSON.stringify(shown)}`);
  }
  await p.evaluate(() => game.registry.get('ui').start()); await started(p);
  // HOLD to take off: a held press on the canvas (the player's own input), 3 s.
  const box = await (await p.$('#game canvas')).boundingBox(), d0 = await p.evaluate(() => game.scene.getScene('game').distancePx || 0);
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(3000);
  const fl = await p.evaluate(() => { const g = game.scene.getScene('game'); return { state: g.state, airborne: !!g.airborne, roll: Math.round(g.rollSpeed || 0), d: Math.round(g.distancePx || 0) }; });
  await p.mouse.up();
  check(['takeoff', 'playing'].includes(fl.state) && (fl.d > d0 || fl.roll > 5 || fl.airborne), `B: holding the screen takes the plane down the runway or into the air: ${JSON.stringify({ d0, ...fl })}`);
  const stored = await p.evaluate(() => { const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)), k = keys.find(x => /contrailPilot\.v2$/.test(x)); try { return !!(k && Number.isFinite(JSON.parse(localStorage.getItem(k)).seeds)); } catch (e) { return false; } });
  check(stored, 'B: the save in localStorage no longer reads as JSON');
  check(!p.errs.length, `B: page errors: ${p.errs.slice(0, 3)}`);
  await p.close(); await b.close();
  console.log(fails.length ? `FAIL webkit-smoke:\n - ${fails.join('\n - ')}` : `PASS webkit-smoke (WebKit ${b.version()}): a new player starts in LONDON; MISSIONS, NATURE, HANGAR, PILOT, BOARDS open; a flight takes off; no page errors`);
  process.exit(fails.length ? 1 : 0);
})();
