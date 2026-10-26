// SEASON 2 PREVIEW switch (src/season2.js, the redesign): with the switch OFF the game is the live game
// (FEATURES.season2 false, no tag, the real save read and written as today); ?season2=1 plays a separate
// player under 's2:' keys, offline; it survives a reload; ?season2=reset wipes only it; ?season2=off is back.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/season2.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
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
  // 3. Reset: from zero again.
  await p.goto(URL + '?season2=reset'); await ready(p);
  g = await state();
  check(g.on && g.seeds === 0, `?season2=reset: from zero: ${JSON.stringify(g)}`);
  // 4. Off: the real game, untouched.
  await p.goto(URL + '?season2=off'); await ready(p);
  g = await state();
  check(!g.on && !g.tag && g.seeds === 777 && g.flights === 50, `?season2=off: the real game is back: ${JSON.stringify(g)}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
