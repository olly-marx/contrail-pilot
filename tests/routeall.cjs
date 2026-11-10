// THE DEFAULT DESTINATION, every opened city (src/destination.js, src/route.js flightPath; ROUTING V2 step 2). Plain Node. With nothing chosen the flight goes to the NEAREST UNVISITED city: fewest hops over the open network, ties in link order, the first city not in
// save.visited AT DISCOVERY in a breadth-first search from save.city (the sim chat's measured rule, 2026-11-10); it flies THROUGH the hops (the path is the whole shortest way, never a landing at each hop); when everything reachable is visited, today's old tour carries on
// (an unmeasured nicer rule is a later step); a save with no city, a tutorial not done and the A/B switch off keep the old path. From every opened city, for every area set: a default exists unless all are visited, it is the nearest, the path is linked,
// ends are inside the open network (no closed city), deterministic. Plants: tools/plants.tsv, test `routeall`. Run: node tests/routeall.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const R = await import('../src/route.js'), D = await import('../src/destination.js'), A = await import('../src/areas.js');
  const keys = Object.keys(A.AREAS);
  const sets = [...keys.map(k => [k]), ['weurope', 'mideast'], ['weurope', 'nordic', 'africa'], keys];
  // The spec as a reference: breadth-first from `from`, neighbours in link order, return the first city not visited AT DISCOVERY.
  const ref = (L, from, visited) => { const seen = new Set([from]); let q = [from]; while (q.length) { const nx = []; for (const c of q) for (const n of L[c]) { if (seen.has(n)) continue; seen.add(n); if (!visited.has(n)) return n; nx.push(n); } q = nx; } return null; };
  const dist = (L, a) => { const d = { [a]: 0 }, q = [a]; while (q.length) { const x = q.shift(); for (const n of L[x]) if (!(n in d)) { d[n] = d[x] + 1; q.push(n); } } return d; };
  let states = 0, cities = 0, nulls = 0;
  for (const areas of sets) {
    const base = { areas, tutorialDone: true, homeArea: areas[0], city: A.AREAS[areas[0]].start, visited: [] }, L = R.linksFor(base), names = Object.keys(L);
    for (const c of names) {
      for (const vis of [[c], names.filter((_, i) => i % 2 === 0), names.filter(n => n !== c && L[c].includes(n))]) {
        const save = { ...base, city: c, visited: vis }, V = new Set([...vis, c]), want = ref(L, c, V), got = D.defaultTargetFrom(L, c, vis);
        states++; cities++;
        if (got !== want) { check(false, `${areas.join('+')}/${c}: the default is ${got}, the spec says ${want}`); continue; }
        const path = R.flightPath(save, 8);
        check(path[0] === c && path.length === 9, `${areas.join('+')}/${c}: the path starts here and holds 9 cities: ${path.length}`);
        check(path.every((x, i) => !i || L[path[i - 1]].includes(x)), `${areas.join('+')}/${c}: every step of the path is a link of the open network: ${path}`);
        if (want) {
          const d = dist(L, c), way = R.pathTo(c, want, L), unv = names.filter(n => !V.has(n) && n in d), best = Math.min(...unv.map(n => d[n]));
          check(d[want] === best, `${areas.join('+')}/${c}: ${want} is ${d[want]} hops away but the nearest unvisited is ${best}`);
          check(JSON.stringify(path.slice(0, way.length)) === JSON.stringify(way), `${areas.join('+')}/${c}: the path begins with the whole shortest way to ${want} (through the hops, no landing at each): ${path.slice(0, way.length)} vs ${way}`);
          check(JSON.stringify(R.flightPath(save, 8)) === JSON.stringify(path), `${areas.join('+')}/${c}: the path is the same twice (no random numbers)`);
        } else nulls++;
      }
    }
  }
  check(states > 800 && nulls >= 0 && cities > 800, `power: ${states} states, ${nulls} with everything visited`);
  // all visited (nothing unvisited reachable): today's old tour carries on, the same as with the switch off
  { const base = { areas: ['weurope'], tutorialDone: true, homeArea: 'weurope' }, L = R.linksFor(base), names = Object.keys(L), c = names[3], save = { ...base, city: c, visited: names };
    const on = R.flightPath(save, 12); D.DEFAULT_DEST.on = false; const off = R.flightPath(save, 12); D.DEFAULT_DEST.on = true;
    check(D.defaultTargetFrom(L, c, names) === null && JSON.stringify(on) === JSON.stringify(off) && on.length === 13, `all visited: no default and the old tour carries on: ${on.length} cities, same as the switch off: ${JSON.stringify(on) === JSON.stringify(off)}`); }
  // the old path stays for: a save with no city, a tutorial not done, the A/B switch off
  { const L0 = R.linksFor({ areas: ['weurope'] }), mk = x => ({ areas: ['weurope'], homeArea: 'weurope', visited: ['LONDON'], ...x });
    for (const [label, save] of [['no city', mk({ tutorialDone: true })], ['tutorial not done', mk({ city: 'AMSTERDAM' })], ['an unknown city', mk({ tutorialDone: true, city: 'ATLANTIS' })]]) {
      const on = R.flightPath(save, 10); D.DEFAULT_DEST.on = false; const off = R.flightPath(save, 10); D.DEFAULT_DEST.on = true;
      check(JSON.stringify(on) === JSON.stringify(off), `${label}: the old path, not the default: ${on} vs ${off}`); }
    const ok = mk({ tutorialDone: true, city: 'AMSTERDAM' }), on = R.flightPath(ok, 10); D.DEFAULT_DEST.on = false; const off = R.flightPath(ok, 10); D.DEFAULT_DEST.on = true;
    check(JSON.stringify(on) !== JSON.stringify(off) || L0['AMSTERDAM'].length < 2, 'power: the switch changes a normal save (the default is not the old tour)'); }
  // the nearest-unvisited primitive on a tiny hand-made network: ties go to the first in link order, visited cities are skipped, nothing reachable is null
  { const L = { A: ['B', 'C'], B: ['A', 'D'], C: ['A', 'E'], D: ['B'], E: ['C'], F: [] };
    check(D.nearestUnvisited(L, 'A', new Set(['A'])) === 'B', 'a tie at one hop goes to the first neighbour in link order');
    check(D.nearestUnvisited(L, 'A', new Set(['A', 'B'])) === 'C', 'a visited neighbour is skipped');
    check(D.nearestUnvisited(L, 'A', new Set(['A', 'B', 'C'])) === 'D', 'then the next level, first discovered: D (through B) before E (through C)');
    check(D.nearestUnvisited(L, 'A', new Set(['A', 'B', 'C', 'D', 'E'])) === null && D.nearestUnvisited(L, 'F', new Set(['F'])) === null, 'nothing unvisited reachable is null'); }
  console.log(fails.length ? `FAIL routeall:\n - ${fails.slice(0, 10).join('\n - ')}${fails.length > 10 ? `\n ... ${fails.length - 10} more` : ''}` : `PASS routeall: from every opened city of ${sets.length} area sets (${states} states) the default is the nearest unvisited in link order, the path goes through the shortest way, stays in the open network and is deterministic; all-visited, no city, tutorial not done and the switch off keep the old tour`);
  process.exit(fails.length ? 1 : 0);
})();
