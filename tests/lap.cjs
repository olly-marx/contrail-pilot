// M4: the final boss is a LAP OF THE EARTH (the user, 2026-10-27): from your home city back to it, 40,000 km, offered only
// when EVERY area is open; it counts only when you land back home; Auckland-Santiago is an ordinary crossing now.
// No browser. Run: node tests/lap.cjs
//  Plant (must FAIL): PLANT=ordinary turns the lap row into an ordinary crossing (no home, no every-area rule).
const path = require('path');
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  globalThis.SEASON2 = true; globalThis.window = { SEASON2: true };
  const X = await import(src('crossings.js')), { SEASON } = await import(src('season.js')), { AREAS } = await import(src('areas.js'));
  if (process.env.PLANT === 'ordinary') Object.assign(X.crossingById('lap'), { kind: 'long', a: 'AUCKLAND', b: 'SANTIAGO' });
  SEASON.maxEra = 5;   // (the live release stops at the 1990s; the lap is the far future's)
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const keys = Object.keys(AREAS), home = keys[0];
  const save = { tutorialDone: true, homeArea: home, city: AREAS[home].start, areas: keys.slice(), flightSeconds: 1e7 };
  const lap = () => X.available(save).find(c => c.id === 'lap');
  const L = lap();
  check(L && L.from === AREAS[home].start && L.to === AREAS[home].start, `the lap is not home -> home (${L && L.from} -> ${L && L.to})`);
  check(L && L.km === 40000 && SEASON.crossingKm.final === 40000, `the lap is not 40,000 km (${L && L.km})`);
  save.areas = keys.slice(1);
  check(!lap(), 'the lap is offered before every area is open');
  save.areas = keys.slice();
  const as = X.crossingById('auckland-santiago');
  check(as && as.kind === 'long' && !X.crossingById('final'), 'Auckland-Santiago is still the boss');
  if (L) {
    save.city = AREAS[keys[1]].start;
    check(X.completeCrossing(save, L) === false && !(save.crossed || []).includes('lap'), 'the lap counted when landing away from home');
    save.city = L.to;
    check(X.completeCrossing(save, L) === true && save.crossed.includes('lap') && save.lapDone, 'landing home did not finish the lap');
    check(!lap(), 'the lap is offered again after it is done');
  }
  if (fails.length) { console.log(`FAIL lap\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log('PASS lap: home -> home, 40,000 km, only with every area open, only counted landing home, Auckland-Santiago ordinary');
})();
