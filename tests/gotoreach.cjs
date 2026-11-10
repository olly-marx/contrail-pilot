// EVERY READY CROSSING'S DEPARTURE AIRPORT CAN BE REACHED (CROSSINGS V2 step 3; like tests/missionreach.cjs). GO TO sends the player to a crossing's departure city over the open network (src/route.js linksFor: the cities of the
// opened areas plus the declared bridges). For every crossing and every state it can be offered in (the area it leaves from open alone, and with every other area open except the one it opens), a route must exist from EVERY city of
// the open areas to the departure city. Plain Node. KNOWN GAPS, declared and asserted (a fix must flip them): a crossing that leaves from a stepping stone (HONOLULU, NADI) when the Pacific is open: the stones belong to no area, so
// they are not in the network; the game then says 'Ready! Tap to cross.' and the crossing starts where the player is (src/crossingview.js boxView). Plants: tools/plants.tsv, test `gotoreach`. Run: node tests/gotoreach.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const A = await import('../src/areas.js'), C = await import('../src/crossings.js'), R = await import('../src/route.js');
  const KNOWN = ['HONOLULU', 'NADI'];
  // KNOWN GAP 2 (measured 2026-11-10): Patagonia (PUNTA ARENAS, PUERTO MADRYN, BALMACEDA) has no ordinary flight link to any other land, so no city outside it reaches a departure inside it and the reverse; only its crossing joins it. The box then says 'Ready! Tap to cross.' (hops null). These five crossings are the ones affected.
  const ISO = ['auckland-santiago', 'caribbean', 'mexico-panama', 'patagonia', 'south-atlantic'], isoSeen = new Set(), pat = n => A.AREAS.patagonia.cities.includes(n);
  const gaps = new Set(); let routes = 0, states = 0;
  for (const c of C.CROSSINGS.filter(x => x.kind !== 'lap')) {
    const [sa, sb] = C.sides(c);
    for (const [openSide, farSide, from, to] of [[sa, sb, c.a, c.b], [sb, sa, c.b, c.a]]) {
      const configs = [openSide === 'ocean' ? [] : [openSide], Object.keys(A.AREAS).filter(k => k !== farSide)];
      for (const areas of configs) {
        const save = { areas: openSide === 'ocean' ? [...areas, 'ocean'] : [...areas], tutorialDone: true, homeArea: areas[0] || 'weurope', city: from };
        if (openSide === 'ocean' && !areas.length) { gaps.add(from); continue; }   // a stone departure with no area open at all: nothing to route from
        const L = R.linksFor(save); states++;
        const offered = C.upcoming(save).find(x => x.id === c.id);
        if (!offered) continue;
        if (!L[offered.from]) { gaps.add(offered.from); continue; }
        for (const k of areas) for (const city of A.AREAS[k].cities) { if (pat(city) !== pat(offered.from)) { isoSeen.add(c.id); continue; } routes++; check(R.pathTo(city, offered.from, L), `${c.id}: no route from ${city} to its departure ${offered.from} with ${areas.length} area(s) open`); }
      }
    }
  }
  check(JSON.stringify([...gaps].sort()) === JSON.stringify(KNOWN.slice().sort()), `the stepping-stone gaps are exactly ${JSON.stringify(KNOWN)}: found ${JSON.stringify([...gaps].sort())}`);
  check(JSON.stringify([...isoSeen].sort()) === JSON.stringify(ISO), `the Patagonia-isolation gaps are exactly ${JSON.stringify(ISO)}: found ${JSON.stringify([...isoSeen].sort())}`);
  check(routes > 1000 && states > 40, `power: ${routes} routes in ${states} states (a sweep that checks nothing proves nothing)`);
  console.log(fails.length ? `FAIL gotoreach:\n - ${fails.slice(0, 10).join('\n - ')}${fails.length > 10 ? `\n ... ${fails.length - 10} more` : ''}` : `PASS gotoreach: ${routes} routes in ${states} states: every city of every open area reaches every offered crossing's departure city; the declared gaps are only ${KNOWN.join(' and ')}`);
  process.exit(fails.length ? 1 : 0);
})();
