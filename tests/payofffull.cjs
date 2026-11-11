// The payoff shows the WHOLE plane (the user's playtest, 0.37.x: "the engine arrives on the plane" but the plane's body was cut off; at 320 only the wing and the engines showed).
// Cause: .payoff.arrive .pay-plane { transform: scale(1.8) } on a frame the planes already fill (the hangar pictures fill 98 percent of the width), so the zoom cropped the fuselage.
// Real purchase flow (the payoffdraw route), at 390x844 and 320x568, then once the part has arrived (.arrive, .labelled): the plane's OPAQUE pixels (sampled from the picture) mapped to page
// coordinates through the picture's own box (so any transform counts) must lie inside BOTH the picture frame and the viewport; the part must be ringed (#payMark visible, inside the frame).
// Run: python3 -m http.server 8000 & node tests/payofffull.cjs   (plants: tools/plants.tsv, test payofffull)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
let B = null; const T = setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(2); }, 150000);
(async () => {
  const b = B = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  for (const [W, H] of [[390, 844], [320, 568]]) {
    const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); });
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    await p.click('#startChoice [data-area="aotearoa"]', { timeout: 4000 }).catch(() => {}); await p.click('#startChoice [data-city="AUCKLAND"]', { timeout: 4000 }).catch(() => {}); await p.waitForTimeout(1200);
    await p.evaluate(() => { const s = game.registry.get('save'); Object.assign(s, { tutorialDone: true, freeGiven: true, freeUpgrade: true }); const t = document.getElementById('tour'); if (t) t.hidden = true; const ui = game.registry.get('ui'); ui.showHangar && ui.showHangar(); });
    await p.waitForTimeout(1500);
    const row = await p.$('[data-ftap^="plane:"][data-ftap$=".engines"]'); check(!!row, `${W}x${H}: the hangar has an engines row to buy`); if (!row) { await p.close(); continue; }
    await row.click({ timeout: 4000 }); await p.waitForTimeout(600);
    const buy = await p.$('#hPreviewBuy'); check(!!buy, `${W}x${H}: the preview has a BUY button`); if (!buy) { await p.close(); continue; }
    await buy.click({ timeout: 4000 });
    await p.waitForFunction(() => { const el = document.getElementById('payoff'); return el && !el.hidden && el.classList.contains('labelled'); }, null, { timeout: 12000 }).catch(() => {});
    await p.waitForTimeout(900);   // (the zoom, if any, has finished: it takes 0.6 s)
    const r = await p.evaluate(() => { const el = document.getElementById('payoff'); if (!el) return null; const part = el.querySelector('.pay-part'), plane = el.querySelector('.pay-plane'), fr = el.querySelector('.pay-frame').getBoundingClientRect(), pr = plane.getBoundingClientRect(), mk = document.getElementById('payMark').getBoundingClientRect(), mcs = getComputedStyle(document.getElementById('payMark'));
      const lb = document.getElementById('payLabel').getBoundingClientRect(), cd = el.querySelector('.payoff-card').getBoundingClientRect(), lop = +getComputedStyle(document.getElementById('payLabel')).opacity;
      const label = { top: Math.round(lb.top), bottom: Math.round(lb.bottom), frameBottom: Math.round(fr.bottom), belowFrame: lb.top >= fr.bottom - 1, inCard: lb.left >= cd.left - 1 && lb.right <= cd.right + 1 && lb.top >= cd.top - 1 && lb.bottom <= cd.bottom + 1, onScreen: lb.left >= 0 && lb.right <= innerWidth && lb.bottom <= innerHeight, shown: lop > 0.9, text: document.getElementById('payLabel').textContent };
      if (!part || !part.naturalWidth) return { noPart: true }; const w = part.naturalWidth, h = part.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(part, 0, 0); const d = g.getImageData(0, 0, w, h).data;
      let n = 0, inside = 0; for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { if (d[(y * w + x) * 4 + 3] < 40) continue; n++; const X = pr.left + x / w * pr.width, Y = pr.top + y / h * pr.height; if (X >= fr.left - 0.5 && X <= fr.right + 0.5 && Y >= fr.top - 0.5 && Y <= fr.bottom + 0.5 && X >= 0 && X <= innerWidth && Y >= 0 && Y <= innerHeight) inside++; }
      return { pct: +(100 * inside / n).toFixed(1), scale: +new DOMMatrix(getComputedStyle(plane).transform).a.toFixed(2), frameTop: Math.round(fr.top), frameBottom: Math.round(fr.bottom), vh: innerHeight, ring: { op: +mcs.opacity, w: Math.round(mk.width), h: Math.round(mk.height), inFrame: mk.left >= fr.left - 1 && mk.right <= fr.right + 1 && mk.top >= fr.top - 1 && mk.bottom <= fr.bottom + 1 }, label, ok: !!document.getElementById('payOk') && getComputedStyle(document.getElementById('payOk')).visibility !== 'hidden' }; });
    console.log(`${W}x${H}`, JSON.stringify(r));
    check(r && !r.noPart, `${W}x${H}: the payoff has the new plane picture`);
    if (r && !r.noPart) {
      check(r.pct >= 99, `the new plane is fully visible in the payoff at ${W}x${H}: ${r.pct}% of its opaque pixels inside the frame and the viewport (scale ${r.scale}; frame ${r.frameTop}..${r.frameBottom} of ${r.vh})`);
      check(r.ring.op > 0.9 && r.ring.w > 4 && r.ring.h > 4 && r.ring.inFrame, `${W}x${H}: the new part is RINGED inside the frame (ring ${JSON.stringify(r.ring)})`);
      check(r.label.shown && r.label.belowFrame && r.label.inCard && r.label.onScreen, `the label does not cover the plane: at ${W}x${H} it sits BELOW the picture (label ${r.label.top}..${r.label.bottom}, picture bottom ${r.label.frameBottom}), inside the card and on screen ("${r.label.text}")`);
      check(r.frameTop >= 0 && r.frameBottom <= r.vh && r.ok, `${W}x${H}: the picture sits fully on screen and OK is shown (frame ${r.frameTop}..${r.frameBottom} of ${r.vh}, OK ${r.ok})`);
    }
    check(errs.length === 0, `${W}x${H}: no page errors: ${errs.join(' | ').slice(0, 160)}`);
    await p.close();
  }
  console.log(fails.length ? 'FAIL payofffull:\n - ' + fails.join('\n - ') : 'PASS payofffull (the whole plane is in view after the part arrives, the part is ringed, at 390x844 and 320x568)');
  await b.close(); B = null; clearTimeout(T); process.exit(fails.length ? 1 : 0);
})().catch(async e => { console.log('FAIL payofffull: crashed: ' + String(e).slice(0, 1200)); if (B) await B.close().catch(() => {}); process.exit(1); });
