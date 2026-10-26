// Sim engine landing 2 (2026-10-25): the baked collision masks (src/sim/masks.js), which GameScene.alphaMask() now uses, must be pixel-for-pixel
// what GameScene.canvasMask() reads from the textures through a canvas, for every picture a crash is checked
// against (the plane, birds, storm clouds). Also checks the check: one flipped pixel must fail.
// Run: python3 -m http.server 8000 & node tests/sim-masks.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'] })); });
  await p.goto(URL); await ready(p);
  const r = await p.evaluate(async () => {
    const { mask, MASK_KEYS } = await import('/src/sim/masks-load.js');
    const s = game.scene.getScene('game'), out = [];
    const diff = (key, flip) => { const a = s.canvasMask(key), m = mask(key); if (a.w !== m.w || a.h !== m.h) return `${key}: size ${a.w}x${a.h} vs baked ${m.w}x${m.h}`;
      let n = 0; for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (a.at(x, y) !== (flip && x === flip[0] && y === flip[1] ? !m.at(x, y) : m.at(x, y))) n++;
      return n ? `${key}: ${n} pixels differ` : null; };
    for (const k of MASK_KEYS) { const d = diff(k); if (d) out.push(d); }
    const planted = diff('plane', [10, 10]);   // a gate that cannot fail is not a gate
    return { out, planted, keys: MASK_KEYS.length };
  });
  await b.close();
  const fails = [...r.out];
  if (!r.planted) fails.push('planted one-pixel difference was NOT caught');
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: ${r.keys} baked masks match the game's canvas masks pixel for pixel; a planted pixel is caught`);
})();
