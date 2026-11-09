// The spotlight audit of ONE rails / tour step on the real page (src/tour.js spot(); research/SPOTLIGHT-SUBJECT.md). Evaluated in the page; returns a list of NAMED problems (empty = fine):
//   the subject of <step> is in the spotlight             every declared subject is on screen, has a size, and sits inside a lit hole;
//   the bubble of <step> covers neither the target nor the subject
//   only the target of <step> is tappable                  a tap on the subject (centre and four inner points) lands on the tour's catcher panels, never on a page control.
exports.audit = page => page.evaluate(() => {
  const tour = game.registry.get('ui').tour, sp = tour.spot(), key = sp.key || '?', out = [];
  const inter = (a, b) => a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  if (sp.declared && !sp.subjects.length) out.push(`the subject of ${key} is declared but is not on the screen`);
  const lit = r => sp.holes.some(h => r.left >= h.x0 - 1 && r.right <= h.x1 + 1 && r.top >= h.y0 - 1 && r.bottom <= h.y1 + 1);
  for (const r of sp.subjects) {
    const onScreen = r.right > r.left && r.bottom > r.top && r.left >= -1 && r.right <= sp.W + 1 && r.top >= -1 && r.bottom <= (sp.bar ? sp.bar.top : sp.H) + 1;
    if (!onScreen || !lit(r)) out.push(`the subject of ${key} is in the spotlight: FAILED (rect ${[r.left, r.top, r.right, r.bottom].map(Math.round)}, holes ${sp.holes.length})`);
  }
  if (inter(sp.bubble, sp.target) || sp.subjects.some(r => inter(sp.bubble, r))) out.push(`the bubble of ${key} covers neither the target nor the subject: FAILED (bubble ${['left', 'top', 'right', 'bottom'].map(k => Math.round(sp.bubble[k]))})`);
  for (const r of sp.subjects) {
    const pts = [[(r.left + r.right) / 2, (r.top + r.bottom) / 2], [r.left + 6, r.top + 6], [r.right - 6, r.top + 6], [r.left + 6, r.bottom - 6], [r.right - 6, r.bottom - 6]];
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x > sp.W || y > sp.H) continue;
      const top = document.elementsFromPoint(x, y)[0], t = sp.target;
      const inTarget = t && x >= t.left - 6 && x <= t.right + 6 && y >= t.top - 6 && y <= t.bottom + 6;   // (the hole is the target plus 4 px: a tap in that rim reaches the page by design)
      if (!inTarget && !(top && top.closest && top.closest('#tour'))) { out.push(`only the target of ${key} is tappable: FAILED (a tap at ${Math.round(x)},${Math.round(y)} would reach ${top && (top.id || top.className || top.tagName)})`); break; }
    }
  }
  return out;
});
