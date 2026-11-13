// NATURE SHOWS ONE TIER AT A TIME (the user, design run A, 2026-11-13: the page was 1,866 to 2,571 px, 3 to 4.5 screens). src/wild.js renderProjects: the CURRENT tier (the first open tier
// not finished) shows its projects; every other open tier folds to one line with a 'show' button. The declared rich save (tools/uxlib.cjs), tiers 1 to 3 open (biodiversity held at 100), 390x667 and 320x568.
// Named lines, in order:
//   FIXTURE  NATURE opens with three open tiers
//   1. exactly one tier shows its project rows; the other open tiers show their heading and a 'show' button and no rows
//   2. 'show' on a folded tier opens its rows, and 'hide' folds it again
//   3. the fold toggle is a real tap (at least 40 x 40 px)
//   4. the animals are a grid of small portraits: at least 4 across, every portrait at least 40 x 40 px, and the grid at most 420 px tall at 390 (it was 706)
//   5. the land's picture fills the width of its panel (the user, 2026-11-13; it was 70 % on short phones)
//   (printed, not checked: the page height before and after, for the design run's table)
// Run: python3 -m http.server 8000 & node tests/naturefold.cjs   (plants: tools/plants.tsv, test naturefold)
const { chromium } = require('playwright-core');
const { openPage } = require('../tools/uxlib.cjs');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [];
  try {
    for (const [W, H] of [[390, 667], [320, 568]]) {
      const tag = `${W}x${H}`, check = (c, m) => { if (!c) fails.push(`${tag}: ${m}`); };
      const p = await openPage(b, W, H, URL);
      try {
        await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(800);
        const read = () => p.evaluate(() => { const ui = game.registry.get('ui'), w = ui.wild || ui.nature; const R = document.getElementById('nature');
          const heads = [...document.querySelectorAll('#wProjects .w-tier[data-tier]')].map(h => { const rows = []; for (let e = h.nextElementSibling; e && !e.classList.contains('w-tier'); e = e.nextElementSibling) if (e.matches('.rowc.project')) rows.push(e.dataset.pline);
            const t = h.querySelector('[data-tier-toggle]'), q = t && t.getBoundingClientRect(); return { tier: +h.dataset.tier, rows: rows.length, toggle: t ? t.textContent : null, tw: q ? Math.round(q.width) : 0, th: q ? Math.round(q.height) : 0 }; });
          return { heads, height: R.scrollHeight }; });
        await p.evaluate(() => { const ui = game.registry.get('ui'), w = ui.wild || ui.nature; w.bio = () => 100; w.openTiers = []; w.render(); }); await p.waitForTimeout(400);
        const a = await read(); log.push(`${tag} folded ${JSON.stringify(a)}`);
        check(a.heads.length >= 3, `FIXTURE: NATURE opens with three open tiers: ${JSON.stringify(a.heads)}`);
        const open = a.heads.filter(h => h.rows > 0), folded = a.heads.filter(h => h.rows === 0);
        check(open.length === 1 && !open[0].toggle && folded.every(h => h.toggle === 'show'), `1. exactly one tier shows its rows and the others are folded with a 'show' button: ${JSON.stringify(a.heads)}`);
        const f = folded[0];
        if (f) {
          await p.click(`#wProjects [data-tier-toggle="${f.tier}"]`); await p.waitForTimeout(300);
          const c = await read(), cf = c.heads.find(h => h.tier === f.tier);
          await p.click(`#wProjects [data-tier-toggle="${f.tier}"]`); await p.waitForTimeout(300);
          const d = await read(), df = d.heads.find(h => h.tier === f.tier);
          log.push(`${tag} unfolded tier ${f.tier}: height ${c.height}`);
          check(cf && cf.rows > 0 && cf.toggle === 'hide' && df && df.rows === 0 && df.toggle === 'show', `2. 'show' opens tier ${f.tier}'s rows and 'hide' folds them again: ${JSON.stringify({ after: cf, again: df })}`);
          check(folded.every(h => h.tw >= 40 && h.th >= 40), `3. the fold toggle is at least 40 x 40 px: ${JSON.stringify(folded)}`);
        }
        const g = await p.evaluate(() => { const F = document.getElementById('wFound'), cards = [...F.querySelectorAll('.w-card')], qs = cards.map(c => c.getBoundingClientRect());
          return { n: cards.length, h: Math.round(F.getBoundingClientRect().height), across: qs.filter(q => Math.abs(q.top - qs[0].top) < 2).length, small: qs.filter(q => q.width < 40 || q.height < 40).length }; });
        log.push(`${tag} animals ${JSON.stringify(g)}`);
        check(g.n > 8 && g.across >= 4 && g.small === 0 && (W !== 390 || g.h <= 420), `4. the animals are a grid of small portraits (at least 4 across, each at least 40 x 40, at most 420 px tall at 390): ${JSON.stringify(g)}`);
        const pic = await p.evaluate(() => { const sc = document.getElementById('wScene'), pin = sc.closest('.wpin'), a = sc.getBoundingClientRect(), b = pin.getBoundingClientRect(), first = document.querySelector('#wProjects .rowc'), bar = document.getElementById('tabbar');
          return { scene: Math.round(a.width), panel: Math.round(b.width), sceneH: Math.round(a.height), firstBottom: first ? Math.round(first.getBoundingClientRect().bottom) : null, barTop: Math.round(bar.getBoundingClientRect().top) }; });
        log.push(`${tag} picture ${JSON.stringify(pic)}`);
        check(pic.scene >= pic.panel - 8, `5. the land's picture fills the width of its panel: ${JSON.stringify(pic)}`);
        check(!p.errs.length, `page errors: ${p.errs.join('; ')}`);
      } catch (e) { fails.push(`${tag}: exception ${String(e).split('\n')[0]}`); }
      await p.close();
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL naturefold:\n - ${fails.join('\n - ')}` : 'PASS naturefold: NATURE shows one tier\'s projects; the others fold to a line with a 40 px show/hide toggle (390x667, 320x568)');
  process.exit(fails.length ? 1 : 0);
})();
