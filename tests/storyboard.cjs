// STORY MISSIONS, the board (src/storyboard.js; the user, 2026-11-23). Plain Node, no browser.
// 1. An offer is made once and never changes: moving to another city, flying further (a bigger reach) or filling the board again
//    leaves every stored offer exactly as it was ("sized ... when they're offered, and then they shouldn't go away or ever change").
// 2. Three offers; the third needs an upgrade (a gadget/nature level the pilot lacks, or a stage longer than today's reach) and cannot
//    be accepted; the other two can, and no stage of theirs is longer than the reach.
// 3. Sized for the pilot: a pilot who has flown 25,000 km gets stages of more than 8,000 km; a new pilot gets none longer than its reach.
// 4. Pay: 500 seeds and 40 crystals per 15,000 km (the user's yardstick), stored with the offer.
// 5. ACCEPT sets the destination to the first stop; each landing at the next stop pays that stage and moves the destination on; a
//    landing elsewhere changes nothing; the last stop ends it, the slot empties and is filled again.
// Plants: tools/plants.tsv, test storyboard. Run: node tests/storyboard.cjs
(async () => {
  const B = await import('../src/storyboard.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const pilot = (best, extra = {}) => ({ areas: ['weurope', 'africa'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', flights: 50, bestDistance: best, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, ...extra });

  // 1 + 2 + 3 + 4: an experienced pilot.
  const s = pilot(25000);
  B.fillBoard(s);
  const frozen = JSON.stringify(s.storyBoard);
  check(s.storyBoard.length === 3 && s.storyBoard.every(Boolean), `three offers: ${frozen.slice(0, 200)}`);
  s.city = 'NAIROBI'; s.bestDistance = 40000; s.areaBest = { africa: 41000 };
  check(B.fillBoard(s) === false && JSON.stringify(s.storyBoard) === frozen, 'a filled board never changes: another city and a bigger reach leave every offer as it was');
  const [a, b, c] = s.storyBoard;
  check(B.missing(s, c).length > 0, `the third offer needs an upgrade: ${JSON.stringify(c.needs)}`);
  check(!B.missing(s, a).length && !B.missing(s, b).length, 'the other two can be accepted');
  s.bestDistance = 25000; s.areaBest = {};
  for (const o of [a, b]) check(Math.max(...o.stages) <= 25000 && Math.max(...o.stages) > 8000, `${o.title}: stages sized for a 25,000 km pilot (${o.stages})`);
  for (const o of s.storyBoard) check(o.pay.seeds === Math.round(o.km * 500 / 15000) && o.pay.crystals === Math.round(o.km * 40 / 15000), `${o.title}: pays 500 seeds / 40 crystals per 15,000 km (${o.km} km: ${JSON.stringify(o.pay)})`);
  check(!B.accept(s, c.id) || !B.missing(s, c).length, 'an offer that still needs an upgrade cannot be accepted');

  // 3: a new pilot.
  const n = pilot(5000, { areas: ['weurope'] });
  B.fillBoard(n);
  for (const o of n.storyBoard.filter(Boolean).slice(0, 2)) check(Math.max(...o.stages) <= B.reachOf(n), `new pilot: ${o.title} stages ${o.stages} within reach ${B.reachOf(n)}`);

  // 5: fly a story.
  check(B.accept(s, a.id) && s.aimCity === a.stops[0], `ACCEPT: the destination is the first stop (${s.aimCity})`);
  const bank = { seeds: 0, crystals: 0 };
  check(B.landedAt(s, 'NOWHERE') === null && s.aimCity === a.stops[0], 'a landing elsewhere changes nothing');
  for (let i = 0; i < a.stops.length; i++) {
    const r = B.landedAt(s, a.stops[i]);
    check(r && r.n === i + 1, `stop ${i + 1} reached: ${JSON.stringify(r)}`);
    if (r) { bank.seeds += r.pay.seeds; bank.crystals += r.pay.crystals; }
    if (i < a.stops.length - 1) check(s.aimCity === a.stops[i + 1], `the destination moves on to ${a.stops[i + 1]} (${s.aimCity})`);
  }
  check(bank.seeds === B.storyPay(a.km).seeds, `the stages pay the whole story: ${bank.seeds} of ${B.storyPay(a.km).seeds} seeds`);
  check(!s.storyActive && !s.aimCity && s.storyBoard[0] === null && s.storiesDone === 1, 'the last stop ends the story and empties its slot');
  check(B.fillBoard(s) === true && s.storyBoard[0] && s.storyBoard[0].id !== a.id && JSON.stringify(s.storyBoard.slice(1)) === JSON.stringify([b, c]), 'the empty slot is filled again; the others stay as they were');

  if (fails.length) { console.log('FAIL storyboard\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS storyboard (offers fixed once made, one in three needs an upgrade, sized for the pilot, 500 seeds / 40 crystals per 15,000 km, flown stop by stop)');
})();
