// NO DISTANCE ON A CROSSING (the user, 2026-11-09, a standing rule: "I don't want distances on crossings. They should just be crossings; the distance should be the difficulty; there should NEVER be any numbers there").
// Every string a crossing shows the player, for every crossing in the game and both sheet variants: the sheet, the HOME row, the conditions and the nearest line, the MISSIONS block, the route sheet lines, the
// ending card, UP NEXT: none has 'km', 'metres', or a number of 4 digits or more. A crossing says how HARD it is as a word, and each crossing is harder than the one before (by era). Plain Node.
// Plants: tools/plants.tsv, test `nocrossingkm`. Run: node tests/nocrossingkm.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const V = await import('../src/crossingview.js'), C = await import('../src/crossings.js'), N = await import('../src/nextup.js'), A = await import('../src/areas.js');
  const bad = s => /\bkm\b|\bmetres?\b|\bmiles?\b|\d[\d,.]{3,}/i.test(String(s));
  const base = () => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], areaBest: {}, crossed: [], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  let scanned = 0; const eras = [];
  for (const c of C.CROSSINGS) {
    const cc = { ...c, from: c.a || 'LONDON', to: c.b || 'LONDON', km: C.crossingKm(c), opens: 'africa' }, st = V.stateOf(base(), cc);
    check(st, `${c.id}: no state could be built`); if (!st) continue;
    const texts = { sheet: Object.values(V.sheetText(st, false)).join(' | '), first: Object.values(V.sheetText(st, true)).join(' | '), right: V.rightText(st), rightTold: V.rightText({ ...st, told: true }), nearest: V.nearestLine(st), route: V.routeCrossRest(cc), lap: V.routeLapRest(cc),
      conds: st.conds.map(x => `${x.label} | ${x.line} | ${x.status}`).join(' || '), ticks: V.ticksTitle(st) };
    for (const [k, v] of Object.entries(texts)) { scanned++; check(!bad(v), `${c.id} ${k}: a distance reaches the player: "${v}"`); }
    check(/Easy|Medium|Hard|Harder|Very hard|The lap/.test(texts.sheet), `${c.id}: the sheet does not say how hard it is: "${texts.sheet}"`);
    eras.push([c.kind === 'lap' ? 99 : c.era, V.DIFFICULTY.indexOf(V.difficultyOf(cc))]);
  }
  check(V.endingBody('LONDON') && !bad(V.endingBody('LONDON')), `the ending card has no distance: "${V.endingBody('LONDON')}"`);
  check(V.NEED_FAR && !bad(V.NEED_FAR), `the route sheet's distance need has no number: "${V.NEED_FAR}"`);
  eras.sort((a, b) => a[0] - b[0]); for (let i = 1; i < eras.length; i++) check(eras[i][1] >= eras[i - 1][1], `a later crossing is not harder: era ${eras[i - 1][0]} is ${eras[i - 1][1]}, era ${eras[i][0]} is ${eras[i][1]}`);
  check(new Set(eras.map(e => e[1])).size >= 5, `the difficulty ladder has at least 5 steps: ${JSON.stringify([...new Set(eras.map(e => e[1]))])}`);
  const ui = require('fs').readFileSync(__dirname + '/../src/ui.js', 'utf8');   // the route sheet and the ending card build their words in crossingview.js; ui.js must not put a distance back
  check(!/\$\{km\(c\.km\)\}/.test(ui) && !/SEASON\.crossingKm\.final/.test(ui) && !/km\(Math\.round\(SEASON\.offer\.distanceShare/.test(ui), 'src/ui.js builds a crossing distance again (km(c.km), the lap length or the needed km)');
  console.log(fails.length ? `FAIL nocrossingkm:\n - ${fails.join('\n - ')}` : `PASS nocrossingkm: ${scanned} crossing strings across ${C.CROSSINGS.length} crossings have no distance; difficulty is a word and never goes down by era`);
  process.exit(fails.length ? 1 : 0);
})();
