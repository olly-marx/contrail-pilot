// The journey (src/route.js, src/network.js; the user, 2026-10-22): ~100 airports, any direction.
// You take off from the city you last landed in and choose one of THREE ways (buttons on FLY, with a
// globe); the flight's path then follows the world-tour rule (no city twice in one flight); legs are
// balanced game lengths (1,800-2,600 km); landing moves you there and asks for a new direction; a crash
// keeps you where you were; laps became "times round the Earth" (flownKm / 40,075); old saves (a city
// INDEX of the 16-city loop) move to the city's name.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/journey.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const base = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 5 };
  const setSave = s => p.evaluate(s => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(s)); }, s);
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));
  const fly = async () => {   // take off and wait until flying
    await p.click('#goBtn');
    for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
    return p.evaluate(() => { const s = game.scene.getScene('game'); return { home: s.homeName, next: s.nextAirport.name, at: Math.round(s.nextAirport.worldX), path: s.path.slice(0, 8) }; });
  };
  // End the flight as if landed at the k-th airport ahead (0 = the next one), or crashed.
  const end = (landed, k = 0) => p.evaluate(([landed, k]) => { const s = game.scene.getScene('game');
    s.landedAt = landed ? s.path[k + 1] : null; s.airportIndex = k; s.airportsSkipped = k;
    s.finish({ landed }); return s.result; }, [landed, k]);
  const reload = async () => { await p.reload(); await ready(p); await p.waitForTimeout(800); };
  const ways = () => p.evaluate(() => [...document.querySelectorAll('[data-way]')].map(b => ({ to: b.dataset.way, text: b.textContent.replace(/\s+/g, ' ').trim(), on: b.classList.contains('on') })));

  await p.goto(URL); await setSave(base); await reload();
  await p.waitForFunction(() => document.querySelectorAll('[data-way]').length === 3, null, { timeout: 15000 }).catch(() => {});
  // 1. Three ways out of LONDON, in different directions, each with its land; the first is chosen.
  let w = await ways();
  check(w.length === 3 && new Set(w.map(x => x.text.split(' ')[0])).size === 3 && w.filter(x => x.on).length === 1, `three different ways from LONDON: ${JSON.stringify(w)}`);
  check(await p.$('#jGlobe') && /Times round the Earth/.test(await p.textContent('#tJourney')), 'a globe and the times-round-the-Earth line');
  // 2. Choose the second way: the flight goes that way, its first leg 1,800-2,600 km, no city twice.
  await p.click(`[data-way="${w[1].to}"]`); await p.waitForTimeout(200);
  check((await save()).heading === w[1].to, `the chosen way is saved: ${(await save()).heading}`);
  let f = await fly();
  check(f.home === 'LONDON' && f.next === w[1].to && f.at >= 1800 && f.at <= 2600, `the flight goes the chosen way: ${JSON.stringify(f)}`);
  const long = await p.evaluate(() => game.scene.getScene('game').path.slice(0, 60));
  // The world-tour rule: new cities first; a few repeats only where every neighbour has been seen (measured: a median of 5 in 104).
  check(long.length - new Set(long).size <= 4, `few cities twice in one flight (60 airports): ${long.length - new Set(long).size} repeats: ${long.join('>')}`);

  // 3. Fly past the first airport: the next one is the path's next, one leg further on.
  const passed = await p.evaluate(() => { const s = game.scene.getScene('game'), x0 = s.nextAirport.worldX; s.distancePx = x0 + 230;
    return new Promise(res => setTimeout(() => res({ next: s.nextAirport.name, want: s.path[2], gap: Math.round(s.nextAirport.worldX - x0), leg: s.legKm(1) }), 300)); });
  check(passed.next === passed.want && passed.gap === passed.leg, `after passing the first airport: ${JSON.stringify(passed)}`);

  // 4. Land at the first airport: you are there, asked for a new way; the km count up.
  r = await end(true, 0);
  let s = await save();
  check(r.landedAt === w[1].to && s.city === w[1].to && s.heading === null && s.flownKm > 0, `landing moves you: ${r.landedAt}, ${s.city}, heading ${s.heading}, ${s.flownKm} km`);
  await p.waitForTimeout(1200); await reload();
  check(new RegExp(`You are in ${w[1].to}`).test(await p.textContent('#tJourney')), 'FLY says where you are now');

  // 5. A crash keeps you where you were.
  await fly(); await end(false);
  check((await save()).city === w[1].to, `a crash keeps you in ${w[1].to}: ${(await save()).city}`);
  await p.waitForTimeout(1200);

  // 6. Times round the Earth: crossing 40,075 km flown is a lap.
  await setSave({ ...base, city: 'LONDON', flownKm: 39990 }); await reload();
  await fly(); r = await p.evaluate(() => { const s = game.scene.getScene('game'); s.distancePx = 500; s.landedAt = s.path[1]; s.finish({ landed: true }); return s.result; });
  check(r.lap === true && (await save()).flownKm >= 40075, `crossing 40,075 km is one more time round the Earth: ${r.lap}, ${(await save()).flownKm}`);
  await p.waitForTimeout(1200);

  // 7. An old save (city = index 15 of the old loop, 2 laps) moves to REYKJAVIK and keeps its distance.
  await setSave({ ...base, city: 15, laps: 2 }); await reload();
  s = await p.evaluate(() => game.registry.get('save'));
  check(s.city === 'REYKJAVIK' && s.flownKm === 2 * 32060, `old save migrated: ${s.city}, ${s.flownKm}`);

  // 8. Flight school always starts in LONDON, even mid-journey.
  await setSave({ ...base, city: 'NAIROBI' }); await reload();
  await p.click('#schoolBtn'); await p.waitForTimeout(400);
  await p.evaluate(() => { const b = document.getElementById('howClose'); if (b && !document.getElementById('how').hidden) b.click(); });
  await p.waitForTimeout(1200);
  check(await p.evaluate(() => game.scene.getScene('game').homeName) === 'LONDON', `flight school should start in LONDON, got ${await p.evaluate(() => game.scene.getScene('game').homeName)}`);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS journey');
})();
