// Swipe between the tabs of a screen (0.11.0, the user: "swipe between the sub-screens"). onSwipe(el, { next, prev }):
// a flick of one finger across `el` calls next() when it goes left, prev() when it goes right.
// A swipe is: touch or pen (a mouse drag selects text, so it is not one), one finger, at least MIN_PX sideways, mostly
// sideways (DX_OVER_DY times as far as it went up or down), within MAX_MS, starting at least EDGE_PX from the screen edge
// (the phone's own back-swipe lives there). It NEVER calls preventDefault, so vertical scrolling is untouched: when the browser
// takes a gesture over to scroll, it sends pointercancel and the swipe is forgotten. Anything slower than MAX_MS is not a swipe,
// which also keeps the hold-2-seconds gates and press-and-hold buy buttons safe from sideways drift; they and anything marked
// data-noswipe, plus inputs and sliders, are skipped outright. (A row that scrolls sideways needs no rule: the browser cancels the pointer
// the moment that row starts to scroll, and a nested scroller is its own scroll container, so it keeps its own pan.)
// touch-action: pan-y pinch-zoom is set on `el` (measured 2026-10-24: with the default, Chrome treats the first sideways move
// as a pan and cancels the pointer, so no swipe ever completes): the browser keeps vertical scrolling and pinch, we get the
// sideways moves; a nested scroller that scrolls sideways (a row of tabs) is its own scroll container and keeps its own pan.
export const MIN_PX = 60, DX_OVER_DY = 1.8, MAX_MS = 600, EDGE_PX = 24;
const SKIP = 'input, select, textarea, canvas, [data-noswipe], .gate, .w-gate, .holding';

export function onSwipe(el, cb) {
  if (el.__swipe) { el.__swipe.cb = cb; return; }   // wired already (the screen was drawn again): just the new callbacks
  const st = el.__swipe = { cb };
  el.style.touchAction = 'pan-y pinch-zoom';
  let g = null;
  el.addEventListener('pointerdown', e => {
    if (g) { g = null; return; }                                    // a second finger: not a swipe
    if (e.pointerType === 'mouse' || e.isPrimary === false) return;
    if (e.target.closest && e.target.closest(SKIP)) return;
    if (e.clientX < EDGE_PX || e.clientX > window.innerWidth - EDGE_PX) return;
    g = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
  });
  el.addEventListener('pointermove', e => {
    if (g && e.pointerId === g.id && Math.abs(e.clientY - g.y) > 14 && Math.abs(e.clientY - g.y) > Math.abs(e.clientX - g.x)) g = null;   // going up or down: a scroll
  });
  el.addEventListener('pointerup', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y, dt = performance.now() - g.t; g = null;
    if (Math.abs(dx) >= MIN_PX && Math.abs(dx) >= DX_OVER_DY * Math.abs(dy) && dt <= MAX_MS) { const f = dx < 0 ? st.cb.next : st.cb.prev; if (f) f(); }
  });
  el.addEventListener('pointercancel', () => { g = null; });
}
