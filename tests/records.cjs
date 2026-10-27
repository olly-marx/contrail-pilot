// MY RECORDS (src/records.js; research/PROPOSAL-BOARDS-S2.md, the user's answers 2026-10-27): the 8 boards' numbers, THIS WEEK and EVER, kept in the save.
// Pure rules, then real flights through the sim engine's bankFlight (the game's own code). Plain Node, ~1 s.
// PLANTS: tools/plants.tsv, test `records` (each must FAIL this test). Run: node tests/records.cjs
(async () => {
  const R = await import('../src/records.js');
  const { createWorld } = await import('../src/sim/world.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const fresh = () => ({ planted: {}, plantedIn: {}, missionsDone: [] });
  const L = (distance, shade = 0, heatTrapped = 0) => ({ landed: true, distance, crash: null, shade, heatTrapped });
  const C = (distance, crash) => ({ landed: false, distance, crash, shade: 5, heatTrapped: 0 });

  // 1. A landing changes the GOOD numbers, never the oops ones.
  let s = fresh(); R.recordFlight(s, L(3000, 10, 4));
  let v = R.values(s);
  check(v.ever.longest === 3000 && v.week.longest === 3000, `a landing sets FURTHEST FLIGHT (both periods): ${JSON.stringify(v)}`);
  check(v.ever.cool === 6, `COOL SKIES = shade minus night heat: ${v.ever.cool}`);
  check(v.ever.crashes === 0 && v.ever.bird === 0 && v.ever.longestCrash === null && v.ever.shortest === null, `a landing touches no oops board: ${JSON.stringify(v.ever)}`);
  check(R.fresh(s).length === 0, `the first landing is a start, not a record beaten: ${R.fresh(s)}`);

  // 2. Beating yourself marks NEW; a shorter flight does not.
  R.recordFlight(s, L(5000)); check(R.fresh(s).includes('longest'), `a longer landing is a NEW RECORD: ${R.fresh(s)}`);
  R.clearFresh(s); R.recordFlight(s, L(4000)); check(R.fresh(s).length === 0 && R.values(s).ever.longest === 5000, `a shorter landing keeps the record and marks nothing: ${JSON.stringify(R.values(s).ever)}`);

  // 3. A crash changes the OOPS numbers (by kind), never the good ones.
  s = fresh(); R.recordFlight(s, L(2000, 8, 0));
  R.recordFlight(s, C(800, 'bird')); R.recordFlight(s, C(300, 'storm'));
  v = R.values(s).ever;
  check(v.crashes === 2 && v.bird === 1, `MOST CRASHES counts every crash, BIRD MAGNET only birds: ${JSON.stringify(v)}`);
  check(v.longestCrash === 800 && v.shortest === 300, `LONGEST CRASH 800 and SHORTEST FLIGHT 300 (the smaller one is the record): ${JSON.stringify(v)}`);
  check(v.longest === 2000 && v.cool === 8, `crashes leave FURTHEST FLIGHT and COOL SKIES alone: ${JSON.stringify(v)}`);
  check(R.fresh(s).includes('shortest'), `a shorter crash is a NEW RECORD for SHORTEST FLIGHT: ${R.fresh(s)}`);

  // 4. COOL SKIES is flight by flight: a bad flight scores 0, never negative.
  s = fresh(); R.recordFlight(s, L(1000, 2, 5)); check(R.values(s).ever.cool === 0, `a flight that trapped more heat than it shaded scores 0: ${R.values(s).ever.cool}`);
  R.recordFlight(s, L(1000, 10, 4)); check(R.values(s).ever.cool === 6, `and does not cancel a good one: ${R.values(s).ever.cool}`);

  // 5. The week: Mondays.
  check(R.mondayOf('2026-10-27') === '2026-10-26', `Tuesday 27 Oct 2026 -> Monday 26 Oct: ${R.mondayOf('2026-10-27')}`);
  check(R.mondayOf('2026-10-26') === '2026-10-26', `a Monday is its own Monday: ${R.mondayOf('2026-10-26')}`);
  check(R.mondayOf('2026-11-01') === '2026-10-26', `Sunday 1 Nov -> Monday 26 Oct: ${R.mondayOf('2026-11-01')}`);
  check(R.mondayOf('2026-11-02') === '2026-11-02', `Monday 2 Nov starts the next week: ${R.mondayOf('2026-11-02')}`);

  // 6. THIS WEEK starts from zero on a new Monday, EVER stays; KINDS and MISSIONS count what is new this week.
  s = fresh(); s.planted = { oak: 3 }; s.missionsDone = ['a', 'b'];
  check(R.rollWeek(s, '2026-10-27') === true, 'the first call starts a week');
  R.recordFlight(s, L(3000, 6, 0)); R.recordFlight(s, C(500, 'bird'));
  s.planted.birch = 1; s.plantedIn = { savanna: { acacia: 2 } }; s.missionsDone.push('c');
  check(R.rollWeek(s, '2026-10-29') === false, 'the same week again changes nothing');
  v = R.values(s);
  check(v.week.longest === 3000 && v.week.crashes === 1 && v.week.cool === 6, `this week so far: ${JSON.stringify(v.week)}`);
  check(v.ever.kinds === 3 && v.week.kinds === 2, `KINDS: 3 ever (oak, birch, savanna:acacia), 2 new this week: ${v.ever.kinds}/${v.week.kinds}`);
  check(v.ever.missions === 3 && v.week.missions === 1, `MISSIONS: 3 ever, 1 this week: ${v.ever.missions}/${v.week.missions}`);
  check(R.rollWeek(s, '2026-11-02') === true, 'a new Monday starts a new week');
  v = R.values(s);
  check(v.week.longest === null && v.week.crashes === 0 && v.week.bird === 0 && v.week.cool === 0 && v.week.kinds === 0 && v.week.missions === 0, `the new week starts from zero: ${JSON.stringify(v.week)}`);
  check(v.ever.longest === 3000 && v.ever.crashes === 1 && v.ever.kinds === 3 && v.ever.missions === 3, `EVER is kept: ${JSON.stringify(v.ever)}`);

  // 7. Real flights through the game's own bankFlight (the sim engine): a landing, a bird strike, and flight school (which must not count).
  const save = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, mission: 99, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const fly = (finishArg, school = false, seed = 1) => {
    const w = createWorld(save, seed);
    for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60);
    w.explain = () => false; w.hitsStorm = () => false; w.hitBird = () => false;
    if (school) w.school = { finished() {}, forgive() {}, holdClock: false };
    w.nextAirport.worldX = 1e12; w.distancePx += 1200; w.sunBlocked = 9; w.heatTrapped = 2;
    w.finish(finishArg);
    return w;
  };
  let w = fly({ landed: true });
  let e = w.save.records && w.save.records.ever;
  check(e && e.longest >= 1200 && e.cool === 7 && e.crashes === 0, `a real landing is recorded (distance, shade 9 minus heat 2): ${JSON.stringify(e)}`);
  w = fly({ reason: 'Bird strike!\nYou hit a bird.' });
  e = w.save.records && w.save.records.ever;
  check(e && e.crashes === 1 && e.bird === 1 && e.longestCrash >= 1200 && e.shortest >= 1200 && e.longest === 0 && e.cool === 0, `a real bird strike is recorded as a crash and a bird, and not as a landing: ${JSON.stringify(e)}`);
  w = fly({ reason: 'You hit the ground!' }, true);
  e = w.save.records && w.save.records.ever;
  check(!e || (e.crashes === 0 && e.longestCrash === 0 && e.shortest === null), `a flight-school crash does not count: ${JSON.stringify(e)}`);

  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS records (8 boards, THIS WEEK + EVER, NEW RECORD marks, week roll, real flights)');
})();
