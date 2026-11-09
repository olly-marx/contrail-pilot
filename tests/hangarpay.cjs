// THE HANGAR PURCHASE DISPLAY HIDES THE LIST (src/hangar.js payoff; the user, 2026-11-09: while the display waits for OK the other items stayed visible and some looked buyable that he could no longer afford).
// 375x667 and 320x568, real taps. A seeded season-2 save (seeds for Cabin AND Engines; after Cabin the Engines are no longer affordable). Buy Cabin, then:
//   the purchase items are hidden while the purchase display is open;  the header totals match the save;
//   (the save changes DURING the display: a prize of 1000 seeds) after OK: the items are shown again, from a fresh render, and every buy button's disabled state equals "can you afford it NOW".
// Plants: tools/plants.tsv, test `hangarpay`. Run: python3 -m http.server 8000 & node tests/hangarpay.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[375, 667], [320, 568]]) {
      const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } },
        { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true, freeUpgrade: false, landings: 8, flights: 9, seeds: 90, crystals: 10, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
      await p.goto(URL); await ready(p); await p.waitForTimeout(800);
      await p.evaluate(() => game.registry.get('ui').showHangar()); await p.waitForTimeout(700);
      const cabin = await p.evaluateHandle(() => [...document.querySelectorAll('#hFleet [data-fbuy]')].find(e => /Cabin/.test(e.closest('.rowc').innerText) && !e.disabled) || null);
      const el = cabin.asElement();
      if (!el) { check(false, `${tag}: no buyable Cabin row to buy (the fixture no longer reaches the case)`); await ctx.close(); continue; }
      await el.click();
      const open = await p.waitForSelector('#payoff', { timeout: 4000 }).then(() => true).catch(() => false);
      check(open, `${tag}: the purchase display never opened after buying`);
      if (!open) { await ctx.close(); continue; }
      await p.waitForTimeout(400);
      const during = await p.evaluate(() => { const items = [...document.querySelectorAll('#hFleet > :not(#payoff)')].filter(e => getComputedStyle(e).display !== 'none' && e.getClientRects().length), rows = [...document.querySelectorAll('#hFleet .rowc')].filter(e => e.getClientRects().length);
        return { showing: items.length, rows: rows.length, what: items.slice(0, 3).map(e => e.className || e.id), header: document.getElementById('hTrees').textContent, seeds: game.registry.get('save').seeds }; });
      check(during.showing === 0 && during.rows === 0, `${tag}: the purchase items are hidden while the purchase display is open: ${during.showing} blocks and ${during.rows} rows are still showing (${during.what})`);
      check(String(during.seeds) === during.header, `${tag}: the header totals match the save while the display is open (header ${during.header}, save ${during.seeds})`);
      await p.evaluate(() => { const s = game.registry.get('save'); s.seeds += 1000; s.crystals = (s.crystals || 0) + 50; game.registry.get('ui').persist(); });   // a prize paid DURING the display
      const okShown = await p.waitForFunction(() => { const o = document.getElementById('payOk'); return o && getComputedStyle(o).visibility !== 'hidden' && o.getClientRects().length; }, null, { timeout: 8000 }).then(() => true).catch(() => false);
      check(okShown, `${tag}: the OK button of the purchase display never showed`);
      if (okShown) await p.click('#payOk'); await p.waitForTimeout(600);
      const after = await p.evaluate(async () => {
        const F = await import('/src/fleet.js'), s = game.registry.get('save'), rows = [...document.querySelectorAll('#hFleet .rowc')].filter(e => e.getClientRects().length), buys = [...document.querySelectorAll('#hFleet [data-fbuy]')], bad = [];
        const next = F.nextBuys(s);
        for (const btn of buys) { const item = next.find(n => `${n.kind}:${n.id}` === btn.dataset.fbuy); if (!item) continue; const should = !!item.open && F.canAfford(s, item); if (btn.disabled === should) bad.push(`${btn.closest('.rowc').innerText.split('\\n')[0]}: ${btn.disabled ? 'looks unaffordable' : 'looks buyable'} but ${should ? 'you can afford it' : `it costs ${item.cost} and you have ${s.seeds}`}`); }
        return { rows: rows.length, payoff: !!document.getElementById('payoff'), buttons: buys.length, bad };
      });
      check(after.rows > 0 && !after.payoff, `${tag}: after OK the items are shown again (${after.rows} rows, display gone: ${!after.payoff})`);
      check(after.buttons > 0 && !after.bad.length, `${tag}: after OK every buy button matches what you can afford NOW: ${after.bad.slice(0, 3).join('; ') || (after.buttons ? '' : 'no buy buttons')}`);
      check(!p.errs.length, `${tag}: no page errors: ${p.errs.slice(0, 2)}`);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(fails.length ? `FAIL hangarpay:\n - ${fails.join('\n - ')}` : 'PASS hangarpay: the purchase display hides the list, OK shows it again from a fresh render with the totals as they are now');
  process.exit(fails.length ? 1 : 0);
})();
