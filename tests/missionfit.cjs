// MISSIONS FITS ITS PANEL (0.78.0; Oliver's iPhone screenshot, 2026-11-24: the FLIGHT SCHOOL row, the NEXT card and every story card stuck out past the panel's right edge).
// Mechanism: the panel is a grid with one column; while that column was 'auto', ONE unbreakable or nowrap piece widened it, and every row and card with it.
// 393x852 (an iPhone 15). Each line plants one wide piece in the real MISSIONS screen and requires that nothing ends past the panel's right edge:
//   1. nothing sticks out as drawn;  2. a 40-letter story title;  3. a long unbroken word in a story's text;  4. a very long city chip;  5. a long NEXT row name.
// Plants (tools/plants.tsv): the column back to 'auto'. Run: python3 -m http.server 8000 & node tests/missionfit.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const SAVE = { areas: ['weurope', 'africa'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'],
  freeGiven: true, freeProjectGiven: true, landings: 120, flights: 200, seeds: 300, crystals: 20, bestDistance: 25000, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 393, height: 852 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); }, SAVE);
  await p.goto(URL); await ready(p); await p.waitForTimeout(600);
  await p.evaluate(() => game.registry.get('ui').go('missions')); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const out = {}, panel = document.querySelector('#missions .panel');
    const sticks = () => { const pr = panel.getBoundingClientRect().right; return [...panel.querySelectorAll('*')].filter(e => { const q = e.getBoundingClientRect(); return q.width && q.right > pr + 0.5; }).length; };
    out.drawn = sticks();
    const plants = { title: ['.scard .stitle', 'W'.repeat(40)], word: ['.scard .stext', 'ANTANANARIVO'.repeat(3)], chip: ['.scard .schip', 'ANTANANARIVO ANTANANARIVO ANTANANARIVO'], next: ['#mNext .rowc-name, #mList .rowc-name', 'M'.repeat(40)] };
    for (const [k, [sel, txt]] of Object.entries(plants)) { const e = document.querySelector(sel); if (!e) { out[k] = 'missing'; continue; } const old = e.textContent; e.textContent = txt; out[k] = sticks(); e.textContent = old; }
    return out; });
  check(r.drawn === 0, `1. as drawn, ${r.drawn} elements end past the panel`);
  for (const k of ['title', 'word', 'chip', 'next']) check(r[k] === 0, `${k}: with a wide ${k} planted, ${r[k]} elements end past the panel (one wide piece must not widen the column)`);
  check(!errs.length, `page errors: ${errs}`);
  await b.close();
  console.log(fails.length ? `FAIL missionfit:\n - ${fails.join('\n - ')}` : 'PASS missionfit: MISSIONS stays inside its panel at 393 px with a long title, word, city chip or NEXT name planted');
  process.exit(fails.length ? 1 : 0);
})();
