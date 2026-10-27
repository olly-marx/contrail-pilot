// Dusk and dawn (2026-10-23): contrails switch between cooling and warming HALFWAY through the twilight,
// fading out of the old mode, neutral in the middle, fading in the new one. Nothing jumps at the
// day/night boundary. Reads GameScene.radiationMode() at set clock times.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/twilight.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], landings: 5, flights: 3 })); } });
  await p.goto(URL); await ready(p);
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const at = async (clock) => p.evaluate(async c => { const s = game.scene.getScene('game'), { DAYNIGHT: D } = await import('./src/config.js'); s.clock = c; return { ...s.radiationMode(), B: D.blendSeconds, D: D.daySeconds, N: D.nightSeconds }; }, clock);
  const base = await at(0), { B, D, N } = base, T = D + N;
  const frac = f => D - B + f * B;               // clock at fraction f through dusk
  const dawn = f => T - B + f * B;               // ... through dawn
  const eq = (r, cool, label, lo, hi) => { check(r.cool === cool && r.strength >= lo && r.strength <= hi, `${label}: wanted cool=${cool} strength ${lo}-${hi}, got ${JSON.stringify(r)}`); };
  eq(await at(5), true, 'midday', 1, 1);
  eq(await at(frac(0.01)), true, 'dusk start', 0.9, 1);
  eq(await at(frac(0.25)), true, 'early dusk fades the cooling', 0.2, 0.7);
  eq(await at(frac(0.5)), false, 'dusk halfway is neutral', 0, 0);
  eq(await at(frac(0.75)), false, 'late dusk fades the warming in', 0.2, 0.7);
  eq(await at(D + 0.01), false, 'night start is full warming, no jump', 0.95, 1);
  eq(await at(D + N / 2), false, 'midnight', 1, 1);
  eq(await at(dawn(0.01)), false, 'dawn start', 0.9, 1);
  eq(await at(dawn(0.5)), true, 'dawn halfway is neutral', 0, 0);
  eq(await at(dawn(0.75)), true, 'late dawn fades the cooling in', 0.2, 0.7);
  eq(await at(0.01), true, 'day start is full cooling, no jump', 0.95, 1);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS twilight');
})();
