// THE CROSSING CARD and THE CROSSINGS LESSON's rules (the owner, 2026-11-18, on MISSIONS: "I don't understand it, and it's ugly"; "the game teaching should never end until everything about the game
// you care about is understood"). Plain Node, no browser (the screen: tests/crosscard-ui.cjs). Named lines:
//   1. (V4, 0.73.0) src/crossingview.js cardsView: ONE card, the shortest crossing; one row, Range; (until 0.73.0: one card per crossing, rows Era, Plane, Nature; a done row has no value, an open one a bar fraction and a value (nature "have / need",
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

  // 1. The card. V4 (0.73.0, Oliver 2026-11-22/23): ONE crossing on offer, the shortest from the open regions; ONE row, Range (no era, no nature); no distance on the card.
  const s1 = save({ bestDistance: 3000, habitat: proj(5) }), cards = V.cardsView(s1);
  check(cards.length === 1 && C.available(s1).length === 1, `one card, one crossing on offer (Asia): ${cards.length}`);
  const k = cards[0] || {};
  check(k.id === 'arabian-sea' && k.route === 'KARACHI > MUSCAT' && k.opens === 'Opens Africa & the Middle East' && k.word === 'Easy', `the offer is Asia's shortest, the Arabian Sea (Easy): ${JSON.stringify([k.id, k.route, k.opens, k.word])}`);
  check(JSON.stringify((k.rows || []).map(r => [r.key, r.label])) === '[["plane","Range"]]', `one row, Range: ${JSON.stringify(k.rows)}`);
  const plane = (k.rows || [])[0];
  check(plane && !plane.done && /^(nearly|not yet)$/.test(plane.value) && Math.abs(plane.frac - 3000 / 12000) < 1e-9, `the range row: a bar (3,000 of 12,000) and a word: ${JSON.stringify(plane)}`);
  check(cards.every(c => c.rows.every(r => !/km|\d,\d{3}/.test(String(r.value)))), 'no distance anywhere on a card');
  check(k.nextKey === 'plane' && k.next === V.CARD_NEXT.plane && /HANGAR/.test(k.next) && k.next.length <= 60, `the next line is the range's: ${k.nextKey} "${k.next}"`);
  const one = V.oneCardView(s1);
  check(one.length === 1 && !one[0].multi && JSON.stringify(one) === JSON.stringify(cards), 'oneCardView: the single card as it is (no picker)');
  const s3 = save({ bestDistance: 12000 }), c3 = V.cardsView(s3);
  check(c3.length === 1 && c3[0].ready && c3[0].next === V.CARD_READY && c3[0].rows.every(r => r.done), `a 12,000 km landed flight, no nature: ready, the Ready line: ${JSON.stringify(c3.map(c => [c.id, c.ready, c.next]))}`);
  check(!V.cardsView(save({ bestDistance: 11999 }))[0].ready, '11,999 km is not enough for a 12,000 km crossing');
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
  // V4: a crossing is always listed until the lap is flown, so the lesson is open whenever flight school is done.
  check(C.available(g).length === 1 && L.lessonOpen(g, les), 'a crossing is listed and the lesson is open');
  check(!L.lessonOpen({ ...g, tutorialDone: false }, les), 'before flight school is done the lesson is not open');

  if (fails.length) { console.log('FAIL crosscard\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1); }
  console.log('PASS crosscard: one card, the shortest crossing (route, land, a Range row, one next line, Ready when the range reaches it); the crossings lesson is not done by a two-area region');
})();
