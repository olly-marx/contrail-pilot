// The pilot code is hard to miss (src/pilot.js, src/nextup.js, src/persist.js; the user lost a 260-flight save, 2026-11-05 — the code is the only way back).
//  1. A named pilot who never opened the code: UP NEXT says 'Save your pilot code' from landing 10; a tap opens PILOT, where COPY CODE copies it; then the line is gone.
//  2. The first time a pilot gets a code, a 'WRITE THIS DOWN' sheet with the code and COPY shows (once).
//  3. If the browser would not promise to keep the storage (a fake navigator.storage.persist -> false), ONE plain note says so from landing 5; not when it promised.
// Real taps in the shipped game, supabase blocked (the code is local). Run: python3 -m http.server 8000 & node tests/pilotcode.cjs   (planted defects: tools/plants.tsv)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  const base = { tutorialDone: true, muted: true, seenTips: ['x-bars', 'records-intro'], tours: ['*'], priceVersion: 2, fleet, areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', freeGiven: true, freeUpgrade: false, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], flights: 14, seeds: 50 };
  const CODE = 'Owl Fox Hare Cloud 42';
  const open = async ({ save, pilot = true, persist = undefined }) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([s, pl, code, persistAnswer]) => {
      if (persistAnswer !== undefined) { try { Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist: async () => persistAnswer, persisted: async () => false } }); } catch (e) { /* keep the real one */ } }
      if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s));
        if (pl) { localStorage.setItem('s2:contrailPilot.pilot', JSON.stringify({ first: 'Olly', word: 'Gardener', tag: 11 })); localStorage.setItem('s2:contrailPilot.code', JSON.stringify(code)); } } }, [save, pilot, CODE, persist]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(1200);
    return p;
  };
  const text = (p, sel) => p.evaluate(s => (document.querySelector(s) ? document.querySelector(s).innerText : ''), sel);
  const live = p => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));   // (in the page the season-2 layer adds the s2: prefix itself)

  // 1. UP NEXT at landing 10
  let p = await open({ save: { ...base, landings: 10 } });
  check(/Save your pilot code/.test(await text(p, '#hubNext')), `landing 10, named pilot, code never opened: UP NEXT asks (got ${JSON.stringify((await text(p, '#hubNext')).slice(0, 100))})`);
  await p.click('#hubNext .rc-row:has-text("Save your pilot code")'); await p.waitForTimeout(500);
  check(await p.evaluate(() => !document.getElementById('pilot').hidden && document.getElementById('pCode').textContent.trim() !== ''), 'a tap on the line opens PILOT with the code');
  check((await live(p)).codeSeen === true, 'showing the code on PILOT marks it seen (codeSeen)');
  check(await p.evaluate(() => { const c = document.getElementById('pCopy'); return !!c && c.offsetParent !== null; }), 'PILOT has a COPY CODE button');
  await p.click('#pCopy', { timeout: 3000 }).catch(e => fails.push('tap COPY CODE: ' + e.message.slice(0, 60))); await p.waitForTimeout(300);
  check(!/^COPY CODE$/.test(await text(p, '#pCopy')), `COPY CODE answers (${JSON.stringify(await text(p, '#pCopy'))})`);
  await p.click('#tabFly'); await p.waitForTimeout(500);
  check(!/Save your pilot code/.test(await text(p, '#hubNext')), 'once seen, UP NEXT stops asking');
  await p.close();
  p = await open({ save: { ...base, landings: 9 } });
  check(!/Save your pilot code/.test(await text(p, '#hubNext')), 'not before landing 10');
  await p.close();

  // 2. the first-time sheet
  p = await open({ save: { ...base, landings: 3, pilotNamed: true, codeSeen: true } });
  await p.evaluate(() => game.registry.get('ui').pilot.codeFirst()); await p.waitForTimeout(400);
  const sheet = await text(p, '#sheet');
  check(/WRITE THIS DOWN/.test(sheet) && sheet.includes(CODE) && /only way to get your game back/.test(sheet), `the first-time sheet: write this down, the code, why: ${JSON.stringify(sheet.slice(0, 160))}`);
  await p.click('#codeCopy', { timeout: 3000 }).catch(e => fails.push('tap COPY: ' + e.message.slice(0, 60))); await p.waitForTimeout(300);
  check(!/^COPY CODE$/.test(await text(p, '#codeCopy')) && !!(await text(p, '#sheet')), 'COPY answers and the sheet stays open');
  await p.click('#sheet .sheet-ok'); await p.waitForTimeout(200);
  await p.evaluate(() => game.registry.get('ui').pilot.codeFirst()); await p.waitForTimeout(400);
  check(!(await text(p, '#sheet')), 'the sheet shows once');
  await p.close();

  // 3. the storage note
  p = await open({ save: { ...base, landings: 6 }, pilot: false, persist: false });
  const toast = await p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.innerText : ''; });
  check(/KEEP YOUR GAME SAFE/i.test(toast) && /browser may delete your game/i.test(toast) && /Pick a pilot name/.test(toast), `persist() false at landing 6, no pilot: the note says so and what to do: ${JSON.stringify(toast)}`);
  check((await live(p)).seenTips.includes('persist-note'), 'the note is marked seen');
  await p.reload(); await ready(p); await p.waitForTimeout(1500);
  check(!(await p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden && /browser may delete/.test(t.innerText); })), 'the note shows once');
  await p.close();
  p = await open({ save: { ...base, landings: 6 }, pilot: false, persist: true });
  check(!(await p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden && /browser may delete/.test(t.innerText); })), 'persist() true: no note');
  await p.close();
  p = await open({ save: { ...base, landings: 3 }, pilot: false, persist: false });
  check(!(await p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden && /browser may delete/.test(t.innerText); })), 'before landing 5: no note');
  await p.close();

  await b.close();
  console.log(fails.length ? `FAIL pilotcode:\n - ${fails.join('\n - ')}` : 'PASS pilotcode: UP NEXT asks from landing 10, the first-time sheet, COPY, and the storage note once');
  process.exit(fails.length ? 1 : 0);
})();
