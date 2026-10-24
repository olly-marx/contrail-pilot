// Hangar fixes (0.10.2, user): the NEW! tag lights only for something newly affordable or opened since the
// hangar was last looked at (it used to glow whenever anything was affordable); a big picture of the plane
// at the top (tap a plane card to preview it); no "REAL" / "GAME GUESS" labels anywhere in the hangar.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/hangarnew.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { if (sessionStorage.i) return; sessionStorage.i = 1; localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'],
    flights: 30, landings: 9, seeds: 60, crystals: 20, flightSeconds: 1500, priceVersion: 2, levels: { trees: 1 }, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: { engines: 1 } }, systems: {}, gadgets: {} } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(500);
  const isNew = () => p.evaluate(() => !document.getElementById('tNew').hidden);

  // 1. NEW: lit (things affordable, never looked at), off after a look, back only when something new is affordable.
  check(await isNew(), 'NEW is lit before the first look');
  await p.click('#tabHangar'); await p.waitForTimeout(300); await p.click('#tabFly'); await p.waitForTimeout(200);
  check(!(await isNew()), 'after looking at the hangar, NEW is off although things are still affordable');
  await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.seeds = 2000; ui.save.crystals = 300; ui.showTitle(); });
  check(await isNew(), 'with more seeds, newly affordable things light NEW again');
  await p.reload(); await ready(p); await p.waitForTimeout(400);

  // 2. The big picture: the plane you fly; tapping the Comet's card previews the Comet.
  await p.click('#tabHangar'); await p.waitForTimeout(300);
  let pv = await p.evaluate(() => ({ src: document.querySelector('#hFleet .fpreview img').dataset.plane, cap: document.querySelector('#hFleet .fpcap').textContent }));
  check(pv.src === 'jumbo' && /747 jumbo/.test(pv.cap) && /FLYING/.test(pv.cap), `preview shows the plane you fly: ${JSON.stringify(pv)}`);
  await p.click('.fplane[data-pview="comet"] b'); await p.waitForTimeout(200);
  pv = await p.evaluate(() => ({ src: document.querySelector('#hFleet .fpreview img').dataset.plane, cap: document.querySelector('#hFleet .fpcap').textContent }));
  check(pv.src === 'comet' && /IN YOUR FLEET/.test(pv.cap), `tapping the Comet card previews it: ${JSON.stringify(pv)}`);
  const plane = await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')).fleet.plane);
  check(plane === 'jumbo', `previewing does not change the plane you fly: ${plane}`);

  // 3. No REAL / GAME GUESS labels: in the rows or the (i) cards.
  const texts = [];
  for (const tab of ['plane', 'systems', 'gadgets']) {
    await p.click(`[data-ftab=${tab}]`); await p.waitForTimeout(150);
    texts.push(await p.textContent('#hFleet'));
    const ids = await p.evaluate(() => [...document.querySelectorAll('[data-finfo]')].map(e => e.dataset.finfo));
    for (const id of ids) { await p.click(`[data-finfo="${id}"]`); await p.waitForTimeout(80); texts.push(await p.textContent('#info')); await p.click('#iClose'); }
  }
  const bad = texts.filter(t => /GAME GUESS|game guess|game estimate|REAL \(|\bREAL\b/.test(t));
  check(!bad.length, `no sourcing labels shown to players: ${bad.map(t => t.slice(0, 80))}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);

  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
