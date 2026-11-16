// THE STUCK FINGER GUARD (src/touchfree.js; Oliver, 2026-11-16: after NATURE, taps did nothing in flight until a refresh). Plain Node, no browser.
// Phaser's touch pointer is freed only by a touchend that reaches the window; a finger lifted off a redrawn element leaves it active and every
// later finger is refused. On each new touch, freeStaleTouches must:
//   1. release a touch pointer that is active but whose finger is not in event.touches (the lost one), and say so;
//   2. keep a touch pointer whose finger IS still on the screen (a real second finger, or the hold for take-off);
//   3. never touch pointer 0 (the mouse), nor an inactive pointer;
//   4. after the release, Phaser's own rule (a new finger goes into the first pointer that is not active) finds a free pointer.
// The browser test tests/stucktouch.cjs plays the real path (a swipe between NATURE lands, then a flight). Plants: tools/plants.tsv, test `touchfree`.
// Run: node tests/touchfree.cjs
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const { freeStaleTouches } = await import('../src/touchfree.js');
  const ptr = (active, identifier) => ({ active, identifier, isDown: active, primaryDown: active, buttons: active ? 1 : 0 });
  const phaserTakes = (pointers, id) => { for (let i = 1; i < pointers.length; i++) if (!pointers[i].active) { pointers[i].active = true; pointers[i].identifier = id; return i; } return -1; };   // Phaser 3.90 TouchManager onTouchStart

  // 1 + 4: the lost finger (id 7) is released; the new finger (id 12) then gets pointer 1.
  let P = [ptr(false, 0), ptr(true, 7)];
  check(phaserTakes(P.map(q => ({ ...q })), 12) === -1, 'control: with the lost finger held, Phaser refuses a new finger (the bug this guards)');
  let freed = freeStaleTouches(P, [{ identifier: 12 }]);
  check(freed.length === 1 && !P[1].active && !P[1].isDown && !P[1].primaryDown && P[1].buttons === 0, `the lost finger's pointer is released: ${JSON.stringify(P[1])}`);
  check(phaserTakes(P, 12) === 1, 'after the release the new finger gets pointer 1');

  // 2: a finger still on the screen is kept.
  P = [ptr(false, 0), ptr(true, 5), ptr(false, 0)];
  freed = freeStaleTouches(P, [{ identifier: 5 }, { identifier: 6 }]);
  check(freed.length === 0 && P[1].active && P[1].isDown, `a finger still down keeps its pointer: ${JSON.stringify(P[1])}`);

  // 3: the mouse pointer and inactive pointers are left alone; a missing list is no finger at all.
  P = [ptr(true, 0), ptr(false, 3)];
  freed = freeStaleTouches(P, []);
  check(freed.length === 0 && P[0].active && P[0].isDown, 'pointer 0 (the mouse) is never released');
  P = [ptr(false, 0), ptr(true, 9)];
  check(freeStaleTouches(P, null).length === 1 && !P[1].active, 'no touch list: every touch pointer is stale');

  if (fails.length) { console.log('FAIL touchfree:\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS touchfree: a lost finger is released on the next touch, live fingers and the mouse are kept');
})();
