// A payoff whose part picture FAILS to load (the user's iPhone, 2026-11-01: Safari's blue "?" broken-image icon on
// "Tourist class: fitted!", after the payoff waited out its 6 s). The part's request is aborted, Tourist class is bought:
// the payoff must finish quickly (< 4 s, not the 6 s fallback), show NO visible picture that failed to load, and offer OK.
// Run: python3 -m http.server 8000 & node tests/payoffbroken.cjs    Plant (tools/plants.tsv): broken pictures not hidden.
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.route('**/hangar-comet-tourist.png', r => r.abort());   // the network drops the new part's picture
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify({ areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', priceVersion: 2,
    freeGiven: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], flights: 10, landings: 5, seeds: 500, crystals: 100,
    flightSeconds: 600, levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(600);
  await p.evaluate(() => document.getElementById('tabHangar').click()); await p.waitForTimeout(500);
  const t0 = Date.now();
  await p.evaluate(() => document.querySelector('[data-fbuy="plane:comet.cabin"]').click());
  await p.waitForSelector('#payOk', { state: 'visible', timeout: 9000 }).catch(() => {});
  const ms = Date.now() - t0;
  const r = await p.evaluate(() => ({ broken: [...document.querySelectorAll('#payoff img')].filter(i => i.getAttribute('src') && i.complete && !i.naturalWidth && getComputedStyle(i).display !== 'none').length,
    ok: !!document.getElementById('payOk') && getComputedStyle(document.getElementById('payOk')).visibility !== 'hidden', text: (document.getElementById('payText') || {}).textContent }));
  check(r.ok, `the payoff never offered OK (${JSON.stringify(r)})`);
  check(ms < 4000, `the payoff waited ${ms} ms for a picture that failed (want < 4 s, not the 6 s fallback)`);
  check(r.broken === 0, `${r.broken} broken picture(s) showing in the payoff (Safari draws a blue "?")`);
  check(!errs.length, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL payoffbroken\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log(`PASS payoffbroken: a failed part picture is hidden, the payoff finishes in ${ms} ms with OK ("${r.text}")`);
})();
