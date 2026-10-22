// Updates (src/updates.js, 2026-10-22): a new version on the server shows a banner on the menu but
// never during a flight; UPDATE writes the save first, then reloads; ignored for a day it reloads by
// itself, but only on an idle menu (not with a card or tip open); after an update with a 'major'
// change you haven't seen, "What's new" shows once; new players don't get it.
// The page's own version is faked (window.__CP_VERSION), the server's version.json is served by the
// test, and the reload is caught (window.__CP_RELOAD) so the page stays put.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/updates.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const errs = [];
  const CHANGES = [{ id: 'c3', level: 'minor', notes: ['Small fix.'] }, { id: 'c2', level: 'major', notes: ['Big new thing!'] }, { id: 'c1', level: 'minor', notes: ['Old.'] }];
  let server = { commit: 'aaa', changes: CHANGES };
  const page = async (updates, extra = {}) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.route('**/version.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(server) }));
    await p.addInitScript(([updates, extra]) => {
      window.__CP_VERSION = 'aaa'; window.__reloads = 0; window.__CP_RELOAD = () => { window.__reloads++; };
      if (!sessionStorage.getItem('init')) {
        sessionStorage.setItem('init', '1'); localStorage.clear();
        localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'],
          tours: ['name', 'hangar', 'nature', 'wild'], freeGiven: true, priceVersion: 2, missionsDone: [], badgeTiers: {}, seeds: 100, ...extra }));
        if (updates) localStorage.setItem('contrailPilot.updates', JSON.stringify(updates));
      }
    }, [updates, extra]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    return p;
  };
  const card = p => p.evaluate(() => !!document.getElementById('upCard'));
  const banner = p => p.evaluate(() => !!document.getElementById('upBanner'));

  // A new player: no What's new.
  let p = await page(null);
  check(!(await card(p)), 'a new player gets no "What\'s new" card');
  await p.close();
  // Last saw c1; now on a version whose notes include a MAJOR change (c2): What's new, once.
  p = await page({ seen: 'c1' });
  const text = await p.evaluate(() => (document.getElementById('upCard') || {}).textContent || '');
  check(/Big new thing/.test(text) && /Small fix/.test(text), `What's new after a major update lists the unseen notes: "${text}"`);
  await p.click('#upCard button'); await p.reload(); await ready(p); await p.waitForTimeout(800);
  check(!(await card(p)), 'What\'s new shows only once');
  // Seen everything up to c2; only a minor change since: no card.
  await p.close(); p = await page({ seen: 'c2' });
  check(!(await card(p)), 'no card for minor changes');

  // A new version on the server: banner on the menu.
  server = { commit: 'bbb', changes: [{ id: 'c4', level: 'minor', notes: ['Even newer.'] }, ...CHANGES] };
  await p.evaluate(() => window.cpUpdates.check()); await p.waitForTimeout(1500);
  check(await banner(p), 'a new version shows the banner on the menu');
  // Not during a flight.
  await p.click('#goBtn');
  await p.waitForFunction(() => ['takeoff', 'playing'].includes(game.scene.getScene('game').state), null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  check(!(await banner(p)), 'no banner during a flight');
  const flying = await p.evaluate(() => { window.cpUpdates.update(); return window.__reloads; });
  check(flying === 0, 'no reload during a flight, even if asked');
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.finish({ reason: 'test' }); });
  await p.waitForTimeout(800);
  await p.evaluate(() => game.registry.get('ui').showTitle()); await p.waitForTimeout(1500);
  check(await banner(p), 'the banner comes back on the menu after the flight');
  // UPDATE: the save is written first (a purchase in the last second is kept), then it reloads.
  const saved = await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.seeds = 4321;   // changed in memory, not yet written
    document.querySelector('#upBanner .go').click();
    return { reloads: window.__reloads, seeds: JSON.parse(localStorage.getItem('contrailPilot.v2')).seeds }; });
  check(saved.reloads === 1 && saved.seeds === 4321, `UPDATE writes the save, then reloads: ${JSON.stringify(saved)}`);

  // Ignored for a day: reloads by itself, but only on an idle menu.
  await p.close();
  p = await page({ seen: 'c3', waitingFor: 'bbb', waitingSince: Date.now() - 25 * 3600 * 1000 });
  await p.evaluate(() => { window.__reloads = 0; document.getElementById('info').hidden = false; });   // an info card open
  await p.waitForTimeout(1500);
  const busy = await p.evaluate(() => window.__reloads);
  await p.evaluate(() => { document.getElementById('info').hidden = true; });
  await p.waitForTimeout(1500);
  const idle = await p.evaluate(() => window.__reloads);
  check(busy === 0, `no auto-update while a card is open: ${busy}`);
  check(idle >= 1, `auto-update after a day on an idle menu: ${idle}`);

  console.log({ fails, errs });
  await b.close();
  if (fails.length || errs.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
