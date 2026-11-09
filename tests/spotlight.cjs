// THE SPOTLIGHT LIGHTS THE SUBJECT (src/tour.js, src/railsubjects.js; research/SPOTLIGHT-SUBJECT.md): every rails / tour step on the real page, 390x844 and 320x568, on the seeded saves of tests/lib/spotcases.js.
// At each step tests/lib/spotlight.js returns NAMED problems: "the subject of <step> is in the spotlight", "the bubble of <step> covers neither the target nor the subject", "only the target of <step> is tappable".
// The walk advances like a player: the OK button, else a real tap at the ring's centre. Plants: tools/plants.tsv, test `spotlight`.
// Run: python3 -m http.server 8000 & node tests/spotlight.cjs   (run onrails320 FIRST on any change to src/tour.js)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js'), { base, CASES, RES } = require('./lib/spotcases.js'), { audit } = require('./lib/spotlight.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], seen = new Set();
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) for (const [id, over, screen, max] of CASES) {
      const ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, { ...base, ...over });
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(900);
        await p.evaluate(([screen, RES]) => { const ui = game.registry.get('ui'); ui.tour.busy = false; if (screen === 'hangar') ui.showHangar(); else if (screen === 'nature') ui.go('nature'); else if (screen === 'results') { ui.showResults(RES); setTimeout(() => { ui.skipReveal = true; }, 60); } else ui.showTitle(); }, [screen, RES]);
        for (let n = 1; n <= max; n++) {
          const up = await p.waitForFunction(() => { const t = document.getElementById('tour'); return t && !t.hidden && t.querySelector('.tbubble p') && t.querySelector('.tbubble p').textContent; }, null, { timeout: n === 1 ? 6000 : 3000 }).then(() => true).catch(() => false);
          if (!up) { if (n === 1) fails.push(`${W}x${H} ${id}: no tour step appeared (the case's screen did not start its tour)`); break; }
          await p.waitForTimeout(700);
          for (const prob of await audit(p)) fails.push(`${W}x${H} ${id}: ${prob}`);
          seen.add(await p.evaluate(() => game.registry.get('ui').tour.spot().key));
          if (id === 'name' && n >= 2) break;
          const info = await p.evaluate(() => { const t = document.getElementById('tour'), r = t.querySelector('.tring').getBoundingClientRect(), ok = t.querySelector('.tbubble .btn'); return { ring: [r.left, r.top, r.right, r.bottom], okShown: !!ok && !ok.hidden }; });
          if (info.okShown) await p.click('#tour .tbubble .btn'); else await p.mouse.click((info.ring[0] + info.ring[2]) / 2, (info.ring[1] + info.ring[3]) / 2);
          await p.waitForTimeout(800);
        }
      } catch (e) { fails.push(`${W}x${H} ${id}: the walk broke: ${String(e).slice(0, 140)}`); }
      if (p.errs.length) fails.push(`${W}x${H} ${id}: page errors: ${p.errs.slice(0, 2)}`);
      await ctx.close();
    }
  } finally { await b.close(); }
  for (const k of ['r-free#1', 'r-free#2', 'r-takeoff1#1', 'r-res1#3', 'r-nature#3', 'r-systems#3', 'r-parcels#1', 'new#2', 'new#3', 'r-payoff#1']) if (!seen.has(k)) fails.push(`step ${k} was never reached by the walk (a case no longer gets there)`);
  console.log(fails.length ? `FAIL spotlight:\n - ${fails.join('\n - ')}` : `PASS spotlight: ${seen.size} steps at 390x844 and 320x568: every subject is lit, the bubble covers neither the target nor the subject, only the target is tappable`);
  process.exit(fails.length ? 1 : 0);
})();
