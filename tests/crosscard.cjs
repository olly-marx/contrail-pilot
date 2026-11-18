// THE CROSSING CARD and THE CROSSINGS LESSON's rules (the owner, 2026-11-18, on MISSIONS: "I don't understand it, and it's ugly"; "the game teaching should never end until everything about the game
// you care about is understood"). Plain Node, no browser (the screen: tests/crosscard-ui.cjs). Named lines:
//   1. src/crossingview.js cardsView: one card per crossing on offer; rows Era, Plane, Nature in that order; a done row has no value, an open one a bar fraction and a value (nature "have / need",
//      the plane a word, never a distance); ONE next line, for the open row nearest to done; a ready card says Ready (the three rows are by status, so every card on offer is ready together); the route and the land it opens.
//   2. src/lessons.js crossings: NOT done by a two-area home region (it was (s.areas || []).length > 1: Asia = sasia + easia, so no one ever saw it); done by the lesson (r-cross) or a flown crossing;
//      not the current lesson until a crossing is listed (`open`), then the current one once the others are done.
// Run: node tests/crosscard.cjs   (plants in tools/plants.tsv)
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const V = await import('../src/crossingview.js'), C = await import('../src/crossings.js'), L = await import('../src/lessons.js'), H = await import('../src/habitats.js');
  const base = { areas: ['sasia', 'easia'], homeArea: 'sasia', city: 'KARACHI', tutorialDone: true };
  const save = (o = {}) => JSON.parse(JSON.stringify({ ...base, ...o }));
  const proj = n => ({ monsoon: H.REGION_DATA.monsoon.projects.slice(0, n).map(p => p.id) });   // PACING A2 (2026-11-18, LAND_EVEN on, need 30): 5 projects: nature 24 in KARACHI's land (measured), 9: 47

  // 1. The cards.
  const s1 = save({ bestDistance: 3000, habitat: proj(5) }), cards = V.cardsView(s1);
  check(cards.length === C.available(s1).length && cards.length === 3, `one card per crossing on offer (Asia: 3): ${cards.length}`);
  const k = cards.find(c => c.id === 'arabian-sea') || {};
  check(k.route === 'KARACHI > MUSCAT' && k.opens === 'Opens Africa & the Middle East' && k.word === 'Easy', `the card names the route, the land it opens and how hard: ${JSON.stringify([k.route, k.opens, k.word])}`);
  check(JSON.stringify((k.rows || []).map(r => r.key)) === '["era","plane","nature"]' && JSON.stringify((k.rows || []).map(r => r.label)) === '["Era","Plane","Nature"]', `three rows Era, Plane, Nature: ${JSON.stringify(k.rows)}`);
  const [era, plane, nature] = k.rows || [];
  check(era && era.done && era.value === null && era.frac === 1, `a done row is a tick with no value: ${JSON.stringify(era)}`);
  check(nature && !nature.done && nature.value === '24 / 30' && Math.abs(nature.frac - 24 / 30) < 1e-9, `the nature row: a bar and "have / need": ${JSON.stringify(nature)}`);
  check(plane && !plane.done && /^(nearly|not yet)$/.test(plane.value) && plane.frac > 0 && plane.frac < 1, `the plane row: a bar and a word: ${JSON.stringify(plane)}`);
  check(cards.every(c => c.rows.every(r => !/km|\d,\d{3}/.test(String(r.value)))), 'no distance anywhere on a card');
  // The next line: the open row NEAREST to done (plane 3,000 of 4,900 = 0.61 vs nature 24/30 = 0.8: nature).
  check(k.nextKey === 'nature' && k.next === V.CARD_NEXT.nature && /NATURE/.test(k.next), `the next line is for the nearest open row (nature): ${k.nextKey} "${k.next}"`);
  const s2 = save({ bestDistance: 4500, habitat: proj(1) }), k2 = V.cardsView(s2).find(c => c.id === 'arabian-sea');
  check(k2.nextKey === 'plane' && /HANGAR/.test(k2.next), `plane nearer than nature: the next line is the plane's: ${k2.nextKey} "${k2.next}"`);
  // Ready: every row done, the Ready line, and the ready card first.
  const s3 = save({ bestDistance: 99999, habitat: proj(9) }), c3 = V.cardsView(s3);
  check(c3.every(c => c.ready && c.next === V.CARD_READY && c.rows.every(r => r.done)), `all three done: ready, every row ticked, the Ready line: ${JSON.stringify(c3.map(c => [c.ready, c.next]))}`);
  const order = V.cardsView(s1);
  check(order.every(c => !c.ready), 'none ready at 3,000 km and nature 24');
  check(order.every(c => typeof c.next === 'string' && c.next.length > 0 && c.next.length <= 60), `every card has one plain next line of at most 60 characters: ${JSON.stringify(order.map(c => c.next))}`);
  // PACING A2 (natureRule 'weakest'): after crossing 1 the nature row reads the weakest opened region, and the next line names it.
  const s4 = save({ areas: ['sasia', 'easia', 'mideast'], flightSeconds: 60 * 60 * 20, bestDistance: 99999, crossed: ['arabian-sea'], habitat: proj(9) });
  const k4 = V.cardsView(s4).find(c => c.kind !== 'lap') || {}, n4 = (k4.rows || []).find(r => r.key === 'nature') || {};
  check(C.natureHave(s4) < C.natureBest(s4) && !n4.done && k4.nextKey === 'nature' && k4.next === V.natureNextIn('Africa & the Middle East') && k4.next.length <= 60,
    `a second crossing waits on the NEW region's nature, and the card says where: ${JSON.stringify([C.natureHave(s4), C.natureBest(s4), n4, k4.next])}`);
  // 2. The crossings lesson.
  const les = L.BOARD.find(l => l.id === 'crossings');
  check(les && L.BOARD[L.BOARD.length - 1].id === 'crossings', 'the crossings lesson is the last on the board');
  const all = ['hangar', 'name', 'r-boards', 'r-map', 'r-earth', 'r-nature'];
  const grad = o => save({ school2: true, freeGiven: true, freeProjectGiven: true, goodLandings: 1, pilotNamed: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, treePractice: true, tours: all, ...o });
  const g = grad({});
  check(!L.lessonDone(g, les), 'a two-area home region (Asia) does NOT finish the crossings lesson (the old rule areas.length > 1 did)');
  check(!L.lessonDone({ ...g, school2: false }, les), 'nor for a save from before the board (the old-rules shortcut)');
  check(L.lessonDone({ ...g, tours: [...all, 'r-cross'] }, les) && L.lessonDone({ ...g, crossed: ['arabian-sea'] }, les), 'the lesson finishes by its rails (r-cross) or by a flown crossing');
  check((L.current(g) || {}).id === 'crossings', `every other lesson done and a crossing listed: the crossings lesson is the current one: ${(L.current(g) || {}).id}`);
  // Not open until a crossing is listed: every area open but the lap's era not reached (nothing listed) -> not the current lesson, the board not graduated.
  const allAreas = Object.keys((await import('../src/areas.js')).AREAS), shut = grad({ areas: allAreas });
  check(C.available(shut).length === 0 && !L.lessonOpen(shut, les) && L.current(shut) === null && !L.boardView(shut).graduated && L.boardView(shut).rows.find(r => r.id === 'crossings').state === 'lock',
    `no crossing listed: the lesson is locked, not current, and the board is not graduated: ${C.available(shut).length} ${JSON.stringify(L.boardView(shut).rows.find(r => r.id === 'crossings'))}`);
  check(!L.lessonOpen({ ...g, tutorialDone: false }, les), 'before flight school is done the lesson is not open');

  if (fails.length) { console.log('FAIL crosscard\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1); }
  console.log('PASS crosscard: one card per crossing (route, land, Era/Plane/Nature, one next line, Ready when all three are done); the crossings lesson waits for a crossing and is not done by a two-area region');
})();
