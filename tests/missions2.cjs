// Season 2 missions (S3 of research/PROPOSAL-HOME-MISSIONS.md; src/missions2.js). No browser.
// 1. lessons come first, in order, and reveal the hub's tiles; 2. an OFF-FLIGHT mission completes on the purchase
// itself, with no flight; 3. teach missions are not offered after the first crossing, and later stages ask more;
// 4. a tier opens after any 3 of the one before; 5. "here" missions and the crossing gate count only in their own area;
// 6. a crash completes nothing; 7. the crossing is not offered with 2 of the 3 starred missions; 8. a land's 4th tree
// opens on its area's 'kinds3' mission; 9. area prizes are seeds only; 10. a free upgrade makes NEXT lead into the hangar.
// Run: node tests/missions2.cjs   (proved by planted defects)
(async () => {
  const M = await import('../src/missions2.js'), C = await import('../src/crossings.js'), L = await import('../src/landtrees.js'), H = await import('../src/hub.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const base = () => ({ areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', visited: ['AMSTERDAM'], missionsDone: [], unclaimed: [], tutorialDone: true, levels: {}, habitat: {},
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const landed = (x = {}) => ({ landed: true, landedAt: 'BERLIN', cargo: 0, sunBlocked: 0, planted: 0, airportsSkipped: 0, nightOwl: false, kinds: 0, bumped: 0, goldens: 0, dodges: 0, ...x });
  // 1. Lessons.
  let s = base();
  check(M.next(s).key === 'L1' && !M.revealed(s, 'hangar'), `a new pilot starts on lesson 1, hangar shut (${M.next(s).key})`);
  M.onFlight(s, landed());
  check(s.missionsDone.includes('L1') && M.revealed(s, 'hangar') && M.revealed(s, 'missions') && !M.revealed(s, 'nature'), `L1 done opens HANGAR + MISSIONS only: ${s.missionsDone}`);
  M.onFlight(s, landed({ nightOwl: true }));
  check(!s.missionsDone.includes('L3'), 'lessons go in order: L3 is not done before L2');
  for (const r of [{ sunBlocked: 3 }, { nightOwl: true }, { airportsSkipped: 1 }, { planted: 1 }]) M.onFlight(s, landed(r));
  check(M.lessonsLeft(s).length === 0 && M.revealed(s, 'world'), `all 5 lessons done: ${s.missionsDone}`);
  // 2. Off-flight: funding a project completes "Fund a nature project here" at once.
  s.habitat = { woodland: ['deadwood'] };
  const got = M.onSave(s);
  check(got.some(m => m.key === 'weurope:project') && s.unclaimed.some(u => u.key === 'mission:weurope:project'), `a project completes its mission on the spot: ${got.map(m => m.key)}`);
  // 3. Stages.
  const s3 = { ...base(), areas: ['weurope', 'nordic'] };
  check(M.stageOf(s3) === 'challenge' && !M.visible(s3).some(m => m.key.startsWith('L')), 'after the first crossing: challenge stage, no lessons');
  check(M.visible(s3).find(m => m.key.endsWith(':bring')).title.includes('20'), `challenge asks more (bring 20, not 10): ${M.visible(s3).find(m => m.key.endsWith(':bring')).title}`);
  // 4. Tiers.
  check(!M.tierOpen(s, 'weurope', 2), 'tier 2 shut with 1 of tier 1 done');
  M.onFlight(s, landed({ cargo: 10, cleanGaps: 3 }));   // bring + clean gaps (+ the project) = 3 of tier 1
  check(M.tierOpen(s, 'weurope', 2) && !M.tierOpen(s, 'weurope', 3), `any 3 of tier 1 open tier 2 (done: ${s.missionsDone.filter(k => k.startsWith('weurope'))})`);
  // 5-6. Area and landing.
  const t3 = () => ['dodge', 'chain', 'rescue'].forEach(id => s.missionsDone.push(`weurope:${id}`));
  t3();
  const away = { ...s, city: 'NEW YORK', missionsDone: [...s.missionsDone] };
  M.onFlight(away, landed({ nightOwl: true, sunBlocked: 12 }));
  check(!away.missionsDone.some(k => /weurope:(night|shade10)/.test(k)), 'a flight from ANOTHER area completes no "here" mission of Western Europe');
  const crash = { ...s, missionsDone: [...s.missionsDone] };
  M.onFlight(crash, { ...landed({ nightOwl: true, sunBlocked: 12, cargo: 99 }), landed: false });
  check(crash.missionsDone.length === s.missionsDone.length, 'a crash completes nothing');
  // 7. The gate.
  const raw = C.CROSSINGS.find(x => x.id === 'warsaw-stockholm'), c = { ...raw, from: 'WARSAW', to: 'STOCKHOLM', km: C.crossingKm(raw) }, full = { capabilityKm: 1e9, bio: 99 };   // as available() orients it
  M.onFlight(s, landed({ sunBlocked: 10 }));   // 1 of 3 starred
  check(M.starsDone(s, 'weurope') === 1 && !M.gateDone(s, 'weurope') && !C.offerCheck(c, { ...full, missionsDone: C.offerCtx(s, c).missionsDone }).offered, 'one of the three starred: no crossing');
  M.onFlight(s, landed({ treeIds: ['spruce', 'birch', 'oak'] }));   // 2 of 3 (the night star NOT done: it blocked weaker pilots)
  check(M.starsDone(s, 'weurope') === 2 && M.gateDone(s, 'weurope') && C.offerCtx(s, c).missionsDone === true && C.offerCheck(c, { ...full, missionsDone: true }).offered, 'any two of the three starred (the user, 2026-10-27): the gate is open');
  check(!M.gateDone(s, 'namerica'), "Western Europe's trio does not open North America's gate");
  // 8. The 4th tree.
  check(L.treesOpen(s, 'woodland').includes(4) || L.OPENS[4].ok(s, 'woodland'), "woodland's 4th tree opens on Western Europe's 'kinds3'");
  check(!L.OPENS[4].ok({ ...s, missionsDone: s.missionsDone.filter(k => k !== 'weurope:kinds3') }, 'woodland'), 'and not without it');
  // 9. Prizes.
  check(s.unclaimed.filter(u => u.key.startsWith('mission:weurope')).every(u => u.crystals === 0 && u.seeds > 0), 'area prizes are seeds only');
  // 10b. A free part waiting reveals the hangar by ITSELF (the user's live bug, 2026-10-27): the school landing grants it,
  // but no lesson is done yet (school flights don't count), and a crash on flight 1 leaves L1 undone too.
  const afterSchool = { ...base(), missionsDone: [], freeUpgrade: true, freeGiven: true };
  check(M.revealed(afterSchool, 'hangar') && H.hubView(afterSchool).next.hangar, `after the school landing (no lesson done) the hangar is revealed and NEXT leads there: ${JSON.stringify(H.hubView(afterSchool).next)}`);
  const picked = { ...afterSchool, freeUpgrade: false };   // the free part picked, flight 1 then crashed: L1 still undone
  check(M.revealed(picked, 'hangar'), 'once the free part was given the hangar stays revealed (a crash on flight 1 must not hide it)');
  // 10. A free upgrade leads into the hangar.
  const f = { ...base(), missionsDone: ['L1'], freeUpgrade: true };
  check(H.hubView(f).next.hangar && H.hubView(f).next.title === H.FREE_NEXT, `free upgrade: NEXT = "${H.FREE_NEXT}" (${JSON.stringify(H.hubView(f).next)})`);
  check(!H.hubView({ ...f, freeUpgrade: false }).next.hangar && H.hubView({ ...f, freeUpgrade: false }).next.id === 'L2', 'once the free part is picked, NEXT goes back to the lesson (no "later": the user wants it a must-do)');
  console.log(fails.length ? `FAIL missions2:\n - ${fails.join('\n - ')}` : 'PASS missions2: lessons in order with reveals, off-flight on purchase, stages, tiers by 3, area-bound, crash = nothing, gate = any 2 of 3 stars, 4th tree, seeds-only, free upgrade leads to the hangar');
  process.exit(fails.length ? 1 : 0);
})();
