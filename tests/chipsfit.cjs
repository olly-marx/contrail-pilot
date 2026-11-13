// THE RESULTS CARD'S CHIPS KEEP THEIR WORDS (design run, problem 5: at 320 px three chips cut each label to two letters, 'Gu..' for Guanaco). src/ui.js showResults: under 340 px wide,
// three or more chips show as two chips and a short '+N' chip on a phone (under 480 px). A synthetic result with three new animals goes through ui.showResults at 320x568 and 390x844. Named lines, in order:
//   FIXTURE  the chip row opens
//   1. two animal chips and a '+1' chip (the chip row is about 276 px wide at both sizes)
//   2. neither animal's name is cut (a label may take two lines)
//   3. every chip is inside the screen
// Run: python3 -m http.server 8000 & node tests/chipsfit.cjs   (plants: tools/plants.tsv, test chipsfit)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'WARSAW', city: 'WARSAW', visited: ['WARSAW'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['x-bars'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
const RES = { landed: true, landedAt: 'PARIS', distance: 900, earned: [{ label: 'Seeds', n: 20 }], rewards: [], breakdown: { co2: 0, night: 0, sun: 0, trees: 0 }, heat: 0, crystals: 0, foundIds: ['guanaco', 'culpeo', 'sealion'], missions2: { done: [], next: null }, school: false };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [];
  try {
    for (const [W, H] of [[320, 568], [390, 844]]) {
      const tag = `${W}x${H}`, check = (c, m) => { if (!c) fails.push(`${tag}: ${m}`); };
      const ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(800);
        await p.evaluate(r => { const ui = game.registry.get('ui'); ui.tour.busy = true; ui.showResults(r); setTimeout(() => { ui.skipReveal = true; }, 60); }, RES);
        await p.waitForFunction(() => { const e = document.getElementById('rChips'); return e && !e.hidden && e.querySelector('.rc-chip'); }, null, { timeout: 8000 }).catch(() => {});
        await p.waitForTimeout(1500);
        const m = await p.evaluate(() => { const row = document.getElementById('rChips'); if (!row || row.hidden) return null;
          return [...row.querySelectorAll('.rc-chip')].map(c => { const sp = c.querySelector('span'), q = c.getBoundingClientRect();
            return { kind: c.dataset.kind || (c.dataset.more ? 'more' : ''), text: sp.textContent, cut: sp.scrollWidth > sp.clientWidth + 1 || sp.scrollHeight > sp.clientHeight + 1, w: Math.round(q.width), inside: q.left >= 0 && q.right <= innerWidth && q.bottom <= innerHeight }; }); });
        log.push(`${tag} ${JSON.stringify(m)}`);
        check(!!m && m.length > 0, 'FIXTURE: the chip row opens');
        if (m) {
          const animals = m.filter(c => c.kind === 'animal'), more = m.filter(c => c.kind === 'more');
          check(animals.length === 2 && more.length === 1 && more[0].text === '+1', `1. two animal chips and a '+1' chip: ${JSON.stringify(m)}`);
          check(animals.every(c => !c.cut), `2. no animal's name is cut (a label may take two lines): ${JSON.stringify(m)}`);
          check(m.every(c => c.inside), `3. every chip is inside the screen: ${JSON.stringify(m)}`);
        }
        check(!p.errs.length, `page errors: ${p.errs.join('; ')}`);
      } catch (e) { fails.push(`${tag}: exception ${String(e).split('\n')[0]}`); }
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL chipsfit:\n - ${fails.join('\n - ')}` : 'PASS chipsfit: on a phone (320 and 390) the results card shows two whole chips and a +N chip');
  process.exit(fails.length ? 1 : 0);
})();
