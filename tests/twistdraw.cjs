// Eras 4-6: the moving gaps are DRAWN where they are (the sim chat, 2026-10-27: rules.js moves the rects of drifting no-fly
// zones and pulsing storms every frame; the pictures were drawn once). A 2010s flight: a drifting no-fly zone and a pulsing
// storm are made, the game runs ~2 s, and every frame the drawn tiles / clouds must sit on their rects.
// Also: with ATC 7 the drift arrow is drawn; with Ops 8 the CLEAN button is there and holding it sets cleanHeld.
// Run: python3 -m http.server 8000 & node tests/twistdraw.cjs     Plant (tools/plants.tsv): followGap never called -> FAIL.
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
    flights: 20, landings: 6, seeds: 200, flightSeconds: 1e6, levels: { trees: 1 }, fleet: { plane: 'dreamliner', planes: { comet: {}, dreamliner: {} }, systems: { atc: 7, ops: 8 }, gadgets: {} } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(300);
  await p.click('#goBtn');
  await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
  const r = await p.evaluate(() => new Promise(res => {
    const s = game.scene.getScene('game'), y0 = s.plane.y; s.graceUntil = 1e12;
    s.events.on('preupdate', () => { s.plane.y = y0; s.plane.vy = 0; });
    s.distancePx = 23000;   // past every twist's `from`
    s.kit.era = 5;          // the far future: drift (era 3) and pulse (era 5) both on
    s.addNoFlyAt(300, 150, 110); s.addStormPairAt(330, 170, 130);
    const nf = s.storms[s.storms.length - 2], st = s.storms[s.storms.length - 1];
    let worst = 0, moved = 0, frames = 0, arrow = false;
    const y1 = nf.rects[1].y;
    s.events.on('postupdate', () => {
      frames++;
      worst = Math.max(worst, Math.abs(nf.parts[1].y - nf.rects[1].y), Math.abs(nf.parts[0].displayHeight - nf.rects[0].height));
      st.parts.forEach((im, i) => { worst = Math.max(worst, Math.abs(im.y - st.pics[i].y)); });
      if (s.era4Gfx && s.era4Gfx.commandBuffer.length) arrow = true;
    });
    s.cleanHeld = false;
    const held = s.cleanBox ? (s.input.emit('pointerdown', { x: s.cleanBox.x + 5, y: s.cleanBox.y + 5 }), s.cleanHeld) : null;
    setTimeout(() => res({ worst, frames, moved: Math.abs(nf.rects[1].y - y1), drift: !!nf.drift, pulse: !!st.pulse, arrow, button: !!s.cleanBox, held }), 2000);
  }));
  check(r.drift && r.pulse, `the twists were not on (drift ${r.drift}, pulse ${r.pulse})`);
  check(r.moved > 3, `the drifting gap did not move (${r.moved} px)`);
  check(r.frames > 30 && r.worst <= 1, `a moving gap was drawn ${r.worst.toFixed(1)} px away from its rect (${r.frames} frames)`);
  check(r.arrow, 'ATC 7: no drift arrow / outline drawn');
  check(r.button && r.held === true, `Ops 8: CLEAN button ${r.button}, hold sets cleanHeld ${r.held}`);
  check(!errs.length, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL twistdraw\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log(`PASS twistdraw: moving gaps drawn on their rects (worst ${r.worst.toFixed(2)} px over ${r.frames} frames), drift arrow, CLEAN button`);
})();
