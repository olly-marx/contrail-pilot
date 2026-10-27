// SEASON 2 SMOKE SUITE (0.12.0 coverage; the shipped game IS season 2, but most of the suite runs classic through
// tests/lib/classic.js). This test does NOT require classic.js: every page is the game as shipped (SEASON2_FORCE unset).
//   A  fresh start: season 2 tag, no save, the start choice offers the six starter areas
//   B  one flight start per starter area: the start choice, then flight school flies from YOUR city over YOUR area
//      (not London > Paris), the first hop is the next airport, the plane takes off, no page errors
//   C  the tabs: HANGAR, NATURE, PILOT, BOARDS and back to FLY open with content and without errors
//   D  the offer card with the gate met through a seeded save (areaBest + planted trees): 4,549 km not offered, another
//      area's flight does not count, 4,550 km + biodiversity 30 offered; a crossing flight starts (Stockholm 6,500 km on)
//   E  every area open and the last era: the MORE TO COME card
//   F  nothing to fly yet in an early era: the card says when the next crossing opens, not silence
//   (C also: PILOT and BOARDS say they are resting in season 2, no name form; Pilot LAPS text does not say London)
// Planted defects, each must FAIL the check named (revert with git checkout after):
//   B  sed -i 's/(SEASON2_ON ? save : { city: HOME })/({ city: HOME })/' src/route.js        -> "B <area>: flight school starts in ..."
//   C  sed -i "s/if (tab === 'nature')/if (tab === 'natur')/" src/ui.js                    -> "C: NATURE opens"
//   D  sed -i 's/distanceShare: 0.7/distanceShare: 0/; s/biodiversity: 30, /biodiversity: 0, /' src/season.js -> "D: 4,549 km ..."
//   D  sed -i 's/maxEra: 2/maxEra: 9/' src/season.js ... (offer-gate.cjs covers it); crossing start: break crossingPath in src/crossings.js
//   F  sed -i 's/if (best === null || c.era < best)/if (false)/' src/crossings.js  -> "F: nothing to fly yet"
//   C  sed -i 's/const off = onlineOff();/const off = false;/' src/pilot.js -> "C: PILOT says"
//   E  sed -i 's/export const moreToCome = save => /export const moreToCome = save => false \&\& /' src/crossings.js -> "E: ..."
// Run: python3 -m http.server 8000 & node tests/season2-smoke.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const STARTERS = ['weurope', 'namerica', 'sasia', 'africa', 'samerica', 'easia'];

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
  let p = await fresh();
  const a = await p.evaluate(async () => ({ on: (await import('/src/config.js')).FEATURES.season2, tag: !!document.getElementById('s2Tag'), areas: (game.registry.get('save').areas || []).length, tut: game.registry.get('save').tutorialDone }));
  check(a.on && a.tag && a.areas === 0 && !a.tut, `A: a fresh device plays season 2, no area chosen yet: ${JSON.stringify(a)}`);
  await p.evaluate(() => { game.registry.get('ui').start(); });
  await p.waitForSelector('#startChoice [data-area]', { timeout: 5000 }).catch(() => {});
  const offered = await p.$$eval('#startChoice [data-area]', bs => bs.map(x => x.dataset.area));
  check(JSON.stringify(offered.sort()) === JSON.stringify([...STARTERS].sort()), `A: the six starter areas are offered: ${offered}`);
  await p.context().close();

  // B. one flight start per starter area
  for (const k of STARTERS) {
    p = await fresh();
    await p.evaluate(() => { game.registry.get('ui').start(); });
    await p.waitForSelector(`#startChoice [data-area="${k}"]`, { timeout: 5000 }).catch(() => {});
    await p.click(`#startChoice [data-area="${k}"]`, { timeout: 5000 }).catch(() => {});
    const home = await p.$eval('#startChoice [data-city]', e => e.dataset.city).catch(() => null);   // the area's own default city, listed first
    await p.click('#startChoice [data-city]', { timeout: 5000 }).catch(() => {});
    await p.waitForSelector('#howClose', { state: 'visible', timeout: 5000 }).catch(() => {});
    await p.click('#howClose', { timeout: 5000 }).catch(() => {});
    await started(p);
    const f = await p.evaluate(async k => { const g = game.scene.getScene('game'), A = (await import('/src/areas.js')).AREAS[k];
      const path = (g.path || []).slice(0, 6);
      return { school: !!g.school, path, next: g.nextAirport && g.nextAirport.name, state: g.state, start: A.start, inArea: path.length > 1 && path.every(n => A.cities.includes(n)), areas: game.registry.get('save').areas }; }, k);
    check(home && home === f.start && f.path[0] === f.start, `B ${k}: flight school starts in ${f.start}, not London: ${JSON.stringify(f)}`);
    check(f.school && f.inArea && f.next === f.path[1] && JSON.stringify(f.areas) === JSON.stringify([k]), `B ${k}: school flies over its own area to the next airport: ${JSON.stringify(f)}`);
    await p.waitForTimeout(1200);
    const after = await p.evaluate(() => { const g = game.scene.getScene('game'); return { state: g.state, x: g.plane && g.plane.y }; });
    check(['takeoff', 'playing'].includes(after.state), `B ${k}: the plane is flying after a moment: ${JSON.stringify(after)}`);
    await p.context().close();
  }

  // C. the tabs, for a player with a plane and an area
  p = await fresh();
  await seed(p, { areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM' });
  for (const [tab, id] of [['hangar', 'hangar'], ['nature', 'nature'], ['pilot', 'pilot'], ['boards', 'boards'], ['fly', 'title']]) {
    await p.evaluate(t => { game.registry.get('ui').go(t); }, tab);
    await p.waitForTimeout(250);
    const t = await p.evaluate(id => { const e = document.getElementById(id); return { shown: !!e && !e.hidden, len: e ? e.innerText.length : 0 }; }, id);
    check(t.shown && t.len > 20, `C: ${tab.toUpperCase()} opens with content: ${JSON.stringify(t)}`);
  }
  check(await p.evaluate(() => !!document.getElementById('jAreas')), 'C: the FLY screen shows "Your area"');
  // season 2 is offline by design: PILOT and BOARDS say so, they do not offer a name form that can only fail
  await p.evaluate(() => game.registry.get('ui').go('pilot')); await p.waitForTimeout(250);
  const pil = await p.evaluate(() => { const v = id => { const e = document.getElementById(id); return !!e && !e.hidden; }; return { note: v('pOffNote'), edit: v('pEdit'), have: v('pHave'), code: v('pCodeBox'), stats: document.getElementById('pStats').innerText.length > 10 }; });
  check(pil.note && !pil.edit && !pil.have && !pil.code && pil.stats, `C: PILOT says the pilot names are resting (no name form, no login) and still shows your stats: ${JSON.stringify(pil)}`);
  await p.evaluate(() => game.registry.get('ui').go('boards')); await p.waitForTimeout(400);
  const bm = await p.evaluate(() => document.getElementById('bMsg').textContent);
  check(/resting while season 2/.test(bm) && !/No internet/.test(bm), `C: BOARDS says the leaderboards are resting, not 'No internet right now': ${bm}`);
  check(await p.evaluate(async () => !/back to LONDON/i.test(await (await fetch('/src/pilot.js')).text())), 'C: the Pilot LAPS text does not say "back to LONDON" (season 2 starts anywhere)');
  await p.context().close();

  // D. the offer card and a crossing flight
  p = await fresh();
  const PLANTED = {}; for (const id of ['spruce', 'birch', 'oak', 'beech', 'pine', 'ash', 'rowan', 'hazel', 'willow', 'alder']) PLANTED[id] = 40;
  const card = async areaBest => { await seed(p, { areas: ['weurope'], homeArea: 'weurope', city: 'WARSAW', planted: PLANTED, areaBest });
    await p.evaluate(() => game.registry.get('ui').showTitle()); return p.evaluate(() => (document.getElementById('jCross') || {}).innerHTML || ''); };
  let c = await card({ weurope: 4549 });
  check(/WARSAW &gt; STOCKHOLM/.test(c) && /Needs:/.test(c) && !/data-cross/.test(c), `D: 4,549 km (just under 70%) is not offered, the card says what it needs: ${c.slice(0, 200)}`);
  c = await card({ nordic: 9999 });
  check(!/data-cross/.test(c), 'D: a long flight from another area does not count');
  c = await card({ weurope: 4550 });
  check(/data-cross="warsaw-stockholm"/.test(c), `D: 4,550 km + biodiversity 30: the crossing is offered: ${c.slice(0, 200)}`);
  const noTrees = await (async () => { await seed(p, { areas: ['weurope'], homeArea: 'weurope', city: 'WARSAW', areaBest: { weurope: 9999 } });
    await p.evaluate(() => game.registry.get('ui').showTitle()); return p.evaluate(() => (document.getElementById('jCross') || {}).innerHTML || ''); })();
  check(!/data-cross/.test(noTrees) && /biodiversity/.test(noTrees), `D: a long flight but no biodiversity is not offered: ${noTrees.slice(0, 200)}`);
  await card({ weurope: 4550 });
  await p.evaluate(() => game.registry.get('ui').showTitle());
  const btn = await p.$('#jCross [data-cross="warsaw-stockholm"]');
  check(!!btn, 'D: the FLY THE CROSSING button is there');
  if (btn) {
    await btn.click(); await started(p);
    const fl = await p.evaluate(() => { const g = game.scene.getScene('game'); return { c: g.crossing && g.crossing.id, to: g.nextAirport.name, at: Math.round(g.nextAirport.worldX - g.distancePx), dist: g.distText.text, path: g.path.slice(0, 3) }; });
    check(fl.c === 'warsaw-stockholm' && fl.to === 'STOCKHOLM' && fl.at >= 6400 && fl.at <= 6500 && /TO STOCKHOLM/.test(fl.dist), `D: the crossing flight starts: Warsaw to Stockholm, 6,500 km away: ${JSON.stringify(fl)}`);
  }
  await p.context().close();

  // E. the end of this release
  p = await fresh();
  await seed(p, { areas: ['weurope', 'namerica', 'sasia', 'africa', 'samerica', 'easia', 'mideast', 'nordic', 'oceania'], homeArea: 'weurope', city: 'AMSTERDAM' });
  await p.evaluate(() => game.registry.get('ui').showTitle());
  const more = await p.evaluate(() => ({ card: !!document.getElementById('jMore'), cross: !!document.querySelector('#jCross [data-cross]') }));
  check(more.card && !more.cross, `E: every area open, the last era: the MORE TO COME card, no crossing: ${JSON.stringify(more)}`);
  await p.context().close();

  // F. an empty FLY screen is not silent: the next crossing opens in a later era
  p = await fresh();
  await seed(p, { areas: ['weurope', 'nordic'], homeArea: 'weurope', city: 'STOCKHOLM', flightSeconds: 0 });
  await p.evaluate(() => game.registry.get('ui').showTitle());
  const later = await p.evaluate(() => ({ later: (document.getElementById('jLater') || {}).innerText || '', cross: !!document.querySelector('#jCross [data-cross]'), more: !!document.getElementById('jMore') }));
  check(/NEXT CROSSING/.test(later.later) && /1970s/.test(later.later) && !later.cross && !later.more, `F: nothing to fly yet: the card says the next crossing opens in the 1970s: ${JSON.stringify(later)}`);
  await p.context().close();

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS season2-smoke');
})();
