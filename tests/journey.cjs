// The journey (src/route.js): flights start in the city you last landed in; the airports ahead
// are the next cities, spaced by real-ish leg lengths (1,000-3,000 km); a crash keeps you where you
// were; landing in LONDON from REYKJAVIK is a lap; "Reach CITY" also counts landing further on.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/journey.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const base = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 5 };
  const setSave = s => p.evaluate(s => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(s)); }, s);
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));
  const fly = async () => {   // take off and wait until flying
    await p.click('#goBtn');
    for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
    return p.evaluate(() => { const s = game.scene.getScene('game'); return { home: s.homeName, next: s.nextAirport.name, at: Math.round(s.nextAirport.worldX), start: s.startCity }; });
  };
  // End the flight as if landed at the k-th airport ahead (0 = the next one), or crashed.
  const end = (landed, k = 0) => p.evaluate(([landed, k]) => { const s = game.scene.getScene('game');
    s.landedAt = landed ? s.airportAhead(k).name : null; s.airportIndex = k; s.airportsSkipped = k;
    s.finish({ landed }); return s.result; }, [landed, k]);
  const reload = async () => { await p.reload(); await ready(p); await p.waitForTimeout(800); };

  await p.goto(URL); await setSave(base); await reload();
  // 1. A new journey: LONDON, PARIS next at 1000 km (real 347, stretched to the 1000 km minimum).
  check(/You are in LONDON/.test(await p.textContent('#tJourney')) && /PARIS \(1,000 km\)/.test(await p.textContent('#tJourney')), `title should say LONDON, next PARIS (1000 km): "${await p.textContent('#tJourney')}"`);
  let f = await fly();
  check(f.home === 'LONDON' && f.next === 'PARIS' && f.at === 1000, `first flight: ${JSON.stringify(f)}`);

  // 2. Land in PARIS -> you are in PARIS; the next flight leaves PARIS for BERLIN (1000 km).
  let r = await end(true);
  check(r.landedAt === 'PARIS' && (await save()).city === 1, `landing in PARIS should move you there: ${r.landedAt}, city ${(await save()).city}`);
  await p.waitForTimeout(1200); await reload();
  check(/You are in PARIS/.test(await p.textContent('#tJourney')), 'title should say PARIS');
  f = await fly();
  check(f.home === 'PARIS' && f.next === 'BERLIN' && f.at === 1000, `second flight should leave PARIS for BERLIN at 1000: ${JSON.stringify(f)}`);

  // 3. Fly past BERLIN: the airport after it is ROME, one BERLIN-ROME leg (1180) further on.
  const passed = await p.evaluate(() => { const s = game.scene.getScene('game'); s.distancePx = s.nextAirport.worldX + 230; return new Promise(res => setTimeout(() => res({ next: s.nextAirport.name, at: Math.round(s.nextAirport.worldX) }), 300)); });
  check(passed.next === 'ROME' && passed.at === 1000 + 1180, `after passing BERLIN the next should be ROME at 2180: ${JSON.stringify(passed)}`);

  // 4. A crash keeps you in PARIS.
  r = await end(false);
  check((await save()).city === 1, `a crash should keep you in PARIS, city ${(await save()).city}`);
  await p.waitForTimeout(1200);

  // 5. From REYKJAVIK, landing in LONDON is a lap; you are home again.
  await setSave({ ...base, city: 15, laps: 0 }); await reload();
  f = await fly();
  check(f.home === 'REYKJAVIK' && f.next === 'LONDON' && f.at === 1900, `REYKJAVIK flight: ${JSON.stringify(f)}`);
  r = await end(true);
  const s5 = await save();
  check(r.lap === true && s5.laps === 1 && s5.city === 0, `landing in LONDON should be a lap: lap ${r.lap}, laps ${s5.laps}, city ${s5.city}`);
  await p.waitForTimeout(1200);

  // 6. "Reach ROME" is done by landing further east (ATHENS), not by landing short of it.
  const reachRome = n => p.evaluate(async ([landedAt, lap]) => { const { MISSIONS } = await import('./src/missions.js'); const m = MISSIONS.find(x => x.id === 'reach-rome'); return m.check({ landed: true, landedAt, lap }); }, n);
  check(await reachRome(['ATHENS', false]) && await reachRome(['ROME', false]) && !(await reachRome(['BERLIN', false])) && await reachRome(['LONDON', true]), 'Reach ROME: ROME/ATHENS/lap yes, BERLIN no');

  // 7. Flight school always starts in LONDON, even mid-journey.
  await setSave({ ...base, city: 7 }); await reload();
  await p.click('#schoolBtn'); await p.waitForTimeout(400);
  const sc = await p.evaluate(() => { const b = document.getElementById('howClose'); if (b && !document.getElementById('how').hidden) b.click(); return null; });
  await p.waitForTimeout(1200);
  check(await p.evaluate(() => game.scene.getScene('game').homeName) === 'LONDON', `flight school should start in LONDON, got ${await p.evaluate(() => game.scene.getScene('game').homeName)}`);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS journey');
})();
