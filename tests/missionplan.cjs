// The harder CITY missions (release A; src/missionplan.js + src/missions2.js; research MISSIONS-HARDER-SPEC.md 1.1-1.5, BLOCK1-PLAYABILITY-NUMBERS.md). Plain Node, no browser.
// Named lines, in order (a planted defect must make ITS OWN line fail first):
//   FIXTURE  the seeded save offers land-city, chain and route; (before line 5) the old and the new rule name different cities, else the migration check would be blind
//   1. land-city names a city at least 2 stops away
//   2. chain names THREE cities: stops from the start / from A / from B each at least 2, B is not A, C is not B, the title names all three
//   3. the stretch (route): at least 3 stops, within 0.90 x reach when such a city exists; no reach information: 3 stops; a small area alone keeps 'without stopping'
//   4. FIXED UNTIL COMPLETED: assignMissionCities stores the cities and a second call changes nothing; the stored cities survive a visit and a move
//   5. OLD SAVES: a save without save.missionCities keeps the city it shows today (rule 'old'); a new save stores rule 'new'
//   6. a finished mission's cities are dropped and its prize is paid once
//   8. every starter area and start city names real, reachable cities for each city mission
//   7. the chain moves on only by landing at its next leg, in order; another landing and a crash change nothing; the third leg finishes it and pays 18 seeds
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const M2 = await import('../src/missions2.js'), P = await import('../src/missionplan.js'), R = await import('../src/route.js'), S = await import('../src/save.js');
  const T1 = ['weurope:shade', 'weurope:plant-tree', 'weurope:clean-gaps'], T2 = ['weurope:dodge', 'weurope:spot', 'weurope:hazard'];
  const mk = (extra = {}) => { const s = S.prepareSave(null); Object.assign(s, { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true,
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5', ...T1, ...T2], levels: {}, flights: 20, landings: 12 }, extra); return s; };
  const find = (s, id) => M2.visible(s).find(m => m.def.id === id);
  const land = (s, city, extra = {}) => M2.onFlight(s, { landed: true, landedAt: city, distance: 2000, airportsSkipped: 0, cargo: 0, planted: 0, sunBlocked: 0, cleanGaps: 0, ...extra });
  const crash = s => M2.onFlight(s, { landed: false, distance: 500, airportsSkipped: 0, cargo: 0, planted: 0, sunBlocked: 0, cleanGaps: 0 });

  const s0 = mk(), L = R.linksFor(s0), st = (a, b) => P.stopsOf(L, a, b);
  const lc = find(s0, 'land-city'), ch = find(s0, 'chain'), rt = find(s0, 'route');
  const oldCity = M2.fillFor(s0, 'weurope', 'LONDON').city;
  check(!!lc && !!ch && !!rt, `FIXTURE: land-city, chain and route are offered (${[lc, ch, rt].map(x => !!x)})`);
  if (!lc || !ch || !rt) { console.log(`FAIL missionplan:\n - ${fails.join('\n - ')}`); process.exit(1); }

  // 1
  check(st('LONDON', lc.fill.city) >= 2, `land-city names a city at least 2 stops away: ${lc.fill.city} is ${st('LONDON', lc.fill.city)} stops from LONDON`);
  // 2
  const f = ch.fill;
  check(!!f.cityC && st('LONDON', f.city) >= 2 && st(f.city, f.cityB) >= 2 && st(f.cityB, f.cityC) >= 2 && f.cityB !== f.city && f.cityC !== f.cityB && ch.title.includes(f.city) && ch.title.includes(f.cityB) && ch.title.includes(f.cityC),
    `chain names three cities, each leg at least 2 stops, none the city just left: ${JSON.stringify([f.city, f.cityB, f.cityC])}, title '${ch.title}'`);
  // 3
  const cand = P.candidates(s0, 'LONDON').map(c => ({ c, n: st('LONDON', c), km: P.routeKm(L, 'LONDON', c) })).filter(x => Number.isFinite(x.n) && x.n >= 3).sort((a, b) => a.km - b.km);
  check(cand.length >= 2 && cand[0].km < cand[cand.length - 1].km, `FIXTURE: weurope offers at least two cities 3+ stops away with different route lengths (${cand.length})`);
  const reach = cand.length ? Math.ceil(((cand[0].km + cand[cand.length - 1].km) / 2) / 0.9) : 0;   // the cap (0.9 x reach) falls between the shortest and the longest
  const sr = mk({ bestDistance: reach }), rr = find(sr, 'route');
  const rkm = rr && rr.fill.stretch ? P.routeKm(R.linksFor(sr), 'LONDON', rr.fill.cityC) : Infinity;
  check(!!rr && !!rr.fill.stretch && rr.fill.stretch.stops >= 3 && rkm <= 0.9 * reach, `the stretch is at least 3 stops and within 0.90 x reach (${reach}): ${rr && rr.fill.cityC} ${rkm} km, ${rr && rr.fill.stretch && rr.fill.stretch.stops} stops`);
  check(!!rr && /in one flight/.test(rr.title), `the stretch title says 'in one flight': ${rr && rr.title}`);
  check(!!rt.fill.stretch && rt.fill.stretch.stops === 3, `with no reach information the stretch is 3 stops: ${JSON.stringify(rt.fill.stretch)}`);
  const so = mk({ areas: ['oceania'], homeArea: 'oceania', homeCity: 'MELBOURNE', city: 'MELBOURNE', visited: ['MELBOURNE'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5', 'oceania:shade', 'oceania:plant-tree', 'oceania:clean-gaps', 'oceania:dodge', 'oceania:spot', 'oceania:hazard'] });
  const ro = M2.visible(so, 'MELBOURNE').find(m => m.def.id === 'route');
  check(!ro || (!ro.fill.stretch && /without stopping/.test(ro.title)), `a small area alone (Oceania) keeps 'without stopping': ${ro && ro.title}`);
  // 4
  const s4 = mk(); const changed1 = M2.assignMissionCities(s4), snap = JSON.stringify(s4.missionCities), changed2 = M2.assignMissionCities(s4);
  check(changed1 === true && Object.keys(s4.missionCities).length >= 3 && changed2 === false && JSON.stringify(s4.missionCities) === snap, `assignMissionCities stores the cities and is idempotent: first ${changed1}, second ${changed2}, ${Object.keys(s4.missionCities)}`);
  const stored = find(s4, 'land-city').fill.city;
  const used = new Set(Object.values(s4.missionCities).flatMap(e => [e.city, e.cityB, e.cityC].filter(Boolean))), mv = P.candidates(s4, 'LONDON').find(c => !used.has(c));
  s4.visited = [...s4.visited, stored, mv]; s4.city = mv;   // (a visit to the mission's city and a move to a city none of the missions names)
  check(find(s4, 'land-city').fill.city === stored && find(s4, 'chain').fill.city === ch.fill.city, `the stored cities stay put after a visit and a move: land-city ${find(s4, 'land-city').fill.city} (was ${stored}), chain A ${find(s4, 'chain').fill.city} (was ${ch.fill.city})`);
  // 5
  check(lc.fill.city !== oldCity, `FIXTURE: the new rule names another city than the old one, so the migration check can tell them apart (new ${lc.fill.city}, old ${oldCity})`);
  const so5 = mk(); delete so5.missionCities;   // an OLD save: it has no missionCities
  const before = find(so5, 'land-city').fill.city;   // (what it shows today: computed with no stored entry: the new rule, so use the old fill's city as the reference)
  const today = M2.fillFor(so5, 'weurope', 'LONDON').city;
  M2.assignMissionCities(so5);
  const e5 = so5.missionCities['weurope:land-city'];
  check(!!e5 && e5.rule === 'old' && e5.city === today && find(so5, 'land-city').fill.city === today, `an old save keeps the city it shows today (${today}): stored ${JSON.stringify(e5)}, now shows ${find(so5, 'land-city').fill.city} (the new rule would say ${before})`);
  const sn = mk(); M2.assignMissionCities(sn);
  check(sn.missionCities['weurope:land-city'] && sn.missionCities['weurope:land-city'].rule === 'new', `a new save stores the new rule: ${JSON.stringify(sn.missionCities['weurope:land-city'])}`);
  // 6
  const s6 = mk(); M2.assignMissionCities(s6); const c6 = find(s6, 'land-city').fill.city, seeds0 = s6.seeds || 0;
  const d6 = land(s6, c6);
  check(d6.some(m => m.key === 'weurope:land-city') && !s6.missionCities['weurope:land-city'] && (s6.seeds || 0) - seeds0 >= 10, `a finished mission's cities are dropped and its prize paid: done ${d6.map(m => m.key)}, entry ${!!s6.missionCities['weurope:land-city']}, seeds +${(s6.seeds || 0) - seeds0}`);
  // 7
  const s7 = mk(); M2.assignMissionCities(s7); const k7 = 'weurope:chain', c7 = find(s7, 'chain').fill, seeds7 = s7.seeds || 0;
  const other = P.candidates(s7, 'LONDON').find(c => ![c7.city, c7.cityB, c7.cityC].includes(c));
  crash(s7); land(s7, other);
  check((s7.missionProgress || {})[k7] === undefined || s7.missionProgress[k7] === 0, `a crash and a landing elsewhere change nothing: progress ${JSON.stringify(s7.missionProgress)}`);
  land(s7, c7.cityB);
  check(((s7.missionProgress || {})[k7] || 0) === 0, `landing at B first does not move the chain: progress ${JSON.stringify(s7.missionProgress)}`);
  land(s7, c7.city);
  check((s7.missionProgress || {})[k7] === 1, `landing at A moves the chain to 1: ${JSON.stringify(s7.missionProgress)}`);
  land(s7, c7.cityB);
  check((s7.missionProgress || {})[k7] === 2 && !s7.missionsDone.includes(k7), `landing at B moves it to 2: ${JSON.stringify(s7.missionProgress)}`);
  const d7 = land(s7, c7.cityC);
  check(d7.some(m => m.key === k7) && s7.missionsDone.includes(k7) && (s7.seeds || 0) - seeds7 >= 18 && !s7.missionProgress[k7], `landing at C finishes the chain and pays: done ${d7.map(m => m.key)}, seeds +${(s7.seeds || 0) - seeds7}`);

  // 8. every starter area, every start city: each city mission names real cities (the declared fallbacks leave nothing undefined)
  const A = await import('../src/areas.js'), bad8 = [];
  for (const [a, area] of Object.entries(A.AREAS)) {
    if (!area.starter) continue;
    for (const c of area.cities) {
      const sv = mk({ areas: [a], homeArea: a, homeCity: area.start, city: c, visited: [c], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5', ...['shade', 'plant-tree', 'clean-gaps', 'dodge', 'spot', 'hazard'].map(x => `${a}:${x}`)] });
      const fl = M2.fillFor(sv, a, c), LL = R.linksFor(sv);
      for (const id of ['land-city', 'chain', 'route']) {
        const o = P.ownFill(sv, a, c, id, fl, `${a}:${id}`), names = id === 'land-city' ? [o.city] : id === 'chain' ? [o.city, o.cityB, o.cityC] : [o.cityC];
        if (names.some(n => !n || !R.cityIndex || P.stopsOf(LL, c, n) === Infinity) && !(o.rule === 'old' && id === 'chain' && !o.cityC)) bad8.push(`${a} from ${c}: ${id} -> ${JSON.stringify(names)}`);
      }
    }
  }
  check(bad8.length === 0, `every starter area and start city gets real, reachable cities for land-city, chain (or the old two-city chain) and route: ${bad8.slice(0, 5).join('; ')}${bad8.length > 5 ? ` (+${bad8.length - 5})` : ''}`);

  console.log(fails.length ? `FAIL missionplan:\n - ${fails.join('\n - ')}` : 'PASS missionplan: land2, three-leg chain with revisits, the stretch, cities fixed until completed, old saves keep what they show, chain progress by landing in order');
  process.exit(fails.length ? 1 : 0);
})();
