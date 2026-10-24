// Eras by flying time (src/eras.js, 2026-10-23, plane build): era n needs 30 x n^1.5 more minutes;
// save.flightSeconds grows only while really flying (not frozen for a tip, not in flight school),
// a crash counts, and the results and FLY screens show "+N min flown" and the era bar.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/eras.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  // A save with REAL progress, 2 s short of the 1970s.
  await p.addInitScript(() => { if (sessionStorage.i) return; sessionStorage.i = 1; localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({
    tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['name', 'hangar', 'nature', 'wild'], freeGiven: true, priceVersion: 2,
    seeds: 640, crystals: 85, flights: 41, landings: 9, bestDistance: 6100000, flownKm: 52000, city: 'PARIS', visited: ['LONDON', 'PARIS'],
    levels: { engine: 2, magnet: 1, radar: 1, trees: 1 }, planted: { spruce: 12 }, flightSeconds: 20 * 60 - 2 })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(400);

  // The maths, at the boundaries.
  const m = await p.evaluate(async () => { const e = await import('/src/eras.js');
    return [0, 1199, 1200, 4594, 4595, 1e9].map(s => e.eraProgress({ flightSeconds: s }).index).concat([Math.round(e.eraOpensAt(2)), Math.round(e.eraOpensAt(5))]); });
  check(JSON.stringify(m) === JSON.stringify([0, 0, 1, 1, 2, 5, 77, 564]), `era boundaries 0/19:59/20:00/1:16:34/1:16:35/forever, and totals 77 & 564 min: ${m}`);

  // FLY screen: the badge and the bar.
  const fly = await p.evaluate(() => document.getElementById('tEra').textContent.replace(/\s+/g, ' '));
  check(/1950s/.test(fly) && /To the 1970s: 19 \/ 20 min/.test(fly), `FLY screen era bar: "${fly}"`);

  // A real flight: the counter grows while flying...
  await p.click('#goBtn');
  await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
  await p.waitForTimeout(1500);
  const a = await p.evaluate(() => game.scene.getScene('game').flySeconds);
  check(a > 1, `flying time grows in flight: ${a}`);
  // ...but not while frozen (a tip explaining something).
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.graceUntil = 1e12; s.frozen = true; });
  const f0 = await p.evaluate(() => game.scene.getScene('game').flySeconds);
  await p.waitForTimeout(1200);
  const f1 = await p.evaluate(() => game.scene.getScene('game').flySeconds);
  check(Math.abs(f1 - f0) < 0.05, `no flying time while frozen: ${f0} -> ${f1}`);
  await p.evaluate(() => { game.scene.getScene('game').frozen = false; });
  check(await p.evaluate(() => game.scene.getScene('game').state === 'playing'), 'still flying before the planted crash');
  // A crash counts, and opens the era.
  const before = await p.evaluate(() => game.scene.getScene('game').flySeconds);
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.graceUntil = 0; s.finish({ reason: 'Bird strike!\nYou hit a bird.' }); });
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')).flightSeconds);
  check(Math.abs(saved - (20 * 60 - 2 + before)) < 0.5, `a crash adds its flying time to the save: ${saved} vs ${20 * 60 - 2 + before}`);
  await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 10000 });
  await p.click('#results');   // skip the reveal
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const e = document.getElementById('rEra'); return { hidden: e.hidden, t: e.textContent.replace(/\s+/g, ' ') }; });
  check(!r.hidden && /\+0\.\d min flown/.test(r.t) && /1970s/.test(r.t) && /To the 1990s: \d \/ 57 min/.test(r.t) && /NEW ERA! Welcome to the 1970s!/.test(r.t) && /A new plane joins your fleet: the 747 jumbo!/.test(r.t), `results show time, bar and the new era: ${JSON.stringify(r)}`);

  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
