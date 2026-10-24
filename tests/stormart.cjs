// PixelLab thunderclouds (the user, 2026-10-24): each storm column is a storm-tower picture; the crash shape is
// its drawn pixels inside the column. Checked against the DRAWN images (position, flip, crop, pixels), not the
// game's own collision data: (1) every drawn cloud pixel inside the column crashes, empty sky never does;
// (2) cloud puffing out beyond the column never crashes; (3) every gap's narrowest point is exactly the gap asked
// for, whichever tower and flip it got; and the inner sparks / lightning flash draw without errors.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/stormart.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'],
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, priceVersion: 2 })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(500); await p.click('#goBtn'); await started(p); await p.waitForTimeout(1000);
  const r = await p.evaluate(() => {
    const s = game.scene.getScene('game'); s.scene.pause();
    s.storms.forEach(st => st.parts.forEach(q => q.destroy())); s.storms = [];
    const SKY = 512 - 48, W = 44;
    // Is (x, y) a drawn cloud pixel of this storm? From the images on screen.
    const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true }), cache = {};
    const alpha = key => cache[key] || (cache[key] = (() => { const img = s.textures.get(key).getSourceImage(); cv.width = img.width; cv.height = img.height;
      cx.clearRect(0, 0, img.width, img.height); cx.drawImage(img, 0, 0); return { w: img.width, h: img.height, d: cx.getImageData(0, 0, img.width, img.height).data }; })());
    const drawn = (st, x, y) => st.parts.some(im => { if (!/^storm-(rise|hang)-[a-z]$/.test(im.texture.key)) return false;
      const a = alpha(im.texture.key); let px = Math.floor(x - im.x), py = Math.floor(y - im.y);
      if (px < 0 || py < 0 || px >= a.w || py >= a.h || py >= im.cropH) return false;
      if (im.flipX) px = a.w - 1 - px; return a.d[(py * a.w + px) * 4 + 3] > 40; });
    let probe; const real = s.planePixels.bind(s); s.planePixels = () => [probe];
    const hit = (st, x, y) => { probe = [x + 0.5, y + 0.5]; return s.stormPixelsHit(st, 1) > 0; };
    const out = { inside: 0, insideWrong: [], outside: 0, outsideWrong: [], gaps: [], storms: 0 };
    for (let k = 0; k < 24; k++) {
      const gap = 110 + (k % 4) * 10, gapY = 120 + (k * 37) % 240, x = 100;
      s.addStormPairAt(x, gapY, gap); const st = s.storms[s.storms.length - 1]; out.storms++;
      s.planeSprite.x = x + 22;   // level with it (stormPixelsHit skips storms far from the plane)
      for (let y = 0; y < SKY; y += 3) for (let lx = -12; lx < W + 12; lx += 2) {
        const d = drawn(st, x + lx, y), h = hit(st, x + lx, y);
        if (lx >= 0 && lx < W) { out.inside++; if (d !== h && out.insideWrong.length < 5) out.insideWrong.push([lx, y, d, h]); }
        else if (d) { out.outside++; if (h && out.outsideWrong.length < 5) out.outsideWrong.push([lx, y]); }
      }
      // The clear gap at each x in the column: from the lowest drawn pixel above the gap to the highest below it.
      let narrowest = 1e9;
      for (let lx = 0; lx < W; lx++) {
        let top = -1, bot = SKY;
        for (let y = Math.floor(gapY); y >= 0; y--) if (drawn(st, x + lx, y)) { top = y; break; }
        for (let y = Math.ceil(gapY); y < SKY; y++) if (drawn(st, x + lx, y)) { bot = y; break; }
        narrowest = Math.min(narrowest, bot - top - 1);
      }
      out.gaps.push([gap, narrowest]);
      if (k === 0) { s.flashStorm(st, s.time.now); for (let i = 0; i < 5; i++) s.sparkStorm(st, 0); out.parts = st.parts.length; }
      st.parts.forEach(q => q.destroy()); s.storms.pop();
    }
    s.planePixels = real;
    return out;
  });
  check(r.inside > 1000 && r.insideWrong.length === 0, `(1) inside the column, crash = drawn cloud: ${r.insideWrong.length} wrong of ${r.inside} e.g. ${JSON.stringify(r.insideWrong)}`);
  check(r.outside > 50 && r.outsideWrong.length === 0, `(2) cloud outside the column is harmless: ${r.outsideWrong.length} crashed of ${r.outside} e.g. ${JSON.stringify(r.outsideWrong)}`);
  const bad = r.gaps.filter(([g, n]) => Math.abs(n - g) > 1);
  check(bad.length === 0, `(3) narrowest point of every gap = the gap asked for: ${JSON.stringify(bad)}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS stormart (${r.storms} storms, ${r.inside} column probes, ${r.outside} outside-fluff probes)`);
})();
