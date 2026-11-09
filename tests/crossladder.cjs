// THE LADDER AND THE PLANE TICK (src/crossings.js LADDER / ladderSplit / planeReady, src/crossingview.js crossingState; CROSSINGS V2, the user's feedback 2026-11-09). Plain Node.
//   1. the declared ladder holds every crossing once, the lap last, by era (never down);
//   2. 'only harder': over a trimmed copy of a real late-game save (tests/fixtures/ladder-save.json; the full local backup too where it exists) (crossed warsaw-stockholm, north-atlantic, mediterranean, mexico-panama) the NEXT crossing is READY and above north-atlantic's rung (north-pacific); the lower ones are kept: a
//      lower one that is the only way to open an area stays a candidate (patagonia, arabian-sea: no higher crossing opens those areas), the others are listed under 'an easier one' (khartoum-addis, silk-road);
//   3. the plane tick counts a landed flight from ANY area (a flight from the Nordic area covers a Western Europe crossing) and its open line says what to do ('Fly farther or upgrade plane', fits 28).
// Plants: tools/plants.tsv, test `crossladder`. Run: node tests/crossladder.cjs
globalThis.SEASON2 = true;
(async () => {
  const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const C = await import('../src/crossings.js'), V = await import('../src/crossingview.js'), B = await import('../src/backup.js'), fs = require('fs');
  // 1
  const ids = C.CROSSINGS.map(c => c.id);
  check(C.LADDER.length === ids.length && new Set(C.LADDER).size === C.LADDER.length && ids.every(i => C.LADDER.includes(i)) && C.LADDER[C.LADDER.length - 1] === 'lap', `the ladder holds every crossing once, the lap last: ${C.LADDER.length} vs ${ids.length}`);
  for (let i = 1; i < C.LADDER.length; i++) check(C.crossingById(C.LADDER[i]).era >= C.crossingById(C.LADDER[i - 1]).era, `the ladder never goes down an era: ${C.LADDER[i - 1]} then ${C.LADDER[i]}`);
  // 2. over a real late-game save. The FIXTURE (tests/fixtures/ladder-save.json: a trimmed copy of a real 134-flight save, only the numbers the test reads, no pilot name, code or timestamps) must exist:
  // a test that skips itself where a private file is missing proves nothing in CI, so a missing fixture FAILS. An EXTRA check against the full local backup runs only on the machine that has it (clearly labelled).
  const S = await import('../src/save.js'), fixture = __dirname + '/fixtures/ladder-save.json';
  check(fs.existsSync(fixture), 'tests/fixtures/ladder-save.json is missing: this test needs it (it does not skip)');
  const saves = [];
  if (fs.existsSync(fixture)) saves.push(['fixture', S.prepareSave(JSON.parse(fs.readFileSync(fixture, 'utf8')))]);
  const extra = process.env.LOLA || require('os').homedir() + '/contrail-research/lola-backup-2026-11-09.json';
  if (fs.existsSync(extra)) { const r = B.readBackup(fs.readFileSync(extra, 'utf8')); check(r.ok, 'EXTRA (local only): the full backup reads'); if (r.ok) saves.push(['EXTRA full backup (local only)', r.save]); }
  for (const [label, save] of saves) {
  const top = C.topRung(save), na = C.rungOf('north-atlantic');
  check(top === na, `${label}: the highest crossed rung is north-atlantic's: ${top} vs ${na}`);
  const st = V.crossingState(save);
  check(st && st.ready && C.rungOf(st.id) > na && st.id === 'north-pacific', `${label}: NEXT is a READY crossing above north-atlantic's rung (north-pacific): ${st && [st.id, st.ready, C.rungOf(st.id)]}`);
  const sp = C.ladderSplit(save), idsOf = l => l.map(c => c.id).sort();
  check(idsOf(sp.higher).includes('north-pacific') && idsOf(sp.higher).includes('south-atlantic') && sp.higher.every(c => C.rungOf(c) > na), `${label}: higher crossings: ${idsOf(sp.higher)}`);
  check(JSON.stringify(idsOf(sp.exception)) === JSON.stringify(['arabian-sea', 'patagonia']), `${label}: the only ways to open an area stay candidates: ${idsOf(sp.exception)}`);
  check(idsOf(sp.easier).includes('khartoum-addis') && idsOf(sp.easier).includes('silk-road'), `${label}: the other lower ones are 'an easier one': ${idsOf(sp.easier)}`);
  const listed = ((st && st.easier) || []).map(e => e.id); check(['khartoum-addis', 'silk-road', 'patagonia', 'arabian-sea'].every(i => listed.includes(i)) && !listed.includes('north-pacific'), `${label}: the screen lists the lower ones: ${listed}`);
  }
  // 3
  const base = () => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], areaBest: {}, crossed: [], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: {}, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const w = base(), c = { ...C.crossingById('warsaw-stockholm'), from: 'WARSAW', to: 'STOCKHOLM', km: 6500 };
  check(!C.planeReady(w, c), 'a fresh pilot: the plane tick is open');
  w.areaBest = { nordic: 9999 }; check(C.planeReady(w, c), 'a landed flight from ANOTHER area (the Nordic area) covers a Western Europe crossing');
  const w2 = base(); w2.bestDistance = 9999; check(C.planeReady(w2, c), 'the longest landed flight of all counts');
  const open = V.stateOf(base(), c).conds.find(x => x.key === 'plane');
  check(open.plain === 'Fly farther or upgrade plane' && open.plain.length <= 28, `the open plane line says what to do and fits: "${open.plain}"`);
  console.log(fails.length ? `FAIL crossladder:\n - ${fails.join('\n - ')}` : 'PASS crossladder: the ladder is declared and never goes down; over the real save the next crossing is north-pacific, above north-atlantic; the plane tick counts a flight from any area');
  process.exit(fails.length ? 1 : 0);
})();
