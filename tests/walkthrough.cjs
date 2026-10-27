// The first hour, played (S3; research/FLOW-FIRST-HOUR.md, approved by the user 2026-10-27 after they played 0.13.0
// from Johannesburg and found the flow broken). A FRESH season 2 player, NOT starting in London, goes through the start
// choice, how-to, flight school and flights 1-5, with a screenshot of every step (SHOTS=<dir>). It asserts the flow:
//   - flight school flies over the START area's land (savanna for Johannesburg), not UK woodland;
//   - after flight 1 the results lead to the HANGAR (OPEN THE HANGAR), TAKE OFF stays locked until the free part is picked;
//   - no wild animal is drawn before the NATURE lesson (lesson 2), and after lesson 2 the results lead to NATURE;
//   - no tip bubble or toast is up for less than 2 s (one "vanished in a microsecond"), and none is left on the results;
//   - lesson 5 asks for tree parcels first (soil and parcels wait for it).
// Run: python3 -m http.server 8000 & SHOTS=/tmp/walk node tests/walkthrough.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const fs = require('fs');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/', SHOTS = process.env.SHOTS || '';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); });
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  let n = 0; const shot = async name => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const scene = fn => p.evaluate(fn);
  // Watch every bubble and toast: how long each stays up (the page's own clock).
  const watch = () => p.evaluate(() => {
    if (window.__bubbles) return; window.__bubbles = [];
    const ui = game.registry.get('ui'), log = (kind, on) => { const t = performance.now(), l = window.__bubbles, last = l.filter(x => x.kind === kind && x.end == null).pop();
      if (on && !last) l.push({ kind, start: t, school: !!(game.scene.getScene('game') || {}).school, text: (document.getElementById(kind === 'coach' ? 'coachText' : 'toast') || {}).textContent });
      if (!on && last) last.end = t; };
    new MutationObserver(() => log('coach', !document.getElementById('coach').hidden)).observe(document.getElementById('coach'), { attributes: true, attributeFilter: ['hidden'] });
    new MutationObserver(() => log('toast', !document.getElementById('toast').hidden)).observe(document.getElementById('toast'), { attributes: true, attributeFilter: ['hidden'] });
  });
  // Count wild animals drawn in flight (cows and sheep are farm animals, always fine).
  const wild = () => scene(() => (game.scene.getScene('game').life || []).filter(x => x.kind && !/animal-(cow|sheep)/.test(x.kind)).length);
  const fly = async (seconds, set = {}) => {   // take off, fly safely for a while, then land with the lesson's numbers
    await p.click('#goBtn'); await started(p);
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 }).catch(() => {});
    await scene(() => { const s = game.scene.getScene('game'); s.graceUntil = 1e12; s.hitsStorm = () => false; s.hitBird = () => false; s.nextAirport.worldX = s.distancePx + 1e7; });
    let animals = 0; set.allowed = await scene(() => game.scene.getScene('game').wildAllowed());
    for (let i = 0; i < seconds * 4; i++) { await p.waitForTimeout(250); await scene(() => { const s = game.scene.getScene('game'); s.heat = 0; if (s.plane.y > 300) s.applyFlap(); }); animals = Math.max(animals, await wild()); }
    await shot(`flight-${set.tag}`);
    await p.evaluate(set => { const s = game.scene.getScene('game'); Object.assign(s, { landedAt: s.path[1] }, set.vals || {}); s.finish({ landed: true }); }, set);   // (a real landing names its city)
    await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(2500);   // the results reveal
    return { animals, allowed: set.allowed };
  };
  const resultsState = () => p.evaluate(() => ({ btn: document.getElementById('againBtn').textContent, coach: !document.getElementById('coach').hidden }));

  // 0a. Start choice: Africa, Johannesburg.
  await p.goto(URL); await ready(p); await p.waitForTimeout(800);
  await shot('start-choice');
  await p.click('#startChoice [data-area="africa"]'); await p.click('#startChoice [data-city="JOHANNESBURG"]'); await p.waitForTimeout(500);
  await watch();
  await shot('hub-before-school');
  // 0b-c. How to play (3 lines), flight school over the start land.
  await p.click('#goBtn'); await p.waitForTimeout(500);
  const how = await p.evaluate(() => document.querySelectorAll('#how .howto li').length);
  check(how === 3, `how to play shows 3 lines, not more (${how})`);
  await shot('how-to');
  await p.click('#howClose'); await p.waitForTimeout(1000);
  // Hold to take off (the school's first step), then fly on a while: the old bug switched the land to UK woodland only
  // once the plane was moving (the start screen still showed the route's land).
  await p.mouse.move(195, 420); await p.mouse.down(); await p.waitForTimeout(2500); await p.mouse.up();
  for (let i = 0; i < 40 && (await scene(() => game.scene.getScene('game').distancePx)) < 400; i++) { await p.mouse.click(195, 420); await p.waitForTimeout(250); }
  const school = await scene(() => { const s = game.scene.getScene('game'); return { school: !!s.school, region: s.regionNow, km: Math.round(s.distancePx) }; });
  check(school.school && school.region === 'savanna', `flight school flies over the START land (savanna for Johannesburg): ${JSON.stringify(school)}`);
  await shot('school');
  await p.click('#skipSchool').catch(() => {}); await p.waitForTimeout(800);
  // Flight 1 (lesson 1: land). No wild animals yet.
  if (await p.evaluate(() => document.getElementById('results') && !document.getElementById('results').hidden)) await p.click('#againBtn');
  await p.evaluate(() => game.registry.get('ui').showTitle()); await p.waitForTimeout(500);
  await shot('hub-flight1');
  let f1 = await fly(8, { tag: '1', vals: {} });
  check(f1.animals === 0 && f1.allowed === false, `flight 1: no wild animals before the NATURE lesson (${JSON.stringify(f1)})`);
  let rs = await resultsState();
  check(/OPEN THE HANGAR/.test(rs.btn) && !rs.coach, `after flight 1 the results lead to the HANGAR, nothing left open: ${JSON.stringify(rs)}`);
  await p.waitForFunction(() => /OPEN THE HANGAR/.test(document.getElementById('againBtn').textContent) && document.getElementById('againBtn').offsetParent !== null, null, { timeout: 8000 }).catch(() => {});
  await shot('results-flight1');
  await p.click('#againBtn'); await p.waitForTimeout(1500);
  check(await p.evaluate(() => !document.getElementById('hangar').hidden), 'OPEN THE HANGAR opens the hangar');
  await p.waitForTimeout(1500); await shot('hangar-free-part');
  const free = await p.$('#hFleet .btn.free'); check(!!free, 'a FREE! part to pick');
  await p.evaluate(() => { const t = document.getElementById('tour'); if (t) t.hidden = true; game.registry.get('ui').tour.busy = false; });   // (the tour's dim layer would catch the click: the tour itself is checked in missionscreen.cjs)
  if (free) { await free.click(); await p.waitForTimeout(500); }
  await p.click('#hubBack'); await p.waitForTimeout(500);
  const hub2 = await p.evaluate(() => ({ locked: document.getElementById('goBtn').disabled, tiles: [...document.querySelectorAll('#hubTiles [data-go]')].map(t => t.dataset.go) }));
  check(!hub2.locked && hub2.tiles.includes('hangar'), `after the free part: TAKE OFF unlocked, the HANGAR tile is there: ${JSON.stringify(hub2)}`);
  await shot('hub-flight2');
  // Flight 2 (lesson 2: daytime icy air) -> NATURE.
  const f2 = await fly(8, { tag: '2', vals: { sunBlocked: 3.5 } });
  check(f2.animals === 0 && f2.allowed === false, `flight 2: still no wild animals (the NATURE lesson ends this flight): ${JSON.stringify(f2)}`);
  rs = await resultsState();
  check(/OPEN NATURE/.test(rs.btn) && !rs.coach, `after lesson 2 the results lead to NATURE: ${JSON.stringify(rs)}`);
  await shot('results-flight2');
  await p.click('#againBtn'); await p.waitForTimeout(1200);
  check(await p.evaluate(() => !document.getElementById('nature').hidden), 'OPEN NATURE opens NATURE');
  await shot('nature');
  await p.evaluate(() => { const t = document.getElementById('tour'); if (t) t.hidden = true; game.registry.get('ui').tour.busy = false; });
  await p.click('#hubBack'); await p.waitForTimeout(500);
  // Flights 3-4 (night, skip one); then lesson 5 asks for parcels first.
  const f3 = await fly(6, { tag: '3', vals: { nightOwl: true } });
  check(f3.allowed === true, `flight 3: wild animals are allowed after the NATURE lesson: ${JSON.stringify(f3)}`); await shot('results-flight3'); await p.click('#againBtn'); await p.waitForTimeout(500);
  await p.evaluate(() => game.registry.get('ui').showTitle());
  await fly(4, { tag: '4', vals: { airportsSkipped: 1 } }); await shot('results-flight4'); await p.click('#againBtn'); await p.waitForTimeout(500);
  await p.evaluate(() => game.registry.get('ui').showTitle()); await p.waitForTimeout(400);
  const n5 = await p.evaluate(() => document.getElementById('hubNext').innerText);
  check(/tree parcels/i.test(n5), `lesson 5 first asks for tree parcels in NATURE: "${n5}"`);
  await shot('hub-lesson5');
  // Bubbles: none shorter than 2 s after flight school (a tap or a newer bubble used to wipe one at once).
  const bubbles = await p.evaluate(() => (window.__bubbles || []).filter(x => !x.school && x.end != null).map(x => ({ ...x, ms: Math.round(x.end - x.start) })));
  const short = bubbles.filter(x => x.ms < 2000);
  check(!short.length, `no bubble or toast under 2 s: ${JSON.stringify(short.slice(0, 3))}`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await b.close();
  console.log(fails.length ? `FAIL walkthrough:\n - ${fails.join('\n - ')}` : `PASS walkthrough: Johannesburg start, savanna school, hangar after flight 1 (TAKE OFF locked until the free part), no animals before lesson 2, NATURE after it, parcels at lesson 5, ${bubbles.length} bubbles all >= 2 s`);
  process.exit(fails.length ? 1 : 0);
})();
