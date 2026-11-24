// The crossing as data (src/crossingview.js; R-A of the UX plan, the user's playtest of 0.29.0). No browser. Checks, on DECLARED saves:
//   1. the three conditions, their words and their order; which one is NEAREST; "ready" follows src/crossings.js offerCheck (rule 'all3', or '2of3' as a test lever);
//   2. the one-time moment: due when ready and not told, markTold keeps it told (a save field, survives), nothing is due twice;
//   3. UP NEXT: a near crossing adds ONE quiet line ("Cross: nature 22 of 30"), a ready one LEADS with "Cross to X" and "NEW Easy" (then "Easy" once told); every row fits one line;
//   4. every crossing in the game has a sheet title / body / ticks title / route and plain line within budget, with the longest city names.
// Run: node tests/crossingview.cjs   (plants in tools/plants.tsv)
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const V = await import('../src/crossingview.js'), N = await import('../src/nextup.js'), C = await import('../src/crossings.js'), S = await import('../src/season.js'), T = await import('../src/tips.js');
  const base = () => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], areaBest: {}, crossed: [],
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  // 1. The three ticks: Era, Plane, Nature (CROSSINGS V2: ready by status; the trial stars and where the player is do not matter).
  const s0 = base(), c0 = V.crossingState(s0);
  check(c0 && c0.id === 'mediterranean' && c0.to === 'TUNIS' && c0.km === 12000 && !c0.ready, `a fresh weurope pilot: the first crossing is near, not ready: ${JSON.stringify(c0 && [c0.id, c0.ready])}`);
  // PLAN B (Oliver, 2026-11-24): TWO ticks, Range (the plane's range or a landed flight reaches the whole crossing) and Nature (the departure land's meter, rising per tier); no era.
  check(c0.conds.map(x => x.label).join('|') === 'Range|Nature', `two ticks, Range and Nature: ${c0.conds.map(x => x.label)}`);
  check(c0.conds.map(x => x.done).join() === 'false,false' && c0.nearest && c0.nearest.key === 'plane', `a fresh pilot: the range is not there yet: ${c0.conds.map(x => [x.key, x.done])}`);
  check(V.boxView(c0).line === 'More range: upgrade plane', `the box's plain line: "${V.boxView(c0).line}"`);
  const H = await import('../src/habitats.js'), medAll = H.REGION_DATA.mediterranean.projects.map(p => p.id);   // every Mediterranean land project: its meter 56, over Easy's 15
  const sShort = base(); sShort.areaBest = { weurope: 11999 }; sShort.habitat = { mediterranean: medAll };   // (nature met, so only the range holds it back)
  check(!V.crossingState(sShort).ready, 'an 11,999 km flight does not open a 12,000 km crossing (V4: the whole crossing, not 70%)');
  const sNoNat = base(); sNoNat.areaBest = { weurope: 12000 };
  check(!V.crossingState(sNoNat).ready, 'Plan B: a 12,000 km landed flight alone does not open it: ROME\'s land has no nature');
  const s1 = base(); s1.areaBest = { weurope: 12000 }; s1.habitat = { mediterranean: medAll };
  const c2 = V.crossingState(s1);
  check(c2.ready && !c2.told, `a 12,000 km landed flight and nature in ROME's land: ready, not told, no trial stars: ${JSON.stringify([c2.ready, c2.told])}`);
  { const far = { ...s1, city: 'OSLO', visited: ['OSLO'] };
    check(JSON.stringify(V.crossingState(s1).conds) === JSON.stringify(V.crossingState(far).conds), 'the tick does not depend on the city the player is in'); }
  // 2. The moment fires once.
  check(V.momentDue(c2) === true, 'the moment is due');
  V.markTold(s1, c2.id); const c3 = V.crossingState(s1);
  check(c3.told && V.momentDue(c3) === false && JSON.stringify(s1.crossingTold) === '["mediterranean"]', `after markTold nothing is due twice and the save remembers: ${JSON.stringify([c3.told, s1.crossingTold])}`);
  V.markTold(s1, c2.id); check(s1.crossingTold.length === 1, 'markTold is idempotent');
  // 3. UP NEXT.
  const near = N.nextUp(s1, { crossing: c0, limit: 3 });
  check(!near.some(r => r.key === 'cross:progress'), `UP NEXT has no quiet crossing line any more (the HOME box replaced it): ${JSON.stringify(near.map(r => r.short))}`);
  const teach = { ...s1, missionsDone: ['L1'] }, early = N.nextUp(teach, { crossing: c0, limit: 3 });   // the lessons are not done: the quiet line waits
  check(!early.some(r => r.key === 'cross:progress'), `while lessons remain UP NEXT shows no crossing line: ${JSON.stringify(early.map(r => r.key))}`);
  const fresh = { ...c2, told: false }, told = { ...c2, told: true };
  const rd = N.nextUp(s1, { crossing: fresh, crossingReady: 'ROME to TUNIS', limit: 3 }), rt = N.nextUp(s1, { crossing: told, crossingReady: 'ROME to TUNIS', limit: 3 });
  check(rd[0].key === 'lead:cross' && rd[0].short === 'Cross to TUNIS' && rd[0].right === 'NEW Easy' && rd[0].lead, `a ready crossing LEADS, NEW + how hard: ${JSON.stringify(rd[0])}`);
  check(rt[0].right === 'Easy' && !rt.some(r => r.key === 'cross:progress') && rd.filter(r => r.lead).length === 1, `once told the NEW goes; only one lead: ${JSON.stringify([rt[0].right, rd.map(r => r.key)])}`);
  const boxed = N.nextUp(s1, { crossing: fresh, crossingReady: 'ROME to TUNIS', limit: 3, boxShown: true });
  check(!boxed.some(r => r.key === 'lead:cross' || /Cross to/.test(r.short)), `with the HOME box showing the ready crossing UP NEXT does not repeat it as a gold row: ${JSON.stringify(boxed.map(r => r.short))}`);
  check(rd[0].key === 'lead:cross', 'without the box (the results card) a ready crossing still leads UP NEXT');
  for (const r of [...near, ...rd, ...rt]) check(r.short.length + N.rightOf(r).length <= N.ROW_MAX, `row "${r.short}" + "${N.rightOf(r)}" fits one line (${N.ROW_MAX})`);
  // 4. Every crossing, longest names.
  for (const c of C.CROSSINGS.flatMap(x => (x.kind === 'lap' ? [] : [0, 1, 2, 3, 4].map(n => C.asNext(x, n))))) {   // CROSSINGS V3: every route as each of the 5 crossings
    const full = { ...c, from: c.a, to: c.b, opens: 'weurope', km: C.crossingKm(c) }, st = V.stateOf(s0, full), t = V.sheetText(st);
    check(t.title.length <= 34 && T.wordCount(`${t.title} ${t.body}`) <= 60 && st.conds.length >= 1, `${c.id}: the sheet fits (title ${t.title.length}, ${T.wordCount(`${t.title} ${t.body}`)} words)`);
    const t1 = V.sheetText(st, true); check(T.wordCount(`${t1.title} ${t1.body}`) <= 60 && /no stops/.test(t1.body) && !/no stops/.test(t.body), `${c.id}: the FIRST crossing's sheet says what a crossing is, within 60 words (${T.wordCount(`${t1.title} ${t1.body}`)}), and later sheets do not`);
    check(V.ticksTitle(st).length <= 28 && V.rightText(st).length <= 13, `${c.id}: ticks title ${V.ticksTitle(st).length}, right ${V.rightText(st).length}`);
    const row = N.fitRow({ short: `Cross to ${st.to}`, where: 'fly', right: V.rightText(st) }); check(row.short.length + row.right.length <= N.ROW_MAX, `${c.id}: the lead row fits one line: "${row.short}" + "${row.right}"`);
  }
  console.log(fails.length ? `FAIL crossingview:\n - ${fails.join('\n - ')}` : `PASS crossingview: Range and Nature (the departure land) conditions, nearest, the moment once and only once, UP NEXT rows, and the sheet and rows of all ${C.CROSSINGS.length - 1} crossings within budget`);
  process.exit(fails.length ? 1 : 0);
})();
