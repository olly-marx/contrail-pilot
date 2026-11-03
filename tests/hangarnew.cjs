// Hangar fixes (0.10.2, user): the NEW! tag lights only for something newly affordable or opened since the
// hangar was last looked at (it used to glow whenever anything was affordable); a big picture of the plane
// at the top (tap a plane card to preview it); no "REAL" / "GAME GUESS" labels anywhere in the hangar.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/hangarnew.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
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
  const dot = id => p.evaluate(i => !document.getElementById(i).hidden, id);
  const raise = () => p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.seeds = 2000; ui.save.crystals = 300; ui.save.seen['hangar/gadgets'] = []; ui.showTitle(); });   // (+ GADGETS made unseen: two hangar sub-tabs have news)

  // 1. The NEW dots (src/fresh.js; real taps). Money that was already there at load is SEEN (no dot storm); newly affordable things light
  // the HANGAR and NATURE dots; NATURE's dot clears only NATURE's (the old ui.js:287 bug: opening NATURE cleared the hangar's NEW);
  // the HANGAR dot clears when its three sub-tabs have been shown.
  check(!(await dot('dHangar')) && !(await dot('dNature')), 'no dot storm: what was already affordable at load is seen');
  await raise();
  check(await dot('dHangar'), 'with more seeds, newly affordable fleet things light the HANGAR dot');
  check(await dot('dNature'), 'with more seeds, newly affordable NATURE things light the NATURE dot');
  await p.click('#tabNature'); await p.waitForTimeout(400);
  check(!(await dot('dNature')), 'after looking at NATURE, its dot is off');
  check(await dot('dHangar'), 'opening NATURE must NOT clear the hangar dot (the old shared list did)');
  await p.click('#tabHangar'); await p.waitForTimeout(400);   // PLANE is showing: only its news is seen
  check(await dot('dHangar'), 'the PLANE sub-tab alone does not clear the HANGAR dot while GADGETS still has something new');
  await p.click('[data-ftab=systems]'); await p.waitForTimeout(300);
  check(await dot('dHangar'), 'PLANE + SYSTEMS shown: GADGETS still lights the HANGAR dot');
  await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(300);
  check(!(await dot('dHangar')), 'after PLANE, SYSTEMS and GADGETS have been shown, the HANGAR dot is off');
  await p.click('#tabFly'); await p.waitForTimeout(200);
  check(!(await dot('dHangar')), 'the dot stays off on HOME');
  await p.reload(); await ready(p); await p.waitForTimeout(400);

  // 2. The big picture: the plane you fly; tapping the Comet's card previews the Comet.
  await p.click('#tabHangar'); await p.waitForTimeout(300);
  let pv = await p.evaluate(() => ({ src: document.querySelector('#hFleet .fpreview img').dataset.plane, cap: document.querySelector('#hFleet .fpcap').textContent }));
  check(pv.src === 'jumbo' && /747 jumbo/.test(pv.cap) && /FLYING/.test(pv.cap), `preview shows the plane you fly: ${JSON.stringify(pv)}`);
  await p.click('[data-pview="comet"]'); await p.waitForTimeout(200);
  pv = await p.evaluate(() => ({ src: document.querySelector('#hFleet .fpreview img').dataset.plane, cap: document.querySelector('#hFleet .fpcap').textContent }));
  check(pv.src === 'comet' && /IN YOUR FLEET/.test(pv.cap), `tapping the Comet card previews it: ${JSON.stringify(pv)}`);
  const plane = await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')).fleet.plane);
  check(plane === 'jumbo', `previewing does not change the plane you fly: ${plane}`);

  // 3. No REAL / GAME GUESS labels: in the rows or the (i) cards.
  const texts = [];
  for (const tab of ['plane', 'systems', 'gadgets']) {
    await p.click(`[data-ftab=${tab}]`); await p.waitForTimeout(150);
    texts.push(await p.textContent('#hFleet'));
    // The (i) lives in the preview strip now (one row at a time): tap each row, then its 'More about it'.
    const ids = await p.evaluate(() => [...document.querySelectorAll('[data-ftap]')].map(e => e.dataset.ftap));
    for (const id of ids) { await p.click(`[data-ftap="${id}"]`); await p.waitForTimeout(120); texts.push(await p.textContent('#hFleet'));
      await p.click(`#hPreview [data-finfo="${id}"]`); await p.waitForTimeout(80); texts.push(await p.textContent('#info')); await p.click('#iClose'); }
  }
  const bad = texts.filter(t => /GAME GUESS|game guess|game estimate|REAL \(|\bREAL\b/.test(t));
  check(!bad.length, `no sourcing labels shown to players: ${bad.map(t => t.slice(0, 80))}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);

  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
