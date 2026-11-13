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
  check(routes.length === 8 && C.CROSSINGS[C.CROSSINGS.length - 1].kind === 'lap' && routes.every(c => reg(c)[0] && reg(c)[1] && reg(c)[0] !== reg(c)[1]), `8 routes, each joining two different regions, the lap last: ${routes.map(c => c.id + ':' + reg(c)).join(' ')}`);
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
    const save = JSON.parse(JSON.stringify(save0)), n0 = C.crossingsMade(save), up = C.upcoming(save).filter(c => c.kind !== 'lap');
    check(A.regionsOpen(save.areas).length === n0 + 1 && up.length > 0 && up.every(c => c.era === n0), `${label}: the old save opens whole regions (${A.regionsOpen(save.areas)}) and every next route is crossing ${n0 + 1} (era ${n0}): ${up.map(c => c.id + ':' + c.era)}`);
    let prev = n0 - 1, steps = 0;
    while (true) { const nx = C.upcoming(save).find(c => c.kind !== 'lap'); if (!nx) break; check(nx.era === prev + 1 && nx.km > (prev >= 0 ? C.crossingKm({ era: prev }) : 0), `${label}: crossing ${nx.era + 1} (${nx.id}) is harder than the last: era ${nx.era}, ${nx.km} km`); prev = nx.era; C.completeCrossing(save, nx); steps++; if (steps > 6) break; }
    check(Object.keys(A.AREAS).every(k => save.areas.includes(k)) && C.upcoming(save).some(c => c.kind === 'lap'), `${label}: after its last crossing every region is open and the lap is next`);
  }
  // 2b. THE PACING LEVERS (SEASON.step, 2026-11-13): the n-th crossing's length and nature need come from step.km[n] / step.bio[n]; the 5th and the lap keep their lengths
  { const SS = (await import('../src/season.js')).SEASON, km0 = SS.step.km[0], bio0 = SS.step.bio[0];
    check(JSON.stringify(SS.step.km.slice(3)) === '[27000,30000]' && SS.crossingKm.final === 40000, `the 4th, 5th and the lap keep 27,000 / 30,000 / 40,000 (the user: no shortening): ${SS.step.km}, ${SS.crossingKm.final}`);
    try {
      SS.step.km[0] = 9000; SS.step.bio[0] = 40;
      const sv = { areas: ['weurope'], homeArea: 'weurope', city: 'ROME', tutorialDone: true, flightSeconds: 0, bestDistance: 99999 };
      const first = C.available(sv).find(c => c.kind !== 'lap');
      check(first && first.km === 9000 && C.natureNeed(first) === 40 && C.readiness(sv, first).nature === false, `a lever moves the first crossing: ${first && [first.km, C.natureNeed(first)]}`);
    } finally { SS.step.km[0] = km0; SS.step.bio[0] = bio0; } }
  // 3
  const base = () => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], areaBest: {}, crossed: [], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: {}, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const w = base(), c = { ...C.asNext(C.crossingById('mediterranean'), 0), from: 'ROME', to: 'TUNIS' };
  check(!C.planeReady(w, c), 'a fresh pilot: the plane tick is open');
  w.areaBest = { nordic: 9999 }; check(C.planeReady(w, c), 'a landed flight from ANOTHER area (the Nordic area) covers a crossing from Rome');
  const w2 = base(); w2.bestDistance = 9999; check(C.planeReady(w2, c), 'the longest landed flight of all counts');
  const open = V.stateOf(base(), c).conds.find(x => x.key === 'plane');
  check(open.plain === 'Fly farther or upgrade plane' && open.plain.length <= 28, `the open plane line says what to do and fits: "${open.plain}"`);
  console.log(fails.length ? `FAIL crossladder:\n - ${fails.join('\n - ')}` : 'PASS crossladder: 8 routes join the 6 regions from every start; each crossing is harder than the last over the real save; the plane tick counts a flight from any area');
  process.exit(fails.length ? 1 : 0);
})();
