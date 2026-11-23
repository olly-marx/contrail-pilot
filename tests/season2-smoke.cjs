// SEASON 2 SMOKE SUITE (0.12.0 coverage; the shipped game IS season 2, but most of the suite runs classic through
// tests/lib/classic.js). This test does NOT require classic.js: every page is the game as shipped (SEASON2_FORCE unset).
//   A  fresh start: season 2 tag, no save, the start choice offers the nine starter areas
//   B  one flight start per starter area: the start choice, then flight school flies from YOUR city over YOUR area
//      (not London > Paris), the first hop is the next airport, the plane takes off, no page errors
//   C  the tabs: HANGAR, NATURE, PILOT, BOARDS and back to FLY open with content and without errors
//   D  the offer card with the gate met through a seeded save (areaBest + planted trees): 4,899 km not offered, another
//      area's flight counts too (0.43.1), 4,900 km + biodiversity 30 offered; a crossing flight starts (Tunis 7,000 km on; pacing A2 2026-11-18)
//   E  every area open and the last era (far future, the era 6 release): THE LAP is listed, no MORE TO COME; after the lap, neither
//   G  a tap before the scene exists (the 0.12.2 iPhone crash): startSchool/startFlight restart instead of throwing
//   F  nothing to fly yet in an early era: the card says when the next crossing opens, not silence
//   (C also: PILOT offers the name form; BOARDS is MY RECORDS with a ranking once there is a pilot name; Pilot LAPS text does not say London)
// Planted defects, each must FAIL the check named (revert with git checkout after):
//   B  sed -i 's/(SEASON2_ON ? save : { city: HOME })/({ city: HOME })/' src/route.js        -> "B <area>: flight school starts in ..."
//   C  sed -i "s/if (tab === 'nature')/if (tab === 'natur')/" src/ui.js                    -> "C: NATURE opens"
//   D  sed -i 's/distanceShare: 0.7/distanceShare: 0/; s/biodiversity: 30, /biodiversity: 0, /' src/season.js -> "D: 4,899 km ..."
//   D  sed -i 's/maxEra: 2/maxEra: 9/' src/season.js ... (offer-gate.cjs covers it); crossing start: break crossingPath in src/crossings.js
//   F  sed -i 's/if (best === null || c.era < best)/if (false)/' src/crossings.js  -> "F: nothing to fly yet"
//   C  sed -i 's/const off = onlineOff();/const off = false;/' src/pilot.js -> "C: PILOT says"
//   G  git show d1ca9d1:src/GameScene.js > src/GameScene.js (today's 0.12.2 code)  -> "G: startSchool before create()" (restore with git checkout HEAD -- src/GameScene.js)
//   E  sed -i 's/export const moreToCome = save => /export const moreToCome = save => false \&\& /' src/crossings.js -> "E: ..."
// PART=<ids> runs only those sections (test-speed, 2026-10-28: the release gate runs them as parallel pieces, see tests/PATHMAP). Ids: A, Bweurope, Bnamerica, Bsasia, Bafrica,
// Bsamerica, Beasia, C, D, E, F, G. No PART = every section (CI, tools/test.sh). An unknown id FAILS (a typo must not run nothing). tests/releasegate.cjs checks the pieces
// in tests/PATHMAP cover every section exactly once.
// Run: python3 -m http.server 8000 & node tests/season2-smoke.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const STARTERS = ['weurope', 'namerica', 'sasia', 'africa', 'samerica', 'easia', 'oceania', 'aotearoa', 'patagonia'];
const SECTIONS = ['A', ...STARTERS.map(k => 'B' + k), 'C', 'D', 'E', 'F', 'G'];
const WANT = process.env.PART ? process.env.PART.split(',').map(x => x.trim()).filter(Boolean) : null;
if (WANT && (!WANT.length || WANT.some(x => !SECTIONS.includes(x)))) { console.log(`FAIL: PART=${process.env.PART} names a section that does not exist (have: ${SECTIONS.join(',')})`); process.exit(1); }
const on = id => !WANT || WANT.includes(id);

