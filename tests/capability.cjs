// M4: the hangar's capability estimate (src/capability.js; the user's pick 2026-10-28: a careful pilot who CAN crash).
// No browser. Run: node tests/capability.cjs
//  1. estimate() gives exactly the sim engine's crashes-ON careful player at s 0.9 (median of 5 skies, rounded to 500 km);
//  2. it is cached by capKey: seeds earned do not make it stale, a purchase does (capFor -> 0 until it runs again);
//  3. the crossing offer counts it ALONGSIDE the best landed flight (the larger wins), in the area it was worked out for.
//  Plant (must FAIL): PLANT=nocrash runs the estimate with crashes off.
const path = require('path');
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  globalThis.SEASON2 = true; globalThis.window = { SEASON2: true };
  const C = await import(src('capability.js')), S = await import(src('sim/simulate.js')), X = await import(src('crossings.js'));
  const F = await import(src('fleet.js')), A = await import(src('areas.js'));
  if (process.env.PLANT === 'nocrash') C.CAP.crashes = false;
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const area = Object.keys(A.AREAS)[0], home = A.AREAS[area].start;
  // A fully upgraded 1990s twin: it flies far enough to meet no-fly zones and birds, so crashes matter (a fresh Comet
  // overheats at ~9,500 km first, where crashes on and off give the same answer and the plant could not fail).
  const full = list => Object.fromEntries(list.map(g => [g.id, g.levels.length]));
  const twin = F.PLANES.find(p => p.id === 'twin'), lines = Object.fromEntries(Object.keys(F.PLANE_LINES).map(l => [l, twin.lines[l].length]));
  const save = { tutorialDone: true, muted: true, seenTips: ['*'], landings: 0, city: home, areas: [area], seeds: 100,
    fleet: { plane: 'twin', planes: { comet: {}, twin: lines }, systems: full(F.SYSTEMS), gadgets: full(F.GADGETS) } };
  const want = C.roundCap(S.capability(JSON.parse(JSON.stringify(save)), { pilots: ['player'], seeds: [1, 2, 3, 4, 5], crashes: true, skill: 0.9, careful: true, maxKm: 60000 }).player.median);
  const got = await new Promise(r => C.estimate(save, r, { frame: cb => setImmediate(cb) }));
  check(got === want, `estimate ${got} km, the crashes-on careful player at s 0.9 flies ${want}`);
  check(C.capFor(save, area) === got, 'capFor does not return the cached estimate');
  check(!C.estimate(save), 'estimate re-ran with nothing changed');
  save.seeds = 5000;
  check(C.capFor(save, area) === got, 'earning seeds made the estimate stale');
  save.fleet.planes.comet = {}; save.seeds = 1e6; save.crystals = 1e6; save.fleet.plane = 'comet'; F.buyFleet(save, 'plane', 'comet.engines');
  check(C.capFor(save, area) === 0, 'a purchase did not make the estimate stale');
  // Alongside: a crossing from this area sees max(best landed, estimate).
  const c = { id: 'x', a: home, b: home, from: home, to: home, km: 1000 };
  save.capability = { km: 7000, key: C.capKey(save), area }; save.areaBest = { [area]: 3000 };
  check(X.offerCtx(save, c).capabilityKm === 7000, 'offer ignores the estimate when it is larger');
  save.areaBest = { [area]: 9000 };
  check(X.offerCtx(save, c).capabilityKm === 9000, 'offer ignores the best landed flight when it is larger');
  if (fails.length) { console.log(`FAIL capability\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`PASS capability: estimate ${got} km (crashes on, s 0.9, 5 skies), cached, stale after a purchase, counted alongside the best landing`);
})();
