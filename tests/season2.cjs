// SEASON 2 PREVIEW switch (src/season2.js, the redesign): with the switch OFF the game is the live game
// (FEATURES.season2 false, no tag, the real save read and written as today); ?season2=1 plays a separate
// player under 's2:' keys, offline; it survives a reload; ?season2=reset wipes only it; ?season2=off is back.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/season2.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '..');
  // 0.12.0: season 2 is the shipped game. index.html turns it on unless a test (tests/lib/classic.js) said `false` first.
  check(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('window.SEASON2_FORCE !== false) window.SEASON2_FORCE = true'), 'index.html must set window.SEASON2_FORCE = true by default');
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const online = []; p.on('request', r => { if (/supabase\.co/.test(r.url())) online.push(r.url()); });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const REAL = { tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], seeds: 777, crystals: 42, flights: 50, landings: 12, priceVersion: 2,
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  await p.goto(URL); await ready(p);
  await p.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, REAL]);
  const state = () => p.evaluate(async () => { const s = game.registry.get('save'); const { FEATURES } = await import('/src/config.js');
    return { seeds: s.seeds, flights: s.flights, on: FEATURES.season2, tag: !!document.getElementById('s2Tag'), s2: !!window.SEASON2 }; });

  // 0. OFF (the live game): no switch, the real save.
  await p.goto(URL); await ready(p);
  let g = await state();
  check(!g.on && !g.tag && !g.s2 && g.seeds === 777 && g.flights === 50, `switch off = the live game: ${JSON.stringify(g)}`);
  // 1. On: a brand-new player, the tag shows.
  await p.goto(URL + '?season2=1'); await ready(p);
  g = await state();
  check(g.on && g.tag && g.seeds === 0 && g.flights === 0, `?season2=1: a new season 2 player: ${JSON.stringify(g)}`);
  await p.evaluate(async () => { const s = game.registry.get('save'); s.seeds = 5; (await import('/src/save.js')).writeSave(s); });
  // 2. A reload stays in season 2 with its own progress; its keys carry the 's2:' prefix in the real storage.
  await p.goto(URL); await ready(p);
  g = await state();
  check(g.on && g.seeds === 5, `a reload stays in season 2: ${JSON.stringify(g)}`);
  // The real storage, seen from a blank same-origin frame (src/season2.js does not run there).
  const raw = await p.evaluate(k => { const f = document.createElement('iframe'); document.body.appendChild(f); const v = f.contentWindow.localStorage.getItem('s2:' + k); f.remove(); return v; }, KEY);
  check(raw && JSON.parse(raw).seeds === 5, `the season 2 save lives under s2: (${raw && raw.slice(0, 40)})`);
  await p.evaluate(async () => { const o = await import('/src/online.js'); try { (o.sendFlight || (() => {}))({ landed: true, distance_m: 1000 }); } catch (e) {} });
  await p.waitForTimeout(1000);
  check(online.length === 0, `season 2 never reaches the online server: ${online.slice(0, 3)}`);
  // 2b. M1: flying is confined to the unlocked area (Western Europe by default); the FLY screen lists the locked areas.
  const conf = await p.evaluate(async () => { const r = await import('/src/route.js'), a = await import('/src/areas.js');
    const s = game.registry.get('save'); s.tutorialDone = true; s.city = 'AMSTERDAM';
    const path = r.flightPath(s, 40); game.registry.get('ui').renderJourney && game.registry.get('ui').renderJourney();
    return { out: path.filter(c => !a.AREAS.weurope.cities.includes(c)), line: (document.getElementById('jAreas') || {}).textContent || '' }; });
  check(conf.out.length === 0, `season 2 flight leaves Western Europe: ${conf.out.slice(0, 3)}`);
  check(/Western Europe/.test(conf.line) && /Locked/.test(conf.line), `the FLY screen lists your area and the locked ones: '${conf.line}'`);
  // 2c. M2: a new season 2 player chooses a start area, then a city; flying is then confined to that area.
  await p.goto(URL + '?season2=reset'); await ready(p);
  await p.evaluate(() => { game.registry.get('ui').start(); });   // (not awaited: it waits for the player's choice)
  const shown = await p.waitForSelector('#startChoice [data-area="africa"]', { timeout: 5000 }).then(() => true).catch(() => false);
  check(shown, 'season 2: a new player is asked where to start');
  const starters = await p.$$eval('#startChoice [data-area]', bs => bs.map(b => b.dataset.area));
  check(starters.length === 9 && ['aotearoa', 'oceania', 'patagonia'].every(a => starters.includes(a)), `nine starter areas offered, Aotearoa New Zealand, Australia and Patagonia among them (the user, 2026-10-28): ${starters}`);
  if (shown) { await p.click('#startChoice [data-area="africa"]'); await p.click('#startChoice [data-city="LAGOS"]'); }
  await p.waitForTimeout(300);
  const st = await p.evaluate(async () => { const s = game.registry.get('save'), r = await import('/src/route.js'), a = await import('/src/areas.js');
    const path = r.flightPath({ ...s, tutorialDone: true }, 40);
    return { areas: s.areas, city: s.city, gone: !document.getElementById('startChoice'), out: path.filter(c => !a.AREAS.africa.cities.includes(c)) }; });
  check(JSON.stringify(st.areas) === '["africa"]' && st.city === 'LAGOS' && st.gone && st.out.length === 0, `start in Lagos, Africa, and stay there: ${JSON.stringify(st)}`);
  // 2d. M3: the crossing. Without the gates met it only says what it needs; with ?s2unlock=1 (preview debug) it can be
  // flown: one leg of 7,000 km to Stockholm with a progress bar; landing it opens the Nordic area.
  await p.evaluate(async () => { const s = game.registry.get('save'); Object.assign(s, { areas: ['weurope'], homeArea: 'weurope', city: 'WARSAW', tutorialDone: true, seenTips: ['*'], tours: ['*'] });
    (await import('/src/save.js')).writeSave(s); });
  await p.goto(URL); await ready(p);
  await p.evaluate(() => game.registry.get('ui').showTitle());
  const card = await p.evaluate(() => (document.getElementById('jCross') || {}).innerHTML || '');
  check(/WARSAW &gt; STOCKHOLM/.test(card) && /Needs:/.test(card) && !/data-cross/.test(card), `the crossing shows what it needs: ${card.slice(0, 160)}`);
  await p.goto(URL + '?s2unlock=1'); await ready(p);
  await p.evaluate(() => game.registry.get('ui').showTitle());
  // S2 hub: the crossings sit behind the route line (tap it), and a ready crossing is also the NEXT card.
  if (await p.evaluate(() => document.getElementById('title').classList.contains('hub') && !document.getElementById('title').classList.contains('world'))) await p.click('#hubRoute');
  const btn = await p.$('#jCross [data-cross="warsaw-stockholm"]');
  check(!!btn, 'with ?s2unlock=1 the crossing can be flown');
  if (btn) {
    await btn.click(); await started(p);
    const fl = await p.evaluate(() => { const g = game.scene.getScene('game'); return { c: g.crossing && g.crossing.id, to: g.nextAirport.name, at: Math.round(g.nextAirport.worldX - g.distancePx), dist: g.distText.text }; });
    check(fl.c === 'warsaw-stockholm' && fl.to === 'STOCKHOLM' && fl.at >= 6400 && /TO STOCKHOLM/.test(fl.dist), `flying the crossing: ${JSON.stringify(fl)}`);
    await p.evaluate(() => { const g = game.scene.getScene('game'); g.landedAt = 'STOCKHOLM'; g.distancePx = 7000; g.finish({ landed: true }); });
    await p.waitForTimeout(500);
    const after = await p.evaluate(() => { const s = game.registry.get('save'); return { areas: s.areas, city: s.city, fly: s.flyCrossing || null, crossed: s.crossed }; });
    check(after.areas.includes('nordic') && !after.fly && (after.crossed || []).includes('warsaw-stockholm'), `landing the crossing opens the Nordic area: ${JSON.stringify(after)}`);
  }
  // 2e. 0.12.0: the offer gate in the shipped game. Best landed flight from the area >= 70% of 6,500 km (4,550) AND
  // biodiversity 30 in the start city's land; a real landed flight records the area's best; MORE TO COME when all is flown.
  const seed2e = (best, stars = ['weurope:night', 'weurope:shade10', 'weurope:kinds3']) => p.evaluate(async ([best, stars]) => { const s = game.registry.get('save'); const planted = {};
    for (const id of ['spruce', 'birch', 'oak', 'beech', 'pine', 'ash', 'rowan', 'hazel', 'willow', 'alder']) planted[id] = 40;
    Object.assign(s, { areas: ['weurope'], homeArea: 'weurope', city: 'WARSAW', crossed: [], planted, areaBest: best, flyCrossing: null, missionsDone: stars, freeUpgrade: false, freeGiven: true });   // (0.15.2: a free part still waiting locks TAKE OFF until it is picked; this player has picked it)   // S3: the 3 starred missions are a condition too
    (await import('/src/save.js')).writeSave(s); }, [best, stars]);
  const cardNow = async (best, stars) => { await seed2e(best, stars); await p.goto(URL); await ready(p); await p.evaluate(() => game.registry.get('ui').showTitle());
    return p.evaluate(() => (document.getElementById('jCross') || {}).innerHTML || ''); };
  let c2 = await cardNow({ weurope: 4549 });
  check(/Needs:/.test(c2) && !/data-cross="warsaw-stockholm"/.test(c2), `4,549 km is not enough to be offered the 6,500 km crossing: ${c2.slice(0, 200)}`);
  c2 = await cardNow({ nordic: 9999 });
  check(!/data-cross="warsaw-stockholm"/.test(c2), 'a long flight from another area does not count');
  c2 = await cardNow({ weurope: 4550 }, ['weurope:shade10']);
  check(!/data-cross="warsaw-stockholm"/.test(c2) && /starred missions/.test(c2), `1 of the 3 starred missions is not enough (any 2 of 3), the card says so: ${c2.slice(0, 200)}`);
  c2 = await cardNow({ weurope: 4550 });
  check(/data-cross="warsaw-stockholm"/.test(c2), `4,550 km (70%) + biodiversity 30 + the 3 starred: the crossing is offered: ${c2.slice(0, 200)}`);
  await seed2e({}); await p.goto(URL); await ready(p);
  await p.evaluate(() => game.registry.get('ui').showTitle()); await p.click('#goBtn'); await started(p);
  await p.evaluate(() => { const g = game.scene.getScene('game'); g.landedAt = 'BERLIN'; g.distancePx = 3000; g.finish({ landed: true }); });
  await p.waitForTimeout(500);
  const rec = await p.evaluate(() => game.registry.get('save').areaBest);
  check(rec && rec.weurope >= 2900 && rec.weurope <= 3100, `a landed flight from Warsaw records the best for Western Europe: ${JSON.stringify(rec)}`);
  await p.evaluate(async () => { const s = game.registry.get('save'), a = await import('/src/areas.js'); s.areas = Object.keys(a.AREAS); s.flightSeconds = 1e6; (await import('/src/save.js')).writeSave(s); });
  await p.goto(URL); await ready(p); await p.evaluate(() => game.registry.get('ui').showTitle());
  check(await p.evaluate(() => !!document.getElementById('jMore')), 'every area open: the MORE TO COME card shows');
  // 3. Reset: from zero again.
  await p.goto(URL + '?season2=reset'); await ready(p);
  g = await state();
  check(g.on && g.seeds === 0, `?season2=reset: from zero: ${JSON.stringify(g)}`);
  // 4. Off: the real game, untouched.
  await p.goto(URL + '?season2=off'); await ready(p);
  g = await state();
  check(!g.on && !g.tag && g.seeds === 777 && g.flights === 50, `?season2=off: the real game is back: ${JSON.stringify(g)}`);
  const live = await p.evaluate(async () => ({ n: Object.keys((await import('/src/network.js')).LINKS).length, line: !!document.getElementById('jAreas') }));
  check(live.n === 104 && !live.line, `switch off: the whole world network, no area line: ${JSON.stringify(live)}`);
  // 5. The shipped game: window.SEASON2_FORCE (index.html sets it) = always on, ?season2=off ignored, no exit
  // link, and the mode flag is NEVER written to the real storage (it is per origin: it would leak into the live game).
  const fctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await fctx.addInitScript(() => { window.SEASON2_FORCE = undefined; });   // as shipped: undefined -> index.html turns it on (after tests/lib/classic.js said false)
  await fctx.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const fp = await fctx.newPage(); fp.on('pageerror', e => errs.push(String(e)));
  const fstate = () => fp.evaluate(async () => { const f = document.createElement('iframe'); document.body.appendChild(f); const flag = f.contentWindow.localStorage.getItem('contrailPilot.season2Mode'); f.remove();
    const t = document.getElementById('s2Tag'); return { on: (await import('/src/config.js')).FEATURES.season2, flag, exit: !!(t && /exit/.test(t.textContent)), tag: !!t }; });
  for (const q of ['', '?season2=off', '?season2=reset', '?season2=1']) {
    await fp.goto(URL + q); await ready(fp);
    const f = await fstate();
    check(f.on && !f.tag && !f.exit && f.flag === null, `shipped default${q}: on, no SEASON 2 tag (so no reset or exit link), flag never written: ${JSON.stringify(f)}`);
  }
  await fctx.close();
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
