// 'Skip the mission route this trip' on HOME, with REAL taps (src/aim.js; the Coordinator + the sim chat, 2026-11-02), at the two gated phone sizes.
// A weurope pilot who has finished the lessons has a city mission open: HOME's route line says (mission) and a chip under it offers the skip
// (a 40 px target, on screen, TAKE OFF still above the bar). Tap it: the route is today's tour, the mission is still open, the chip becomes an undo.
// A CRASH keeps the choice (the retry flies the route chosen); a LANDING clears it and the route aims again.
// Run: python3 -m http.server 8000 & node tests/skiptrip.cjs   (plants in tools/plants.tsv)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const SIZES = [[390, 667], [320, 568]];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  const SAVE = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'],
    tours: ['*'], priceVersion: 2, landings: 5, flights: 6, seeds: 80, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet };
  for (const [W, H] of SIZES) {
    const tag = `${W}x${H}`;
    const p = await b.newPage({ viewport: { width: W, height: H } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('skiptrip-seeded')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('skiptrip-seeded', '1'); } }, SAVE);
    await p.goto(URL); await ready(p); await p.waitForTimeout(600);
    const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('s2:contrailPilot.v2')));
    const reload = async () => { await p.reload(); await ready(p); await p.waitForTimeout(800); };
    const view = () => p.evaluate(() => { const c = document.getElementById('hubSkip'), r = document.getElementById('hubRoute'), g = document.getElementById('goBtn'), bar = document.getElementById('tabbar');
      const box = e => { if (!e || e.hidden || e.offsetParent === null) return null; const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; };
      return { route: r.innerText.replace(/\s+/g, ' ').trim(), chip: c && !c.hidden ? c.textContent.trim() : null, chipBox: box(c), goBox: box(g), barTop: bar && !bar.hidden ? bar.getBoundingClientRect().top : innerHeight,
        chipFits: c ? c.scrollWidth <= c.clientWidth + 1 : null, vw: innerWidth, vh: innerHeight }; });
    const open = () => p.evaluate(async () => { const M = await import('./src/missions2.js'), s = JSON.parse(localStorage.getItem('s2:contrailPilot.v2')); return M.visible(s).map(m => m.key).join(); });
    const target = () => p.evaluate(async () => { const A = await import('./src/aim.js'), s = JSON.parse(localStorage.getItem('s2:contrailPilot.v2')); return { open: A.aimOpen(s), aim: A.aimTarget(s) }; });
    const fly = async () => { await p.click('#goBtn');
      for (let i = 0; i < 80 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
      return p.evaluate(async () => { const R = await import('./src/route.js'), s = game.scene.getScene('game'), sv = JSON.parse(localStorage.getItem('s2:contrailPilot.v2'));
        return { path: s.path.slice(0, 8), tour: R.flightPath(sv, 8) }; }); };
    const end = (landed, k = 0) => p.evaluate(([landed, k]) => { const s = game.scene.getScene('game'); s.landedAt = landed ? s.path[k + 1] : null; s.airportIndex = k; s.airportsSkipped = k; s.finish({ landed }); return s.result; }, [landed, k]);

    // 1. The aimed route: HOME names the mission city, the chip is offered and reachable.
    const t0 = await target(); let v = await view(); const before = await open();
    check(!!t0.open && t0.aim === t0.open, `${tag}: a city mission is open and the route aims at it: ${JSON.stringify(t0)}`);
    check(/\(mission\)/.test(v.route) && v.route.includes(t0.open), `${tag}: HOME's route line runs to the mission city and says (mission): "${v.route}"`);
    check(v.chip === 'Skip mission route this trip', `${tag}: the skip chip is offered: ${v.chip}`);
    check(v.chipBox && v.chipBox.h >= 40 && v.chipBox.w >= 40 && v.chipBox.x >= 0 && v.chipBox.x + v.chipBox.w <= v.vw && v.chipBox.y >= 0 && v.chipBox.y + v.chipBox.h <= v.barTop, `${tag}: the chip is a 40 px target fully on screen above the bar: ${JSON.stringify(v.chipBox)} bar ${v.barTop}`);
    check(v.goBox && v.goBox.y + v.goBox.h <= v.barTop, `${tag}: TAKE OFF is still on screen above the bar with the chip there: ${JSON.stringify(v.goBox)} bar ${v.barTop}`);
    check(v.chipFits === true, `${tag}: the chip text fits its box (no clipping)`);
    // 2. Tap it (a real tap): skipped, today's tour, the mission still open, the chip becomes the undo.
    await p.click('#hubSkip'); await p.waitForTimeout(300);
    let s = await save(); v = await view(); const t1 = await target();
    check(s.skipAim === true && t1.aim === null && t1.open === t0.open, `${tag}: skipped, saved, and the mission still names ${t0.open}: ${JSON.stringify({ skip: s.skipAim, ...t1 })}`);
    check(!/\(mission\)/.test(v.route), `${tag}: HOME's route line no longer says (mission): "${v.route}"`);
    check(v.chip === 'Mission route skipped: undo', `${tag}: the chip is the undo: ${v.chip}`);
    check(await open() === before, `${tag}: the mission list is unchanged (still open): ${await open()} vs ${before}`);
    let f = await fly();
    check(f.path.join() === f.tour.join(), `${tag}: the skipped flight flies today's tour: ${f.path} vs ${f.tour}`);
    // 3. A crash keeps the choice (the retry flies the route the player chose).
    await end(false); await p.waitForTimeout(800);
    check((await save()).skipAim === true, `${tag}: a crash keeps the skip: ${(await save()).skipAim}`);
    await reload(); v = await view();
    check(v.chip === 'Mission route skipped: undo' && !/\(mission\)/.test(v.route), `${tag}: after the crash HOME still shows the skip: ${v.chip} / "${v.route}"`);
    f = await fly();
    check(f.path.join() === f.tour.join(), `${tag}: the retry flies today's tour too: ${f.path}`);
    // 4. A landing clears it; the route aims again (or no city mission is left, and then there is no chip).
    await end(true, 0); await p.waitForTimeout(800); await reload();
    s = await save(); v = await view(); const t2 = await target();
    check(s.skipAim === false, `${tag}: a landing clears the skip: ${s.skipAim}`);
    check(t2.aim === t2.open && (t2.open ? v.chip === 'Skip mission route this trip' : v.chip === null), `${tag}: after landing the route aims again and the chip offers the skip: ${JSON.stringify(t2)} chip ${v.chip}`);
    check(!errs.length, `${tag}: no page errors: ${errs.slice(0, 2)}`);
    await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL skiptrip:\n - ${fails.join('\n - ')}` : 'PASS skiptrip: at 390x667 and 320x568 the skip chip is a real tap target, a crash keeps the skip, a landing clears it');
  process.exit(fails.length ? 1 : 0);
})();
