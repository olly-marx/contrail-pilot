// What the area missions and crossings pay (src/missionprize.js; research BLOCK1-MISSION-REWARDS-AND-GATES.md A.8). Plain Node, no browser. Named lines, in order:
//   1. every tier total is EXACTLY today's (60 / 90 / 105 seeds at k = 1) at k = 1, 2, 3 for release A's ladder, and 60 / 104 / 134 for release B's (streaks on top)
//   2. the order streak3 > chain > land2 and streak3 > streak2 (pay follows effort inside a tier)
//   3. the 22 crossings (7 Easy, 6 Medium, 4 Hard, 2 Harder, 2 Very hard, 1 The lap) pay 9,100 seeds and 1,132 crystals; an unknown kind or word throws
//   4. SHOWN = PAID: the prize on every visible mission equals missionPrize(kind, k), and finishing the mission banks exactly that
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const Z = await import('../src/missionprize.js'), M2 = await import('../src/missions2.js'), S = await import('../src/save.js');
  const total = (kinds, k) => kinds.reduce((a, x) => a + Z.missionPrize(x, k).seeds, 0);
  // Release B's ladder adds the streak kinds as EXTRAS (rescue and golden stay); the streaks are paid on top: 60 / 104 / 134 at k = 1.
  check(Z.LADDER_B[2].includes('streak2') && Z.LADDER_B[3].includes('streak3') && Z.LADDER_B[2].includes('rescue') && Z.LADDER_B[3].includes('golden') && Z.missionPrize('streak2', 1).seeds > 0 && Z.missionPrize('streak3', 1).crystals > 0, 'release B ladder: streak2 and streak3 are EXTRAS beside rescue and golden and have a pay');
  for (const [name, lad, t] of [['A', Z.LADDER_A, [60, 90, 105]], ['B', Z.LADDER_B, [60, 104, 134]]]) for (const k of [1, 2, 3])
    check(total(lad[1], k) === t[0] * k && total(lad[2], k) === t[1] * k && total(lad[3], k) === t[2] * k, `tier totals of ladder ${name} at k = ${k} are ${t[0] * k} / ${t[1] * k} / ${t[2] * k}: ${total(lad[1], k)} / ${total(lad[2], k)} / ${total(lad[3], k)}`);
  const p = x => Z.missionPrize(x, 1).seeds;
  check(p('streak3') > p('chain') && p('chain') > p('land2') && p('streak3') > p('streak2'), `pay follows effort inside a tier: streak3 ${p('streak3')} > chain ${p('chain')} > land2 ${p('land2')}, streak3 > streak2 ${p('streak2')}`);
  const counts = { Easy: 7, Medium: 6, Hard: 4, Harder: 2, 'Very hard': 2, 'The lap': 1 };
  const sum = Object.entries(counts).reduce((a, [w, n]) => [a[0] + n * Z.crossingReward(w).seeds, a[1] + n * Z.crossingReward(w).crystals], [0, 0]);
  let threwKind = false, threwWord = false; try { Z.missionPrize('nope', 1); } catch (e) { threwKind = true; } try { Z.crossingReward('Nope'); } catch (e) { threwWord = true; }
  check(sum[0] === 9100 && sum[1] === 1132 && threwKind && threwWord, `22 crossings pay 9,100 seeds and 1,132 crystals, and an unknown kind or word throws: ${sum}, threw ${threwKind}/${threwWord}`);
  // 4: shown = paid
  const s = S.prepareSave(null); Object.assign(s, { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5', 'weurope:shade', 'weurope:plant-tree', 'weurope:clean-gaps', 'weurope:dodge', 'weurope:spot', 'weurope:hazard'], levels: {}, flights: 20, landings: 12 });   // tiers 1 to 3 open: the old flat pay equalled the table only in tier 1, so a tier-1-only fixture could not tell them apart (the first prove-plants run)
  const vis = M2.visible(s), bad = vis.filter(m => { const want = Z.missionPrize(Z.kindOf(m.def.id), m.fill.k); return m.prize.seeds !== want.seeds || m.prize.crystals !== want.crystals; });
  check(vis.length > 0 && bad.length === 0, `the prize shown on every visible mission is missionPrize(kind, k): ${vis.length} missions, off: ${bad.map(m => m.def.id)}`);
  const lc = vis.find(m => m.def.id === 'land-city'), seeds0 = s.seeds || 0;
  check(vis.some(m => m.def.id === 'chain') && vis.some(m => m.def.id === 'route') && !!lc, `FIXTURE: land-city, chain and route are all offered: ${vis.map(m => m.def.id)}`);
  M2.onFlight(s, { landed: true, landedAt: lc.fill.city, distance: 100, airportsSkipped: 0, cargo: 0, planted: 0, sunBlocked: 0, cleanGaps: 0 });
  check((s.seeds || 0) - seeds0 === lc.prize.seeds, `finishing land-city banks exactly the prize shown (${lc.prize.seeds}): +${(s.seeds || 0) - seeds0}`);
  console.log(fails.length ? `FAIL missionprize:\n - ${fails.join('\n - ')}` : 'PASS missionprize: tier totals stay 60 / 90 / 105, pay follows effort inside a tier, the crossing scale sums to 9,100 seeds, the prize shown is the prize paid');
  process.exit(fails.length ? 1 : 0);
})();
