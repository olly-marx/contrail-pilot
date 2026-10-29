// The MISSIONS screen's new lanes (the user, 2026-10-29): after L3 it shows Today (with the streak), Steady with progress bars
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
      return { shown: !m.hidden, labels: [...m.querySelectorAll('.label')].map(x => x.textContent), bars: m.querySelectorAll('.mbar').length,
        rows: [...m.querySelectorAll('.mrow')].map(r => r.innerText.replace(/\s+/g, ' ')) };
    }, seeds);
    
  }
  const fails = [], check = (c, m) => { if (!c) fails.push(m); }, S = out.saving, R = out.rich;
  check(S.shown && /^Today \(streak \+3\)/.test(S.labels[0] || ''), `Today shows after L3, with the streak: ${S.labels}`);
  check(S.labels.includes('Steady') && S.labels.includes('Badges') && S.bars === 5, `Steady and Badges with 5 bars: ${S.labels} ${S.bars}`);
  check(S.rows.some(r => /2,000 km .*1,400 \/ 2,000 \+5/.test(r)) && R.rows.some(r => /1,400 \/ 2,000 \+1/.test(r)), `steady pays 5 while saving, 1 when rich: ${S.rows} | ${R.rows}`);
  check(/spend to earn more/.test(R.labels.join(' ')), 'a rich pilot is told why');
  check(!errs.length, `page errors: ${errs}`);
  await b.close();
  console.log(fails.length ? `FAIL missionlanes:\n - ${fails.join('\n - ')}` : 'PASS missionlanes: Today with streak, Steady bars (need-based), Badges bars');
  process.exit(fails.length ? 1 : 0);
})();
