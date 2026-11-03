// NATURE after R6 (UX plan C4), real taps: the page says ONE thing (the NEXT line), the intro paragraph / NEXT HERE box / headings are gone,
// and the dots (src/fresh.js) are per land: a dot on a land tab with news, cleared only when THAT land is shown; opening NATURE does not
// clear the other lands. Run: python3 -m http.server 8000 & node tests/naturefresh.cjs   (plants: tools/plants.tsv, test `naturefresh`)
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { if (sessionStorage.i) return; sessionStorage.i = 1; localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'],
    flights: 30, landings: 9, seeds: 5, crystals: 0, flightSeconds: 1500, priceVersion: 2, discovered: { mediterranean: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(500);
  const dot = id => p.evaluate(i => !document.getElementById(i).hidden, id);
  const tabDot = r => p.evaluate(r => !!document.querySelector(`#wRegions [data-region="${r}"] .dot`), r);
  const cur = () => p.evaluate(() => (document.querySelector('#wRegions .on') || {}).dataset.region);

  // 1. The page: NEXT is the primary; the old intro / NEXT HERE / headings are gone.
  await p.click('#tabNature'); await p.waitForTimeout(400);
  const pg = await p.evaluate(() => ({ intro: !!document.getElementById('wMeterMore'), nextHere: !!document.getElementById('wNext'), heads: [...document.querySelectorAll('#nature h3')].map(h => h.textContent).filter(t => /Habitat projects|Trees/.test(t)),
    next: document.querySelectorAll('#wNextLine [data-fund], #wNextLine .rowc').length, info: !!document.querySelector('#wMeter [data-minfo]') }));
  check(!pg.intro && !pg.nextHere && pg.heads.length === 0, `no intro paragraph, no NEXT HERE box, no Habitat projects / Trees headings: ${JSON.stringify(pg)}`);
  check(pg.next >= 1 && pg.info, `the NEXT line and the meter's (i) are there: ${JSON.stringify(pg)}`);

  // 2. Dots are per land. At load nothing is new (the migration). With money, the OTHER land gets a dot; the land shown does not.
  const land0 = await cur(); await p.click('#tabFly'); await p.waitForTimeout(200);
  check(!(await dot('dNature')), 'no dot storm: what was there at load is seen');
  await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.seeds = 5000; ui.save.crystals = 500; ui.showTitle(); });
  check(await dot('dNature'), 'with money, NATURE lights the bar dot');
  await p.click('#tabNature'); await p.waitForTimeout(500);
  const other = land0 === 'woodland' ? 'mediterranean' : 'woodland';
  check(await cur() === land0 && !(await tabDot(land0)), `the land shown (${land0}) has no tab dot`);
  check(await tabDot(other), `the OTHER land (${other}) keeps its dot after NATURE opens (one list per land, not one for all of NATURE)`);
  check(await dot('dNature'), 'the bar dot stays while another land has news');
  await p.click(`#wRegions [data-region="${other}"]`); await p.waitForTimeout(500);
  check(!(await tabDot(other)) && !(await dot('dNature')), 'showing the other land clears its dot and the bar dot');

  // 3. The NEXT line buys through the same path as the row.
  const before = await p.evaluate(() => ({ seeds: game.registry.get('ui').save.seeds, id: (document.querySelector('#wNextLine [data-fund]') || {}).dataset?.fund }));
  if (before.id) { await p.click('#wNextLine [data-fund]'); await p.waitForTimeout(900);
    const after = await p.evaluate(id => ({ seeds: game.registry.get('ui').save.seeds, done: [...document.querySelectorAll(`[data-pline="${id}"] .w-done`)].length }), before.id);
    check(after.seeds < before.seeds && after.done === 1, `NEXT buys the project (seeds ${before.seeds} -> ${after.seeds}, row done ${after.done})`); }
  else check(false, 'the NEXT line has no project to fund with 5000 seeds (the test would prove nothing)');
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL naturefresh\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS naturefresh: NEXT is the one primary, per-land dots, one buy path');
})();
