// THE 'FITTED!' CARD IN THE HANGAR (Oliver, 2026-11-16, photo of 'Pinion fuel tanks: fitted!': the part "looks like it's weirdly on the engine", and
// "the takeoff button shouldn't be on this screen"). At 390x844, a Comet that already wears engine parts and gadgets buys the Pinion fuel tanks:
//   1. while the card is up, the bottom row (the big TAKE OFF and 'reset progress') is hidden; after OK it is back;
//   2. the ring (#payMark) goes round the new part only: under 30 % of the frame wide (against the picture before, every fitted part and gadget
//      counted as changed and the ring went round the whole plane);
//   3. the Pinion layer's own pixels (where it differs from the bare plane) stay clear of the engine intakes at the wing root (x 236-262, y 138-152 of
//      the 400x176 portrait), so the fuel pod no longer sits on the engines.
// Plants: tools/plants.tsv, test `payoffcard`. Run: python3 -m http.server 8000 & node tests/payoffcard.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const SAVE = { ...require('./fixtures/ladder-save.json'), muted: true, seenTips: ['*'], tours: ['*'], seeds: 50000, crystals: 5000 };
SAVE.fleet = { ...SAVE.fleet, plane: 'comet', planes: { ...SAVE.fleet.planes, comet: { engines: 2 } } };   // engine parts + the fixture's gadgets: the 'before' is busy
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(s => { if (sessionStorage.i) return; sessionStorage.i = 1; localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); }, SAVE);
  await p.goto(URL); await ready(p); await p.waitForTimeout(500);

  // 3 first (no purchase needed): the layer's pixels against the bare plane, in the page's own canvas.
  const art = await p.evaluate(async () => {
    const load = src => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });
    const [base, part] = await Promise.all([load('assets/ui/plane-hangar-comet.png'), load('assets/ui/upgrades/hangar-comet-pinion.png')]);
    const px = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
    const A = px(base), B = px(part), w = base.width; let onIntakes = 0, changed = 0;
    for (let i = 0; i < A.length; i += 4) { const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) + Math.abs(A[i + 3] - B[i + 3]); if (d <= 60) continue;
      changed++; const x = (i / 4) % w, y = Math.floor(i / 4 / w); if (x >= 236 && x <= 262 && y >= 138 && y <= 152) onIntakes++; }
    return { changed, onIntakes, w, h: base.height };
  });
  check(art.w === 400 && art.h === 176 && art.changed > 100, `the Pinion layer and the bare Comet load at 400x176 and the layer changes the picture: ${JSON.stringify(art)}`);
  check(art.onIntakes === 0, `the Pinion fuel pod stays off the engine intakes (${art.onIntakes} of its ${art.changed} pixels are on them)`);

  // 1 + 2: buy it.
  await p.click('#tabHangar'); await p.waitForTimeout(500);
  const buy = p.locator('#hangar [data-fbuy="plane:comet.body"]');
  check(await buy.count() > 0, 'the Comet body line (Pinion fuel tanks) is for sale');
  if (await buy.count()) {
    await buy.first().click(); await p.waitForTimeout(200);
    if (await p.locator('#hPreviewBuy').isVisible().catch(() => false)) await p.click('#hPreviewBuy');
    await p.waitForFunction(() => document.querySelector('#payoff.labelled'), null, { timeout: 12000 }).catch(() => {});
    const up = await p.evaluate(() => { const vis = id => !!document.getElementById(id).offsetParent, f = document.querySelector('#payoff .pay-frame').getBoundingClientRect(), m = document.getElementById('payMark').getBoundingClientRect();
      return { text: (document.getElementById('payText') || {}).textContent, go: vis('hGoBtn'), reset: vis('resetBtn'), top: vis('hGoTop'), ring: m.width / f.width, ringW: Math.round(m.width),
        clear: (() => { const mk = document.getElementById('payMark'), part = document.querySelector('#payoff .pay-part'); if (!mk.dataset.part || !part) return null;
          const [x0, y0, x1, y1, w, h] = mk.dataset.part.split(',').map(Number), r = part.getBoundingClientRect(), sx = r.width / w, sy = r.height / h, bw = 2;   /* the ring's border */
          const px = { l: r.left + x0 * sx, t: r.top + y0 * sy, r: r.left + (x1 + 1) * sx, b: r.top + (y1 + 1) * sy };
          return Math.round(Math.min(px.l - (m.left + bw), px.t - (m.top + bw), (m.right - bw) - px.r, (m.bottom - bw) - px.b)); })() }; });
    check(/Pinion fuel tanks: fitted!/.test(up.text), `the card says the part is fitted: ${JSON.stringify(up)}`);
    check(!up.go && !up.reset, `while the card is up, the bottom TAKE OFF and reset row are hidden: ${JSON.stringify(up)}`);
    check(up.ringW > 0 && up.ring < 0.3, `the ring goes round the new part only (${Math.round(up.ring * 100)} % of the frame wide): ${JSON.stringify(up)}`);
    check(up.clear !== null && up.clear >= 2, `the ring's border stays clear of the part (Oliver, 2026-11-17: the highlight covered the part): gap ${up.clear} px`);
    await p.click('#payOk'); await p.waitForTimeout(500);
    check(await p.evaluate(() => !!document.getElementById('hGoBtn').offsetParent), 'after OK the bottom TAKE OFF is back');
  }
  check(!errs.length, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL payoffcard:\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS payoffcard: no TAKE OFF row under the fitted card, the ring is on the part, the Pinion pod is off the engines');
})();
