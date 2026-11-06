// The crossing as data (src/crossingview.js; R-A of the UX plan, the user's playtest of 0.29.0). No browser. Checks, on DECLARED saves:
//   1. the three conditions, their words and their order; which one is NEAREST; "ready" follows src/crossings.js offerCheck (rule 'all3', or '2of3' as a test lever);
//   2. the one-time moment: due when ready and not told, markTold keeps it told (a save field, survives), nothing is due twice;
//   3. UP NEXT: a near crossing adds ONE quiet line ("Cross: nature 22 of 30"), a ready one LEADS with "Cross to X" and "NEW 6,500km" (then "6,500km" once told); every row fits one line;
//   4. every crossing in the game has a sheet title / body / ticks title / nearest line within budget, with the longest city names.
// Run: node tests/crossingview.cjs   (plants in tools/plants.tsv)
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const V = await import('../src/crossingview.js'), N = await import('../src/nextup.js'), C = await import('../src/crossings.js'), S = await import('../src/season.js'), T = await import('../src/tips.js');
  const base = () => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], areaBest: {}, crossed: [],
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const rule0 = S.SEASON.offer.rule;
  // 1. The conditions.
  const s0 = base(), c0 = V.crossingState(s0);
  check(c0 && c0.id === 'warsaw-stockholm' && c0.to === 'STOCKHOLM' && c0.km === 6500 && !c0.ready, `a fresh weurope pilot: the first crossing is near, not ready: ${JSON.stringify(c0 && [c0.id, c0.ready])}`);
  check(c0.conds.map(x => x.label).join('|') === 'Fly 4,550 km|Nature 30|Trial stars', `the three conditions, in order: ${c0.conds.map(x => x.label)}`);
  const s1 = base(); s1.areaBest = { weurope: 99999 }; s1.missionsDone = [...s1.missionsDone, 'weurope:night', 'weurope:shade10'];
  const c1 = V.crossingState(s1);
  check(c1.conds.filter(x => x.done).map(x => x.key).join() === 'capability,contrails' && c1.nearest && c1.nearest.key === 'nature' && !c1.ready, `flight + trial done, nature left: nearest is nature, not ready: ${JSON.stringify(c1.conds.map(x => [x.key, x.done]))}`);
  check(/^Cross: nature \d+ of 30$/.test(V.nearestLine(c1)), `the nearest line: "${V.nearestLine(c1)}"`);
  S.SEASON.offer.rule = '2of3'; const c2 = V.crossingState(s1); S.SEASON.offer.rule = rule0;   // the test lever: "the last condition has just been met"
  check(c2.ready && !c2.told, `2 of 3 met under the 2of3 lever: ready, not told: ${JSON.stringify([c2.ready, c2.told])}`);
  // 2. The moment fires once.
  check(V.momentDue(c2) === true, 'the moment is due');
  V.markTold(s1, c2.id); S.SEASON.offer.rule = '2of3'; const c3 = V.crossingState(s1); S.SEASON.offer.rule = rule0;
  check(c3.told && V.momentDue(c3) === false && JSON.stringify(s1.crossingTold) === '["warsaw-stockholm"]', `after markTold nothing is due twice and the save remembers: ${JSON.stringify([c3.told, s1.crossingTold])}`);
  V.markTold(s1, c2.id); check(s1.crossingTold.length === 1, 'markTold is idempotent');
  // 3. UP NEXT.
  const near = N.nextUp(s1, { crossing: c1, limit: 3 });
  check(near.some(r => r.key === 'cross:progress' && r.right === '' && /^Cross: nature/.test(r.short)), `a near crossing adds one quiet line: ${JSON.stringify(near.map(r => r.short))}`);
  const teach = { ...s1, missionsDone: ['L1'] }, early = N.nextUp(teach, { crossing: c1, limit: 3 });   // the lessons are not done: the quiet line waits
  check(!early.some(r => r.key === 'cross:progress'), `while lessons remain UP NEXT shows no crossing line: ${JSON.stringify(early.map(r => r.key))}`);
  const fresh = { ...c2, told: false }, told = { ...c2, told: true };
  const rd = N.nextUp(s1, { crossing: fresh, crossingReady: 'WARSAW to STOCKHOLM', limit: 3 }), rt = N.nextUp(s1, { crossing: told, crossingReady: 'WARSAW to STOCKHOLM', limit: 3 });
  check(rd[0].key === 'lead:cross' && rd[0].short === 'Cross to STOCKHOLM' && rd[0].right === 'NEW 6,500km' && rd[0].lead, `a ready crossing LEADS, NEW + the distance: ${JSON.stringify(rd[0])}`);
  check(rt[0].right === '6,500km' && !rt.some(r => r.key === 'cross:progress') && rd.filter(r => r.lead).length === 1, `once told the NEW goes; only one lead: ${JSON.stringify([rt[0].right, rd.map(r => r.key)])}`);
  for (const r of [...near, ...rd, ...rt]) check(r.short.length + N.rightOf(r).length <= N.ROW_MAX, `row "${r.short}" + "${N.rightOf(r)}" fits one line (${N.ROW_MAX})`);
  // 4. Every crossing, longest names.
  for (const c of C.CROSSINGS.filter(x => x.kind !== 'lap')) {
    const full = { ...c, from: c.a, to: c.b, opens: 'weurope', km: C.crossingKm(c) }, st = V.stateOf(s0, full), t = V.sheetText(st);
    check(t.title.length <= 34 && T.wordCount(`${t.title} ${t.body}`) <= 60 && st.conds.length >= 2, `${c.id}: the sheet fits (title ${t.title.length}, ${T.wordCount(`${t.title} ${t.body}`)} words)`);
    const t1 = V.sheetText(st, true); check(T.wordCount(`${t1.title} ${t1.body}`) <= 60 && /no stops/.test(t1.body) && !/no stops/.test(t.body), `${c.id}: the FIRST crossing's sheet says what a crossing is, within 60 words (${T.wordCount(`${t1.title} ${t1.body}`)}), and later sheets do not`);
    check(V.ticksTitle(st).length <= 28 && V.nearestLine(st).length <= 24 && V.rightText(st).length <= 12, `${c.id}: ticks title ${V.ticksTitle(st).length}, nearest line ${V.nearestLine(st).length}, right ${V.rightText(st).length}`);
    const row = N.fitRow({ short: `Cross to ${st.to}`, where: 'fly', right: V.rightText(st) }); check(row.short.length + row.right.length <= N.ROW_MAX, `${c.id}: the lead row fits one line: "${row.short}" + "${row.right}"`);
  }
  console.log(fails.length ? `FAIL crossingview:\n - ${fails.join('\n - ')}` : `PASS crossingview: 3 conditions, nearest, the moment once and only once, UP NEXT rows, and the sheet and rows of all ${C.CROSSINGS.length - 1} crossings within budget`);
  process.exit(fails.length ? 1 : 0);
})();
