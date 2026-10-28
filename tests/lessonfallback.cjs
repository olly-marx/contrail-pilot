// Every lesson after L1 never stalls (the user, 2026-10-28): missed on 2 flights it counts as taught, per lesson.
// L3/L4/L5: 1 miss pending, 2 misses done; L5 counts misses only once tree parcels are owned; earned at once = no miss;
// an old save's l2Misses carries over. Plant: the fallback off in src/missions2.js -> must FAIL. Plain Node.
(async () => {
  const M = await import('../src/missions2.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const base = done => ({ areas: ['easia'], homeArea: 'easia', city: 'SEOUL', tutorialDone: true, landings: 4, flights: 5, missionsDone: done, unclaimed: [], levels: {} });
  const miss = { landed: true, landedAt: 'TOKYO', sunBlocked: 0, dodges: 0, airportsSkipped: 0, planted: 0 }, crash = { landed: false, crash: 'storm' };
  for (const [id, done] of [['L3', ['L1', 'L2']], ['L4', ['L1', 'L2', 'L3']]]) {
    const s = base(done); M.onFlight(s, miss);
    check(!s.missionsDone.includes(id), `${id}: one miss leaves it pending`);
    M.onFlight(s, crash);
    check(s.missionsDone.includes(id), `${id}: two misses (a landing, a crash) count it as taught (${s.missionsDone})`);
  }
  let s = base(['L1', 'L2', 'L3', 'L4']); M.onFlight(s, miss); M.onFlight(s, miss); M.onFlight(s, miss);
  check(!s.missionsDone.includes('L5'), 'L5: flights without tree parcels do not count as misses');
  s.levels.trees = 1; M.onFlight(s, miss); check(!s.missionsDone.includes('L5'), 'L5: one miss with parcels leaves it pending');
  M.onFlight(s, miss); check(s.missionsDone.includes('L5'), 'L5: two misses with parcels count it as taught');
  s = base(['L1', 'L2']); M.onFlight(s, { ...miss, dodges: 1 });
  check(s.missionsDone.includes('L3') && !((s.lessonMisses || {}).L3), 'L3 earned at once: done, no miss counted');
  s = base(['L1']); s.l2Misses = 1; M.onFlight(s, miss);
  check(s.missionsDone.includes('L2'), 'an old save with l2Misses 1: the next miss is the second');
  if (fails.length) { console.log('FAIL lessonfallback\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS lessonfallback: L3/L4/L5 count as taught after 2 misses (L5 only once parcels are owned); earned at once otherwise; old l2Misses carried');
})();
