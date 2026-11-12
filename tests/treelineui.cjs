// THE PLANTING LINE ON THE RESULTS CARD AND THE 'A TREE HAS GROWN UP' TOAST (tutorial 1a steps 5 and 7; src/resultscard.js v.trees, src/ui.js showResults / renderHub, index.html #rTrees). Real page, 390x844 and 320x568,
// a season 2 save in WARSAW with the lessons done. A synthetic result (3 trees dropped, 2 planted, one sapling grew up) goes through ui.showResults. Named lines, in order:
//   FIXTURE  the results card opens
//   1. the planting ROW is on the card as two lines, "Planted 2 of 3 trees" and under it "Spruce, Oak", both visible, inside the screen and not covered
//   2. the card still fits: the FLY ON button is fully on screen
//   3. the next HOME shows the toast 'A tree you planted has grown up!' and marks it told (seenTips has 'tree-grown')
//   4. a second result with a grown tree shows the toast NO second time
// Screenshots: SHOTS, else <tmpdir>/treelineui-shots (taken at the checked moment, written after the checks, FAIL- prefix when a check failed). Run: python3 -m http.server 8000 & node tests/treelineui.cjs   (plants: tools/plants.tsv, test treelineui)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const fs = require('fs'), os = require('os'), path = require('path');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'treelineui-shots');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'WARSAW', city: 'WARSAW', visited: ['WARSAW'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['x-bars'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
const RES = { landed: true, landedAt: 'PARIS', distance: 900, earned: [], rewards: [], breakdown: { co2: 0, night: 0, sun: 0, trees: 0 }, heat: 0, crystals: 0, planted: 2, treesDropped: 3, treeNames: ['Spruce', 'Oak'], treesGrown: 1, missions2: { done: [], next: null }, school: false };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  let shotsOk = true; try { if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS); } catch (e) { shotsOk = false; console.log(`NOTE: screenshots off, cannot make ${SHOTS}: ${e.code || e}`); }   // (not recursive: that can loop on an uncreatable path)
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, before = fails.length, check = (c, m) => { if (!c) fails.push(`${tag}: ${m}`); };
      const ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
      let buf = null, stage = 'load';
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(900);
        stage = 'results'; await p.evaluate(r => { const ui = game.registry.get('ui'); ui.tour.busy = true; ui.showResults(r); setTimeout(() => { ui.skipReveal = true; }, 60); }, RES);
        await p.waitForFunction(() => { const e = document.getElementById('rTrees'); return e && !e.hidden && e.classList.contains('in'); }, null, { timeout: 8000 }).catch(() => {});
        await p.waitForTimeout(600);
        const m = await p.evaluate(() => {
          const row = document.getElementById('rTrees'), go = document.getElementById('againBtn');
          if (!row) return null;
          const g = go.getBoundingClientRect();
          const probe = e => { const r = e.getBoundingClientRect(), top = document.elementsFromPoint(r.left + Math.min(20, r.width / 2), r.top + r.height / 2)[0];
            return { text: e.textContent.trim(), hidden: e.hidden, shown: e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0, rect: [Math.round(r.top), Math.round(r.bottom)], inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, covered: !(top && (top === e || e.contains(top) || top.contains(e))) }; };
          const a = probe(document.getElementById('rTreesTxt')), n = probe(document.getElementById('rTreesNames')), rr = row.getBoundingClientRect();
          return { text: a.text, names: n.text, hidden: row.hidden || a.hidden, shown: a.shown && n.shown, inside: a.inside && n.inside, covered: a.covered || n.covered, twoLines: n.rect[0] >= a.rect[1] - 1, rowRect: [Math.round(rr.top), Math.round(rr.bottom)],
            go: [Math.round(g.top), Math.round(g.bottom)], goOn: g.top >= 0 && g.bottom <= innerHeight, H: innerHeight };
        });
        buf = shotsOk ? await p.screenshot().catch(() => null) : null;
        check(!!m, 'FIXTURE: the results card has no #rTrees element');
        if (m) {
          check(m.text === 'Planted 2 of 3 trees' && m.names === 'Spruce, Oak' && !m.hidden && m.shown && m.inside && !m.covered && m.twoLines, `1: the planting row is not two visible lines ('Planted 2 of 3 trees' and under it 'Spruce, Oak') inside the screen and uncovered: ${JSON.stringify(m)}`);
          check(m.goOn, `2: the card no longer fits: FLY ON is not fully on screen (${m.go} of ${m.H})`);
        }
        stage = 'home'; await p.evaluate(() => { const ui = game.registry.get('ui'); ui.showTitle(); });
        await p.waitForFunction(() => { const t = document.getElementById('toast'); return t && !t.hidden && /grown up/.test(t.innerText); }, null, { timeout: 5000 }).catch(() => {});
        const t1 = await p.evaluate(() => { const t = document.getElementById('toast'); return { toast: t && !t.hidden ? t.innerText.replace(/\s+/g, ' ') : null, told: (JSON.parse(localStorage.getItem('contrailPilot.v2')).seenTips || []).includes('tree-grown') }; });
        check(/A tree you planted has grown up!/.test(t1.toast || '') && t1.told, `3: HOME does not show 'A tree you planted has grown up!' and mark it told: ${JSON.stringify(t1)}`);
        stage = 'second'; await p.waitForTimeout(4500);
        await p.evaluate(r => { const ui = game.registry.get('ui'); ui.showResults(r); setTimeout(() => { ui.skipReveal = true; }, 60); }, RES); await p.waitForTimeout(1500);
        await p.evaluate(() => { game.registry.get('ui').showTitle(); }); await p.waitForTimeout(1500);
        const t2 = await p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.innerText.replace(/\s+/g, ' ') : null; });
        check(!/grown up/.test(t2 || ''), `4: the toast shows a second time: ${JSON.stringify(t2)}`);
        check(!p.errs.length, `page errors ${p.errs.slice(0, 2)}`);
      } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
      if (buf) try { fs.writeFileSync(`${SHOTS}/${fails.length > before ? 'FAIL-' : ''}${W}x${H}-results-planting-line.png`, buf); } catch (e) { /* no shot */ }
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL treelineui:\n - ${fails.join('\n - ')}` : 'PASS treelineui: the results card shows "Planted 2 of 3 trees" inside the screen with FLY ON still on screen, and the first grown tree gives one toast on HOME (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
