// A MISSED STORY STOP (0.79.0; Oliver, 2026-11-24: 'I forgot to land. I just missed the airport ... I don't know what happens to the story if you miss an airport and land
// somewhere else'; src/storyboard.js missed, src/missions2.js onFlight, src/resultscard.js storyView). Plain Node. Named lines:
//  1. a landed story flight that flew PAST the next stop costs one heart; the stop stays the next one and the results card says 'Missed <city>: lost a heart';
//  2. a landing SHORT of the stop (it was never passed) costs nothing;
//  3. an Easy story (no hearts) loses nothing, and the card still says 'Missed <city>';
//  4. the last heart lost this way fails the story.
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
  // 3.
  const e = withStory('easy');
  check(!!e, 'FIXTURE: an easy story is on the board');
  if (e) { const { s, o } = e, stop = o.stops[0]; const v = fly(s, { landedAt: 'PARIS' === stop ? 'BRUSSELS' : 'PARIS', passed: [stop] });
    check(s.storyActive === o.id && v && v.line === `Missed ${stop}: fly back`, `3. an Easy story loses nothing and the card says 'Missed ${stop}': ${JSON.stringify(v && v.line)}`); }
  if (fails.length) { console.log(`FAIL storymiss:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log('PASS storymiss: flying past a story stop and landing elsewhere costs a heart (Easy: none) and the card says so; landing short costs nothing; the last heart fails the story');
})();
