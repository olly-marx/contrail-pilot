// The loading screen's promise (src/loader.js, src/preload.js; user decision 2026-11-02): once the game is ready, NOTHING under assets/ is fetched because the player tapped.
//   1. The loading screen is gone after ready() and never covers #goBtn (the new player's START is #goBtn too): pointer-events none / removed, and the button is what a tap would hit.
//   2. After ready: HANGAR, NATURE (every open land), MISSIONS, BOARDS and back, then TAKE OFF: every request for a file under assets/ must be the loader's (X-Preload header) or served from the cache
//      (the idle fetch of tier 2; its fetch() carries an X-Preload header); a request from any other script, or from the page's own <img>/CSS, fails with its URL.
//   3. The WHOLE flight (a new player's is flight school), until it lands or crashes: the scene declares it (loading.flying) and the loader starts no fetch while it is on;
//      timeline kept in the page (every loader fetch, and a 50 ms sample of the flag / scene state / school / bottom bar). Tier-2 work is still queued, so a loader that ignored the flight would fetch.
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
    // A timeline kept IN the page: every fetch the loader makes, and every 50 ms what says 'a flight is on': the flag the scene declares (loading.flying), the scene state,
    // flight school, and the bottom bar hidden. Whole flight, not a window: a loader fetch that starts while two or more of these samples in a row say flying is a failure.
    await p.addInitScript(() => {
      window.__tl = [];
      const f = window.fetch.bind(window);
      window.fetch = (u, o) => { if (o && o.headers && o.headers['X-Preload']) window.__tl.push({ k: 'req', t: performance.now(), u: String(u) }); return f(u, o); };
      setInterval(() => {
        const L = window.cpLoading, g = window.game && game.scene && game.scene.getScene('game'), tb = document.getElementById('tabbar');
        if (!L || !L.finished) return;
        window.__tl.push({ k: 's', t: performance.now(), flag: !!L.flying, state: g && g.state, school: !!(g && g.school), noBar: !!(tb && tb.hidden), q: (L.queue || []).length });
      }, 50);
    });
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
    await p.evaluate(() => { window.__tl.length = 0; });
    await p.click('#goBtn', { timeout: 5000 }).catch(e => check(false, `${label}: TAKE OFF could not be tapped (${e.message.split('\n')[0].slice(0, 90)})`));
    // Drive the whole flight (a new player's is flight school) until it lands or crashes: hold the screen for take-off, tap to stay in the gaps, press every coach OK.
    let held = false, flew = false; const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      const st = await p.evaluate(() => { const g = game.scene.getScene('game'); const next = g.storms && g.storms.find(x => x.rects[0].x + 44 > g.plane.x);
        const target = next ? next.rects[0].height + (next.rects[1].y - next.rects[0].height) / 2 - 2 : 200;
        const ok = document.getElementById('coachOk'); const okVis = !!(ok && ok.offsetParent);
        return { state: g.state, tap: g.state === 'playing' && g.plane.y > target && g.plane.vy > -50, okVis, over: g.state === 'over' || !!g.result }; });
      if (st.state === 'playing') { flew = true; phase = 'air'; }
      if (st.over && flew) break;
      if (st.okVis) await p.click('#coachOk', { timeout: 1000 }).catch(() => {});
      if (st.state === 'takeoff' && !held) { await p.mouse.move(187, 400); await p.mouse.down(); held = true; }
      else if (held && st.state === 'playing') { await p.mouse.up(); held = false; }
      if (st.tap) await p.mouse.click(187, 400);
      await p.waitForTimeout(120);
    }
    if (held) await p.mouse.up();
    const tl = await p.evaluate(() => window.__tl), samples = tl.filter(x => x.k === 's'), loads = tl.filter(x => x.k === 'req');
    const isFlying = x => x.flag || x.school || x.noBar || ['takeoff', 'playing', 'landing'].includes(x.state);
    check(flew, `${label}: the plane took off (state playing) within the drive`);
    check(samples.some(x => x.flag), `${label}: the scene DECLARED the flight (loading.flying was on at some point)`);
    check(samples.some(x => x.flag && x.q > 0), `${label}: ... while tier-2 work was still queued (the test could fail)`);
    const clash = loads.filter(r => { const before = samples.filter(x => x.t <= r.t).pop(), after = samples.find(x => x.t >= r.t); return before && after && isFlying(before) && isFlying(after); });
    check(!clash.length, `${label}: the loader fetched ${clash.length} file(s) while a flight was on (of ${loads.length} fetches in all): ${clash.slice(0, 4).map(r => r.u.replace(/^.*\/assets\//, '')).join(', ')}`);
    const bad = reqs.filter(r => r.phase !== 'load' && !r.fromLoader && !r.cached);
    check(!bad.length, `${label}: ${bad.length} file(s) under assets/ fetched after ready (a tap, take-off or flight), not by the loader: ${bad.slice(0, 6).map(r => `${r.path} [${r.phase} via ${r.initiator}]`).join(', ')}`);
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
