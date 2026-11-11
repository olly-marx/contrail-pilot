// RELEASE C: the crossing prize (src/missionprize.js crossingReward / crossingWord; src/crossings.js crossingPrizeDue, completeCrossing; src/crossingend.js endView; src/crossingview.js stateOf / boxView). Plain Node, no browser.
// The prize is paid in completeCrossing, which the game (GameScene.finish) and the sim (src/sim/progression.js) both call. Named lines, in order:
//   FIXTURE  the ladder has 22 crossings and every one has a difficulty word the price table knows
//   1. the 22 crossings pay 9,100 seeds and 1,132 ice crystals together, by their words (7 Easy, 6 Medium, 4 Hard, 2 Harder, 2 Very hard, the lap)
//   2. a landed crossing pays its word's prize ONCE: the first completeCrossing adds exactly crossingReward(word) to the bank
//   3. NO BACK-PAY: a crossing already in save.crossed pays nothing (a second landing, and an old save that crossed it before this release)
//   4. the lap pays only when it is landed back HOME (the player is elsewhere: nothing, not marked crossed); landed at home it pays 2,000 seeds and 250 crystals
//   5. a crash pays nothing: the scene never calls completeCrossing on a crash, so crossingPrizeDue is only read after a landing (GameScene: `due = landed ? ... : null`); here: no call, bank unchanged, and the landing card has no prize lines
//   6. the prize shown is the prize paid: stateOf(...).prize and boxView(...).prize ('Prize: 100 seeds') equal what completeCrossing adds
//   7. the landing card (endView) says '+100 seeds' and '+12 ice crystals' for a paid first crossing, and nothing for an unpaid one
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const C = await import('../src/crossings.js'), Z = await import('../src/missionprize.js'), V = await import('../src/crossingview.js'), E = await import('../src/crossingend.js');
  const all = C.CROSSINGS, word = c => Z.crossingWord(c);
  const counts = {}; for (const c of all) counts[word(c)] = (counts[word(c)] || 0) + 1;
  check(all.length === 22 && all.every(c => Z.CROSSING_PRIZE[word(c)]), `FIXTURE: 22 crossings, every word priced: ${all.length} ${JSON.stringify(counts)}`);
  // 1
  const sum = all.reduce((a, c) => { const r = Z.crossingReward(word(c)); return [a[0] + r.seeds, a[1] + r.crystals]; }, [0, 0]);
  check(sum[0] === 9100 && sum[1] === 1132 && JSON.stringify(counts) === JSON.stringify({ Easy: 7, Medium: 6, Hard: 4, Harder: 2, 'Very hard': 2, 'The lap': 1 }), `the 22 crossings pay 9,100 seeds and 1,132 crystals: ${sum} ${JSON.stringify(counts)}`);
  const S = await import('../src/save.js');
  const mk = (extra = {}) => Object.assign(S.prepareSave(null), { areas: ['weurope'], homeArea: 'weurope', homeCity: 'WARSAW', city: 'WARSAW', visited: ['WARSAW'], tutorialDone: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], seeds: 10, crystals: 3, crossed: [] }, extra);
  const c0 = C.available(mk()).find(x => x.id === 'warsaw-stockholm');   // the real offered crossing (from, to, opens, km filled in)
  if (!c0) { console.log('FAIL crossreward: FIXTURE: warsaw-stockholm is not offered to a new weurope save'); process.exit(1); }
  // 2
  const s2 = mk(), want = Z.crossingReward(word(c0)); const ok2 = C.completeCrossing(s2, c0);
  check(ok2 === true && s2.seeds === 10 + want.seeds && s2.crystals === 3 + want.crystals && s2.crossed.includes(c0.id), `a landed crossing pays its word's prize once (${word(c0)}): seeds ${s2.seeds}, crystals ${s2.crystals}, wanted +${want.seeds}/+${want.crystals}`);
  // 3
  C.completeCrossing(s2, c0);
  const s3 = mk({ crossed: [c0.id] }); C.completeCrossing(s3, c0);
  check(s2.seeds === 10 + want.seeds && s3.seeds === 10 && s3.crystals === 3 && C.crossingPrizeDue(s3, c0) === null, `a crossing already crossed pays nothing (no back-pay): second landing seeds ${s2.seeds}, old save seeds ${s3.seeds}`);
  // 4
  const lap = C.crossingById('lap'), lc = { ...lap, from: 'LONDON', to: 'LONDON', a: 'LONDON', b: 'LONDON' };
  const s4 = mk({ city: 'PARIS' }), r4 = C.completeCrossing(s4, lc), s4b = mk({ city: 'LONDON' }), r4b = C.completeCrossing(s4b, lc);
  check(r4 === false && s4.seeds === 10 && !s4.crossed.includes('lap') && r4b === true && s4b.seeds === 10 + 2000 && s4b.crystals === 3 + 250 && s4b.lapDone === true, `the lap pays only landed at home: away ${r4}/${s4.seeds}, home ${r4b}/${s4b.seeds}/${s4b.crystals}`);
  // 5
  const s5 = mk(), v5 = E.endView({ crossing: { id: c0.id, kind: 'long', landed: false, opens: 'weurope', to: c0.to }, crystals: 0, cargo: 0 }, s5);
  check(s5.seeds === 10 && s5.crystals === 3 && !v5.lines.some(l => /^\+\d/.test(l)), `a crash pays nothing and its card has no prize lines: ${s5.seeds}, ${JSON.stringify(v5.lines)}`);
  // 6
  const st = V.stateOf(mk(), c0), bx = V.boxView(st);
  check(st.prize.seeds === want.seeds && bx.prize === `Prize: ${want.seeds} seeds`, `the prize shown is the prize paid: state ${JSON.stringify(st.prize)}, box '${bx.prize}'`);
  // 7
  const landed = (prize) => E.endView({ landedAt: c0.to, crossing: { id: c0.id, kind: 'long', landed: true, opens: 'weurope', to: c0.to, prize } }, mk(), { first: false }).lines.join(' | ');
  const withP = landed(want), noP = landed(null);
  check(withP.includes(`+${want.seeds} seeds`) && withP.includes(`+${want.crystals} ice crystals`) && !/\+\d/.test(noP), `the landing card shows the paid prize and nothing when unpaid: '${withP}' / '${noP}'`);
  console.log(fails.length ? `FAIL crossreward:\n - ${fails.join('\n - ')}` : 'PASS crossreward: 22 crossings pay 9,100 / 1,132, paid once on landing, no back-pay, lap only at home, nothing on a crash, shown = paid, the landing card names it');
  process.exit(fails.length ? 1 : 0);
})();
