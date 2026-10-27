// A tour step whose target is not in the page gives up at once (the audit, 2026-10-27: the dim layer used to catch every
// tap for 4 s, which feels frozen on a phone). Run: python3 -m http.server 8000 & node tests/tourgiveup.cjs
// (proved by a planted defect: the old 4 s wait)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); },
    { areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], priceVersion: 2,
      missionsDone: ['L1'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  await p.goto(URL); await ready(p); await p.waitForTimeout(400);
  const ms = await p.evaluate(async () => { const t = game.registry.get('ui').tour, t0 = performance.now();
    await t.run(null, [{ target: '#no-such-thing-anywhere', text: 'x', tap: true }]); return Math.round(performance.now() - t0); });
  const shown = await p.evaluate(() => !document.getElementById('tour').hidden);
  check(ms < 1000 && !shown, `a step with no target in the page gives up within 1 s and hides (${ms} ms, tour shown ${shown})`);
  // The data-loss guard of the old wait stays: a target that EXISTS but shows a moment later is still waited for.
  const ms2 = await p.evaluate(async () => { const t = game.registry.get('ui').tour, el = document.createElement('button'); el.id = 'lateTarget'; el.style.display = 'none'; document.body.appendChild(el);
    setTimeout(() => { el.style.display = 'block'; }, 600); const t0 = performance.now();
    const done = t.step({ target: '#lateTarget', text: 'x', ok: true }); setTimeout(() => document.querySelector('#tour .tbubble .btn').click(), 900); await done; return Math.round(performance.now() - t0); });
  check(ms2 >= 600, `a target that exists but appears a moment later is still waited for (${ms2} ms)`);
  await b.close();
  console.log(fails.length ? `FAIL tourgiveup:\n - ${fails.join('\n - ')}` : `PASS tourgiveup: an absent target gives up in ${ms} ms; a late-showing one is still waited for`);
  process.exit(fails.length ? 1 : 0);
})();
