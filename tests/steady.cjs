// The steady lane and the daily trio (the user, 2026-10-29: beginners ran out of missions; src/missions2.js). No browser.
// 1. nothing steady or daily before L3; 2. after L3: 2 steady goals on show, crashes add to them, a full one pays and climbs
// a rung (x1.5); 3. steady keys never open a tier; 4. the daily trio starts after L3 with an EASY slot a crash can finish;
// 5. the streak: +2 seeds per day, capped at +10; a missed day halves it.
// Run: node tests/steady.cjs   (proved by planted defects)
(async () => {
  const M = await import('../src/missions2.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const base = done => ({ areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', visited: ['AMSTERDAM'], missionsDone: done, unclaimed: [], tutorialDone: true, levels: {}, habitat: {},
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const crash = x => ({ landed: false, cargo: 0, sunBlocked: 0, planted: 0, airportsSkipped: 0, nightOwl: false, kinds: 0, bumped: 0, goldens: 0, dodges: 0, distance: 0, cleanGaps: 0, ...x });
  // 1.
  const early = base(['L1', 'L2']); M.setDaily(early, '2026-10-29');
  check(!M.steadyVisible(early).length && !early.daily, 'nothing steady or daily before L3');
  // 2.
  const s = base(['L1', 'L2', 'L3']);
  const v = M.steadyVisible(s);
  check(v.length === 2 && v.every(x => x.progress === 0), `2 steady goals on show after L3: ${v.map(x => x.key)}`);
  const km = v.find(x => x.def.id === 'st-km');
  check(!!km, `the first pair includes the km goal: ${v.map(x => x.def.id)}`);
  M.onFlight(s, crash({ distance: 1000 }));
  check(M.steadyVisible(s).find(x => x.def.id === 'st-km').progress === 1000, 'a CRASH adds its km to the steady goal');
  M.onFlight(s, crash({ distance: 2500 }));
  check(s.missionsDone.includes('steady:weurope:st-km:0') && s.steady.weurope['st-km'].rung === 1, `a full steady goal pays and climbs a rung: ${s.missionsDone}`);
  const next = M.steadyVisible(s).find(x => x.def.id === 'st-km');
  check((!next || next.target === 4500) && M.rungTarget(M.STEADY[0], 1) === 4500 && M.rungTarget(M.STEADY[0], 2) === 6750, `the next rung asks x1.5 (${M.rungTarget(M.STEADY[0], 1)})`);
  // 3.
  const lots = base(['L1', 'L2', 'L3', 'steady:weurope:st-km:0', 'steady:weurope:st-km:1', 'steady:weurope:st-seeds:0']);
  check(!M.tierOpen(lots, 'weurope', 2), 'steady goals do not open tier 2');
  // 4.
  const d = base(['L1', 'L2', 'L3']); M.setDaily(d, '2026-10-29');
  const dv = M.dailyVisible(d);
  check(dv.length === 3 && dv.filter(x => x.easy).length === 1, `the daily trio after L3, one EASY: ${dv.map(x => x.key)}`);
  M.onFlight(d, crash({ distance: 1200, cargo: 9, cleanGaps: 5 }));
  check(d.missionsDone.some(k => k.startsWith('daily:2026-10-29:e-')), `a crash can finish the easy daily: ${d.missionsDone}`);
  // 5.
  const p0 = M.dailyVisible(d).concat([])[0];
  for (const date of ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']) {
    M.setDaily(d, date); M.onFlight(d, crash({ distance: 1200, cargo: 9, cleanGaps: 5 }));
  }
  M.setDaily(d, '2026-11-05');
  check(M.streakBonus(d) === 10, `6+ days in a row cap the streak at +10 (${M.streakBonus(d)}, days ${d.dailyStreak.days})`);
  check(M.dailyVisible(d).every(x => x.prize.seeds >= 10 + 10), 'the streak adds to every daily prize');
  M.onFlight(d, crash({ distance: 1200, cargo: 9, cleanGaps: 5 }));
  M.setDaily(d, '2026-11-08');
  check(d.dailyStreak.days < 7 && d.dailyStreak.days >= 3, `a missed day halves the streak (days ${d.dailyStreak.days})`);
  void p0;
  console.log(fails.length ? `FAIL steady:\n - ${fails.join('\n - ')}` : 'PASS steady: after L3 only; crashes count; rungs x1.5; no tier opening; easy daily; streak cap and halving');
  process.exit(fails.length ? 1 : 0);
})();
