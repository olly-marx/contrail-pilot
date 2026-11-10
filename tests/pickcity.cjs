// TAP ANY CITY, the card (src/pickcity.js; ROUTING V2 step 1). Plain Node, no browser. For every city and every area state: 'here', 'closed' ('Opens with the <crossing> crossing', the crossing really touches that area), 'noroute' (the stepping stones;
// Patagonia before its crossing), 'ok' (stops = the shortest way's hops; dots at most 6 then a plus); no distance reaches the player; every crossing has a plain name; the tap picks the NEAREST dot within the radius.
// Plants: tools/plants.tsv, test `pickcity`. Run: node tests/pickcity.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const P = await import('../src/pickcity.js'), A = await import('../src/areas.js'), C = await import('../src/crossings.js'), R = await import('../src/route.js'), N = await import('../src/network.js'), CT = await import('../src/cities.js');
  const bad = s => /\bkm\b|\d{3,}|miles?/i.test(s);
  // 1. every crossing has a plain, short name
  for (const c of C.CROSSINGS) check(typeof P.CROSSING_NAMES[c.id] === 'string' && P.CROSSING_NAMES[c.id].length >= 3 && P.CROSSING_NAMES[c.id].length <= 22 && !/\d/.test(P.CROSSING_NAMES[c.id]), `crossing ${c.id} has a plain name (3 to 22 letters, no number): ${P.CROSSING_NAMES[c.id]}`);
  // 2. every city in every single-area state
  let cards = 0; const seen = { here: 0, closed: 0, ok: 0, noroute: 0 };
  for (const k of Object.keys(A.AREAS)) {
    const save = { areas: [k], tutorialDone: true, homeArea: k, city: A.AREAS[k].start };
    for (const c of CT.CITIES) {
      const d = P.cityCard(save, c.name); cards++; seen[d.state]++;
      const area = A.areaOf(c.name), open = area === k;
      check(!bad(d.line), `${k}/${c.name}: a distance or a long number reaches the player: "${d.line}"`);
      check(d.line.length <= 48, `${k}/${c.name}: the line is short (${d.line.length}): "${d.line}"`);
      if (c.name === save.city) { check(d.state === 'here' && !d.canFly, `${k}/${c.name}: your own city says you are here and cannot fly`); continue; }
      if (open) {
        const path = R.pathTo(save.city, c.name, R.linksFor(save));
        check(d.state === 'ok' && d.canFly && d.stops === path.length - 1 && d.dots === Math.min(d.stops, 6) && d.moreDots === (d.stops > 6) && d.line === `${d.stops} stop${d.stops === 1 ? '' : 's'}`, `${k}/${c.name}: an open city is 'ok' with its stops: ${JSON.stringify(d)}`);
      } else if (area) {
        const x = C.CROSSINGS.find(z => z.id === d.crossing);
        check(d.state === 'closed' && !d.canFly && x && C.sides(x).includes(area) && d.line === `Opens with the ${P.CROSSING_NAMES[x.id]} crossing`, `${k}/${c.name}: a closed-area city names a crossing that touches its area and cannot fly: ${JSON.stringify(d)}`);
      } else check(d.state === 'noroute' && !d.canFly, `${k}/${c.name}: a stepping stone (no area) has no route: ${JSON.stringify(d)}`);
    }
  }
  check(cards > 800 && seen.ok > 60 && seen.closed > 500 && seen.here === Object.keys(A.AREAS).length, `power: ${cards} cards, ${JSON.stringify(seen)} (a sweep that checks nothing proves nothing)`);
  // 3. the far end of the world: all areas open, the longest way has more than 6 stops and shows a plus
  const all = { areas: Object.keys(A.AREAS), tutorialDone: true, homeArea: 'weurope', city: 'LONDON', crossed: ['patagonia'] };
  let most = null; for (const c of CT.CITIES) { const d = P.cityCard(all, c.name); if (d.state === 'ok' && (!most || d.stops > most.stops)) most = d; }
  check(most && most.stops > 6 && most.moreDots === true && most.dots === 6, `the longest way shows six dots and a plus: ${JSON.stringify(most)}`);
  // 4. Patagonia: before its crossing there is no route and the card says which crossing flies there; after it, an ordinary route
  const before = { ...all, areas: all.areas.filter(k => k !== 'samerica'), crossed: [] };   // Patagonia open, South America (the Patagonia crossing) not yet
  const pb = P.cityCard(before, 'PUNTA ARENAS'), pa = P.cityCard(all, 'PUNTA ARENAS');
  check(pb.state === 'noroute' && pb.line === 'The Patagonia crossing flies there.' && !pb.canFly, `Patagonia while samerica is closed: ${JSON.stringify(pb)}`);
  check(pa.state === 'ok' && pa.canFly && pa.stops >= 3, `Patagonia once South America is open is an ordinary route: ${JSON.stringify(pa)}`);
  // 4b. the closed card names the FIRST crossing on the ladder (the one the player meets first): Sydney from Western Europe is the Tasman crossing, which precedes the Timor Sea one
  const sy = P.cityCard({ areas: ['weurope'], tutorialDone: true, homeArea: 'weurope', city: 'LONDON' }, 'SYDNEY');
  check(sy.state === 'closed' && sy.crossing === 'tasman' && sy.line === 'Opens with the Tasman crossing' && C.LADDER.indexOf('tasman') < C.LADDER.indexOf('jakarta-darwin'), `Sydney names the first crossing on the ladder (Tasman): ${JSON.stringify(sy)}`);
  // 5. a city that does not exist is not a card
  check(P.cityCard(all, 'ATLANTIS') === null, 'an unknown city gives no card');
  // 6. the tap picks the NEAREST dot within the radius, and nothing beyond it
  const dots = [{ name: 'A', x: 10, y: 10 }, { name: 'B', x: 14, y: 10 }, { name: 'C', x: 40, y: 40 }];
  const n1 = P.nearestDot(dots, 13, 10, 8), n2 = P.nearestDot(dots, 100, 100, 8), n3 = P.nearestDot(dots, 40, 38, 8), n4 = P.nearestDot([...dots].reverse(), 12, 10, 8);
  check(n1 && n1.name === 'B', `the nearest dot wins over the first in the list: ${n1 && n1.name}`);
  check(n2 === null, 'a tap far from every dot picks nothing');
  check(n3 && n3.name === 'C', 'a tap near an isolated dot picks it');
  check(n4 && n4.name === 'B', `an exact tie goes to the first in the list (deterministic): ${n4 && n4.name}`);
  console.log(fails.length ? `FAIL pickcity:\n - ${fails.slice(0, 10).join('\n - ')}${fails.length > 10 ? `\n ... ${fails.length - 10} more` : ''}` : `PASS pickcity: ${cards} cards across every single-area state say here, ok with stops, closed with the crossing, or no route; no distance; the nearest dot wins`);
  process.exit(fails.length ? 1 : 0);
})();
