// 'COPY LANDING NUMBERS' ON THE PILOT SCREEN (src/pilot.js, src/landlog.js; for a grown-up). 390x844, real tap, the real clipboard: with 3 touchdowns in the log the tap puts the log's plain text on the clipboard and
// says 'Copied 3 landings.'; with none it says 'No landings yet.' and copies nothing. Plants: tools/plants.tsv, test `landlogui`. Run: python3 -m http.server 8000 & node tests/landlogui.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'AMSTERDAM', city: 'AMSTERDAM', visited: ['AMSTERDAM'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const rows of [[[0.62, 85, 6.1, 2, 1.2, 1], [null, 40, 3, 0, 1, 0], [0.9, 120, 9.4, 1, 1.1, 1]], []]) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(([s, r]) => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); if (r.length) localStorage.setItem('s2:contrailPilot.landlog', JSON.stringify(r)); sessionStorage.setItem('fresh', '1'); } }, [seed, rows]);
      await p.goto(URL); await ready(p); await p.waitForTimeout(1000);
      await p.evaluate(() => game.registry.get('ui').go('pilot')); await p.waitForTimeout(700);
      await p.evaluate(() => document.getElementById('pLandCopy').scrollIntoView({ block: 'center' }));
      await p.evaluate(() => navigator.clipboard.writeText('(untouched)'));   // the clipboard is shared by the pages of one browser: start from a known text
      await p.click('#pLandCopy'); await p.waitForTimeout(600);
      const msg = await p.evaluate(() => document.getElementById('pLandMsg').textContent), clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => '')); log.push(`${rows.length} rows: "${msg}", clipboard ${JSON.stringify(clip.slice(0, 80))}`);
      if (rows.length) {
        check(msg === 'Copied 3 landings.', `the message after the tap: "${msg}"`);
        check(/^contrail pilot landing numbers v1/.test(clip) && clip.split('\n').length === 4 && /0\.62 85 6\.1 2 1\.2 1/.test(clip), `the clipboard holds the log as plain text: ${JSON.stringify(clip)}`);
      } else check(msg === 'No landings yet.' && clip === '(untouched)', `an empty log says so and copies nothing: "${msg}"`);
      check(!p.errs.length, `page errors: ${p.errs.join('; ')}`); await ctx.close();
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL landlogui:\n - ${fails.join('\n - ')}` : 'PASS landlogui: COPY LANDING NUMBERS puts the log on the clipboard as plain text; an empty log says so');
  process.exit(fails.length ? 1 : 0);
})();
