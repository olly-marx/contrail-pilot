// The loading screen's promise (src/loader.js, src/preload.js; user decision 2026-11-02): once the game is ready, NOTHING under assets/ is fetched because the player tapped.
//   1. The loading screen is gone after ready() and never covers #goBtn (or #schoolBtn for a new player): pointer-events none / removed, and the button is what a tap would hit.
//   2. After ready: HANGAR, NATURE (every open land), MISSIONS, BOARDS and back, then TAKE OFF: every request for a file under assets/ must come from src/loader.js
//      (the idle fetch of tier 2); a request from any other script, or from the page's own <img>/CSS, fails with its URL.
//   3. Flying: the loader fetches nothing while the plane flies (the pump yields to the flight).
// PLANTS: tools/plants.tsv, test `preloadgate` (each must FAIL this test). Run: python3 -m http.server 8000 & node tests/preloadgate.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const run = async (save, label) => {
    const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(s)); }, save);
    const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable');
    const reqs = []; let phase = 'load';
    cdp.on('Network.requestWillBeSent', e => {
      const u = new globalThis.URL(e.request.url); if (!/\/assets\//.test(u.pathname)) return;
      const frames = []; let st = e.initiator && e.initiator.stack; while (st) { frames.push(...(st.callFrames || []).map(f => f.url)); st = st.parent; }
      reqs.push({ phase, path: u.pathname.replace(/^.*\/assets\//, 'assets/'), fromLoader: frames.some(f => /\/src\/loader\.js/.test(f)), initiator: (frames[0] || e.initiator.type || '?').replace(/^.*\/(src\/)?/, '') });
    });
    await p.goto(URL); await ready(p);
    const gone = await p.evaluate(() => { const l = document.getElementById('loader'); return { removed: !l, pe: l ? getComputedStyle(l).pointerEvents : null, loaded: document.body.dataset.loaded };
    });
    check(gone.loaded === '1' && (gone.removed || gone.pe === 'none'), `${label}: the loading screen is gone or pointer-events none after ready: ${JSON.stringify(gone)}`);
    const btn = save.tutorialDone === false ? '#schoolBtn' : '#goBtn';
    const hit = await p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return 'missing'; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return t && (t === e || e.contains(t)) ? 'ok' : `covered by ${t && (t.id || t.className)}`; }, btn);
    check(hit === 'ok', `${label}: ${btn} is what a tap would hit after ready (${hit})`);
    phase = 'menus';
    for (const id of ['hangar', 'nature', 'missions', 'boards', 'fly']) { await p.evaluate(id => game.registry.get('ui').go(id), id).catch(() => {}); await p.waitForTimeout(1200); }
    await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(600);
    const n = await p.evaluate(() => document.querySelectorAll('#wRegions [data-region]:not([disabled])').length);
    for (let i = 0; i < n; i++) { await p.evaluate(i => document.querySelectorAll('#wRegions [data-region]:not([disabled])')[i].click(), i); await p.waitForTimeout(500); }
    await p.evaluate(() => { const r = document.querySelector('#hFleet .rowc, .rowc'); if (r) r.click(); }); await p.waitForTimeout(500);
    await p.evaluate(() => game.registry.get('ui').go('fly')); await p.waitForTimeout(800);
    phase = 'flight';
    if (save.tutorialDone !== false) { await p.click('#goBtn'); await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(2500); }
    const bad = reqs.filter(r => r.phase !== 'load' && !r.fromLoader);
    check(!bad.length, `${label}: ${bad.length} file(s) under assets/ fetched after ready, not by the loader: ${bad.slice(0, 6).map(r => `${r.path} [${r.phase} via ${r.initiator}]`).join(', ')}`);
    const inFlight = reqs.filter(r => r.phase === 'flight');
    check(!inFlight.length, `${label}: ${inFlight.length} file(s) fetched while taking off / flying: ${inFlight.slice(0, 5).map(r => r.path).join(', ')}`);
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