setTimeout(() => { console.log('FAIL: the smoke suite did not finish in 4 minutes (a hang is a failure)'); process.exit(1); }, 240000).unref();
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], errs = [], check = (c, m) => { if (!c) fails.push(m); };
  const fresh = async () => {   // a new player on a new device, the game as shipped
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(URL); await ready(p);
    return p;
  };
  const SEEDED = { tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], priceVersion: 2, landings: 30, mission: 99, flightSeconds: 1e6,
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  // Write a save (through the page's own s2: storage) and reload on it. `extra` overrides.
  const seed = async (p, extra) => {
    await p.evaluate(([base, extra]) => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ ...base, ...extra })); }, [SEEDED, extra]);
    await p.goto(URL); await ready(p);
  };

  // A. fresh start
  let p;
  if (on('A')) {
  p = await fresh();
  const a = await p.evaluate(async () => ({ on: (await import('/src/config.js')).FEATURES.season2, tag: !!document.getElementById('s2Tag'), areas: (game.registry.get('save').areas || []).length, tut: game.registry.get('save').tutorialDone }));
  check(a.on && !a.tag && a.areas === 0 && !a.tut, `A: a fresh device plays season 2 (no SEASON 2 tag or reset link for players), no area chosen yet: ${JSON.stringify(a)}`);
  await p.evaluate(() => { game.registry.get('ui').start(); });
  await p.waitForSelector('#startChoice [data-area]', { timeout: 5000 }).catch(() => {});
  const offered = await p.$$eval('#startChoice [data-area]', bs => bs.map(x => x.dataset.area));
  check(JSON.stringify(offered.sort()) === JSON.stringify([...STARTERS].sort()), `A: the nine starter areas are offered: ${offered}`);
  await p.context().close();
  }

  // B. one flight start per starter area
  for (const k of STARTERS) {
    if (!on('B' + k)) continue;
    p = await fresh();
    await p.evaluate(() => { game.registry.get('ui').start(); });
    await p.waitForSelector(`#startChoice [data-area="${k}"]`, { timeout: 5000 }).catch(() => {});
    await p.click(`#startChoice [data-area="${k}"]`, { timeout: 5000 }).catch(() => {});
    const home = await p.$eval('#startChoice [data-city]', e => e.dataset.city).catch(() => null);   // the area's own default city, listed first
    await p.click('#startChoice [data-city]', { timeout: 5000 }).catch(() => {});
    await p.waitForSelector('#howClose', { state: 'visible', timeout: 5000 }).catch(() => {});
    await p.click('#howClose', { timeout: 5000 }).catch(() => {});
    await started(p);
    const f = await p.evaluate(async k => { const g = game.scene.getScene('game'), AR = await import('/src/areas.js'), A = { start: AR.AREAS[k].start, cities: AR.withRegions([k]).flatMap(x => AR.AREAS[x].cities) };   // CROSSINGS V3: the home REGION
      const path = (g.path || []).slice(0, 6);
      return { school: !!g.school, path, next: g.nextAirport && g.nextAirport.name, state: g.state, start: A.start, inArea: path.length > 1 && path.every(n => A.cities.includes(n)), areas: game.registry.get('save').areas, region: AR.withRegions([k]) }; }, k);
    check(home && home === f.start && f.path[0] === f.start, `B ${k}: flight school starts in ${f.start}, not London: ${JSON.stringify(f)}`);
    check(f.school && f.inArea && f.next === f.path[1] && JSON.stringify(f.areas) === JSON.stringify(f.region), `B ${k}: school flies over its own region to the next airport: ${JSON.stringify(f)}`);
    await p.waitForTimeout(1200);
    const after = await p.evaluate(() => { const g = game.scene.getScene('game'); return { state: g.state, x: g.plane && g.plane.y }; });
    check(['takeoff', 'playing'].includes(after.state), `B ${k}: the plane is flying after a moment: ${JSON.stringify(after)}`);
    await p.context().close();
  }

  // C. the tabs, for a player with a plane and an area
  if (on('C')) {
  p = await fresh();
  await seed(p, { areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM' });
  for (const [tab, id] of [['hangar', 'hangar'], ['nature', 'nature'], ['pilot', 'pilot'], ['boards', 'boards'], ['fly', 'title']]) {
    await p.evaluate(t => { game.registry.get('ui').go(t); }, tab);
    await p.waitForTimeout(250);
    const t = await p.evaluate(id => { const e = document.getElementById(id); return { shown: !!e && !e.hidden, len: e ? e.innerText.length : 0 }; }, id);
    check(t.shown && t.len > 20, `C: ${tab.toUpperCase()} opens with content: ${JSON.stringify(t)}`);
  }
  check(await p.evaluate(() => !!document.getElementById('jAreas')), 'C: the FLY screen shows "Your area"');
  // online is back (0.20.0): PILOT offers the name form and "I already have a pilot"; BOARDS (MY RECORDS) tells a device with no name to pick one
  await p.evaluate(() => game.registry.get('ui').go('pilot')); await p.waitForTimeout(250);
  const pil = await p.evaluate(() => { const v = id => { const e = document.getElementById(id); return !!e && !e.hidden; }; return { note: v('pOffNote'), edit: v('pEdit'), have: v('pHave'), code: v('pCodeBox'), stats: document.getElementById('pStats').innerText.length > 10 }; });
  check(!pil.note && pil.edit && pil.have && pil.stats, `C: PILOT offers the name form and the login (no 'resting' note) and shows your stats: ${JSON.stringify(pil)}`);
  await p.evaluate(() => game.registry.get('ui').go('boards')); await p.waitForTimeout(400);
  const bm = await p.evaluate(() => ({ msg: document.getElementById('bMsg').textContent, cards: document.querySelectorAll('#bBoards .btn.rec').length }));
  check(/Pick a name in PILOT/.test(bm.msg) && !/No internet/.test(bm.msg) && bm.cards === 8, `C: BOARDS is MY RECORDS (8 cards) and tells a device with no name to pick one in PILOT, not 'No internet right now': ${JSON.stringify(bm)}`);
  check(await p.evaluate(async () => !/back to LONDON/i.test(await (await fetch('/src/pilot.js')).text())), 'C: the Pilot LAPS text does not say "back to LONDON" (season 2 starts anywhere)');
  await p.context().close();

  }

  // D. the offer card and a crossing flight
  if (on('D')) {
  p = await fresh();
  const PLANTED = {}; for (const id of ['spruce', 'birch', 'oak', 'beech', 'pine', 'ash', 'rowan', 'hazel', 'willow', 'alder']) PLANTED[id] = 40;
  const STARS = ['weurope:night', 'weurope:shade10', 'weurope:kinds3'];   // S3: the area's 3 starred missions are a condition too
  const LESSONS = ['L1', 'L2', 'L3', 'L4', 'L5'];   // (0.75.0) the first-hour lessons are done: no crossing leads UP NEXT while one is left
  const zeroRange = () => p.evaluate(async () => { const C = await import('/src/capability.js'), s = game.registry.get('save'), key = C.capKey(s); s.capability = { km: 0, key, area: 'weurope' }; s.capArea = { weurope: { km: 0, key } }; });   // (0.75.0) a fresh zero range: HOME's estimate keeps it, so only the landed flight counts
  const card = async (areaBest, missionsDone = STARS) => { await seed(p, { areas: ['weurope'], homeArea: 'weurope', city: 'ROME', planted: PLANTED, habitat: { woodland: ['deadwood', 'meadow', 'margins'] }, areaBest, missionsDone: [...LESSONS, ...missionsDone] }); await zeroRange();   // (3 projects: woodland meter 41 >= the first crossing's 38, CROSSINGS V3)
    await p.evaluate(() => game.registry.get('ui').showTitle()); return p.evaluate(() => (document.getElementById('jCross') || {}).innerHTML || ''); };
  let c = await card({ weurope: 11999 });
  check(/ROME &gt; TUNIS/.test(c) && /data-k="plane"><span class="xc-l">Range<\/span><span class="xc-bar">/.test(c) && /class="xc-next">[^<]+</.test(c) && !/data-cross|data-ready="[a-z]/.test(c), `D: 11,999 km (just under 12,000; V4 0.73.0) is not offered, the card says what it needs: ${c.slice(0, 200)}`);
  c = await card({ namerica: 12000 });   // (another area's flight: the Nordic area is in the home region now)
  check(!/xcard ready" data-xc="mediterranean"/.test(c), 'D: V5 (0.74.0): a long flight from ANOTHER area does not count (the plane over the departure land)');
  c = await card({ weurope: 12000 }, STARS.slice(1, 2));
  check(/xcard ready" data-xc="mediterranean"/.test(c), `D: the trial stars are no longer a gate (CROSSINGS V2): 12,000 km is offered with only 1 of the 3 starred missions: ${c.slice(0, 200)}`);
  c = await card({ weurope: 12000 });
  check(/xcard ready" data-xc="mediterranean"/.test(c), `D: 12,000 km: the crossing is offered: ${c.slice(0, 200)}`);
  const noTrees = await (async () => { await seed(p, { areas: ['weurope'], homeArea: 'weurope', city: 'ROME', areaBest: { weurope: 12000 }, missionsDone: [...LESSONS, ...STARS] }); await zeroRange();
    await p.evaluate(() => game.registry.get('ui').showTitle()); return p.evaluate(() => (document.getElementById('jCross') || {}).innerHTML || ''); })();
  check(/xcard ready" data-xc="mediterranean"/.test(noTrees), `D: a long flight with no biodiversity IS offered (V4, 0.73.0: range only): ${noTrees.slice(0, 200)}`);
  await card({ weurope: 12000 });
  await p.evaluate(() => game.registry.get('ui').showTitle());
  const nextCard = await p.evaluate(() => ({ text: (document.getElementById('hubNext') || {}).innerText || '', box: /xcard ready/.test((document.getElementById('jCross') || {}).innerHTML || '') }));
  // (0.75.0) after the lessons the ready crossing leads HOME in its own box (ui.js boxOn), and UP NEXT does not repeat it as a gold row
  check(nextCard.box && !/Cross to/i.test(nextCard.text), `D: the ready crossing shows in the HOME crossing box, not again in UP NEXT: ${JSON.stringify(nextCard)}`);
  // S2 hub: the crossings sit behind the route line (tap it), and a ready crossing is also the NEXT card.
  if (await p.$('#sheet')) await p.click('#sheet .sheet-ok');   // (R-A: a ready crossing announces itself once, on HOME: LATER, then the route panel)
  if (await p.evaluate(() => document.getElementById('title').classList.contains('hub') && !document.getElementById('title').classList.contains('world'))) await p.evaluate(() => game.registry.get('ui').openJourneySheet());   // (the route chip now opens the FLY TO sheet; the crossing buttons live in the journey sheet)
  const btn = await p.$('#jCross [data-cross], #jCross [data-pick]');   // (V4, 0.73.0: one crossing on offer, its own FLY button)   // (Oliver, 2026-11-20: a Western Europe pilot has 2 crossings on offer, ROME > TUNIS and the North Atlantic: ONE card, '2 WAYS TO CROSS'; FLY A CROSSING asks where to)
  check(!!btn, 'D: the FLY THE CROSSING button is there');
  if (btn) {
    await btn.click(); if (await p.$('#sheet [data-pickx="mediterranean"]')) await p.click('#sheet [data-pickx="mediterranean"]'); if (await p.$('#sheet .sheet-action')) await p.click('#sheet .sheet-action'); await started(p);   // (R-A: the crossing sheet is the confirm before the flight starts)
    const fl = await p.evaluate(() => { const g = game.scene.getScene('game'); return { c: g.crossing && g.crossing.id, to: g.nextAirport.name, at: Math.round(g.nextAirport.worldX - g.distancePx), dist: g.distText.text, path: g.path.slice(0, 3) }; });
    check(fl.c === 'mediterranean' && fl.to === 'TUNIS' && fl.at >= 11900 && fl.at <= 12000 && /TO TUNIS/.test(fl.dist), `D: the crossing flight starts: Rome to Tunis, 12,000 km away: ${JSON.stringify(fl)}`);
  }
  await p.context().close();

  }

  // E. the end of this release
  if (on('E')) {
  p = await fresh();
  await seed(p, { areas: ['weurope', 'namerica', 'sasia', 'africa', 'samerica', 'easia', 'mideast', 'nordic', 'oceania', 'aotearoa', 'patagonia', 'ocean'], homeArea: 'weurope', city: 'AMSTERDAM' });
  await p.evaluate(() => game.registry.get('ui').showTitle());
  const more = await p.evaluate(() => ({ card: !!document.getElementById('jMore'), lap: !!document.getElementById('jLap'), text: (document.getElementById('jCross') || {}).textContent || '' }));
  check(!more.card && more.lap && /AMSTERDAM round the world and home, non-stop/.test(more.text), `E: every area open, the far future: THE LAP is listed (from home), no MORE TO COME: ${JSON.stringify(more)}`);
  await seed(p, { areas: ['weurope', 'namerica', 'sasia', 'africa', 'samerica', 'easia', 'mideast', 'nordic', 'oceania', 'aotearoa', 'patagonia', 'ocean'], homeArea: 'weurope', city: 'AMSTERDAM', crossed: ['lap'], lapDone: true });
  await p.evaluate(() => game.registry.get('ui').showTitle());
  const done = await p.evaluate(() => ({ card: !!document.getElementById('jMore'), lap: !!document.getElementById('jLap') }));
  check(!done.card && !done.lap, `E: after the lap: no MORE TO COME and no lap (the game is finished): ${JSON.stringify(done)}`);
  await p.context().close();

  }

  // F. an empty FLY screen is not silent: the next crossing is listed (V4: never waiting for an era)
  if (on('F')) {
  p = await fresh();
  await seed(p, { areas: ['weurope', 'mideast'], homeArea: 'weurope', city: 'TUNIS', flightSeconds: 0 });
  await p.evaluate(() => game.registry.get('ui').showTitle());
  const later = await p.evaluate(() => ({ later: (document.getElementById('jLater') || {}).innerText || '', cross: !!document.querySelector('#jCross [data-cross], #jCross [data-pick]'), more: !!document.getElementById('jMore') }));
  const card = await p.evaluate(() => (document.getElementById('jCross') || {}).innerText || '');
  check(!later.later && !later.more && /Range|range/.test(card), `F (V4, 0.73.0: no crossing waits for an era): the next crossing is listed with its Range row, no 'later era' card: ${JSON.stringify(later)} ${card.slice(0, 120)}`);
  await p.context().close();

  }

  // G. the 0.12.2 live crash (iPhone: `undefined is not an object (evaluating 'save.areas')` in startSchool): a tap on TAKE OFF / the how-to
  if (on('G')) {
  // card before the scene's create() has run finds no state and no save; the scene must just restart, not throw.
  p = await fresh();
  const early = await p.evaluate(() => { const proto = game.scene.getScene('game').constructor.prototype, out = {};
    for (const m of ['startSchool', 'startFlight']) { let called = null, err = null; const fake = { state: undefined, save: undefined, scene: { restart: d => { called = d; } } };
      try { proto[m].call(fake); } catch (e) { err = String(e); } out[m] = { called, err }; }
    return out; });
  check(early.startSchool.err === null && early.startSchool.called && early.startSchool.called.mode === 'school', `G: startSchool before create() restarts into school, no crash: ${JSON.stringify(early.startSchool)}`);
  check(early.startFlight.err === null && early.startFlight.called && early.startFlight.called.go === true, `G: startFlight before create() restarts, no crash: ${JSON.stringify(early.startFlight)}`);
  await p.context().close();

  }

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS season2-smoke');
})();
