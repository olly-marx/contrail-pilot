// A RAILS STEP MUST NEVER SURVIVE INTO A FLIGHT (the user, 2026-11-12: "after I buy an upgrade in NATURE, tapping in flight does not respond"; probe 2 MEASURED on live 0.61.0: after a Tree Planting purchase a rails step stayed up on HOME,
// its catcher panels covered TAKE OFF, and when the flight was started another way the panels stayed over the game and swallowed every tap). Real page, 390x844 and 320x568, a season 2 save with most rails done.
// Named lines, in order (the active step's key is printed in the log, so it says WHICH rail it was). Page A, a clean HOME (no purchase, no rail up):
//   5. a step whose target goes away ends itself within 1.6 s (exit 'gone')
//   6. an interrupted step comes back ONCE: the first abort leaves it undone (save.railAborts 1, not in save.tours); the second marks it seen (neither a loop on every HOME nor lost by the first interruption)
//   7. a step that is up when the scene starts a flight (scene.startFlight() itself, not ui.start()) is hidden AT ONCE
// Page C, a clean HOME with ui.tour.abort turned into a no-op (the two abort calls are removed, only the poll is left):
//   4a. ui.start() while a step is up: the step ends itself within 0.7 s (exit 'flight')
// Page B, after a real tap on Tree Planting's buy button in NATURE and a real tap on FLY:
//   FIXTURE  a rails step is up (#tour shown, tour.busy); its key is printed
//   1. ui.start() (a start that does not go through the step's own lit target) hides #tour AT ONCE (in the same turn, before the next poll)
//   2. the flight reaches 'playing', #tour stays hidden, tour.busy ends false, and the step is recorded as aborted (window.__tourAborts) with its key
//   3. nothing but the game is over the canvas centre (no pointer-events layer) and a real tap on the canvas makes the plane flap
//   4b. a step asked for while the flight is on is NEVER shown (#tour is not visible in any animation frame of the next 0.6 s)
// Run: python3 -m http.server 8000 & node tests/tourflight.cjs   (plants: tools/plants.tsv, test tourflight)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'AMSTERDAM', city: 'AMSTERDAM', visited: ['AMSTERDAM', 'LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['x-bars', 'airport', 'takeoff'],
  tours: ['hangar', 'name', 'r-boards', 'r-bonus', 'r-free', 'r-nature', 'r-parcels', 'r-res1', 'r-res2', 'r-school', 'r-systems', 'r-takeoff1', 'r-takeoff2', 'r-payoff', 'r-plant1', 'r-plant2', 'r-map', 'nature-lead', 'nature-swipe', 'globe-hint'],
  freeGiven: true, freeProjectGiven: true, freeUpgrade: false, freeParcelsGiven: true, landings: 12, flights: 20, seeds: 9000, crystals: 900, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, planted: { spruce: 2 },
  fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [];
  const open = async (W, H) => {
    const ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
    await p.goto(URL); await ready(p); await p.waitForTimeout(900); return { ctx, p };
  };
  const stepUp = p => p.evaluate(async () => { const ui = game.registry.get('ui'); window.__tourAborts = []; ui.tour.busy = false; ui.tour.run('tf-step', [{ target: '#goBtn', text: 'test', tap: true }]); await new Promise(r => setTimeout(r, 700)); return !document.getElementById('tour').hidden; });
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, check = (c, m) => { if (!c) fails.push(`${tag}: ${m}`); };
      { const { ctx, p } = await open(W, H); let stage = 'clean HOME';
        try {
          stage = 'gone exit';
          const up5 = await stepUp(p);
          await p.evaluate(() => { document.getElementById('goBtn').style.display = 'none'; });
          await p.waitForTimeout(1600);
          const gone = await p.evaluate(() => { document.getElementById('goBtn').style.display = ''; return { hidden: document.getElementById('tour').hidden, busy: !!game.registry.get('ui').tour.busy, aborts: (window.__tourAborts || []).map(a => a.why) }; });
          check(up5 && gone.hidden && gone.busy === false && gone.aborts.includes('gone'), `5: a step whose target went away ends itself within 1.6 s (exit 'gone'): up ${up5}, ${JSON.stringify(gone)}`);
          stage = 'back once';
          const one = await p.evaluate(async () => { const ui = game.registry.get('ui'); ui.save.railAborts = {}; ui.save.tours = (ui.save.tours || []).filter(t => t !== 'tf-back'); const out = [];
            for (let i = 0; i < 2; i++) { ui.tour.busy = false; ui.tour.run('tf-back', [{ target: '#goBtn', text: 'test', tap: true }]); await new Promise(r => setTimeout(r, 700)); ui.tour.abort(); await new Promise(r => setTimeout(r, 500));
              out.push({ aborts: (ui.save.railAborts || {})['tf-back'] || 0, done: (ui.save.tours || []).includes('tf-back') }); }
            return out; });
          check(one.length === 2 && one[0].aborts === 1 && one[0].done === false && one[1].aborts === 2 && one[1].done === true, `6: the first abort leaves the step undone (it comes back once), the second marks it seen: ${JSON.stringify(one)}`);
          stage = 'startFlight';
          const up7 = await stepUp(p);
          const at = await p.evaluate(() => { game.scene.getScene('game').startFlight(); return { hidden: document.getElementById('tour').hidden }; });
          check(up7 && at.hidden === true, `7: scene.startFlight() hides a step that is up AT ONCE: up ${up7}, ${JSON.stringify(at)}`);
          check(!p.errs.length, `page errors (clean HOME) ${p.errs.slice(0, 2)}`);
        } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
        await ctx.close(); }
      { const { ctx, p } = await open(W, H); let stage = 'poll only';
        try {
          const up4 = await stepUp(p);
          await p.evaluate(() => { const ui = game.registry.get('ui'); ui.tour.abort = () => {}; ui.start(); });   // only the poll's flight exit is left
          await p.waitForTimeout(900);
          const ended = await p.evaluate(() => ({ hidden: document.getElementById('tour').hidden, busy: !!game.registry.get('ui').tour.busy, aborts: (window.__tourAborts || []).map(a => a.why), state: game.scene.getScene('game').state }));
          check(up4 && ended.hidden && ended.busy === false && ended.aborts.includes('flight'), `4a: with the abort calls out, a step that is up when a flight starts ends itself within 0.7 s (the poll's exit 'flight'): up ${up4}, ${JSON.stringify(ended)}`);
        } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
        await ctx.close(); }
      { const { ctx, p } = await open(W, H); let stage = 'NATURE';
        try {
          await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(900);
          await p.locator('[data-buy="trees"]').first().scrollIntoViewIfNeeded().catch(() => {}); await p.locator('[data-buy="trees"]').first().click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(900);
          await p.click('#tabFly').catch(() => {}); await p.waitForTimeout(1500);
          const up = await p.evaluate(() => { const ui = game.registry.get('ui'), t = document.getElementById('tour'); return { shown: !t.hidden, busy: !!ui.tour.busy, key: (ui.tour.spot() || {}).key || null, trees: ui.save.levels.trees }; });
          log.push(`${tag} FIXTURE (the rails step that is up after the purchase): ${JSON.stringify(up)}`);
          check(up.trees === 2 && up.shown && up.busy, `FIXTURE: after buying Tree Planting and tapping FLY a rails step should be up (the bug's start): ${JSON.stringify(up)}`);
          stage = 'ui.start';
          const now = await p.evaluate(() => { const ui = game.registry.get('ui'); ui.start(); return { hidden: document.getElementById('tour').hidden }; });
          check(now.hidden === true, `1: ui.start() should hide #tour at once (before the next poll): ${JSON.stringify(now)}`);
          const playing = await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s && s.state === 'playing'; }, null, { timeout: 25000 }).then(() => true).catch(() => false);
          await p.waitForTimeout(1500);
          const mid = await p.evaluate(() => { const ui = game.registry.get('ui'); return { hidden: document.getElementById('tour').hidden, busy: !!ui.tour.busy, aborts: window.__tourAborts || [] }; });
          log.push(`${tag} after the flight started: ${JSON.stringify(mid)}`);
          check(playing && mid.hidden && mid.busy === false && mid.aborts.length >= 1 && !!mid.aborts[0].key, `2: the flight is playing, #tour stays hidden, tour.busy is false and the step is recorded as aborted with its key: playing ${playing} ${JSON.stringify(mid)}`);
          stage = 'tap';
          const tap = await p.evaluate(() => {
            const s = game.scene.getScene('game'), cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.35;
            s.flapCalls = 0; const orig = s.flap; s.flap = function (...a) { s.flapCalls++; return orig.apply(this, a); };
            return { x: Math.round(cx), y: Math.round(cy), over: document.elementsFromPoint(cx, cy).filter(e => e !== cv && !['HTML', 'BODY'].includes(e.tagName) && e.id !== 'game').map(e => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}`) };
          });
          await p.mouse.click(tap.x, tap.y); await p.waitForTimeout(250);
          const flaps = await p.evaluate(() => game.scene.getScene('game').flapCalls);
          check(tap.over.length === 0 && flaps > 0, `3: nothing but the game over the canvas centre and a real tap flaps the plane: over ${JSON.stringify(tap.over)}, flapCalls ${flaps}`);
          stage = 'never shown';
          const seen = await p.evaluate(async () => { const ui = game.registry.get('ui'), t = document.getElementById('tour'); window.__tourAborts = []; let shown = 0, frames = 0; const t0 = performance.now();
            ui.tour.busy = false; ui.tour.run('tf-flight', [{ target: 'canvas', text: 'test', tap: true }]);
            await new Promise(res => { const f = () => { frames++; if (!t.hidden) shown++; if (performance.now() - t0 < 600) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
            return { shown, frames, aborts: (window.__tourAborts || []).map(a => a.why), busy: !!ui.tour.busy }; });
          check(seen.shown === 0 && seen.frames > 5 && seen.aborts.includes('flight') && seen.busy === false, `4b: a step asked for while the flight is on is never shown (#tour visible in ${seen.shown} of ${seen.frames} frames): ${JSON.stringify(seen)}`);
          check(!p.errs.length, `page errors ${p.errs.slice(0, 2)}`);
        } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
        await ctx.close(); }
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  for (const l of log) console.log(l);
  console.log(fails.length ? `FAIL tourflight:\n - ${fails.join('\n - ')}` : 'PASS tourflight: a rails step never survives into a flight (abort at the start, exit when a flight is on, never shown during one, exit when the target is gone); an interrupted step comes back once and then counts as seen (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
