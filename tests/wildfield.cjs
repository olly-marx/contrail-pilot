// Wild Area field (src/wild.js Field, 2026-10-22): a habitat feature for every project done (and
// none for projects not done), trees for what you planted, every animal found wandering about (it
// moves, faces the way it goes, and never asks for a missing picture).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/wildfield.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], missing = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('response', r => { if (r.status() === 404) missing.push(r.url().split('/').pop()); });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const t = Date.now();
  const done = ['pond', 'hedgerow', 'storks'];
  await p.addInitScript(([done, t]) => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'],
    tours: ['name', 'hangar', 'nature', 'wild'], freeGiven: true, priceVersion: 2, missionsDone: [], badgeTiers: {}, habitat: { woodland: done },
    planted: { oak: 5, birch: 3 }, found: { fox: t, rabbit: t, stork: t, robin: t } })); }, [done, t]);
  await p.goto(URL); await ready(p); await p.waitForTimeout(400);
  await p.click('#tabNature'); await p.waitForTimeout(1500);
  const feats = await p.$$eval('#wScene .wf.feat', els => els.map(e => e.src.split('/').pop()));
  check(['wild-pond.png', 'wild-hedgerow.png', 'wild-storks.png'].every(f => feats.includes(f)), `features for projects done: ${feats}`);
  check(!feats.some(f => /deadwood|meadow|beavers/.test(f)), `no features for projects not done: ${feats}`);
  const trees = await p.$$eval('#wScene .wf.tree', els => els.map(e => e.src.split('/').pop()));
  check(trees.length === 4 && trees.some(x => /oak/.test(x)) && trees.some(x => /birch/.test(x)), `8 trees planted -> 4 in the field, oak and birch: ${trees}`);
  const before = await p.$$eval('#wScene .critter', els => els.map(e => e.style.left + ',' + e.style.top));
  await p.waitForTimeout(6000);
  const after = await p.$$eval('#wScene .critter', els => els.map(e => [e.style.left + ',' + e.style.top, e.src.split('/').pop()]));
  check(before.length === 4, `the 4 animals found are in the field: ${before.length}`);
  check(after.filter(([pos], i) => pos !== before[i]).length >= 3, `animals wander: ${JSON.stringify([before, after])}`);
  check(after.every(([, src]) => /-[01]\.png$/.test(src)), `every animal shows a real frame: ${after.map(a => a[1])}`);
  check(missing.length === 0, `no missing pictures: ${missing}`);
  console.log({ fails, errs });
  await b.close();
  if (fails.length || errs.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
