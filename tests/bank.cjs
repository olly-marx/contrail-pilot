// THE BANK tab (the finance desk rework, 2026-11-23; Oliver: 'it always says buy after next flight, it seems impossible to actually
// invest ... it sits in a strange place'). In the browser, phone size:
//  1. no BANK tab before the 2010s; in the 2010s the hangar has a BANK sub-tab and SYSTEMS no longer holds the desk;
//  2. opening the desk costs 1,500 seeds and works with an era-3 pilot's few thousand seeds;
//  3. BUY takes the amount picked (default 10), as often as you like (no one-trade-a-landing), MAX buys all you can afford,
//     then the greyed button says 'Need N seeds for a crystal' (never a word about landings);
//  4. SELL sells the amount picked; INVEST puts seeds in the fund and TAKE OUT shows; the steppers change the amount.
// Plants (tools/plants.tsv): the desk back under SYSTEMS (no BANK tab); the greyed buy button talks about landings; BUY ignores the amount.
// Run: URL=http://localhost:8000/ node tests/bank.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const open = async (more = {}) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(m => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], flights: 140, landings: 90, seeds: 3000, crystals: 20,
      flightSeconds: 60 * 200, levels: { trees: 1 }, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} }, ...m })); }, more);
    await p.goto(URL); await ready(p); await p.waitForTimeout(600);
    await p.click('#tabHangar'); await p.waitForTimeout(300);
    return p;
  };
  const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));
  const text = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);

  // 1. Before the 2010s (60 min flown): no BANK tab.
  let p = await open({ flightSeconds: 3600 });
  check(!(await p.$('[data-ftab=bank]')), 'a BANK tab before the 2010s');
  await p.close();

  // In the 2010s: the tab is there, SYSTEMS has no desk.
  p = await open();
  if (!(await p.$('[data-ftab=bank]'))) { console.log('FAIL bank\n  no BANK tab in the 2010s (the desk is unreachable)'); await b.close(); process.exit(1); }
  await p.click('[data-ftab=systems]'); await p.waitForTimeout(200);
  check(!(await p.$('#hFleet .finance')), 'the finance desk still sits under SYSTEMS');
  await p.click('[data-ftab=bank]'); await p.waitForTimeout(200);
  check(!!(await p.$('#hFleet .finance')), 'the BANK tab shows no desk');

  // 2. Open the desk.
  check(/1,500/.test(await text(p, '#hFinBuy') || ''), `the desk's opening price is not 1,500: '${await text(p, '#hFinBuy')}'`);
  await p.click('#hFinBuy'); await p.waitForTimeout(300);
  let s = await saved(p);
  check(s.finance && s.finance.level === 1 && s.seeds === 1500, `opening the desk: ${JSON.stringify([s.finance, s.seeds])}`);

  // 3. BUY 10, twice in the same landing, then MAX, then the honest grey button.
  const rate = await p.evaluate(() => Number(document.querySelector('.fin-rates b').textContent));
  check(/BUY 10/.test(await text(p, '#hTrade') || ''), `the buy button does not offer 10: '${await text(p, '#hTrade')}'`);
  await p.click('#hTrade'); await p.waitForTimeout(200);
  await p.click('#hTrade'); await p.waitForTimeout(200);
  s = await saved(p);
  check(s.crystals === 40 && s.seeds === 1500 - 20 * rate, `two buys of 10 at ${rate}: ${s.crystals} crystals, ${s.seeds} seeds`);
  // Oliver 2026-11-23: 'when I invested money in the bank it didn't reflect on my balance until I went out and came back in'.
  const head = async () => [Number(await text(p, '#hTrees')), Number(await text(p, '#hCrystals'))];
  let hd = await head();
  check(hd[0] === s.seeds && hd[1] === s.crystals, `after BUY the top counters show ${hd[0]} seeds ${hd[1]} crystals, the save has ${s.seeds} / ${s.crystals}`);
  await p.click('[data-fstep="buy:max"]'); await p.waitForTimeout(150);
  await p.click('#hTrade'); await p.waitForTimeout(200);
  s = await saved(p);
  check(s.seeds < rate, `MAX left ${s.seeds} seeds at ${rate} a crystal`);
  const grey = await text(p, '#hTrade');
  check(await p.isDisabled('#hTrade') && grey === `Need ${rate} seeds for a crystal`, `the greyed buy button says '${grey}'`);
  const desk = await text(p, '#hFleet');
  check(!/next landing|after your next/i.test(desk), 'the bank still says to wait for a landing');

  // 4. SELL 5 (stepper down from 10), INVEST, TAKE OUT shows.
  await p.click('[data-fstep="sell:-"]'); await p.waitForTimeout(150);
  const before = await saved(p);
  check(/SELL 5/.test(await text(p, '#hSell') || ''), `the sell stepper did not go to 5: '${await text(p, '#hSell')}'`);
  await p.click('#hSell'); await p.waitForTimeout(200);
  s = await saved(p);
  check(s.crystals === before.crystals - 5 && s.seeds > before.seeds, `selling 5: ${before.crystals} -> ${s.crystals} crystals`);
  const seeds0 = s.seeds;
  check(!(await p.isDisabled('#hInvest')), `INVEST is greyed with ${seeds0} seeds: '${await text(p, '#hInvest')}'`);
  await p.click('#hInvest'); await p.waitForTimeout(200);
  s = await saved(p);
  check(s.finance.fund && s.finance.fund.paid > 0 && s.seeds === seeds0 - s.finance.fund.paid, `investing: ${JSON.stringify(s.finance.fund)}, seeds ${seeds0} -> ${s.seeds}`);
  hd = await head();
  check(hd[0] === s.seeds, `after INVEST the top counter shows ${hd[0]} seeds, the save has ${s.seeds}`);
  check(await p.isVisible('#hCashOut'), 'no TAKE OUT button with money in the fund');
  // The desk fits a phone: nothing wider than the screen.
  const wide = await p.evaluate(() => [...document.querySelectorAll('#hFleet .finance *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length);
  check(wide === 0, `${wide} bank element(s) run off a 390 px screen`);
  check(!p.errs.length, `page errors: ${p.errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log(`FAIL bank\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`PASS bank: BANK tab from the 2010s only, desk 1,500, buy any amount twice a landing, MAX then '${grey}', sell 5, invest, take out shows, fits 390 px`);
})();
