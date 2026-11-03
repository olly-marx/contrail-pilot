// The loading screen's counter and plane (src/loader.js), with the race that really happens on a fast connection: the menu pictures start loading when loading.start() runs, but Phaser's
// total is only known when its loader reports progress (GameScene.preload 'progress'). If the menu step has already finished some files by then, an un-guarded fraction
// = done / total DROPS when Phaser's total joins and the plane flies backwards. Here Phaser's loader is started 2.5 s late (LoaderPlugin.start wrapped) so the race always happens.
//   1. the race really happened: when Phaser's total first appears, at least 5 menu files were already done (else the check proves nothing and FAILS)
//   2. loading.fraction() never decreases, and neither does the plane's eased position
//   3. the counter shows nothing until Phaser's total is known, and every number it shows has the same M
// PLANTS: tools/plants.tsv, test `loadercount` (each must FAIL this test). Run: python3 -m http.server 8000 & node tests/loadercount.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--host-resolver-rules=MAP mkucbsjzbipjaiqzrlkj.supabase.co 127.0.0.1:1'] });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 375, height: 667 } });
  // Phaser's loader is held back 2.5 s: its files are queued by GameScene.preload, but it only STARTS (and reports its first progress, and so its total) later. The menu pictures (a separate
  // fetch from loading.start()) are well under way by then, as on a connection where Phaser's own load starts late.
  await p.addInitScript(() => {
    let P; Object.defineProperty(window, 'Phaser', { configurable: true, get: () => P, set: v => { P = v; const L = v.Loader.LoaderPlugin.prototype, start = L.start; L.start = function () { setTimeout(() => start.call(this), 2500); }; } });
  });
  await p.addInitScript(() => {
    localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true, tutorialDone: true, seenTips: ['*'], tours: ['*'], flights: 30, landings: 9, areas: ['weurope'], homeArea: 'weurope', city: 'LONDON',
      fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } }));
    window.__rec = [];
    setInterval(() => { const L = window.cpLoading; if (!L) return; const c = document.querySelector('.loader-count');
      const ft = document.querySelector('.loader-fact'); window.__rec.push({ pt: L.phaser.total, md: L.menus.done, mt: L.menus.total, f: L.fraction(), shown: L.shown, txt: c ? c.textContent : null, fact: ft ? ft.textContent : null, age: performance.now() - (L.t0 || 1e12) }); }, 10);
  });
  await p.goto(URL, { waitUntil: 'commit' });
  await p.waitForFunction(() => document.body.dataset.loaded === '1', null, { timeout: 60000, polling: 200 }).catch(() => fails.push('the loading screen never finished'));
  const rec = await p.evaluate(() => window.__rec);
  const facts = await p.evaluate(async () => (await import('./src/ui.js')).FACTS).catch(() => []);
  // A warm page (nothing held back): if it finishes in under 2 s it must never have shown a fact.
  const q = await b.newPage({ viewport: { width: 375, height: 667 } });
  await q.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true, tutorialDone: true, seenTips: ['*'], tours: ['*'], flights: 30, landings: 9, areas: ['weurope'], homeArea: 'weurope' })); });
  await q.goto(URL, { waitUntil: 'commit' });
  await q.waitForFunction(() => document.body.dataset.loaded === '1', null, { timeout: 60000, polling: 100 }).catch(() => {});
  const warm = await q.evaluate(() => ({ ms: window.cpLoading.tDone - window.cpLoading.t0, fact: document.querySelector('.loader-fact') ? 1 : 0 }));
  await b.close();
  check(rec.length > 50, `enough samples (${rec.length})`);
  const jump = rec.find(r => r.pt > 0);
  check(jump && jump.md >= 5, `the race happened: menu files already done when Phaser's total appeared (${jump ? jump.md : 'no total'} of ${jump ? jump.mt : '?'})`);
  let pf = 0, ps = 0, fDrops = [], sDrops = 0;
  for (const r of rec) { if (r.f < pf - 1e-9) fDrops.push(`${pf.toFixed(3)}->${r.f.toFixed(3)}`); pf = r.f; if (r.shown < ps - 1e-9) sDrops++; ps = r.shown; }
  check(!fDrops.length, `loading.fraction() never decreases (${fDrops.length} drops: ${fDrops.slice(0, 3).join(', ')})`);
  check(!sDrops, `the plane's eased position never goes back (${sDrops} drops)`);
  const shown = rec.filter(r => r.txt), Ms = new Set(shown.map(r => (/\/ (\d+)$/.exec(r.txt) || [])[1]));
  check(!rec.some(r => r.pt === 0 && r.txt), 'the counter shows nothing before Phaser\'s total is known');
  check(Ms.size === 1, `every number the counter shows has the same M (${[...Ms].join(', ')})`);
  // The loader fact (UX plan decision 4): only on a load over 2 s, one short line from FACTS, never before 2 s.
  const withFact = rec.filter(r => r.fact);
  check(withFact.length > 0, 'a load held back for 2.5 s shows a fact');
  check(!withFact.some(r => r.age < 1990), `no fact before 2 s (first at ${withFact.length ? Math.round(Math.min(...withFact.map(r => r.age))) : '-'} ms)`);
  check(new Set(withFact.map(r => r.fact)).size <= 1, 'only ONE fact is shown');
  check(withFact.every(r => facts.includes(r.fact) && r.fact.trim().split(/\s+/).length <= 15), `the fact is one of FACTS and at most 15 words ("${withFact[0] && withFact[0].fact}"; ${facts.length} facts known)`);
  check(warm.ms >= 2000 || !warm.fact, `a warm load (${Math.round(warm.ms)} ms) shows no fact`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS loadercount (with the race: ${jump.md} menu files done before Phaser's total; fraction and plane never go back; M fixed at ${[...Ms][0]})`);
})();
