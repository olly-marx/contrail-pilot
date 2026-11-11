// RELEASE B: the streak missions 'Land 2 long flights' / 'Land 3 long flights' (src/missionplan.js D_TABLE, STREAK_N, ownStreak; src/missions2.js advanceStreaks, assignMissionDist; src/resultscard.js 'Row broken').
// Plain Node, no browser. A LONG flight = a landing of at least D game km (the Comet's D is 3,100), D stored when the mission is first shown. Named lines, in order:
//   FIXTURE  both streak missions are offered in a new-player save with tiers 1 to 3 open, with count 0
//   1. D by plane: the Comet's D is 3,100 and is STORED when first shown; a later plane does not change it; a mission first shown with the jumbo stores 3,900
//   2. a long landing adds one; a landing SHORTER than D sets the count back to 0
//   3. a CRASH (even one that flew farther than D) sets the count back to 0, and save.streakBroken counts the rows that flight broke
//   4. two long landings finish 'Land 2 long flights' and pay its prize once; the third finishes 'Land 3'; the stored entries are dropped
//   5. a crash resets only the streaks: a chain's progress survives it
//   6. an OLD save without missionDist / missionStreak counts from nothing and creates them
//   7. the RESULTS card says 'Row broken: start again' when a flight broke a row and no mission was done on it, and nothing otherwise
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const M2 = await import('../src/missions2.js'), P = await import('../src/missionplan.js'), S = await import('../src/save.js'), R = await import('../src/resultscard.js'), Z = await import('../src/missionprize.js');
  const T1 = ['shade', 'plant-tree', 'clean-gaps'], T2 = ['dodge', 'spot', 'hazard'];
  const mk = (extra = {}) => { const s = S.prepareSave(null); Object.assign(s, { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true,
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5', ...T1.map(x => `weurope:${x}`), ...T2.map(x => `weurope:${x}`)], levels: {}, flights: 20, landings: 12, flightSeconds: 600 }, extra); return s; };
  const find = (s, id) => M2.visible(s).find(m => m.def.id === id);
  const base = { airportsSkipped: 0, cargo: 0, planted: 0, sunBlocked: 0, cleanGaps: 0 };
  const land = (s, dist, at = 'NOWHERE') => M2.onFlight(s, { ...base, landed: true, landedAt: at, distance: dist });
  const crash = (s, dist = 500) => M2.onFlight(s, { ...base, landed: false, distance: dist });
  const K2 = 'weurope:streak2', K3 = 'weurope:streak3', cnt = (s, k) => (s.missionStreak || {})[k] || 0;

  const s0 = mk(), a2 = find(s0, 'streak2'), a3 = find(s0, 'streak3');
  check(!!a2 && !!a3 && a2.fill.N === 2 && a3.fill.N === 3 && a2.fill.count === 0 && a3.fill.count === 0, `FIXTURE: both streak missions are offered with count 0: ${JSON.stringify([a2 && a2.fill.N, a3 && a3.fill.N, a2 && a2.fill.count])}`);
  if (!a2 || !a3) { console.log(`FAIL missionstreak:\n - ${fails.join('\n - ')}`); process.exit(1); }
  // 1
  M2.assignMissionCities(s0);
  const D0 = s0.missionDist && s0.missionDist[K2] && s0.missionDist[K2].D;
  s0.fleet = { ...s0.fleet, plane: 'jumbo', planes: { ...(s0.fleet.planes || {}), jumbo: {} } }; M2.assignMissionCities(s0);
  const sj = mk(); sj.fleet = { ...sj.fleet, plane: 'jumbo', planes: { ...(sj.fleet.planes || {}), jumbo: {} } }; M2.assignMissionCities(sj);
  check(D0 === 3100 && s0.missionDist[K2].D === 3100 && s0.missionDist[K3].D === 3100 && sj.missionDist[K2].D === 3900, `D by plane: the Comet's D is 3,100 and stays after a plane change, a mission first shown with the jumbo stores 3,900: ${JSON.stringify([D0, s0.missionDist[K2].D, sj.missionDist[K2] && sj.missionDist[K2].D])}`);
  // 2
  const s2 = mk(); land(s2, 3200);
  check(cnt(s2, K3) === 1, `a long landing adds one (counted on Land 3, so that finishing Land 2 early is caught by line 4 only): ${JSON.stringify(s2.missionStreak)}`);
  land(s2, 3000);
  check(cnt(s2, K3) === 0, `a landing shorter than D sets the count back to 0 (on Land 3): ${JSON.stringify(s2.missionStreak)}`);
  // 3
  const s3 = mk(); land(s3, 3300); crash(s3, 3500);
  check(cnt(s3, K2) === 0 && s3.streakBroken === 2, `a crash (even one that flew farther than D) sets the count back to 0 and counts the broken rows: ${JSON.stringify([s3.missionStreak, s3.streakBroken])}`);
  land(s3, 3300);
  check(s3.streakBroken === 0 && cnt(s3, K2) === 1, `a flight that breaks nothing leaves streakBroken at 0: ${s3.streakBroken}`);
  // 4
  const s4 = mk(), c0 = s4.crystals || 0; M2.assignMissionCities(s4); const seeds0 = s4.seeds || 0;
  land(s4, 3200); const d2 = land(s4, 3400);
  check(d2.some(m => m.key === K2) && s4.missionsDone.includes(K2) && !s4.missionsDone.includes(K3) && (s4.seeds || 0) - seeds0 >= Z.missionPrize('streak2', 1).seeds && !s4.missionDist[K2] && !(K2 in (s4.missionStreak || {})), `two long landings finish Land 2 and pay (once), entries dropped: done ${d2.map(m => m.key)}, seeds +${(s4.seeds || 0) - seeds0}, crystals +${(s4.crystals || 0) - c0}`);
  const d3 = land(s4, 3500);
  check(d3.some(m => m.key === K3) && s4.missionsDone.includes(K3), `the third long landing finishes Land 3: ${d3.map(m => m.key)}`);
  // 5
  const s5 = mk(); M2.assignMissionCities(s5); const ch = find(s5, 'chain').fill;
  land(s5, 3300); land(s5, 500, ch.city);   // a short landing at the chain's first city: streak back to 0, chain at 1
  const chainBefore = (s5.missionProgress || {})['weurope:chain']; crash(s5, 3500);
  check(chainBefore === 1 && (s5.missionProgress || {})['weurope:chain'] === 1 && cnt(s5, K2) === 0, `a crash resets only the streaks: chain progress ${chainBefore} -> ${(s5.missionProgress || {})['weurope:chain']}, streak ${cnt(s5, K2)}`);
  // 6
  const s6 = mk(); delete s6.missionDist; delete s6.missionStreak; let threw = null; try { land(s6, 3300); } catch (e) { threw = String(e); }
  check(!threw && !!s6.missionDist && cnt(s6, K2) === 1, `an old save without missionDist / missionStreak counts from nothing and creates them: ${threw || JSON.stringify([s6.missionDist && Object.keys(s6.missionDist), s6.missionStreak])}`);
  // 7
  const rv = (save, done = []) => { try { return R.resultsView({ landed: true, landedAt: 'PARIS', distance: 1000, earned: [], rewards: [], breakdown: { co2: 0, night: 0, sun: 0, trees: 0 }, heat: 0, crystals: 0, missions2: { done, next: null }, school: false }, save).missions; } catch (e) { return `THREW ${String(e).slice(0, 80)}`; } };
  const brk = mk({ streakBroken: 1 }), ok = mk({ streakBroken: 0 });
  const mb = rv(brk), mo = rv(ok);
  check(mb && mb.line === 'Row broken: start again' && mb.seeds === 0 && mo === null, `the results card says 'Row broken: start again' only when a row broke and no mission was done: broken ${JSON.stringify(mb)}, not broken ${JSON.stringify(mo)}`);

  console.log(fails.length ? `FAIL missionstreak:\n - ${fails.join('\n - ')}` : 'PASS missionstreak: D by plane stored when shown, long landings count, a crash or a shorter landing resets only the streaks, two (three) in a row finish and pay once, old saves start empty, Row broken on the results card');
  process.exit(fails.length ? 1 : 0);
})();
