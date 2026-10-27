// Collision check: hits use the plane's drawn pixels, not boxes. Places a storm all around the
// plane and checks: (1) some placements touched the old box but no drawn pixels, and those don't
// crash; (2) a storm forgives a nick (1-5 pixels) but a no-fly zone in the same place does not;
// (3) a deep hit always counts; (4) birds count from one pixel.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/collisions.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'] })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(800); await p.click('#goBtn'); await started(p); await p.waitForTimeout(2300);
  await p.evaluate(() => game.scene.getScene('game').scene.pause());

  const r = await p.evaluate(() => { const s = game.scene.getScene('game');
    s.storms.forEach(st => st.parts.forEach(q => q.destroy())); s.storms = [];
    s.plane.y = 200; s.plane.vy = 0; s.drawPlane(); s.planePtsAt = -1;
    const box = s.hitbox(), forgive = 5;
    const out = { boxOnly: 0, nicks: 0, nickStormHits: 0, nickNoFlyHits: 0, deep: 0, deepMissed: 0 };
    for (const gap of [140]) for (let dy = -30; dy <= 30; dy++) for (let dx = -60; dx <= 20; dx += 2) {
      // Bottom storm whose top edge sits near the plane's belly; top storm far above.
      const botY = box.y + box.h + dy, gapY = botY - gap / 2, x = box.x + dx;
      s.addStormPairAt(x, gapY, gap); const st = s.storms.pop(); st.parts.forEach(q => q.destroy());
      const old = st.rects.some(q => box.x < q.x + q.width && box.x + box.w > q.x && box.y < q.y + q.height && box.y + box.h > q.y);
      const n = s.stormPixelsHit(st, 1000);
      if (old && n === 0) out.boxOnly++;
      if (n >= 1 && n <= forgive) { out.nicks++; if (s.hitsStorm(st)) out.nickStormHits++; if (s.hitsStorm({ ...st, noFly: true })) out.nickNoFlyHits++; }
      // (16 px, not 10, since the PixelLab storm towers, 2026-10-24: their crowns are rounded, so a box corner 10 px down is sky.)
      if (dy <= -16 && dx > -40 && dx < 0) { out.deep++; if (!s.hitsStorm(st)) out.deepMissed++; }
    }
    // Bird: one placed right on the fuselage hits; one just clear of the nose doesn't.
    s.birds = []; s.addFlock(-999, -999); const f = s.birds[0]; f.birds = [f.birds[0]];
    const bimg = f.birds[0];   // a record (x, y, key, flip)
    bimg.x = s.planeSprite.x - 4; bimg.y = s.planeSprite.y; const birdOn = s.hitBird(box);
    bimg.x = s.planeSprite.x + 40; bimg.y = s.planeSprite.y - 20; const birdOff = s.hitBird(box);
    // Probes: a single "plane pixel" on a known empty and a known solid pixel of each sprite.
    const realPts = s.planePixels.bind(s); let probe = null;
    s.planePixels = () => [probe];
    const findPx = (key, solid) => { const m = s.alphaMask(key); for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.at(x, y) === solid) return [x, y]; };
    s.addStormPairAt(100, 200, 120); const st = s.storms.pop(); st.parts.forEach(q => q.destroy());
    // The crown of the bottom column's tower (PixelLab storms, 2026-10-24): an empty and a solid pixel inside the column.
    const q = st.pics.find(p => p.key.includes('rise') && p.y === st.rects[1].y), cm = s.alphaMask(q.key);
    const crown = solid => { for (let y = 0; y < 30; y++) for (let lx = 0; lx < 44; lx++) { const px = lx - q.dx;
      if (px >= 0 && px < cm.w && cm.at(q.flip ? cm.w - 1 - px : px, y) === solid) return [lx, y]; } };
    const [ex, ey] = crown(false), [fx, fy] = crown(true), botY = st.rects[1].y;
    probe = [100 + ex + 0.5, botY + ey + 0.5]; const capEmpty = s.stormPixelsHit(st, 1);
    probe = [100 + fx + 0.5, botY + fy + 0.5]; const capSolid = s.stormPixelsHit(st, 1);
    const bm = s.alphaMask(bimg.key), [bx0, by0] = findPx(bimg.key, false), [bx1, by1] = findPx(bimg.key, true);
    bimg.x = 150; bimg.y = 150; bimg.flip = false;
    probe = [150 + bx0 + 0.5, 150 + by0 + 0.5]; const birdEmpty = s.hitBird({ x: 140, y: 140, w: 30, h: 30 });
    probe = [150 + bx1 + 0.5, 150 + by1 + 0.5]; const birdSolid = s.hitBird({ x: 140, y: 140, w: 30, h: 30 });
    s.planePixels = realPts; s.birds = [];
    return { ...out, birdOn, birdOff, capEmpty, capSolid, birdEmpty, birdSolid };
  });
  check(r.boxOnly > 0, `some placements should touch only the old box, not drawn pixels (${r.boxOnly})`);
  check(r.nicks > 0 && r.nickStormHits === 0 && r.nickNoFlyHits === r.nicks, `a nick should be forgiven by storms but not no-fly zones (${r.nicks} nicks, ${r.nickNoFlyHits} no-fly hits)`);
  check(r.deep > 0 && r.deepMissed === 0, `a deep hit should always count (${r.deepMissed} of ${r.deep} missed)`);
  check(r.capEmpty === 0 && r.capSolid === 1, `a storm's empty cap pixels must not count, solid ones must (${r.capEmpty}, ${r.capSolid})`);
  check(!r.birdEmpty && r.birdSolid, `a bird's empty pixels must not count, solid ones must (${r.birdEmpty}, ${r.birdSolid})`);
  check(r.birdOn && !r.birdOff, `bird on the fuselage should hit, clear of it should not (${r.birdOn}, ${r.birdOff})`);

  check(errs.length === 0, `page errors: ${errs}`);
  console.log(r);
  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
