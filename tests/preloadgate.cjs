// The loading screen's promise (src/loader.js, src/preload.js; user decision 2026-11-02): once the game is ready, NOTHING under assets/ is fetched because the player tapped.
//   1. The loading screen is gone after ready() and never covers #goBtn (the new player's START is #goBtn too): pointer-events none / removed, and the button is what a tap would hit.
//   2. After ready: HANGAR, NATURE (every open land), MISSIONS, BOARDS and back, then TAKE OFF: every request for a file under assets/ must be the loader's (X-Preload header) or served from the cache
//      (the idle fetch of tier 2; its fetch() carries an X-Preload header); a request from any other script, or from the page's own <img>/CSS, fails with its URL.
//   3. Flying: nothing at all is fetched once the plane is airborne (the loader's idle fetch yields to the flight).
// PLANTS: tools/plants.tsv, test `preloadgate` (each must FAIL this test). Run: python3 -m http.server 8000 & node tests/preloadgate.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  // (the online sync is refused by name resolution, NOT page.route: Playwright switches the HTTP cache off for a routed page, and this test is about the cache)
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--host-resolver-rules=MAP mkucbsjzbipjaiqzrlkj.supabase.co 127.0.0.1:1'] });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const run = async (save, label) => {
    const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(s)); }, save);
    const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable');
    const reqs = [], byId = new Map(); let phase = 'load';
    // A request counts only if it really went to the network: a picture the loader already fetched is served from the browser's cache (fromDiskCache / memory).
    cdp.on('Network.requestServedFromCache', e => { const r = byId.get(e.requestId); if (r) r.cached = true; });
    cdp.on('Network.responseReceived', e => { const r = byId.get(e.requestId); if (r && (e.response.fromDiskCache || e.response.fromMemoryCache)) r.cached = true; });
    cdp.on('Network.requestWillBeSent', e => {
      const u = new globalThis.URL(e.request.url); if (!/\/assets\//.test(u.pathname)) return;
      const frames = []; let st = e.initiator && e.initiator.stack; while (st) { frames.push(...(st.callFrames || []).map(f => f.url)); st = st.parent; }
      const rec = { phase, path: u.pathname.replace(/^.*\/assets\//, 'assets/'), fromLoader: !!(e.request.headers && (e.request.headers['X-Preload'] || e.request.headers['x-preload'])), initiator: (frames[0] || e.initiator.type || '?').replace(/^.*\/(src\/)?/, '') };
      reqs.push(rec); byId.set(e.requestId, rec);
    });
    await p.goto(URL); await ready(p);
    const gone = await p.evaluate(() => { const l = document.getElementById('loader'); return { removed: !l, pe: l ? getComputedStyle(l).pointerEvents : null, loaded: document.body.dataset.loaded };
    });
    check(gone.loaded === '1' && (gone.removed || gone.pe === 'none'), `${label}: the loading screen is gone or pointer-events none after ready: ${JSON.stringify(gone)}`);
    const btn = '#goBtn';   // (a new player's first screen shows START in #goBtn too; #schoolBtn is the small text button, hidden then)
    const hit = await p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return 'missing'; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return t && (t === e || e.contains(t)) ? 'ok' : `covered by ${t && (t.id || t.className)}`; }, btn);
    check(hit === 'ok', `${label}: ${btn} is what a tap would hit after ready (${hit})`);
    phase = 'menus';
    for (const id of ['hangar', 'nature', 'missions', 'boards', 'fly']) { await p.evaluate(id => game.registry.get('ui').go(id), id).catch(() => {}); await p.waitForTimeout(1200); }
    await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(600);
    const n = await p.evaluate(() => document.querySelectorAll('#wRegions [data-region]:not([disabled])').length);
    for (let i = 0; i < n; i++) { await p.evaluate(i => document.querySelectorAll('#wRegions [data-region]:not([disabled])')[i].click(), i); await p.waitForTimeout(500); }
    await p.evaluate(() => { const r = document.querySelector('#hFleet .rowc, .rowc'); if (r) r.click(); }); await p.waitForTimeout(500);
    await p.evaluate(() => game.registry.get('ui').go('fly')); await p.waitForTimeout(800);
    phase = 'takeoff';
    await p.click('#goBtn', { timeout: 5000 }).catch(e => check(false, `${label}: TAKE OFF could not be tapped (${e.message.split('\n')[0].slice(0, 90)})`));
    await p.mouse.move(187, 400); await p.mouse.down();   // (hold the screen: the plane lifts off while the press is held)
    const flew = await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 }).then(() => true, () => false);
    await p.mouse.up();
    phase = 'air'; await p.waitForTimeout(2500);
    if (save.tutorialDone !== false) check(flew, `${label}: the plane took off (state playing)`);   // (a new player's START opens flight school, which waits for its own taps)
    const bad = reqs.filter(r => r.phase !== 'load' && !r.fromLoader && !r.cached);
    check(!bad.length, `${label}: ${bad.length} file(s) under assets/ fetched after ready (a tap, take-off or flight), not by the loader: ${bad.slice(0, 6).map(r => `${r.path} [${r.phase} via ${r.initiator}]`).join(', ')}`);
    const inAir = reqs.filter(r => r.phase === 'air' && !r.cached);
    check(!inAir.length, `${label}: ${inAir.length} file(s) fetched while flying (the loader must wait for the landing): ${inAir.slice(0, 5).map(r => r.path).join(', ')}`);
    check(menusSeen(n), `${label}: the NATURE screen had open lands to visit (${n})`);
    check(!p.errs.length, `${label}: page errors: ${p.errs.join(' | ').slice(0, 200)}`);
    await ctx.close();
  };
  const menusSeen = n => n >= 1;
  const base = { muted: true, seenTips: ['*'], tours: ['*'], flights: 30, landings: 9, seeds: 1250, flightSeconds: 2000, levels: { trees: 1 }, areas: ['weurope'], homeArea: 'weurope', city: 'LONDON',
    fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: { magnet: 2 } } };
  await run({ ...base, tutorialDone: true }, 'a returning pilot');
  await run({ muted: true, tutorialDone: false }, 'a new player');
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS preloadgate (the loading screen is gone and never covers TAKE OFF / flight school; no file under assets/ fetched on a tap or at take-off except by the idle loader)');
})();
