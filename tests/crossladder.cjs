// THE CROSSING ORDER AND THE PLANE TICK (src/crossings.js crossingsMade / upcoming / planeReady, src/crossingview.js crossingState; CROSSINGS V2, the user's feedback 2026-11-09). Plain Node.
//   1. CROSSINGS V3 (2026-11-13): 8 routes join the 6 regions, the lap last, and from every start region the routes reach every region;
//   2. each crossing is harder than the last, whichever route: over a trimmed copy of a real late-game save (tests/fixtures/ladder-save.json; the full local backup too where it exists) the old save
//      opens whole regions, every next route is the same next era, and flying them in turn gives era n+1 each time until the lap;
//   3. the plane tick counts a landed flight from ANY area (a flight from the Nordic area covers a Western Europe crossing) and its open line says what to do ('Fly farther or upgrade plane', fits 28).
// Plants: tools/plants.tsv, test `crossladder`. Run: node tests/crossladder.cjs
globalThis.SEASON2 = true;
(async () => {
  const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const C = await import('../src/crossings.js'), V = await import('../src/crossingview.js'), B = await import('../src/backup.js'), fs = require('fs');
  // 1. CROSSINGS V3 (the user, 2026-11-13: '6 regions, 5 crossings plus the lap ... each one harder than the last'): 8 routes join the 6 regions, the lap last; from EVERY start the routes reach every region.
  const A = await import('../src/areas.js'), routes = C.CROSSINGS.filter(c => c.kind !== 'lap'), reg = c => C.sides(c).map(A.regionOfArea);
  check(routes.length >= 30 && C.CROSSINGS[C.CROSSINGS.length - 1].kind === 'lap' && routes.every(c => reg(c)[0] && reg(c)[1] && reg(c)[0] !== reg(c)[1]), `V5: 30+ routes, each joining two different regions, the lap last: ${routes.map(c => c.id + ':' + reg(c)).join(' ')}`);
  for (const r0 of Object.keys(A.REGIONS)) { const seen = new Set([r0]); let grew = true; while (grew) { grew = false; for (const c of routes) { const [x, y] = reg(c); if (seen.has(x) !== seen.has(y)) { seen.add(x); seen.add(y); grew = true; } } }
    check(seen.size === 6, `from the ${r0} region the routes reach every region: ${[...seen]}`); }
  // 2. Each crossing harder than the last, whichever route: over the real late-game save (tests/fixtures/ladder-save.json: a trimmed copy of a real 134-flight save) and the full local backup where it exists.
  const S = await import('../src/save.js'), fixture = __dirname + '/fixtures/ladder-save.json';
  check(fs.existsSync(fixture), 'tests/fixtures/ladder-save.json is missing: this test needs it (it does not skip)');
  const saves = [];
  if (fs.existsSync(fixture)) saves.push(['fixture', S.prepareSave(JSON.parse(fs.readFileSync(fixture, 'utf8')))]);
  const extra = process.env.TESTER_BACKUP || require('os').homedir() + '/contrail-research/tester-backup-2026-11-09.json';
  if (fs.existsSync(extra)) { const r = B.readBackup(fs.readFileSync(extra, 'utf8')); check(r.ok, 'EXTRA (local only): the full backup reads'); if (r.ok) saves.push(['EXTRA full backup (local only)', r.save]); }
  for (const [label, save0] of saves) {
    // V4 (0.73.0, Oliver 2026-11-22/23): each route has its OWN tier; ONE is offered: the shortest of those that open a new region. Flying the offer each time opens every region, then the lap.
    const save = JSON.parse(JSON.stringify(save0)), up = C.upcoming(save).filter(c => c.kind !== 'lap');
    check(up.length > 0 && up.every(c => c.era === C.ROUTE_TIER[c.id]), `${label}: every next route carries its own tier: ${up.map(c => c.id + ':' + c.era)}`);
    let steps = 0;
    while (true) {
      const all = C.upcoming(save).filter(c => c.kind !== 'lap'), offer = C.available(save);
      if (!all.length) break;
      const prevTier = save.crossTierLast ?? -1; check(offer.length === 1 && offer[0].era > prevTier || offer[0].era === Math.max(...C.CROSSINGS.filter(c => c.kind !== 'lap').map(c => c.tier)), `${label}: one crossing on offer, of a higher tier than the last (V5; the top tier may repeat when nothing higher is left): ${offer.map(c => c.id + ':' + c.era)} after tier ${prevTier}`);
      C.completeCrossing(save, offer[0]); steps++; if (steps > 10) break;
    }
    check(Object.keys(A.AREAS).every(k => save.areas.includes(k)) && C.upcoming(save).some(c => c.kind === 'lap'), `${label}: after its last crossing every region is open and the lap is next`);
  }
  // 2a. V5 from EVERY start area: offered in turn, the tiers climb (never the same tier twice, except the top one when nothing higher is left) and the world opens.
  { const top = Math.max(...C.CROSSINGS.filter(c => c.kind !== 'lap').map(c => c.tier));
    for (const start of Object.keys(A.AREAS)) { const sv = { areas: [start], homeArea: start, city: A.AREAS[start].start, crossed: [] }, seq = [];
      for (let k = 0; k < 10; k++) { const o = C.available(sv).filter(c => c.kind !== 'lap'); if (!o.length) break; seq.push(o[0].era); C.completeCrossing(sv, o[0]); }
      const climbs = seq.every((t, i) => i === 0 || t > seq[i - 1] || (t === top && seq[i - 1] === top));
      check(climbs && C.upcoming(sv).some(c => c.kind === 'lap'), `${start}: the ladder climbs and ends at the lap: ${seq}`); } }
  // 2c. V5: THE PICK STICKS. Two routes at the next tier; the first to be ready is picked, and when the other becomes ready too, the pick stays (Oliver: 'the other just never gets a crossing').
  { const HD = (await import('../src/habitats.js')).REGION_DATA, allNature = Object.fromEntries(Object.entries(HD).map(([l, r]) => [l, (r.projects || []).map(p => p.id)]));   // every land's projects: each land part over Medium's 45 (Plan B), so range decides here
    const sv = { areas: ['weurope', 'nordic', 'mideast', 'africa'], homeArea: 'weurope', city: 'ROME', crossed: ['mediterranean'], crossTierLast: 0, areaBest: { weurope: 16000 }, habitat: allNature };
    const first = C.pickCrossing(sv), upNow = C.upcoming(sv).map(c => c.id);
    sv.areaBest = { weurope: 16000, mideast: 16000, nordic: 16000, africa: 16000 };
    const after = C.pickCrossing(sv), off = C.available(sv).map(c => c.id);
    check(first && upNow.length >= 2 && after === first && off.length === 1 && off[0] === first, `the first ready route is picked and kept: picked ${first} of ${upNow}, then ${after}, offered ${off}`); }
  // 2b. THE PACING LEVERS (SEASON.step, 2026-11-13): the n-th crossing's length and nature need come from step.km[n] / step.bioMul[n] x offer.biodiversity; the 5th and the lap keep their lengths
  { const SS = (await import('../src/season.js')).SEASON, km0 = SS.step.km[0], bio0 = SS.step.bioMul[0];
    check(JSON.stringify(SS.step.km.slice(3)) === '[30000,36000]' && SS.crossingKm.final === 40000, `the 4th, 5th and the lap are 30,000 / 36,000 (Plan B 2026-11-24; 27,000 / 32,000 before) / 40,000: ${SS.step.km}, ${SS.crossingKm.final}`);
    try {
      SS.step.km[0] = 12000; SS.step.bioMul[0] = 40 / 30;
      const sv = { areas: ['weurope'], homeArea: 'weurope', city: 'ROME', tutorialDone: true, flightSeconds: 0, bestDistance: 99999 };
      const first = C.available(sv).find(c => c.kind !== 'lap');
      const H = await import('../src/habitats.js'), rich = { ...sv, habitat: { mediterranean: H.REGION_DATA.mediterranean.projects.map(p => p.id) } };   // ROME's land at 56
      check(first && first.km === 12000 && C.natureNeed(first) === 40 && C.readiness(sv, first).nature === false && C.readiness(rich, first).nature === true,
        `the levers move the Easy tier's length and its nature need, read on ROME's land (Plan B): ${first && [first.km, C.natureNeed(first), C.readiness(sv, first).nature, C.readiness(rich, first).nature]}`);
      const lapC = { ...C.CROSSINGS.find(x => x.kind === 'lap') };
      check(C.natureNeed(lapC) === Math.round(SS.offer.biodiversity * SS.step.bioMul[SS.step.bioMul.length - 1]), `the lap asks what the hardest tier asks: ${C.natureNeed(lapC)}`);
    } finally { SS.step.km[0] = km0; SS.step.bioMul[0] = bio0; } }
  // 2d. PLAN B (2026-11-24): with the range there for every route, the one OFFERED is the one whose departure land has grown most (by range alone the sim was offered a desert it never flew over for 160 flights).
  { const HD = (await import('../src/habitats.js')).REGION_DATA, sv = { areas: ['weurope', 'nordic', 'mideast', 'africa'], homeArea: 'weurope', city: 'ROME', crossed: ['mediterranean'], crossTierLast: 0,
      areaBest: { weurope: 60000, nordic: 60000, mideast: 60000, africa: 60000 } };
    const ups = C.upcoming(sv).filter(c => c.kind !== 'lap'), lands = [...new Set(ups.map(c => C.departureLand(c)))], grow = lands[lands.length - 1];
    sv.habitat = { [grow]: HD[grow].projects.slice(0, 6).map(p => p.id) };
    const off = C.available(sv)[0];
    check(lands.length >= 2 && off && C.departureLand(off) === grow, `the route offered leaves from the land with the most nature (${grow}): offered ${off && off.id} from ${off && C.departureLand(off)}; lands ${lands}`); }
  // 3
  const base = () => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], areaBest: {}, crossed: [], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: {}, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const w = base(), c = { ...C.asNext(C.crossingById('mediterranean'), 0), from: 'ROME', to: 'TUNIS' };
  check(!C.planeReady(w, c), 'a fresh pilot: the plane tick is open');
  w.areaBest = { nordic: 19999 }; check(!C.planeReady(w, c), 'V5: a landed flight from ANOTHER area (the Nordic area) does not cover a crossing from Rome (the plane over the departure land)');
  w.areaBest = { weurope: 19999 }; check(C.planeReady(w, c), 'V5: a landed flight from the departure area covers it');
  const w2 = base(); w2.bestDistance = 19999; check(!C.planeReady(w2, c), 'V5: the longest landed flight of all, from elsewhere, does not count');
  // The LAP from the departure area too (Oliver, 2026-11-23: 'I JUST had the Lagos to Lagos crossing and then I flew to Lagos and now I don't have it'): it read the range of
  // the area he stood in, so it was ready from a richer area and gone on landing at home. Its readiness must not depend on where the player is.
  const lapC = { ...C.CROSSINGS.find(x => x.kind === 'lap'), from: 'LONDON', to: 'LONDON', km: 40000 };
  const lapAt = city => { const s = base(); s.city = city; s.capArea = { weurope: { km: 30000 }, africa: { km: 45000 } }; s.capability = { km: city === 'LAGOS' ? 45000 : 30000 }; return C.planeReady(s, lapC); };
  check(lapAt('LAGOS') === lapAt('LONDON') && !lapAt('LAGOS'), `the lap from LONDON: ready ${lapAt('LAGOS')} standing in LAGOS, ${lapAt('LONDON')} in LONDON (its own area's range is 30,000 of 40,000)`);
  const open = V.stateOf(base(), c).conds.find(x => x.key === 'plane');
  check(open.plain === 'More range: upgrade plane' && open.plain.length <= 28, `the open plane line says what to do and fits: "${open.plain}"`);
  console.log(fails.length ? `FAIL crossladder:\n - ${fails.join('\n - ')}` : 'PASS crossladder: 30+ routes join the 6 regions; from every start one crossing on offer, each a higher tier than the last, until every region is open; the range reads the departure land');
  process.exit(fails.length ? 1 : 0);
})();
