// NEW PLAYER TEST mode (src/newplayer.js, user 2026-10-24): ?newplayer=1 plays a separate, brand-new test
// player: the real save is never read or changed, nothing reaches the online server, it survives a reload,
// ?newplayer=reset wipes only the test player, ?newplayer=off brings the real game back untouched.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/newplayer.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const online = []; p.on('request', r => { if (/supabase\.co/.test(r.url())) online.push(r.url()); });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());   // counted above, never really sent
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  // The REAL game: a pilot with progress and a name.
  const REAL = { tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], seeds: 777, crystals: 42, flights: 50, landings: 12, priceVersion: 2,
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  await p.goto(URL); await ready(p);
  await p.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); localStorage.setItem('contrailPilot.pilot', JSON.stringify({ first: 'Real', word: 'Pilot', tag: 7 })); }, [KEY, REAL]);
  const realRaw = () => p.evaluate(k => { const s = Object.getOwnPropertyDescriptor(Window.prototype, 'localStorage') || Object.getOwnPropertyDescriptor(window, 'localStorage');
    return window.NEWPLAYER_TEST ? null : localStorage.getItem(k); }, KEY);
  const before = await realRaw();
  const game = () => p.evaluate(() => { const s = game.registry.get('save'); return { seeds: s.seeds, flights: s.flights, tutorialDone: s.tutorialDone, tag: !!document.getElementById('npTag') }; });

  // 1. On: a brand-new player, the tag shows.
  await p.goto(URL + '?newplayer=1'); await ready(p); await p.waitForTimeout(400);
  let g = await game();
  check(g.seeds === 0 && g.flights === 0 && !g.tutorialDone && g.tag, `?newplayer=1: a brand-new player with the tag: ${JSON.stringify(g)}`);
  // Play a little: the test player's own save changes.
  await p.evaluate(() => { const s = game.registry.get('save'); s.seeds = 5; s.tutorialDone = true; });
  await p.evaluate(async () => { (await import('/src/save.js')).writeSave(game.registry.get('save')); });
  // 2. A reload without the switch stays in test mode, with the test player's progress.
  await p.goto(URL); await ready(p); await p.waitForTimeout(400);
  g = await game();
  check(g.tag && g.seeds === 5, `a reload stays in test mode: ${JSON.stringify(g)}`);
  // Online: try to save a pilot name and send a flight: nothing reaches the server.
  await p.evaluate(async () => { const o = await import('/src/online.js'); try { await (o.savePilot || o.setPilot || (() => {}))({ first: 'Test', word: 'Otter', tag: 1 }); } catch (e) {}
    try { (o.sendFlight || (() => {}))({ landed: true, distance_m: 1000 }); } catch (e) {} });
  await p.waitForTimeout(1500);
  check(online.length === 0, `test mode never reaches the online server: ${online.slice(0, 3)}`);
  // 3. Reset: the test player starts again from zero.
  await p.goto(URL + '?newplayer=reset'); await ready(p); await p.waitForTimeout(400);
  g = await game();
  check(g.tag && g.seeds === 0 && !g.tutorialDone, `?newplayer=reset: from zero again: ${JSON.stringify(g)}`);
  // 4. Off: the real game, untouched.
  await p.goto(URL + '?newplayer=off'); await ready(p); await p.waitForTimeout(400);
  g = await game();
  const after = await realRaw();
  check(!g.tag && g.seeds === 777 && g.flights === 50, `?newplayer=off: the real game is back: ${JSON.stringify(g)}`);
  check(JSON.parse(after).seeds === JSON.parse(before).seeds && JSON.parse(after).flights === JSON.parse(before).flights, 'the real save was never changed');
  check(await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.pilot')).first) === 'Real', 'the real pilot name is untouched');
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
