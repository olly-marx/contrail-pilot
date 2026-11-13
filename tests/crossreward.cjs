// RELEASE C: the crossing prize (src/missionprize.js crossingReward / crossingWord; src/crossings.js crossingPrizeDue, completeCrossing; src/crossingend.js endView; src/crossingview.js stateOf / boxView). Plain Node, no browser.
// The prize is paid in completeCrossing, which the game (GameScene.finish) and the sim (src/sim/progression.js) both call. Named lines, in order:
//   FIXTURE  8 routes + the lap (CROSSINGS V3, 2026-11-13); a game is 5 crossings (eras 0-4, asNext) + the lap, each with a word the price table knows
//   1. they pay 4,500 seeds and 561 ice crystals together (Easy, Medium, Hard, Harder, Very hard, the lap: one each)
//   2. a landed crossing pays its word's prize ONCE: the first completeCrossing adds exactly crossingReward(word) to the bank
//   3. NO BACK-PAY: a crossing already in save.crossed pays nothing (a second landing, and an old save that crossed it before this release)
//   4. the lap pays only when it is landed back HOME (the player is elsewhere: nothing, not marked crossed); landed at home it pays 2,000 seeds and 250 crystals
//   5. a crash pays nothing: the scene never calls completeCrossing on a crash, so crossingPrizeDue is only read after a landing (GameScene: `due = landed ? ... : null`); here: no call, bank unchanged, and the landing card has no prize lines
//   6. the prize shown is the prize paid: stateOf(...).prize and boxView(...).prize ('Prize: 100 seeds') equal what completeCrossing adds
//   8. the lap's two card lines read '+2,000 seeds' and '+250 ice crystals' (the ending screen shows them: tests/crossrewardui.cjs D)
//   9. a lap landed AWAY from home shows no prize and pays nothing (finishCrossing, used by GameScene.finish); landed at home it shows the prize it paid
//  10. crossingWord throws for a non-lap crossing whose era is not 0 to 4 (era 5 used to read 'The lap': 2,000 seeds)
//   7. the landing card (endView) says '+100 seeds' and '+12 ice crystals' for a paid first crossing, and nothing for an unpaid one
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const C = await import('../src/crossings.js'), Z = await import('../src/missionprize.js'), V = await import('../src/crossingview.js'), E = await import('../src/crossingend.js');
  // CROSSINGS V3 (2026-11-13): a player makes 5 crossings, each the next era (asNext), then the lap: these six are what a whole game pays.
  const all = [0, 1, 2, 3, 4].map(n => C.asNext(C.CROSSINGS[0], n)).concat([C.crossingById('lap')]), word = c => Z.crossingWord(c);
  const counts = {}; for (const c of all) counts[word(c)] = (counts[word(c)] || 0) + 1;
  check(all.length === 6 && C.CROSSINGS.length === 9 && all.every(c => Z.CROSSING_PRIZE[word(c)]), `FIXTURE: 8 routes + the lap; a game's 5 crossings + the lap, every word priced: ${all.length} ${JSON.stringify(counts)}`);
  // 1
  const sum = all.reduce((a, c) => { const r = Z.crossingReward(word(c)); return [a[0] + r.seeds, a[1] + r.crystals]; }, [0, 0]);
  check(sum[0] === 4500 && sum[1] === 561 && JSON.stringify(counts) === JSON.stringify({ Easy: 1, Medium: 1, Hard: 1, Harder: 1, 'Very hard': 1, 'The lap': 1 }), `a game's 5 crossings and the lap pay 4,500 seeds and 561 crystals, one of each word: ${sum} ${JSON.stringify(counts)}`);
  const S = await import('../src/save.js');
  const mk = (extra = {}) => Object.assign(S.prepareSave(null), { areas: ['weurope'], homeArea: 'weurope', homeCity: 'ROME', city: 'ROME', visited: ['ROME'], tutorialDone: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], seeds: 10, crystals: 3, crossed: [] }, extra);
  const c0 = C.available(mk()).find(x => x.id === 'mediterranean');   // the real offered crossing (from, to, opens, km filled in)
  if (!c0) { console.log('FAIL crossreward: FIXTURE: mediterranean is not offered to a new weurope save'); process.exit(1); }
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
  const pl = Z.prizeLines(Z.crossingReward('The lap'));
  check(pl.join(' | ') === '+2,000 seeds | +250 ice crystals', `the lap's card lines: ${pl}`);
  const sa = mk({ city: 'PARIS' }), fa = C.finishCrossing(sa, lc, true), sh = mk({ city: 'LONDON' }), fh = C.finishCrossing(sh, lc, true);
  check(fa.landed === false && fa.prize === null && sa.seeds === 10 && fh.landed === true && fh.prize && fh.prize.seeds === 2000 && sh.seeds === 2010, `a lap landed away shows no prize and pays nothing; at home it shows the prize it paid: away ${JSON.stringify(fa)} bank ${sa.seeds}, home ${JSON.stringify(fh)} bank ${sh.seeds}`);
  const thr = c => { try { Z.crossingWord(c); return false; } catch (e) { return true; } };
  check(thr({ id: 'x', kind: 'long', era: 5 }) && thr({ id: 'x', kind: 'long' }) && thr({ id: 'x', kind: 'long', era: -1 }) && !thr({ id: 'x', kind: 'lap' }) && Z.crossingWord({ kind: 'long', era: 4 }) === 'Very hard', 'crossingWord throws for an unknown era of a non-lap crossing, and still names era 4 and the lap');
  console.log(fails.length ? `FAIL crossreward:\n - ${fails.join('\n - ')}` : 'PASS crossreward: a game of 5 crossings + the lap pay 4,500 / 561, paid once on landing, no back-pay, lap only at home, nothing on a crash, shown = paid, the landing card names it');
  process.exit(fails.length ? 1 : 0);
})();
