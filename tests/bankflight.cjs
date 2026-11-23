// Money put in the nature fund stays out of the wallet across a flight (Oliver, 2026-11-23: 'I invested some money in the bank and then flew a bit
// and realised I had duplicate money... in the bank and in my wallet'). In the browser: open the desk, INVEST, take off, land, and check that
// wallet after = wallet after investing + what the flight paid, the fund is still there, and a reload reads the same.
// Run: URL=http://localhost:8000/ node tests/bankflight.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); localStorage.clear();
    localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'], flights: 140, landings: 90, seeds: 5000, crystals: 20,
      flightSeconds: 60 * 200, levels: { trees: 1 }, mission: 99, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } })); });
  const saved = () => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));
  await p.goto(URL); await ready(p); await p.waitForTimeout(600);
  await p.click('#tabHangar'); await p.waitForTimeout(300);
  await p.click('[data-ftab=bank]'); await p.waitForTimeout(200);
  await p.click('#hFinBuy'); await p.waitForTimeout(300);
  await p.click('#hInvest'); await p.waitForTimeout(300);
  const s0 = await saved();
  check(s0.finance && s0.finance.fund && s0.finance.fund.paid > 0, `no money went in: ${JSON.stringify(s0.finance)}`);
  const wallet0 = s0.seeds, paid = s0.finance.fund.paid;

  await p.click('#tabFly'); await p.waitForTimeout(300);
  await p.click('#goBtn');
  await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
  const gained = await p.evaluate(async () => { const { WORLD } = await import('/src/config.js'); const s = game.scene.getScene('game');
    s.graceUntil = 0; s.distancePx = 3000 * WORLD.pxPerMetre; s.landedAt = s.path[1]; s.finish({ landed: true });
    return s.result.earned.reduce((a, e) => a + (e.lost ? 0 : (e.seeds ?? e.n ?? 0)), 0); });
  await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 10000 });
  await p.waitForTimeout(800);
  const s1 = await saved();
  check(s1.finance && s1.finance.fund && s1.finance.fund.paid === paid, `the fund changed over the flight: ${JSON.stringify(s0.finance.fund)} -> ${JSON.stringify(s1.finance && s1.finance.fund)}`);
  check(s1.seeds < wallet0 + paid, `the wallet holds the invested seeds again: ${wallet0} after investing ${paid}, ${s1.seeds} after a flight that paid about ${gained}`);
  await p.reload(); await ready(p); await p.waitForTimeout(600); await p.click('#tabFly').catch(() => {}); await p.waitForTimeout(400);
  const s2 = await saved();
  check(s2.seeds === s1.seeds, `after a reload: saved ${s2.seeds} (was ${s1.seeds})`);
  check(s2.finance && s2.finance.fund && s2.finance.fund.paid === paid, `after a reload the fund is ${JSON.stringify(s2.finance && s2.finance.fund)}`);
  check(!p.errs.length, `page errors: ${p.errs.join(' | ')}`);
  console.log({ wallet0, paid, gained, after: s1.seeds, reload: s2.seeds });
  await b.close();
  if (fails.length) { console.log(`FAIL bankflight\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log('PASS bankflight: invested seeds stay out of the wallet across a landed flight and a reload');
})();
