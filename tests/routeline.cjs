// THE ROUTE OF A TAPPED CITY (src/pickcity.js routeOf; ROUTE ON THE MAP R1, research/ROUTE-ON-MAP-PLAN.md). Plain Node. For every city of every area state: the whole way the globe will draw: it begins at the player's city, ends at the tapped city, has stops + 1 cities,
// every step is a link of the open network, it is the shortest way (equals pathTo), it never uses a city of a closed area, it is deterministic; a card that cannot fly (here, closed, no route) has no route. Plants: tools/plants.tsv, test `routeline`. Run: node tests/routeline.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const P = await import('../src/pickcity.js'), A = await import('../src/areas.js'), R = await import('../src/route.js'), CT = await import('../src/cities.js');
  let routes = 0, none = 0, longest = 0;
  for (const k of Object.keys(A.AREAS)) {
    const save = { areas: [k], tutorialDone: true, homeArea: k, city: A.AREAS[k].start }, L = R.linksFor(save);
    for (const c of CT.CITIES) {
      const card = P.cityCard(save, c.name), way = P.routeOf(save, c.name);
      if (card.state !== 'ok') { none++; check(way === null, `${k}/${c.name}: a card that cannot fly has no route: ${JSON.stringify(way)}`); continue; }
      if (!way) { check(false, `${k}/${c.name}: a card that can fly has a route (it is null)`); continue; }
      routes++; longest = Math.max(longest, way.length);
      check(way[0] === save.city && way[way.length - 1] === c.name && way.length === card.stops + 1, `${k}/${c.name}: the route begins here, ends at the city and has stops + 1 cities: ${way} (stops ${card.stops})`);
      check(way.every((x, i) => !i || L[way[i - 1]].includes(x)), `${k}/${c.name}: every step is a link: ${way}`);
      check(JSON.stringify(way) === JSON.stringify(R.pathTo(save.city, c.name, L)), `${k}/${c.name}: it is the shortest way`);
      check(way.every(x => x in L), `${k}/${c.name}: no city outside the open network: ${way}`);
      check(JSON.stringify(P.routeOf(save, c.name)) === JSON.stringify(way), `${k}/${c.name}: the same twice (no random numbers)`);
    }
  }
  check(routes > 60 && none > 500 && longest >= 3, `power: ${routes} routes, ${none} without, the longest holds ${longest} cities`);
  // all areas open: the longest route in the world is long (the globe must be able to draw it whole)
  const all = { areas: Object.keys(A.AREAS), tutorialDone: true, homeArea: 'weurope', city: 'LONDON', crossed: ['patagonia'] }; let far = 0;
  for (const c of CT.CITIES) { const w = P.routeOf(all, c.name); if (w) far = Math.max(far, w.length - 1); }
  check(far >= 7, `with every area open some city is 7 or more stops away (the globe route must not be cut at 5): ${far}`);
  // HOW FAR (ROUTE ON THE MAP R2): airports passed, the trip as one flight in game km rounded to 100, the verdict only when the reach is known and exceeded
  const R2 = await import('../src/route.js'), base = { areas: ['weurope', 'mideast', 'africa', 'sasia', 'easia'], tutorialDone: true, homeArea: 'weurope', city: 'LONDON' }, LB = R2.linksFor(base);
  let trips = 0, verdicts = 0;
  for (const c of CT.CITIES) {
    const way = P.routeOf(base, c.name); if (!way) continue; trips++;
    const raw = way.slice(1).reduce((a, x, i) => a + R2.legBetween(way[i], x), 0), t = P.tripLine(base, c.name);
    check(t.airports === way.length - 2 && P.routeKm(way) === raw && t.km === Math.round(raw / 100) * 100 && t.km % 100 === 0, `LONDON>${c.name}: airports ${t.airports} (want ${way.length - 2}), km ${t.km} (want ${Math.round(raw / 100) * 100})`);
    check(t.verdict === null && !/%|range|capability/i.test(t.line) && t.line.length <= 48 && /about [\d,]+ km\./.test(t.line), `LONDON>${c.name}: with no reach known there is no verdict and the line is plain and short: "${t.line}"`);
    const tall = P.tripLine({ ...base, bestDistance: raw - 1 }, c.name), within = P.tripLine({ ...base, bestDistance: raw + 1 }, c.name);
    check(tall.verdict === 'More than one flight: stops help.' && within.verdict === null, `LONDON>${c.name}: the verdict appears exactly when the trip is longer than the best landed flight (${raw}): ${tall.verdict} / ${within.verdict}`); if (tall.verdict) verdicts++;
  }
  check(trips > 60 && verdicts > 60, `power: ${trips} trips, ${verdicts} with a verdict`);
  check(P.reachKm({ ...base, bestDistance: 4550 }) === 4550 && P.reachKm(base) === 0, 'reach is the longest landed flight, and 0 when nothing is known');
  { const direct = Object.keys(LB).map(n => ['LONDON', ...LB['LONDON']]).length && P.tripLine(base, LB['LONDON'][0]); check(direct && direct.airports === 0 && /^Direct, about/.test(direct.line), `a neighbour is 'Direct': ${direct && direct.line}`); }
  console.log(fails.length ? `FAIL routeline:\n - ${fails.slice(0, 10).join('\n - ')}${fails.length > 10 ? `\n ... ${fails.length - 10} more` : ''}` : `PASS routeline: ${routes} routes in 10 area states begin here, end at the tapped city, are shortest, linked and inside the open network; cards that cannot fly have none; the longest is ${far} stops`);
  process.exit(fails.length ? 1 : 0);
})();
