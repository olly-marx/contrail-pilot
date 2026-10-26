// A save whose `planted` holds a kind the UK list does not know (a regional tree, an old or corrupt save) must not crash
// NATURE or the results ("The game got stuck", 2026-10-24: speciesPoints() read SPECIES[id].native with no guard).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/nature-unknown.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.clear();
    localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 9, planted: { oak: 2, baobab: 3, 'no-such-tree': 1 } })); } });
  await p.goto(URL); await ready(p);
  const out = await p.evaluate(async () => { const N = await import('./src/nature.js'), s = game.registry.get('save'), r = {};
    for (const fn of ['biodiversity', 'speciesPoints']) { try { r[fn] = typeof N[fn] === 'function' ? String(N[fn](s)).slice(0, 20) : 'n/a'; } catch (e) { r[fn] = 'THREW ' + e.message; } }
    try { game.registry.get('ui').go('nature'); r.nature = 'opened'; } catch (e) { r.nature = 'THREW ' + e.message; }
    return r; });
  await p.waitForTimeout(600);
  const fails = [];
  for (const [k, v] of Object.entries(out)) if (/THREW/.test(v)) fails.push(`${k}: ${v}`);
  if (errs.length) fails.push('page errors: ' + errs.join(' | '));
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS nature-unknown', JSON.stringify(out));
})();
