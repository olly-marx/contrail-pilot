// THE TREE PLANTING BUY GUIDE (rail r-parcels, src/tour.js step + keepVisible; ledger row 38, BACKLOG item 1b): the guide must leave the BUY button of Tree Planting fully on screen,
// above the bottom tab bar, not under the guide's bubble and not under another element, and a real tap on its ring must buy the first level. Real page, 390x844 and 320x568, the seeded
// save of tests/lib/spotcases.js case 'r-parcels' (lessons 1 to 4 done, no Tree Planting level). Three states the player can be in when NATURE opens:
//   natural   NATURE as it opens;   behind the bar   the player had scrolled so the button's bottom is behind the tab bar;   under the land   the button's middle is under NATURE's pinned land block.
// The step is started by the real rail (ui.tour.maybe('nature')), not by a made-up step. Named lines for each state, in order:
//   FIXTURE  the r-parcels#1 step appears and its target is the Tree Planting BUY button
//   1. the button is fully above the tab bar and inside the screen   2. the bubble does not overlap the button   3. the button is the top element at its centre (nothing covers it)
//   4. a real tap on the ring centre buys Tree Planting level 1 (save.levels.trees becomes 1)
// Screenshots: SHOTS, else <tmpdir>/rparcels-shots, written after the checks and prefixed FAIL- when a check failed. Run: python3 -m http.server 8000 & node tests/rparcels.cjs   (plants: tools/plants.tsv, test rparcels)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js'), { base, CASES } = require('./lib/spotcases.js');
const fs = require('fs'), os = require('os'), path = require('path');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'rparcels-shots');
const URL = process.env.URL || 'http://localhost:8000/';
const over = CASES.find(c => c[0] === 'r-parcels')[1];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  let shotsOk = true; try { if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS); } catch (e) { shotsOk = false; console.log(`NOTE: screenshots off, cannot make ${SHOTS}: ${e.code || e}`); }   // (not recursive: that can loop on an uncreatable path)
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) for (const state of ['natural', 'behind the bar', 'under the land']) {
      const tag = `${W}x${H} ${state}`, before = fails.length, check = (c, m) => { if (!c) fails.push(`${tag}: ${m}`); };
      const ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, { ...base, ...over });
      let buf = null;
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(900);
        // open NATURE with the tour held, put the page in the state, then let the REAL rail start
        await p.evaluate(async state => {
          const ui = game.registry.get('ui'); ui.tour.busy = true; ui.go('nature'); await new Promise(r => setTimeout(r, 900));
          const t = document.querySelector('#wTrees [data-buy="trees"]'); if (!t) return;
          const ov = t.closest('.overlay'), bar = document.querySelector('.tabbar:not([hidden])').getBoundingClientRect();
          if (ov && state === 'behind the bar') { const need = 700; document.querySelector('#nature .panel').style.paddingBottom = `${need}px`; await new Promise(r => setTimeout(r, 100)); ov.scrollTop += t.getBoundingClientRect().bottom - (bar.top + 10); }
          if (ov && state === 'under the land') { const pe = document.querySelector('.wpin'); document.querySelector('#nature .panel').style.paddingBottom = '700px'; await new Promise(r => setTimeout(r, 100)); const pin = pe.getBoundingClientRect(); ov.scrollTop += t.getBoundingClientRect().top - (pin.top + pin.height / 2); }
          await new Promise(r => setTimeout(r, 200)); ui.tour.busy = false; ui.tour.maybe('nature');
        }, state);
        const up = await p.waitForFunction(() => { const s = game.registry.get('ui').tour.spot(); return s && s.key === 'r-parcels#1' && s.target; }, null, { timeout: 8000 }).then(() => true).catch(() => false);
        check(up, 'FIXTURE: the r-parcels#1 step did not appear on NATURE');
        if (up) {
          await p.waitForTimeout(900);   // (keepVisible runs from the poll, every 150 ms)
          const m = await p.evaluate(() => {
            const sp = game.registry.get('ui').tour.spot(), t = document.querySelector('#wTrees [data-buy="trees"]'), r = t.getBoundingClientRect(), bar = sp.bar;
            const inter = (a, c) => a && c && a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top;
            const top = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find(e => !e.closest('#tour'));
            return { isTarget: !!sp.target && Math.abs(sp.target.top - r.top) < 1, rect: [r.left, r.top, r.right, r.bottom].map(Math.round), barTop: bar ? Math.round(bar.top) : sp.H, W: sp.W, H: sp.H, bubble: sp.bubble, bubbleOver: inter(sp.bubble, { left: r.left, top: r.top, right: r.right, bottom: r.bottom }), covered: !(top && (top === t || t.contains(top))), coveredBy: top && (top.id || top.className || top.tagName) };
          });
          buf = shotsOk ? await p.screenshot().catch(() => null) : null;
          check(m.isTarget, `FIXTURE: the step's target is not the Tree Planting buy button: ${JSON.stringify(m)}`);
          check(m.rect[1] >= 0 && m.rect[3] <= m.barTop + 1 && m.rect[0] >= -1 && m.rect[2] <= m.W + 1, `1: the buy button is not fully above the tab bar and inside the screen: rect ${m.rect}, bar top ${m.barTop}, screen ${m.W}x${m.H}`);
          check(!m.bubbleOver, `2: the guide's bubble overlaps the buy button: bubble ${JSON.stringify(m.bubble)}, button ${m.rect}`);
          check(!m.covered, `3: something covers the buy button (${m.coveredBy}) at its centre`);
          const info = await p.evaluate(() => { const r = document.getElementById('tour').querySelector('.tring').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
          await p.mouse.click(info[0], info[1]); await p.waitForTimeout(900);
          const lv = await p.evaluate(() => ((game.registry.get('ui').save.levels || {}).trees) || 0);
          check(lv === 1, `4: a real tap on the ring centre did not buy Tree Planting level 1 (level ${lv})`);
        }
        check(!p.errs.length, `page errors ${p.errs.slice(0, 2)}`);
      } catch (e) { fails.push(`${tag}: exception: ${String(e).split('\n')[0]}`); }
      if (buf) try { fs.writeFileSync(`${SHOTS}/${fails.length > before ? 'FAIL-' : ''}${W}x${H}-${state.replace(/ /g, '-')}.png`, buf); } catch (e) { /* no shot */ }
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL rparcels:\n - ${fails.join('\n - ')}` : 'PASS rparcels: the Tree Planting buy guide leaves the button above the bar, uncovered and tappable, from the natural state, from behind the bar and from under the pinned land (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
