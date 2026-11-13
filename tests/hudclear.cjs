// THE HUD TEXT STAYS READABLE (src/hudclear.js; the user's backlog, 2026-11-11: the 'Airport ahead!' toast covered the target banner and the next-airport line on a tall phone, and the
// first-time coach strip covered them on a small one). REAL flights, nothing forced: a tap bot flies (as tests/flight.cjs does) from LONDON to PARIS and lands; every ~60 ms the boxes of
// the toast (#toast), the coach strip (#coach) and the two Phaser HUD lines (the banner s.missionText, the next-airport line s.nextText) are read in page pixels.
// Order of the checks (the first named line that fails is what a planted defect must show):
//   FIXTURE: the flight landed, and a card and a HUD line were on screen together at least once (else the test could pass blind).
//   1. the toast never covers the banner or the next-airport line (4 px2 of slack; at most 2 samples of grace, about 150 ms: a toast that opened at the title is moved by tidyToast on the first flight frame, and one run of the first version caught that single frame at 390x844).
//   2. the coach strip never covers them.
//   3. the toast and the coach strip never cover each other (dropToast).
// 320x568, 390x844, 375x667; the first-time seed (tips unseen) and the tips-off seed (['*']; the 'Airport ahead' card ignores '*', it is shown once per save: src/ui.js tipOnce).
// The run stops at the first width/seed that fails (a flight is about 25 s). Screenshots: $SHOTS, default <tmpdir>/hudclear-shots (skipped, not failed, when the directory cannot be made). Run: python3 -m http.server 8000 & node tests/hudclear.cjs   (plants: tools/plants.tsv, test hudclear)
const { chromium } = require('playwright-core');
const fs = require('fs');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const os = require('os'), path = require('path');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'hudclear-shots');   // (not under /home: a CI runner has no such directory; the branch run found it, 2026-11-11)
const base = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  let shotsOk = true; try { if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS); } catch (e) { shotsOk = false; console.log(`NOTE: screenshots off, cannot make ${SHOTS}: ${e.code || e}`); }   // (a screenshot is a courtesy: never a failure; NOT recursive: mkdirSync(recursive) on /proc/nope/x never returned)
  const shot = (p, name) => (shotsOk ? p.screenshot({ path: `${SHOTS}/${name}` }).catch(() => {}) : Promise.resolve());
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  check(!!process.env.SHOTS || !SHOTS.startsWith('/home/'), `THE SCREENSHOTS DIRECTORY: the default (${SHOTS}) is not under /home: a CI runner has no such directory (the branch run of 0.54.0 failed with EACCES on it)`);
  try {
    for (const [W, H, label, seenTips] of [[320, 568, 'firsttime', []], [320, 568, 'tipsoff', ['*']], [390, 844, 'tipsoff', ['*']], [390, 844, 'firsttime', []], [375, 667, 'firsttime', []], [375, 667, 'tipsoff', ['*']]]) {
      if (fails.length) break;   // (a flight is about 25 s: the first failure ends the run)
      const tag = `${W}x${H} ${label}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, { ...base, seenTips });
      let stage = 'load';
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(800);
        await p.evaluate(async () => { (await import('/src/season.js')).SEASON.offer.biodiversity = 0; game.registry.get('ui').showTitle(); }); await p.waitForTimeout(400);
        stage = 'fly'; await p.evaluate(() => game.registry.get('ui').start()); await started(p).catch(() => null);
        const seen = { frames: 0, together: 0, biomeTogether: 0, toastOnBiome: 0, toast: 0, coach: 0, toastOnHud: 0, coachOnHud: 0, toastOnCoach: 0, firstShot: false, worst: {} }; let result = null; const t0 = Date.now();
        while (Date.now() - t0 < 90000) {
          const r = await p.evaluate(() => { const s = game.scene.getScene('game'), cv = document.querySelector('#game canvas') || document.querySelector('canvas'), cr = cv.getBoundingClientRect(), k = cr.width / s.scale.width;
            const toA = s.nextAirport ? s.nextAirport.worldX - s.distancePx : 9999, approach = toA < 300 && toA > -150, landing = approach && toA < 60;
            const next = s.storms.find(st => st.rects[0].x + 44 > s.plane.x);
            const target = landing ? 999 : next ? next.rects[0].height + (next.rects[1].y - next.rects[0].height) / 2 - 2 : approach ? s.groundedY() - 60 : 200;
            const box = e => { if (!e || e.hidden) return null; const q = e.getBoundingClientRect(), cs = getComputedStyle(e); return q.width > 0 && q.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' ? { l: q.left, t: q.top, r: q.right, b: q.bottom } : null; };
            const txt = t => { if (!t || !t.text || !t.visible) return null; const q = t.getBounds(); return { l: cr.left + q.left * k, t: cr.top + q.top * k, r: cr.left + q.right * k, b: cr.top + q.bottom * k }; };
            return { tap: s.state === 'playing' && s.plane.y > target && s.plane.vy > -50, state: s.state, toast: box(document.getElementById('toast')), coach: box(document.getElementById('coach')), banner: txt(s.missionText), next: txt(s.nextText), biome: (s.banner && s.banner.visible && s.banner.alpha > 0.05) ? (q => ({ l: cr.left + q.left * k, t: cr.top + q.top * k, r: cr.left + q.right * k, b: cr.top + q.bottom * k }))(s.banner.getBounds()) : null,
              result: s.state === 'over' ? (s.result ? { landed: s.result.landed, reason: s.result.reason } : null) : undefined }; });
          seen.frames++;
          const area = (a, c) => (a && c) ? Math.max(0, Math.min(a.r, c.r) - Math.max(a.l, c.l)) * Math.max(0, Math.min(a.b, c.b) - Math.max(a.t, c.t)) : 0;
          const hud = [r.banner, r.next].filter(Boolean);
          if (r.biome && (r.toast || r.coach)) seen.biomeTogether++;
          const tOnBiome = r.biome ? area(r.toast, r.biome) : 0; if (tOnBiome > 4) seen.toastOnBiome++;
          if (r.toast) seen.toast++; if (r.coach) seen.coach++;
          if ((r.toast || r.coach) && hud.length) seen.together++;
          const tOn = Math.max(0, ...hud.map(h => area(r.toast, h))), cOn = Math.max(0, ...hud.map(h => area(r.coach, h))), tc = area(r.toast, r.coach);
          if (tOn > 4) { seen.toastOnHud++; seen.worst.toast = seen.worst.toast || { px2: Math.round(tOn), toast: r.toast && Object.values(r.toast).map(Math.round), hud: hud.map(h => Object.values(h).map(Math.round)) }; }
          if (cOn > 4) { seen.coachOnHud++; seen.worst.coach = seen.worst.coach || { px2: Math.round(cOn), coach: r.coach && Object.values(r.coach).map(Math.round), hud: hud.map(h => Object.values(h).map(Math.round)) }; }
          if (tc > 4) { seen.toastOnCoach++; seen.worst.both = seen.worst.both || { px2: Math.round(tc), toast: Object.values(r.toast).map(Math.round), coach: Object.values(r.coach).map(Math.round) }; }
          if (!seen.firstShot && (tOn > 4 || cOn > 4 || tc > 4)) { seen.firstShot = true; await shot(p, `${W}-${label}-overlap.png`); }
          if (!seen.firstShot && !seen.shotCard && (r.toast || r.coach) && hud.length) { seen.shotCard = true; await shot(p, `${W}-${label}-cards.png`); }
          if (r.state === 'over') { result = r.result; break; }
          if (r.tap) await p.mouse.click(Math.round(W / 2), Math.round(H / 2));
          await p.waitForTimeout(60);
        }
        console.log(`FLIGHT ${tag}: result ${JSON.stringify(result)}, ${seen.frames} samples, toast on screen ${seen.toast}, coach strip ${seen.coach}, together with a HUD line ${seen.together}; samples ON the HUD: toast ${seen.toastOnHud} (allowed 2), strip ${seen.coachOnHud} (0), toast on strip ${seen.toastOnCoach} (0); biome card up with a card ${seen.biomeTogether}, toast ON the biome card ${seen.toastOnBiome} (allowed 2)`);
        check(result && result.landed && seen.together > 0, `${tag}: FIXTURE: the flight landed and a card and a HUD line were on screen together (result ${JSON.stringify(result)}, toast samples ${seen.toast}, coach samples ${seen.coach}, together ${seen.together})`);
        check(seen.toastOnHud <= 2, `${tag}: the toast never covers the banner or the next-airport line (more than 2 samples, about 150 ms: a toast that opens at the title, e.g. the keep-your-game-safe note, is on the HUD for at most the frame before the first flight update moves it, src/GameScene.js tidyToast): ${seen.toastOnHud} samples, first ${JSON.stringify(seen.worst.toast)}`);
        check(seen.toastOnBiome <= 2, `${tag}: the toast never covers the land's card (TEMPERATE WOODLAND + BIODIVERSITY, GameScene.regionBanner; L-37): ${seen.toastOnBiome} samples`);
        check(seen.coachOnHud === 0, `${tag}: the coach strip never covers the banner or the next-airport line: ${seen.coachOnHud} samples, first ${JSON.stringify(seen.worst.coach)}`);
        check(seen.toastOnCoach === 0, `${tag}: the toast and the coach strip never cover each other: ${seen.toastOnCoach} samples, first ${JSON.stringify(seen.worst.both)}`);
        check(p.errs.length === 0, `${tag}: no page errors: ${p.errs}`);
      } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL hudclear:\n - ${fails.join('\n - ')}` : 'PASS hudclear: in real flights the toast and the coach strip never cover the banner or the next-airport line, nor each other (320, 390 and 375 wide; first-time and tips-off)');
  process.exit(fails.length ? 1 : 0);
})();
