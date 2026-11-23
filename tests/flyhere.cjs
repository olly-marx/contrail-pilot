// FLY HERE's choice (src/flyhere.js flyHereChoice; the owner, 2026-11-18: 'select fly here, so that you can fly to a natural area if you're not already there'). Plain Node, season 2.
//  1. away from the land, the land reachable: the land's city with the FEWEST hops from save.city (checked against every city of the land by pathTo), ties in the network's order.
//  2. a land that spans areas (KARACHI is desert in South Asia): an Asia player gets KARACHI.
//  3. in the land: 'here'.
//  4. not reachable: the crossing on offer that opens a region holding one of its cities (Europe: ROME > TUNIS; North America: none yet, V5: its next-tier route goes to South America).
//  5. not reachable and no crossing on offer opens it: 'closed' with no crossing.
// Plants: tools/plants.tsv, test `flyhere`. Run: node tests/flyhere.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const F = await import('../src/flyhere.js'), R = await import('../src/route.js'), X = await import('../src/crossings.js');
  const base = o => ({ tutorialDone: true, homeArea: 'weurope', homeCity: 'LONDON', areas: ['weurope'], city: 'LONDON', visited: ['LONDON'], ...o });
  const landOf = c => (R.city(c) || {}).region;
  // 1. the nearest city by hops, brute force against every city of the land
  for (const s of [base({ areas: ['weurope', 'africa'], city: 'ROME' }), base({ areas: ['weurope', 'africa'], city: 'LONDON' }), base({ areas: ['weurope', 'africa'], city: 'TUNIS' }), base({ areas: ['weurope', 'africa'], city: 'NAIROBI' })]) {
    const L = R.linksFor(s), ways = Object.keys(L).filter(c => landOf(c) === 'desert').map(c => ({ c, n: R.pathTo(s.city, c, L).length - 1 })), min = Math.min(...ways.map(w => w.n)), first = ways.find(w => w.n === min);
    const ch = F.flyHereChoice(s, 'desert');
    check(ch && ch.kind === 'go' && ch.city === first.c && ch.hops === min, `from ${s.city}: the desert city with the fewest hops (${first.c}, ${min}): ${JSON.stringify(ch)}`);
  }
  { const ch = F.flyHereChoice(base({ areas: ['weurope', 'africa'], city: 'ROME' }), 'desert'); check(ch && ch.city === 'CAIRO' && ch.hops === 2, `ROME, Africa open: CAIRO in 2 hops: ${JSON.stringify(ch)}`); }
  { const ch = F.flyHereChoice(base({ areas: ['weurope', 'africa'], city: 'TUNIS' }), 'desert'); check(ch && ch.city === 'TAMANRASSET' && ch.hops === 1, `TUNIS: TAMANRASSET next door: ${JSON.stringify(ch)}`); }
  // 2. a land across areas
  { const ch = F.flyHereChoice(base({ homeArea: 'sasia', homeCity: 'KOLKATA', areas: ['sasia'], city: 'KOLKATA' }), 'desert'); check(ch && ch.kind === 'go' && ch.city === 'KARACHI', `an Asia player's desert city is KARACHI: ${JSON.stringify(ch)}`); }
  // 3. in the land
  { const ch = F.flyHereChoice(base({ areas: ['weurope', 'africa'], city: 'CAIRO' }), 'desert'); check(ch && ch.kind === 'here', `in CAIRO the desert is 'here': ${JSON.stringify(ch)}`); }
  { const ch = F.flyHereChoice(base({ city: 'LONDON' }), 'woodland'); check(ch && ch.kind === 'here', `in LONDON the woodland is 'here': ${JSON.stringify(ch)}`); }
  // 4. not reachable: the crossing that opens it
  { const ch = F.flyHereChoice(base({ city: 'ROME' }), 'desert'); check(ch && ch.kind === 'closed' && ch.from === 'ROME' && ch.to === 'TUNIS', `Europe only: cross ROME > TUNIS to reach the desert: ${JSON.stringify(ch)}`); }
  { const s = base({ homeArea: 'namerica', homeCity: 'DENVER', areas: ['namerica'], city: 'DENVER' }), up = X.upcoming(s), ch = F.flyHereChoice(s, 'desert');
    // V5 (0.73.2): only the routes at the NEXT tier count; from North America that is the Easy one into South America, so Asia's desert has no crossing yet.
    check(up.length >= 1 && up.every(u => u.region !== 'asia'), `power: North America's next-tier routes do not go to Asia: ${up.map(u => u.region)}`);
    check(ch && ch.kind === 'closed' && !ch.from, `North America: the desert (Asia) is closed with no crossing on offer yet: ${JSON.stringify(ch)}`); }
  // 5. nothing on offer opens it
  { const ch = F.flyHereChoice(base({ city: 'ROME' }), 'eastasia'); check(ch && ch.kind === 'closed' && ch.from === null && ch.to === null, `Europe only: no single crossing opens East Asia: ${JSON.stringify(ch)}`); }
  console.log(fails.length ? `FAIL flyhere:\n - ${fails.join('\n - ')}` : 'PASS flyhere: FLY HERE picks the land\'s nearest city by hops, says "here" in the land, and names the crossing that opens an unreachable land');
  process.exit(fails.length ? 1 : 0);
})();
