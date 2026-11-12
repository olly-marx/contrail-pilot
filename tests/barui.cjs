// THE UPGRADE BAR ON THE HANGAR STRIP (src/hangar.js levelBarHTML, src/upgradetext.js; BLOCK2-PLAN item 4, DESIGN-UPGRADE-BAR.md B2). Real taps, 390x844 and 320x568, a save flying the jumbo with the magnet at level 2.
// Tap a row and the strip (#hPreview) shows a segmented bar, 'Now: ...' and 'Next: ...'. Named lines, in order:
//   FIXTURE  the Magnet row can be tapped and its strip opens
//   1. the bar has one segment per level of the Magnet (6) and 2 of them are filled (level 2)
//   2. 'Now:' is the words of Magnet level 2 ('Bigger horseshoe': 'grab seeds from 19 px') and 'Next:' names level 3 ('Electromagnet: grab seeds from 22 px')
//   3. the strip fits: its buy button is fully on screen and nothing in it is wider than the screen
//   4. after buying level 3 (the payoff OK) the bar shows 3 filled, Now is 22 px and the Next moves on to level 4 ('Stronger coil')
// Screenshots: SHOTS, else <tmpdir>/barui-shots (taken at the checked moment, written after the checks, FAIL- prefix when a check failed). Run: python3 -m http.server 8000 & node tests/barui.cjs   (plants: tools/plants.tsv, test barui)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const fs = require('fs'), os = require('os'), path = require('path');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'barui-shots');
const URL = process.env.URL || 'http://localhost:8000/';
const save = { tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], flights: 30, landings: 9, seeds: 5000, crystals: 500, flightSeconds: 2000, levels: { trees: 1 },
  fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: { magnet: 2 } } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  let shotsOk = true; try { if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS); } catch (e) { shotsOk = false; console.log(`NOTE: screenshots off, cannot make ${SHOTS}: ${e.code || e}`); }   // (not recursive: that can loop on an uncreatable path)
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, before = fails.length, check = (c, m) => { if (!c) fails.push(`${tag}: ${m}`); };
      const ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, save);
      let buf = null, stage = 'load';
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(900);
        await p.click('#tabHangar'); await p.waitForTimeout(300); await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(250);
        stage = 'tap the Magnet row'; await p.click('[data-ftap="gadget:magnet"]'); await p.waitForTimeout(700);
        const read = () => p.evaluate(() => {
          const st = document.getElementById('hPreview'); if (!st || st.classList.contains('empty')) return null;
          const segs = [...st.querySelectorAll('.lvbar i')], buy = document.getElementById('hPreviewBuy'), br = buy && buy.getBoundingClientRect(), sr = st.getBoundingClientRect();
          const wide = [...st.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length;
          return { segs: segs.length, on: segs.filter(e => e.classList.contains('on')).length, now: (st.querySelector('.hp-now') || {}).textContent || '', next: (st.querySelector('.hp-next') || {}).textContent || '',
            buyOn: !!br && br.top >= 0 && br.bottom <= innerHeight, stripTop: Math.round(sr.top), stripBottom: Math.round(sr.bottom), wide, H: innerHeight };
        });
        const m = await read();
        buf = shotsOk ? await p.screenshot().catch(() => null) : null;
        check(!!m, 'FIXTURE: the Magnet row did not open a strip');
        if (m) {
          check(m.segs === 6 && m.on === 2, `1: the bar should have 6 segments with 2 filled: ${m.segs} segments, ${m.on} filled`);
          check(/^Now: grab seeds from 19 px$/.test(m.now) && /^Next: Electromagnet: grab seeds from 22 px$/.test(m.next), `2: Now/Next should read 'Now: grab seeds from 19 px' / 'Next: Electromagnet: grab seeds from 22 px': '${m.now}' / '${m.next}'`);
          check(m.buyOn && m.wide === 0, `3: the strip does not fit: buy button on screen ${m.buyOn}, ${m.wide} elements wider than the screen (strip ${m.stripTop}-${m.stripBottom} of ${m.H})`);
        }
        stage = 'buy'; await p.click('#hPreviewBuy').catch(() => {}); await p.waitForSelector('#payOk', { state: 'visible', timeout: 5000 }).catch(() => {});
        await p.click('#payOk', { timeout: 4000 }).catch(() => {}); await p.waitForTimeout(500);
        await p.click('[data-ftab=gadgets]').catch(() => {}); await p.waitForTimeout(200); await p.click('[data-ftap="gadget:magnet"]').catch(() => {}); await p.waitForTimeout(600);
        const m2 = await read();
        check(!!m2 && m2.on === 3 && /^Now: grab seeds from 22 px$/.test(m2.now) && /^Next: Stronger coil: grab seeds from 26 px$/.test(m2.next), `4: after buying level 3 the bar shows 3 filled, Now 22 px and Next 'Stronger coil': ${JSON.stringify(m2)}`);
        check(!p.errs.length, `page errors ${p.errs.slice(0, 2)}`);
      } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
      if (buf) try { fs.writeFileSync(`${SHOTS}/${fails.length > before ? 'FAIL-' : ''}${W}x${H}-hangar-bar.png`, buf); } catch (e) { /* no shot */ }
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL barui:\n - ${fails.join('\n - ')}` : 'PASS barui: the hangar strip shows a bar with one segment per level, Now and Next from the level words, fits at 390 and 320, and moves on after a purchase');
  process.exit(fails.length ? 1 : 0);
})();
