// STORY MISSIONS, the board (src/storyboard.js; the user, 2026-11-23). Plain Node, no browser.
// 1. An offer is made once and never changes: moving to another city, flying further (a bigger reach) or filling the board again
//    leaves every stored offer exactly as it was ("sized ... when they're offered, and then they shouldn't go away or ever change").
// 2. Three offers; the third needs an upgrade (a gadget/nature level the pilot lacks, or a stage longer than today's reach) and cannot
//    be accepted; the other two can, and no stage of theirs is longer than the reach.
// 3. Sized for the pilot: a pilot who has flown 25,000 km gets stages of more than 8,000 km; a new pilot gets none longer than its reach.
// 4. Pay: 1,000 seeds and 80 crystals per 15,000 km (the user's yardstick), stored with the offer.
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
  for (const o of [a, b]) check(Math.max(...o.stages) <= 25000, `${o.title}: no stage longer than the 25,000 km reach (${o.stages})`);
  check(Math.max(...b.stages) > 8000, `${b.title} (${b.level}): stages sized for a 25,000 km pilot (${b.stages})`);
  check(Math.max(...a.stages) <= 25000 * 0.55 + 1, `${a.title} (easy): short stages (${a.stages})`);
  // 6. DIFFICULTY (Plan A, 2026-11-24): slot 0 easy, slot 1 medium (impossible now and then), slot 2 hard; hearts and pay from LEVELS.
  check(a.level === 'easy' && ['medium', 'impossible'].includes(b.level) && c.level === 'hard', `levels by slot: ${a.level} ${b.level} ${c.level}`);
  for (const o of s.storyBoard) { const L = B.LEVELS[o.level];
    check(o.hearts === L.hearts && o.payMul === L.pay, `${o.title}: hearts ${o.hearts} and pay x${o.payMul} from its level ${o.level}`);
    check(o.pay.seeds === Math.round(o.km * 1000 / 15000 * L.pay) && o.pay.crystals === Math.round(o.km * 80 / 15000 * L.pay), `${o.title}: pays 1,000 seeds / 80 crystals per 15,000 km x${L.pay} (${o.km} km: ${JSON.stringify(o.pay)})`); }
  const lv = []; for (let q = 1; q <= 8; q++) lv.push(B.levelFor(1, q));
  check(lv.filter(x => x === 'impossible').length === 2, `slot 1 is impossible 1 time in ${B.IMPOSSIBLE_EVERY}: ${lv}`);
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


  // 7. ONE STORY AT A TIME, hearts, failing, the drop fee.
  const h = pilot(25000, { seeds: 5000 }); B.fillBoard(h);
  const [e, m] = h.storyBoard;
  check(B.accept(h, m.id) && B.heartsLeft(B.activeStory(h)) === m.hearts, `accept a ${m.level} story: ${m.hearts} hearts`);
  const fee = B.dropFee(h), want = Math.max(B.FEE.min, Math.round(B.leftPay(m).seeds * B.FEE.share));
  check(fee === want, `the fee is ${B.FEE.share * 100}% of what the story has left, at least ${B.FEE.min}: ${fee} (want ${want})`);
  check(B.accept(h, e.id) && h.storyActive === e.id && h.seeds === 5000 - fee && !h.storyBoard.includes(m) && h.storiesDropped === 1, 'ACCEPT on another story drops the active one (it leaves the board) and pays the fee');
  check(B.crashed(h) === null && B.activeStory(h), 'a crash on an easy story costs nothing (as many tries as you like)');
  B.fillBoard(h); const hard = h.storyBoard[2]; hard.needs = []; B.accept(h, hard.id);
  for (let k = 1; k < hard.hearts; k++) { const r = B.crashed(h); check(r && r.hearts === hard.hearts - k && !r.failed, `crash ${k}: ${hard.hearts - k} hearts left`); }
  const last = B.crashed(h);
  check(last && last.failed && !h.storyActive && !h.aimCity && !h.storyBoard.includes(hard) && h.storiesFailed === 1, 'the last heart fails the story: it leaves the board');
  const poor = pilot(25000, { seeds: 10 }); B.fillBoard(poor); B.accept(poor, poor.storyBoard[1].id);
  check(B.drop(poor) === 10 && poor.seeds === 0 && !poor.storyActive, 'the fee never takes more seeds than the player has');

  if (fails.length) { console.log('FAIL storyboard\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS storyboard (offers fixed once made, one in three needs an upgrade, sized for the pilot, 1,000 seeds / 80 crystals per 15,000 km, flown stop by stop)');
})();
