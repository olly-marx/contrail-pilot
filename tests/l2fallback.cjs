// The rails never stall (Coordinator, 2026-10-27): lesson L2 ("fly through icy air in daytime") missed on 2 flights counts
// as taught, so NATURE opens. 1 miss: still pending; 2 misses (a landing and a crash): done, NATURE revealed; earned on the
// first try: done at once, no miss counted. Plant: the fallback removed from src/missions2.js -> must FAIL. Plain Node.
(async () => {
  const M = await import('../src/missions2.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const base = () => ({ areas: ['easia'], homeArea: 'easia', city: 'SEOUL', tutorialDone: true, landings: 2, flights: 2, missionsDone: ['L1'], unclaimed: [] });
  const miss = { landed: true, landedAt: 'TOKYO', sunBlocked: 1 }, crash = { landed: false, crash: 'storm', sunBlocked: 0 };
  let s = base(); M.onFlight(s, miss);
  check(!s.missionsDone.includes('L2') && !M.revealed(s, 'nature'), `one miss: L2 still pending (${s.missionsDone})`);
  M.onFlight(s, crash);
  check(s.missionsDone.includes('L2') && M.revealed(s, 'nature'), `two misses (a landing, then a crash): L2 counts as taught, NATURE opens (${s.missionsDone})`);
  s = base(); M.onFlight(s, { ...miss, sunBlocked: 3.2 });
  check(s.missionsDone.includes('L2') && !s.l2Misses, `earned on the first try: done at once, no miss counted (${s.l2Misses})`);
  s = base(); s.missionsDone = ['L1', 'L2']; M.onFlight(s, miss); M.onFlight(s, miss);
  check(!s.l2Misses, 'L2 already done: no misses counted');
  if (fails.length) { console.log('FAIL l2fallback\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS l2fallback: L2 missed twice counts as taught and NATURE opens; once is not enough; earned at once otherwise');
})();
