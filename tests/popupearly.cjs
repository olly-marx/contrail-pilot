// A POPUP BEFORE THE SCENE IS BUILT (0.79.2; Oliver's iPhone, 2026-11-25: the app crashed at launch on HOME, 'undefined is not an object (evaluating this.fxLayer.add)',
// popup <- showRunway <- addRunway <- GameScene.create: the special-delivery 'Drop the crate on X!' popup for the HOME runway ran before create made fxLayer).
// In the real game: the runway call with a crate due at that city, (1) while fxLayer does not exist yet: no error; (2) once built, in flight: the popup shows.
// Plants (tools/plants.tsv): the guard removed. Run: python3 -m http.server 8000 & node tests/popupearly.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify({ areas: ['namerica'], homeArea: 'namerica', homeCity: 'DENVER', city: 'DENVER', visited: ['DENVER'], tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], freeGiven: true, landings: 40, flights: 60, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'] })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const g = game.scene.getScene('game'), out = {};
    const fx = g.fxLayer, st = g.state; g.fxLayer = undefined; g.crates = ['DENVER']; g.state = 'playing';   // (state 'playing': only the popup's own guard stands between this and the crash)
    try { g.addRunway(-60, 'DENVER'); out.early = 'ok'; } catch (e) { out.early = String(e); }
    g.fxLayer = fx; const n0 = fx.list.length;
    try { g.addRunway(400, 'DENVER'); out.late = fx.list.length > n0 ? 'shown' : 'not shown'; } catch (e) { out.late = String(e); }
    g.state = st; g.crates = []; return out; });
  check(r.early === 'ok', `1. a crate popup for a runway made before the scene's layers exist: no error (${r.early})`);
  check(r.late === 'shown', `2. in flight the crate popup still shows (${r.late})`);
  check(!errs.length, `no page errors: ${errs.slice(0, 2).join(' | ')}`);
  await b.close();
  console.log(fails.length ? `FAIL popupearly:\n - ${fails.join('\n - ')}` : 'PASS popupearly: a popup before the scene is built does nothing; in flight the crate popup shows');
  process.exit(fails.length ? 1 : 0);
})();
