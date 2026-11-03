// The MISSIONS screen lanes (the user, 2026-10-29; R4 2026-11-03: .rowc.goal rows, no badges lane): after L3 it shows TODAY (with the streak), STEADY with progress
// (1 seed each when the bank is rich) and Badges bars. Run: python3 -m http.server 8000 & node tests/missionlanes.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); });
  await p.goto((process.env.URL || 'http://localhost:8000/')); await ready(p); await p.waitForTimeout(800);
  await p.click('#startChoice [data-area="weurope"]').catch(() => {}); await p.click('#startChoice [data-city]').catch(() => {}); await p.waitForTimeout(1200);
  const out = {};
  for (const [tag, seeds] of [['saving', 0], ['rich', 99999]]) {
    out[tag] = await p.evaluate(seeds => {
      const s = game.registry.get('save');
      Object.assign(s, { tutorialDone: true, seeds, missionsDone: ['L1', 'L2', 'L3'], steady: { [s.homeArea || 'weurope']: { 'st-km': { rung: 0, n: 1400 } } },
        dailyStreak: { days: 3, last: null }, totals: { km: 4200, seeds: 31, gaps: 20 } });
      const ui = game.registry.get('ui'); ui.showMissions();
      const m = document.getElementById('missions');
      return { shown: !m.hidden, labels: [...m.querySelectorAll('.label')].map(x => x.textContent), bars: m.querySelectorAll('.rowc.goal.steady').length,
        rows: [...m.querySelectorAll('.rowc.goal')].map(r => r.innerText.replace(/\s+/g, ' ')) };
    }, seeds);
    
  }
  const fails = [], check = (c, m) => { if (!c) fails.push(m); }, S = out.saving, R = out.rich;
  check(S.shown && S.labels.some(x => /^TODAY \(streak \+3\)/.test(x.trim())), `TODAY shows after L3, with the streak: ${S.labels}`);
  check(S.labels.some(x => /^STEADY/.test(x.trim())) && !S.labels.includes('Badges') && S.bars === 2, `STEADY with 2 rows, and no Badges lane any more (R4: badges are BOARDS' now): ${S.labels} ${S.bars}`);
  check(S.rows.some(r => /2,000 km .*1,400 \/ 2,000 \+5/.test(r)) && R.rows.some(r => /1,400 \/ 2,000 \+1/.test(r)), `steady pays 5 while saving, 1 when rich: ${S.rows} | ${R.rows}`);
  check(/1 seed each/.test(R.labels.join(' ')), 'a rich pilot is told why');
  check(!errs.length, `page errors: ${errs}`);
  await b.close();
  console.log(fails.length ? `FAIL missionlanes:\n - ${fails.join('\n - ')}` : 'PASS missionlanes: TODAY with streak, STEADY rows (need-based), no badges lane');
  process.exit(fails.length ? 1 : 0);
})();
