// Saves are hard to lose (2026-10-22, a phone lost a save): every save is written twice (main +
// backup); a missing or unreadable main copy loads the backup; an unreadable save is kept aside,
// never silently overwritten. (A browser wiping ALL the site's storage still wipes both copies.)
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/savesafe.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const errs = [], fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const good = JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], priceVersion: 2, seeds: 321, bestDistance: 7777, mission: 5 });
  const open = async (main, backup) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([k, m, bk]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear();
      if (m !== null) localStorage.setItem(k, m); if (bk !== null) localStorage.setItem(k + '.backup', bk); } }, [KEY, main, backup]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(1000);
    return p;
  };
  const state = p => p.evaluate(k => ({ seeds: game.registry.get('save').seeds, best: game.registry.get('save').bestDistance,
    main: localStorage.getItem(k), backup: localStorage.getItem(k + '.backup'), unreadable: localStorage.getItem(k + '.unreadable') }), KEY);

  // 1. A normal save is written twice once anything is saved.
  let p = await open(good, null);
  await p.evaluate(async () => { const { writeSave } = await import('./src/save.js'); writeSave(game.registry.get('save')); });
  let st = await state(p);
  check(st.seeds === 321 && JSON.parse(st.backup).seeds === 321, `a save is also written to the backup: ${JSON.stringify(st)}`);
  await p.close();

  // 2. Main copy gone, backup there: progress comes back from the backup.
  p = await open(null, good); st = await state(p);
  check(st.seeds === 321 && st.best === 7777, `missing main copy -> the backup is loaded: ${JSON.stringify(st)}`);
  await p.close();

  // 3. Main copy unreadable: the backup is loaded AND the unreadable one is kept aside.
  p = await open('{"seeds": 99, broken', good); st = await state(p);
  check(st.seeds === 321 && st.unreadable === '{"seeds": 99, broken', `unreadable main -> backup loaded, unreadable kept: ${JSON.stringify(st)}`);
  await p.close();

  // 4. Unreadable and no backup: a fresh start, but the unreadable save is still kept.
  p = await open('not json', null); st = await state(p);
  check(st.seeds === 0 && st.unreadable === 'not json', `nothing readable -> fresh start, unreadable kept: ${JSON.stringify(st)}`);
  await p.close();

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS savesafe');
})();
