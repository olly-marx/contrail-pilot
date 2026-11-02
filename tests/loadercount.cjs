// The loading screen's counter and plane (src/loader.js), with the race that really happens on a fast connection: the menu pictures start loading when loading.start() runs, but Phaser
// registers ITS files (and so its total) later, when the page's load event lets the game boot. If the menu step has already finished some files by then, an un-guarded fraction
// = done / total DROPS when Phaser's total joins and the plane flies backwards. Here the page's load event is held back 2.5 s (one logo image is delayed) so the race always happens.
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
  await p.route('**/assets/ui/logo-imperial.png', async r => { await new Promise(res => setTimeout(res, 2500)); await r.continue(); });   // holds the load event, so Phaser boots late
  await p.addInitScript(() => {
    localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true, tutorialDone: true, seenTips: ['*'], tours: ['*'], flights: 30, landings: 9, areas: ['weurope'], homeArea: 'weurope', city: 'LONDON',
      fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } }));
    window.__rec = [];
    setInterval(() => { const L = window.cpLoading; if (!L) return; const c = document.querySelector('.loader-count');
      window.__rec.push({ pt: L.phaser.total, md: L.menus.done, mt: L.menus.total, f: L.fraction(), shown: L.shown, txt: c ? c.textContent : null }); }, 10);
  });
  await p.goto(URL, { waitUntil: 'commit' });
  await p.waitForFunction(() => document.body.dataset.loaded === '1', null, { timeout: 60000, polling: 200 }).catch(() => fails.push('the loading screen never finished'));
  const rec = await p.evaluate(() => window.__rec); await b.close();
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
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS loadercount (with the race: ${jump.md} menu files done before Phaser's total; fraction and plane never go back; M fixed at ${[...Ms][0]})`);
})();
