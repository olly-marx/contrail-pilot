// GO TO, the standing aim (src/aim.js; CROSSINGS V2 step 3). Plain Node, a season 2 save. The player's GO TO (save.aimCity) is a target the flights head for: it is aimed first, with no stop limit (a city 4 or more hops away),
// it survives a mission being open and the per-trip 'skip the mission route', it is not aimed once the player is there (arrivedGoto clears it) or when it cannot be reached, and a flight's path begins with the shortest way there.
// Plants: tools/plants.tsv, test `gotoaim`. Run: node tests/gotoaim.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const A = await import('../src/aim.js'), R = await import('../src/route.js'), AR = await import('../src/areas.js');
  const base = () => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, areas: ['weurope', 'mideast'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: {}, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const s = base(), L = R.linksFor(s);
  // the farthest city of the two open areas (Western Europe alone has none 4 hops away since the ladder release; DUBAI is 6) from LONDON: the target must be 4 or more hops away (the 3-stop cap is the missions', not the aim's)
  let far = null, hops = 0; for (const c of [...AR.AREAS.weurope.cities, ...AR.AREAS.mideast.cities]) { const p = R.pathTo('LONDON', c, L); if (p && p.length - 1 > hops) { hops = p.length - 1; far = c; } }
  check(hops >= 4, `fixture: a city 4 or more hops from LONDON exists in Western Europe + Middle East (${far}: ${hops})`);
  check(A.gotoTarget(s) === null && A.gotoHops(s) === 0, 'no GO TO set: no target, 0 hops');
  A.setGoto(s, far);
  check(A.gotoTarget(s) === far && A.aimOpen(s) === far && A.aimTarget(s) === far, `a GO TO ${hops} hops away is the aim (no stop limit): ${[A.gotoTarget(s), A.aimOpen(s), A.aimTarget(s)]}`);
  check(A.gotoHops(s) === hops, `hops left: ${A.gotoHops(s)} (want ${hops})`);
  const path = A.routeFor(s), way = R.pathTo('LONDON', far, L);
  check(JSON.stringify(path.slice(0, way.length)) === JSON.stringify(way), `the flight's path begins with the shortest way there: ${path.slice(0, way.length)} vs ${way}`);
  s.city = far; check(A.gotoTarget(s) === null && A.aimTarget(s) !== far, 'arrived: no target any more');
  check(A.arrivedGoto(s) === true && s.aimCity === undefined && A.arrivedGoto(s) === false, 'arrivedGoto clears the aim once');
  const t = base(); A.setGoto(t, 'SYDNEY'); check(A.gotoTarget(t) === null, 'a city in a land that is not open cannot be reached: no target');
  const u = base(); A.setGoto(u, far); u.flyCrossing = { id: 'x' }; check(A.gotoTarget(u) === null, 'during a crossing flight there is no GO TO aim');
  const v = base(); v.tutorialDone = false; A.setGoto(v, far); check(A.gotoTarget(v) === null, 'before the tutorial is done there is no aim');
  A.clearGoto(s); check(s.aimCity === undefined, 'the player can clear it');
  console.log(fails.length ? `FAIL gotoaim:\n - ${fails.join('\n - ')}` : `PASS gotoaim: GO TO is the aim ${hops} hops away, survives the mission skip, clears on arrival and by the player, and is not aimed when unreachable`);
  process.exit(fails.length ? 1 : 0);
})();
