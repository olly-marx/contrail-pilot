// THE UPGRADE BAR ON NATURE'S TOOL ROWS (ledger L-52; src/wild.js toolLevelHTML, the same words as the hangar's strip: src/upgradetext.js upgradeCard kind 'nature').
// A season 2 save with Tree Planting at level 1; real taps on the Tree Planting row (its tap area [data-tpreview="trees"]) at 390x844 and 320x568. Named lines, in order:
//   FIXTURE  the Tree Planting row is on NATURE and its tap area can be tapped
//   1. the tapped row shows a bar with one segment per level of Tree Planting and 1 filled, and 'Now:' / 'Next:' with the words of upgradeCard
//   2. the bar fits: nothing in it is wider than the screen, and the row's buy button stays fully on screen and clickable
//   3. a second tap on the row closes the bar, and an untapped row never shows one
// Run: python3 -m http.server 8000 & node tests/naturebar.cjs   (plants: tools/plants.tsv, test naturebar)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } },
        { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true,
          freeProjectGiven: true, freeUpgrade: false, landings: 12, flights: 20, seeds: 5000, crystals: 400, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, planted: {}, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(800);
        await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(600);
        const want = await p.evaluate(async () => { const U = await import('/src/upgradetext.js'); return U.upgradeCard(game.registry.get('ui').save, 'nature', 'trees'); });
        const tap = p.locator('#wTrees [data-tpreview="trees"]');
        check(await tap.count() === 1, `${tag}: FIXTURE: the Tree Planting row's tap area is on NATURE`);
        await tap.scrollIntoViewIfNeeded(); await tap.click(); await p.waitForTimeout(300);
        const r = await p.evaluate(() => { const bar = document.querySelector('#wTrees .rowc-lvl[data-lvl="trees"]'); if (!bar) return { bar: false, others: document.querySelectorAll('#wTrees .rowc-lvl').length };
          const q = bar.getBoundingClientRect(), wide = [...bar.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 0.5 || e.getBoundingClientRect().left < -0.5).length;
          const buy = document.querySelector('#wTrees [data-buy="trees"]'); buy.scrollIntoView({ block: 'center' }); const bq = buy.getBoundingClientRect(), hit = document.elementFromPoint(bq.left + bq.width / 2, bq.top + bq.height / 2);
          return { bar: true, segs: bar.querySelectorAll('.lvbar i').length, on: bar.querySelectorAll('.lvbar i.on').length, now: bar.querySelector('.hp-now').textContent, next: bar.querySelector('.hp-next').textContent,
            right: Math.round(q.right), wide, others: document.querySelectorAll('#wTrees .rowc-lvl').length, buyOk: bq.left >= 0 && bq.right <= innerWidth && (hit === buy || buy.contains(hit)) }; });
        log.push(`${tag} ${JSON.stringify(r)}`);
        check(r.bar && r.segs === want.count && r.on === want.have && r.on === 1 && r.now === `Now: ${want.now}` && r.next === (want.next ? `Next: ${want.next}` : 'All done: the best there is.'),
          `${tag}: 1. the tapped Tree Planting row shows the level bar (${want.count} segments, 1 filled) with Now '${want.now}' and Next '${want.next}': ${JSON.stringify(r)}`);
        check(r.bar && r.wide === 0 && r.right <= W && r.buyOk, `${tag}: 2. the bar fits the screen and the buy button stays on screen and clickable: ${JSON.stringify(r)}`);
        check(r.others === 1, `${tag}: 3. only the tapped row shows a bar (bars ${r.others})`);
        await tap.click(); await p.waitForTimeout(300);
        const closed = await p.evaluate(() => document.querySelectorAll('#wTrees .rowc-lvl').length);
        check(closed === 0, `${tag}: 3. a second tap on the row closes its bar (bars ${closed})`);
        check(!p.errs.length, `${tag}: page errors: ${p.errs.join('; ')}`);
        await p.screenshot({ path: require('path').join(require('os').tmpdir(), `naturebar-${tag}.png`) }).catch(() => {});
      } catch (e) { fails.push(`${tag}: exception ${String(e).split('\n')[0]}`); }
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL naturebar:\n - ${fails.join('\n - ')}` : 'PASS naturebar: a tapped NATURE tool row shows the level bar with the hangar\'s Now/Next words, it fits at 390 and 320, and a second tap closes it');
  process.exit(fails.length ? 1 : 0);
})();
