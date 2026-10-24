// Info cards for the plane side (src/fleetfacts.js, 2026-10-23): every fact key is a real level name
// (no typos silently dropping a card); every REAL fact has a source; every line has what/why text;
// the levels with no fact of their own are only "better versions" (never the first level of a line);
// in the hangar, (i) opens the card with the level's fact and how sure we are.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/fleetfacts.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const F = await import('../src/fleet.js'), X = await import('../src/fleetfacts.js');
  const lines = [...F.PLANES.flatMap(p => Object.entries(p.lines).map(([k, lv]) => ({ key: k, levels: lv, who: `${p.id}.${k}` }))),
    ...[...F.SYSTEMS, ...F.GADGETS].map(g => ({ key: g.id, levels: g.levels, who: g.id }))];
  const names = new Set(lines.flatMap(l => l.levels.map(v => v.name)));
  const stray = Object.keys(X.LEVEL_FACTS).filter(n => !names.has(n));
  check(!stray.length, `facts for levels that do not exist (typos?): ${stray}`);
  const firsts = lines.filter(l => !X.LEVEL_FACTS[l.levels[0].name]).map(l => l.who);
  check(!firsts.length, `the first level of every line has its own fact: missing ${firsts}`);
  const nosrc = Object.entries(X.LEVEL_FACTS).filter(([, f]) => f.status !== 'guess' && !f.src).map(([n]) => n);
  check(!nosrc.length, `REAL facts without a source: ${nosrc}`);
  const noinfo = lines.filter(l => !X.LINE_INFO[l.key] || !X.LINE_INFO[l.key].what || !X.LINE_INFO[l.key].why).map(l => l.who);
  check(!noinfo.length, `lines without what/why: ${noinfo}`);

  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], flights: 30, landings: 9, seeds: 400, crystals: 60,
    flightSeconds: 2000, priceVersion: 2, levels: { trees: 1 }, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: { engines: 1 } }, systems: {}, gadgets: {} } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(500);
  await p.click('#tabHangar'); await p.waitForTimeout(300);
  await p.click('[data-finfo="plane:jumbo.engines"]'); await p.waitForTimeout(200);
  const t = await p.evaluate(() => document.getElementById('info').hidden ? '' : document.getElementById('info').textContent.replace(/\s+/g, ' '));
  check(/Engines: 747 jumbo/.test(t) && /JT9D/.test(t) && /22 January 1970/.test(t) && !/REAL|GAME GUESS|\[\d+\]/.test(t), `the 747 engines card: "${t.slice(0, 400)}"`);
  await p.click('#iClose');
  await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(200);
  await p.click('[data-finfo="gadget:gear"]'); await p.waitForTimeout(200);
  const g = await p.evaluate(() => document.getElementById('info').textContent.replace(/\s+/g, ' '));
  check(/Trident jet landed itself/.test(g) && /A better version of/.test(g), `the landing gear card: "${g.slice(0, 300)}"`);
  await b.close();

  console.log({ fails });
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
