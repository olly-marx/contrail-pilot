// PLAN A, THE FLY SCREEN HUB (the user, 2026-11-24; src/ui.js renderHub/acceptStory/dropStory, src/storyboard.js, src/globe.js story). 390x844,
// a season 2 save in LONDON that has flown 25,000 km with Europe and Africa open (a crossing is on offer, so the HOME box has both objectives).
//   1. ACCEPT a Medium story: HOME's box shows the story (level, 5 hearts, "Stop 1 of n: <city>"), with a STORY | CROSSING switch; the globe
//      draws the way to the story's next stop; the story is not repeated as an UP NEXT row; a "free flight" link is under TAKE OFF.
//   2. The switch: CROSSING shows the crossing box (no story text) and is remembered (save.hubFocus); STORY brings the story back.
//   3. A crash on the story flight costs one heart: the save and the results card say so.
//   4. ACCEPT on another story asks first (one story at a time) and names the fee; SWAP drops the old story (it leaves the board) and charges it.
//   5. A tangent (the destination set elsewhere, as a mission's GO THERE does): TAKE OFF asks first; BACK TO MY STORY puts the story's stop back.
//   6. FREE FLIGHT asks first; FLY FREE fails the story (it leaves the board, no fee) and takes off.
// Plants: tools/plants.tsv, test flyhub. Run: python3 -m http.server 8000 & node tests/flyhub.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const SAVE = { areas: ['weurope', 'africa'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'],
  freeGiven: true, freeProjectGiven: true, landings: 120, flights: 200, seeds: 3000, crystals: 20, bestDistance: 25000, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, SAVE);
  try {
    await p.goto(URL); await ready(p); await p.waitForTimeout(600);
    const save = () => p.evaluate(() => game.registry.get('save'));
    const go = async t => { await p.evaluate(t => game.registry.get('ui').go(t), t); await p.waitForTimeout(400); };
    const hub = () => p.evaluate(() => ({ box: document.getElementById('hubCross').hidden ? '' : document.getElementById('hubCross').innerText.replace(/\s+/g, ' '), story: document.getElementById('hubCross').classList.contains('story'),
      hearts: document.querySelectorAll('#hubCross .sheart:not(.lost)').length, sw: document.querySelectorAll('#hubCross [data-focus]').length, fly: document.getElementById('hubFly').hidden ? '' : document.getElementById('hubFly').textContent,
      rows: [...document.querySelectorAll('#hubUpRows .rc-row')].map(r => r.innerText), path: game.registry.get('ui').hubGlobe.routePath() }));
    // 1.
    await go('missions');
    await p.click('#mList .scard:nth-child(2) [data-saccept]'); await p.waitForTimeout(300);
    let s = await save(); const o = s.storyBoard.find(x => x && x.id === s.storyActive);
    if (!o) throw new Error('no story accepted');
    check(o.level === 'medium' && o.hearts === 5, `the second card is a Medium story with 5 hearts: ${o.level} ${o.hearts}`);
    await go('fly');
    let h = await hub();
    check(h.story && h.box.includes(o.title) && h.box.includes(`Stop 1 of ${o.stops.length}: ${o.stops[0]}`) && /MEDIUM/.test(h.box), `HOME's box shows the story: ${h.box}`);
    check(h.hearts === 5, `5 hearts on the box: ${h.hearts}`);
    check(h.sw === 2, `a STORY | CROSSING switch (a crossing is on offer too): ${h.sw}`);
    check(h.path[h.path.length - 1] === o.stops[0] || o.stops[0] === 'LONDON', `the globe's gold line ends at the next stop ${o.stops[0]}: ${h.path}`);
    check(!h.rows.some(r => r.includes(o.title)), `the story is not repeated in UP NEXT: ${h.rows}`);
    check(h.fly === 'free flight', `a free flight link: "${h.fly}"`);
    // 2.
    await p.click('#hubCross [data-focus="crossing"]'); await p.waitForTimeout(300);
    h = await hub(); s = await save();
    check(!h.story && !h.box.includes(o.title) && s.hubFocus === 'crossing', `CROSSING shows the crossing box, remembered: ${h.box} (${s.hubFocus})`);
    await p.click('#hubCross [data-focus="story"]'); await p.waitForTimeout(300);
    h = await hub(); check(h.story && h.box.includes(o.title), 'STORY brings the story back');
    // 3. A crash on the story flight.
    await p.evaluate(() => game.registry.get('ui').start()); await started(p);
    await p.evaluate(() => { const g = game.scene.getScene('game'); g.landedAt = null; g.finish({ landed: false }); });
    await p.waitForTimeout(800);
    s = await save(); const o2 = s.storyBoard.find(x => x && x.id === o.id);
    check(o2 && o2.heartsLeft === 4 && s.storyActive === o.id, `a crash costs one heart: ${o2 && o2.heartsLeft}`);
    await p.waitForTimeout(1500); const res = await p.evaluate(() => (document.getElementById('rStory') || {}).innerText || '');   // (0.78.0: the story has its own block on the results card, #rStory)
    check(/Lost a heart: 4 of 5 left/.test(res), `the results card says a heart was lost: ${res}`);
    // 4. ACCEPT another story: asked first, with the fee.
    await go('fly'); await go('missions');
    const other = s.storyBoard.find(x => x && x.id !== o.id && !x.needs.length);
    s = await save(); const seeds0 = s.seeds;
    await p.click(`#mList [data-saccept="${other.id}"]`); await p.waitForTimeout(400);
    const sheet = await p.evaluate(() => document.getElementById('sheet') && !document.getElementById('sheet').hidden ? document.getElementById('sheet').innerText.replace(/\s+/g, ' ') : '');
    const fee = +(sheet.match(/costs (\d+) seeds/) || [])[1];
    check(/ONE STORY AT A TIME/.test(sheet) && fee >= 50, `ACCEPT on another story asks first and names the fee: ${sheet}`);
    s = await save(); check(s.storyActive === o.id, 'nothing changes before SWAP');
    await p.click('#sheet .sheet-action'); await p.waitForTimeout(400);
    s = await save();
    check(s.storyActive === other.id && !s.storyBoard.some(x => x && x.id === o.id) && s.seeds === seeds0 - fee, `SWAP: the new story is active, the old one left the board, ${fee} seeds paid (${seeds0} -> ${s.seeds})`);
    // 5. A tangent.
    await go('fly');
    const stop = other.stops[0], elsewhere = ['PARIS', 'MADRID', 'ROME'].find(c => c !== stop);
    await p.evaluate(c => { const sv = game.registry.get('save'); sv.aimCity = c; game.registry.get('ui').start(); }, elsewhere); await p.waitForTimeout(400);
    const sheet3 = await p.evaluate(() => document.getElementById('sheet') ? document.getElementById('sheet').innerText.replace(/\s+/g, ' ') : '');
    check(/OFF YOUR STORY/.test(sheet3) && sheet3.includes(elsewhere), `a tangent asks first: ${sheet3}`);
    await p.click('#sheet .sheet-ok'); await p.waitForTimeout(400);
    s = await save();
    check(s.storyActive === other.id && s.aimCity === stop, `BACK TO MY STORY: the destination is the story's stop again (${s.aimCity})`);
    check(await p.evaluate(() => game.scene.getScene('game').state !== 'playing'), 'and nothing took off');
    // 6. FREE FLIGHT.
    await go('fly');
    const seeds1 = (await save()).seeds;
    await p.click('#hubFly'); await p.waitForTimeout(400);
    const sheet2 = await p.evaluate(() => document.getElementById('sheet').innerText.replace(/\s+/g, ' '));
    check(/LEAVE YOUR STORY/.test(sheet2) && /free flight leaves your story/i.test(sheet2) && /fails/.test(sheet2), `FREE FLIGHT asks first: ${sheet2}`);
    await p.click('#sheet .sheet-action');
    await started(p);
    s = await save();
    check(!s.storyActive && s.seeds === seeds1 && !s.storyBoard.some(x => x && x.id === other.id) && s.storiesFailed === 1, `FLY FREE fails the story, no fee (${seeds1} -> ${s.seeds}, failed ${s.storiesFailed})`);
    check(await p.evaluate(() => ['takeoff', 'playing'].includes(game.scene.getScene('game').state)), 'and the free flight takes off');
  } catch (e) { fails.push(String(e)); }
  if (errs.length) fails.push(`page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL flyhub\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS flyhub (HOME shows the story with a switch, hearts lost on a crash, one story at a time with a fee, a tangent asks first, free flight fails it)');
})();
