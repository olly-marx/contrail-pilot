// Stuck finger guard (Oliver, 2026-11-16: "I bought a nature project and then I can't fly anymore without a page refresh"; recurring).
// Phaser keeps ONE touch pointer (game.input.pointers[1]) and takes a new finger only into a pointer that is not active. It frees that
// pointer on a touchend that reaches the canvas or the window. A touch whose element is redrawn under the finger (a swipe between
// NATURE lands or HANGAR tabs redraws the screen on pointerup, before the touchend) sends its touchend to the detached element, where
// it never bubbles to the window: Phaser thinks a finger is still down and ignores every later tap until a reload. Take-off still
// works (it reads window pointer events), so the plane rolls, autopilot flies, and taps do nothing (measured in Chromium, 2026-11-16).
// The guard: on every new touch, a Phaser touch pointer whose finger is no longer on the screen (its identifier is not in
// event.touches) is released, before Phaser looks for a free one. tests/touchfree.cjs (Node) and tests/stucktouch.cjs (browser).

// pointers: Phaser's input pointers (index 0 is the mouse); touches: the TouchList (or array) of fingers on the screen now.
// Returns the pointers released.
export function freeStaleTouches(pointers, touches) {
  const on = new Set(Array.from(touches || [], t => t.identifier));
  const freed = [];
  for (let i = 1; i < (pointers || []).length; i++) {
    const q = pointers[i];
    if (!q || !q.active || on.has(q.identifier)) continue;
    q.active = false; q.isDown = false; q.primaryDown = false; q.buttons = 0; q.wasCanceled = true;   // what Phaser's own touchcancel sets
    freed.push(q);
  }
  return freed;
}

// Capture phase on the window: runs before Phaser's own touchstart listeners (on the canvas and, bubbling, on the window).
export function watchStaleTouches(game, win = window) {
  win.addEventListener('touchstart', e => { if (game.input) freeStaleTouches(game.input.pointers, e.touches); }, { capture: true, passive: true });
}
