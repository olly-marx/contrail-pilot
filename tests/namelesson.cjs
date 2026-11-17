// THE SCHOOL'S NAME LESSON ON A DEVICE THAT CANNOT NAME A PILOT (Oliver, 2026-11-17, on ?newplayer=1: "I can't get past the pilot mission in the school at all").
// NEW PLAYER TEST mode switches online off on purpose (src/newplayer.js __CP_NO_ONLINE), so namesOpen() is false and the name tour never starts:
// the board must pass the lesson instead of waiting for ever. Control: with online on, the lesson stays until a name is saved.
// Run: python3 -m http.server 8000 & node tests/namelesson.cjs   (plants in tools/plants.tsv)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const SAVE = { school2: true, tutorialDone: true, muted: true, freeGiven: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, treePractice: true, flights: 12, landings: 10,
    tours: ['hangar', 'r-free', 'r-nature', 'r-map', 'r-earth', 'r-school', 'r-takeoff1', 'r-takeoff2', 'r-res1', 'r-res2', 'r-systems', 'r-bonus', 'r-trees', 'r-parcels', 'r-practice', 'r-plant1', 'r-plant2'] };
  const run = async offline => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([s, off]) => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); if (off) window.__CP_NO_ONLINE = true; }, [SAVE, offline]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(600);
    const r = await p.evaluate(async () => { const { current } = await import('./src/lessons.js'); const ui = game.registry.get('ui'), s = game.registry.get('save');
      const before = (current(s) || {}).id; ui.showTitle(); await new Promise(r => setTimeout(r, 900)); ui.tour.maybe('title'); await new Promise(r => setTimeout(r, 600));
      return { before, after: (current(s) || {}).id, named: (s.tours || []).includes('name') }; });
    check(!errs.length, `page errors: ${errs}`);
    await p.close(); return r;
  };
  const off = await run(true), on = await run(false);
  const L = await import('../src/lessons.js'); check((L.current(SAVE) || {}).id === 'name', `the test save stands at the name lesson: ${(L.current(SAVE) || {}).id}`);
  check(off.named && off.after !== 'name', `online switched off: the School passes the name lesson: ${JSON.stringify(off)}`);
  check(!on.named || on.after !== 'name', `online on: the lesson is not passed without a name, or the name tour runs: ${JSON.stringify(on)}`);
  check(on.after === 'name', `online on: the board still asks for the name (no name saved): ${JSON.stringify(on)}`);
  await b.close();
  if (fails.length) { console.log('FAIL namelesson\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1); }
  console.log(`PASS namelesson: offline-by-design passes the name lesson (now ${off.after}); online it waits for a name`);
})();
