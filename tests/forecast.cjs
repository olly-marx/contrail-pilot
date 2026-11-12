// Forecasting (eras stage 5, 2026-10-23): no forecast = icy air seen only up close, no false patches;
// a forecast shows icy air sooner but some patches are FALSE (they puff away with "Forecast wrong!"
// when you get close, make no contrail and pay no dodge crystal) and some real ones are MISSED
// (seen only up close). Better forecasts: fewer of both.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/forecast.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
    flights: 20, landings: 6, seeds: 200, flightSeconds: 8000, levels: { trees: 1 }, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: { forecast: 4 }, gadgets: {} } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(400);

  // 1. The numbers: none, level 1, level 5.
  const k = await p.evaluate(async () => { const F = await import('/src/fleet.js'); const kit = n => F.fleetKit({ fleet: { plane: 'comet', planes: { comet: {} }, systems: { forecast: n }, gadgets: {} } });
    return [0, 1, 2, 3, 4, 5].map(n => [kit(n).revealPx, kit(n).fakes, kit(n).late]); });
  // (0.62.0: the Forecasting levels were smoothed on purpose, src/fleet.js SYSTEMS forecast, tests/forecastsmooth.cjs: level 1 is no longer worse than nothing)
  const pick = [0, 1, 4, 5].map(i => k[i]);
  check(JSON.stringify(pick) === '[[50,0,0],[60,0.2,0.25],[150,0.16,0.18],[160,0.15,0.16]]', `reveal / false share / missed share by level 0, 1, 4, 5: ${JSON.stringify(pick)}`);
  check(k.slice(1).every((q, i, a) => (i === 0 ? q[0] > k[0][0] : q[0] > a[i - 1][0]) && (i === 0 || (q[1] <= a[i - 1][1] + 1e-9 && q[2] <= a[i - 1][2] + 1e-9))), `every Forecasting level is better than the last (reveal up; false and missed shares never up) for levels 0 to 5: ${JSON.stringify(k)}`);

  // 2. In flight: a false patch right ahead of the plane.
  await p.click('#goBtn');
  await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
  const r = await p.evaluate(() => new Promise(res => {
    const s = game.scene.getScene('game'); s.graceUntil = 1e12;
    const y0 = s.plane.y; s.events.on('preupdate', () => { s.plane.y = y0; s.plane.vy = 0; });   // hold the plane level (no taps)
    s.issrs.forEach(i => { i.x = -1e4; }); s.nextIssrAt = 1e12;   // only our patches
    const box = s.hitbox(), y = box.y + box.h / 2 - 30;
    const f = s.addIssrAt(box.x + box.w + 120, y, 120, 60); f.fake = true;
    const overlap = s.inIssrShape(f, { x: f.x + 50, y: f.y + 25, w: 10, h: 10 });   // even inside it: no icy air
    const puffs0 = s.contrails ? s.contrails.length : 0, crys0 = s.crystals;
    const texts = []; const pop = s.popup.bind(s); s.popup = (x, y, t, ...a) => { texts.push(t); return pop(x, y, t, ...a); };
    setTimeout(() => res({ overlap, popped: !!f.popped, said: texts.includes('Forecast wrong!'), gone: !s.issrs.includes(f) || f.x < -1000,
      puffs: (s.contrails ? s.contrails.length : 0) - puffs0, crystals: s.crystals - crys0 }), 2500);
  }));
  check(r.overlap === false, 'a false patch is never icy air, even inside it');
  check(r.popped && r.said && r.gone, `it puffs away with "Forecast wrong!" when the plane gets close: ${JSON.stringify(r)}`);
  check(r.puffs === 0 && r.crystals === 0, `no contrail and no dodge crystal from it: ${JSON.stringify(r)}`);

  // 3. A missed patch is seen only up close (today's 50 px), a forecast one from 130 px.
  const a = await p.evaluate(() => { const s = game.scene.getScene('game'), box = s.hitbox();
    const mk = late => { const i = s.addIssrAt(box.x + box.w + 90, box.y, 60, 40); i.late = late; const v = s.issrAlpha(i, box, false); i.x = -1e4; return v; };
    return { seen: mk(false), missed: mk(true), hidden: s.kit.hiddenAlpha }; });
  check(a.seen > a.hidden && a.missed === a.hidden, `90 px away: a forecast patch shows, a missed one doesn't yet: ${JSON.stringify(a)}`);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
