// M4: the hangar's capability estimate (src/capability.js; the user's pick 2026-10-28: a careful pilot who CAN crash).
// No browser. Run: node tests/capability.cjs
//  1. ACCURACY: on 5 kits (fresh Comet .. full twin) the cheap estimate (3 crashes-off heat skies + the era's hazard pool)
//     is within 20% of the median of 20 real crashes-on flights (tests/capability-truth.json, tools/sim/cap-validate.mjs);
//  2. it is cached by capKey: seeds earned do not make it stale, a purchase does (capFor -> 0 until it runs again);
//  3. the crossing offer counts it ALONGSIDE the best landed flight (the larger wins), in the area it was worked out for.
//  Plant (tools/plants.tsv): the hazard pool ignored (heat only) -> the full twin is ~+70% -> FAIL.
const path = require('path');
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  globalThis.SEASON2 = true; globalThis.window = { SEASON2: true };
  const C = await import(src('capability.js')), X = await import(src('crossings.js')), F = await import(src('fleet.js')), A = await import(src('areas.js'));
  const truth = require('./capability-truth.json');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const full = (l, n) => Object.fromEntries(l.map(g => [g.id, Math.min(n, g.levels.length)]));
  const lines = (id, n) => { const p = F.PLANES.find(q => q.id === id); return Object.fromEntries(Object.keys(F.PLANE_LINES).map(l => [l, Math.min(n, p.lines[l].length)])); };
  const kits = {   // the same kits as tools/sim/cap-validate.mjs
    fresh: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} },
    cometMid: { plane: 'comet', planes: { comet: lines('comet', 2) }, systems: full(F.SYSTEMS, 2), gadgets: full(F.GADGETS, 2) },
    jumboMid: { plane: 'jumbo', planes: { comet: {}, jumbo: lines('jumbo', 2) }, systems: full(F.SYSTEMS, 3), gadgets: full(F.GADGETS, 3) },
    twinBare: { plane: 'twin', planes: { comet: {}, twin: {} }, systems: full(F.SYSTEMS, 4), gadgets: full(F.GADGETS, 4) },
    twinFull: { plane: 'twin', planes: { comet: {}, twin: lines('twin', 4) }, systems: full(F.SYSTEMS, 6), gadgets: full(F.GADGETS, 6) },
  };
  const base = fleet => ({ tutorialDone: true, muted: true, seenTips: ['*'], landings: 0, fleet });
  const errs = [];
  for (const [k, fleet] of Object.entries(kits)) {
    const e = await C.estimateNow(base(fleet)), t = truth[k].median, err = (e - t) / t;
    errs.push(`${k} ${Math.round(err * 100)}%`);
    check(Math.abs(err) <= 0.2, `${k}: estimate ${e} km vs ${Math.round(t)} km over 20 real flights (${Math.round(err * 100)}%, allowed 20%)`);
  }
  // Cache and the crossing offer, on a saved area.
  const area = Object.keys(A.AREAS)[0], home = A.AREAS[area].start;
  const save = { ...base(kits.fresh), city: home, areas: [area], seeds: 100 };
  const got = await new Promise(r => C.estimate(save, r, { frame: cb => setImmediate(cb), worker: false }));
  check(got === await C.estimateNow(save), 'the in-game estimate differs from estimateNow');
  check(C.capFor(save, area) === got && !C.estimate(save), 'the estimate is not cached');
  save.seeds = 5000;
  check(C.capFor(save, area) === got, 'earning seeds made the estimate stale');
  save.seeds = 1e6; save.crystals = 1e6; F.buyFleet(save, 'plane', 'comet.engines');
  check(C.capFor(save, area) === 0, 'a purchase did not make the estimate stale');
  const c = { id: 'x', a: home, b: home, from: home, to: home, km: 1000 };
  save.capability = { km: 7000, key: C.capKey(save), area }; save.areaBest = { [area]: 3000 };
  check(X.offerCtx(save, c).capabilityKm === 7000, 'offer ignores the estimate when it is larger');
  save.areaBest = { [area]: 9000 };
  check(X.offerCtx(save, c).capabilityKm === 9000, 'offer ignores the best landed flight when it is larger');
  if (fails.length) { console.log(`FAIL capability\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`PASS capability: within 20% of 20 real flights (${errs.join(', ')}), cached, stale after a purchase, counted alongside the best landing`);
})();
