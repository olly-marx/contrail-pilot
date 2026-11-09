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

// The PIXELS of the target are not darkened (the dark is a mask with a hole there; the first version used an even-odd path and the overlap of the target's hole and the subject's came out dark: nothing in the rects showed it).
// Two clips of the target's inner area (inset 8 px, clear of the ring): with the tour shown, and with it hidden; the mean absolute difference must be small.
exports.pixels = async page => {
  const { PNG } = require('pngjs'), sp = await page.evaluate(() => { const s = game.registry.get('ui').tour.spot(); return { key: s.key, t: s.target, subs: s.subjects }; });
  const out = [], boxes = [['target', sp.t], ...sp.subjects.slice(0, 1).map(r => ['subject', r])];
  for (const [what, r] of boxes) {
    if (!r) continue;
    const clip = { x: Math.round(r.left + 8), y: Math.round(r.top + 8), width: Math.round(r.right - r.left - 16), height: Math.round(r.bottom - r.top - 16) };
    if (clip.width < 4 || clip.height < 4) continue;
    const A = PNG.sync.read(await page.screenshot({ clip }));
    await page.evaluate(() => { document.getElementById('tour').style.visibility = 'hidden'; }); await page.waitForTimeout(60);
    const B = PNG.sync.read(await page.screenshot({ clip }));
    await page.evaluate(() => { document.getElementById('tour').style.visibility = ''; });
    let d = 0; for (let i = 0; i < A.data.length; i += 4) d += Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
    const mean = d / (A.data.length / 4) / 3;
    if (mean > 14) out.push(`the ${what} of ${sp.key} is darkened: FAILED (mean pixel difference ${mean.toFixed(1)} with the tour on and off)`);
  }
  return out;
};
