// A MISSED STORY STOP (0.79.0; Oliver, 2026-11-24: 'I forgot to land. I just missed the airport ... I don't know what happens to the story if you miss an airport and land
// somewhere else'; src/storyboard.js missed, src/missions2.js onFlight, src/resultscard.js storyView). Plain Node. Named lines:
//  1. a landed story flight that flew PAST the next stop costs one heart; the stop stays the next one and the results card says 'Missed <city>: lost a heart';
//  2. on the way to the PICKUP, a landing short of it (never passed) costs nothing;
//  3. an Easy story (no hearts) loses nothing, and the card still says 'Missed <city>';
//  4. the last heart lost this way fails the story;
//  5. STRICT STOPS (Oliver, 2026-11-25): once the pickup is reached, landing anywhere but the next stop costs a heart, passed or not,
//     and the card says 'Wrong airport: lost a heart'; landing at the next stop costs nothing;
//  6. an Easy story stays as many tries as you like: a wrong landing after the pickup costs nothing.
// Plants (tools/plants.tsv): a passed stop costs nothing. Run: node tests/storymiss.cjs
(async () => {
  const B = await import('../src/storyboard.js'), M = await import('../src/missions2.js'), R = await import('../src/resultscard.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const pilot = () => ({ areas: ['weurope', 'africa'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], flights: 50, landings: 40, bestDistance: 25000, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], tutorialDone: true, levels: {}, seeds: 0, crystals: 0, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const withStory = level => { const s = pilot(); B.fillBoard(s); const o = s.storyBoard.find(x => x && x.level === level && !x.crate && !B.missing(s, x).length) || s.storyBoard.find(x => x && x.level === level && !x.crate);
    if (!o) return null; o.needs = []; B.accept(s, o.id); return { s, o }; };
  const fly = (s, r) => { M.onFlight(s, { landed: true, distance: 3000, airportsSkipped: (r.passed || []).length, ...r }); return R.storyView({ landed: true, rewards: [] }, s); };
  // 1.
  const m = withStory('medium');
  check(!!m, 'FIXTURE: a medium story is on the board');
  if (m) { const { s, o } = m, stop = o.stops[0], h0 = B.heartsLeft(o);
    const v = fly(s, { landedAt: 'PARIS' === stop ? 'BRUSSELS' : 'PARIS', passed: [stop] });
    check(B.heartsLeft(o) === h0 - 1 && s.storyActive === o.id && (o.reached || 0) === 0, `1. flying past ${stop} costs one heart (${h0} -> ${B.heartsLeft(o)}) and it stays the next stop`);
    check(v && v.mood === 'bad' && v.line === `Missed ${stop}: lost a heart`, `1. the card says so: ${JSON.stringify(v && v.line)}`);
    // 2.
    const h1 = B.heartsLeft(o); fly(s, { landedAt: 'PARIS' === stop ? 'BRUSSELS' : 'PARIS', passed: [] });
    check(B.heartsLeft(o) === h1 && !s.storyHurt, `2. landing short of ${stop} costs nothing (${h1} -> ${B.heartsLeft(o)})`);
    // 4.
    o.heartsLeft = 1; fly(s, { landedAt: 'PARIS' === stop ? 'BRUSSELS' : 'PARIS', passed: [stop] });
    check(s.storyActive !== o.id && s.storyHurt && s.storyHurt.failed, `4. the last heart lost to a miss fails the story: active ${s.storyActive}, ${JSON.stringify(s.storyHurt && { failed: s.storyHurt.failed, missed: s.storyHurt.missed })}`); }
  // 5.
  const m5 = withStory('medium');
  if (m5) { const { s, o } = m5, wrong = c => ['PARIS', 'BRUSSELS', 'MADRID', 'ROME'].find(x => x !== c && !o.stops.includes(x));
    s.city = o.stops[0]; B.landedAt(s, o.stops[0]); const next = o.stops[1], h0 = B.heartsLeft(o);
    const v = fly(s, { landedAt: wrong(next), passed: [] });
    check(B.heartsLeft(o) === h0 - 1 && o.reached === 1 && s.storyActive === o.id, `5. after the pickup, landing at ${wrong(next)} short of ${next} costs a heart (${h0} -> ${B.heartsLeft(o)})`);
    check(v && v.mood === 'bad' && v.line === 'Wrong airport: lost a heart', `5. the card says so: ${JSON.stringify(v && v.line)}`);
    const h1 = B.heartsLeft(o); fly(s, { landedAt: next, passed: [] });
    check(B.heartsLeft(o) === h1 && o.reached === 2 && !s.storyHurt, `5. landing at ${next} costs nothing and reaches it (reached ${o.reached})`); }
  // 6.
  const e6 = withStory('easy');
  if (e6) { const { s, o } = e6; s.city = o.stops[0]; B.landedAt(s, o.stops[0]); const before = JSON.stringify(o);
    fly(s, { landedAt: ['PARIS', 'BRUSSELS', 'MADRID'].find(x => !o.stops.includes(x)), passed: [] });
    check(s.storyActive === o.id && JSON.stringify(o) === before && !s.storyHurt, '6. an Easy story: a wrong landing after the pickup costs nothing'); }
  // 3.
  const e = withStory('easy');
  check(!!e, 'FIXTURE: an easy story is on the board');
  if (e) { const { s, o } = e, stop = o.stops[0]; const v = fly(s, { landedAt: 'PARIS' === stop ? 'BRUSSELS' : 'PARIS', passed: [stop] });
    check(s.storyActive === o.id && v && v.line === `Missed ${stop}: fly back`, `3. an Easy story loses nothing and the card says 'Missed ${stop}': ${JSON.stringify(v && v.line)}`); }
  if (fails.length) { console.log(`FAIL storymiss:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log('PASS storymiss: flying past a story stop costs a heart (Easy: none) and the card says so; after the pickup any wrong landing costs one; on the way to the pickup landing short costs nothing; the last heart fails the story');
})();
