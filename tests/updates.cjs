// Updates (src/updates.js, 2026-10-22; automatic since 0.11.0): a new version on an idle menu updates by itself (save
// written first, one plain reload, then one forced fresh load if the page came back old, then silence); with a card open
// it is a banner; never during a flight; ignored for a day it still updates on an idle menu; after an update with a 'major'
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
  const page = async (updates, extra = {}, query = '') => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.route('**/version.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(server) }));
    await p.addInitScript(([updates, extra]) => {
      window.__CP_VERSION = 'aaa'; window.__reloads = 0; window.__fresh = []; window.__CP_RELOAD = () => { window.__reloads++; }; window.__CP_FRESH = u => { window.__fresh.push(u); };
      if (!sessionStorage.getItem('init')) {
        sessionStorage.setItem('init', '1'); localStorage.clear();
        localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'],
          tours: ['name', 'hangar', 'nature', 'wild'], freeGiven: true, priceVersion: 2, missionsDone: [], badgeTiers: {}, seeds: 100, ...extra }));
        if (updates) localStorage.setItem('contrailPilot.updates', JSON.stringify(updates));
      }
    }, [updates, extra]);
    await p.goto(URL + query); await ready(p); await p.waitForTimeout(800);
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

  const NEWER = { commit: 'bbb', changes: [{ id: 'c4', level: 'minor', notes: ['Even newer.'] }, ...CHANGES] };
  const reloads = p => p.evaluate(() => window.__reloads);
  const fresh = p => p.evaluate(() => window.__fresh.slice());
  const waitFor = async (p, fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(100); } return false; };
  await p.close();

  // 1. A new version on an IDLE menu updates by itself (0.11.0): "Updating...", the save is written, one plain reload.
  server = { commit: 'aaa', changes: CHANGES };
  p = await page({ seen: 'c3' });
  server = NEWER;
  await p.evaluate(() => { document.getElementById('info').hidden = true; window.cpUpdates.check(); });
  check(await waitFor(p, () => !!document.getElementById('upAuto'), 5000), 'an idle menu says "Updating..." before it reloads');
  await p.evaluate(() => { game.registry.get('ui').save.seeds = 4321; });   // changed in memory, not yet written
  check(await waitFor(p, () => window.__reloads === 1, 6000), `an idle menu updates by itself (reloads: ${await reloads(p)})`);
  check(await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')).seeds) === 4321, 'the save is written before the reload');
  // The page "came back old" (the fake reload leaves it where it is): the second way is ONE forced fresh load, then silence.
  check(await waitFor(p, () => window.__fresh.length === 1, 6000), `a stale page tries one fresh load (${JSON.stringify(await fresh(p))})`);
  check((await fresh(p))[0] === (await p.evaluate(() => location.pathname)) + '?u=bbb', `the fresh address carries the new commit: ${JSON.stringify(await fresh(p))}`);
  await p.waitForTimeout(6000);
  check(await reloads(p) === 1 && (await fresh(p)).length === 1, `the loop guard: no third try (reloads ${await reloads(p)}, fresh ${(await fresh(p)).length})`);
  check(await banner(p), 'after both automatic tries the banner is what is left');
  const tapped = await p.evaluate(() => { document.querySelector('#upBanner .go').click(); return window.__reloads; });
  check(tapped === 2, `UPDATE on the banner still reloads: ${tapped}`);
  await p.close();

  // 2. Something open on the menu (an info card): a banner, no automatic reload; closing it lets the update through.
  server = { commit: 'aaa', changes: CHANGES };
  p = await page({ seen: 'c3' });
  await p.evaluate(() => { document.getElementById('info').hidden = false; });
  server = NEWER; await p.evaluate(() => window.cpUpdates.check());
  check(await waitFor(p, () => !!document.getElementById('upBanner'), 5000), 'with a card open, a new version shows the banner');
  await p.waitForTimeout(3500);
  check(await reloads(p) === 0 && (await fresh(p)).length === 0, 'no automatic update while a card is open');
  await p.evaluate(() => { document.getElementById('info').hidden = true; });
  check(await waitFor(p, () => window.__reloads === 1, 6000), 'closing the card lets the automatic update through');
  await p.close();

  // 3. A tap in the "Updating..." moment cancels it.
  server = { commit: 'aaa', changes: CHANGES };
  p = await page({ seen: 'c3' });
  server = NEWER; await p.evaluate(() => window.cpUpdates.check());
  check(await waitFor(p, () => !!document.getElementById('upAuto'), 5000), '3: "Updating..." shows');
  await p.evaluate(() => { document.getElementById('info').hidden = false; });   // the player opened something in that second
  await p.waitForTimeout(2500);
  check(await reloads(p) === 0 && !(await p.evaluate(() => !!document.getElementById('upAuto'))), `opening something cancels the update (reloads ${await reloads(p)})`);
  await p.close();

  // 4. NEVER during a flight, even when asked; it goes through on the menu afterwards.
  server = { commit: 'aaa', changes: CHANGES };
  p = await page({ seen: 'c3' });
  await p.click('#goBtn');
  await p.waitForFunction(() => ['takeoff', 'playing'].includes(game.scene.getScene('game').state), null, { timeout: 20000 });
  // The flight is PAUSED (loop asleep) so it is still a flight however long the checks take: an unflown plane crashes by itself in a few
  // seconds of game time, and a loaded or a fast machine then decided whether the asked-for update below met a flight or a results screen.
  await p.evaluate(() => game.loop.sleep());
  server = NEWER; await p.evaluate(() => window.cpUpdates.check());
  await p.waitForTimeout(4000);
  check(await p.evaluate(() => ['takeoff', 'playing', 'landing'].includes(game.scene.getScene('game').state)), '4: the paused flight is still a flight');
  check(!(await banner(p)) && !(await p.evaluate(() => !!document.getElementById('upAuto'))), 'no banner and no "Updating..." during a flight');
  const flying = await p.evaluate(() => { window.cpUpdates.update(); window.cpUpdates.update('bbb'); return [window.__reloads, window.__fresh.length]; });
  check(flying[0] === 0 && flying[1] === 0, `no reload during a flight, even if asked: ${JSON.stringify(flying)}`);
  await p.evaluate(() => { game.loop.wake(); const s = game.scene.getScene('game'); s.finish({ reason: 'test' }); });
  check(await waitFor(p, () => !document.getElementById('results').hidden, 8000), 'the results show after the flight');
  await p.waitForTimeout(1500);
  check(await reloads(p) === 0, 'still no reload on the results screen (it is not the idle menu)');
  await p.evaluate(() => document.getElementById('againBtn').click());   // FLY ON: back to the menu, where the update goes through
  check(await waitFor(p, () => window.__reloads === 1, 8000), 'back on the menu after the flight the update goes through');
  await p.close();

  // 4b. The forced fresh load keeps every OTHER parameter of the address (?newplayer=1 and the like), and tidies only its own ?u=.
  server = { commit: 'aaa', changes: CHANGES };
  p = await page({ seen: 'c3', autoTried: 'bbb' }, {}, '?keep=1');   // the plain reload was already tried: the next try is the fresh load
  server = NEWER; await p.evaluate(() => window.cpUpdates.check());
  check(await waitFor(p, () => window.__fresh.length === 1, 8000), '4b: the fresh load is tried');
  const fa = (await fresh(p))[0] || '';
  check(/[?&]keep=1/.test(fa) && /[?&]u=bbb/.test(fa), `the fresh address keeps ?keep=1 and adds ?u=bbb: ${fa}`);
  await p.close();
  p = await page({ seen: 'c3' }, {}, '?keep=1&u=bbb');
  check(await p.evaluate(() => location.search) === '?keep=1', `the ?u= is tidied away and ?keep=1 stays: ${await p.evaluate(() => location.search)}`);
  await p.close();

  // 5. Ignored for a day (both automatic tries used up): still updates by itself on an idle menu, never with a card open.
  p = await page({ seen: 'c3', waitingFor: 'bbb', waitingSince: Date.now() - 25 * 3600 * 1000, autoTried: 'bbb', freshTried: 'bbb' });
  await p.evaluate(() => { window.__reloads = 0; document.getElementById('info').hidden = false; });   // an info card open
  await p.waitForTimeout(2500);
  const busy = await reloads(p);
  await p.evaluate(() => { document.getElementById('info').hidden = true; });
  await p.waitForTimeout(2500);
  const idle = await reloads(p);
  check(busy === 0, `no auto-update while a card is open: ${busy}`);
  check(idle >= 1, `auto-update after a day on an idle menu: ${idle}`);

  console.log({ fails, errs });
  await b.close();
  if (fails.length || errs.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
