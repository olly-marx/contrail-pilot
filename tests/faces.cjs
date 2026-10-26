// The planet face (the user, 2026-10-24): PixelLab faces that get redder, happy > nervous > stressed > crying,
// with sweat drops that run down (two frames per mood, Hud.js). Each heat shows its mood's texture, the two
// frames alternate, and every face texture really loaded (not Phaser's missing-texture box).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/faces.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const errs = [], fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'],
    landings: 9, priceVersion: 2, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } })));
  await p.goto(URL); await ready(p);
  const r = await p.evaluate(() => {
    const s = game.scene.getScene('game'); s.scene.pause();
    const show = (pc, t) => { s.hud.setHeat(pc, t); return s.hud.face.texture.key; };
    const loaded = ['happy', 'ok', 'hot', 'melting'].flatMap(m => [0, 1].map(f => `face-${m}-${f}`))
      .filter(k => !s.textures.exists(k) || s.textures.get(k).key === '__MISSING');
    return { cold: show(-10, 0), cold1: show(-10, 400), warm: show(1, 0), missing: loaded, w: s.hud.face.width };
  });
  check(r.cold === 'face-happy-0' && r.cold1 === 'face-happy-1', `cold: happy, frames alternate: ${r.cold} ${r.cold1}`);
  check(r.warm === 'face-ok-0', `a little warm: nervous: ${r.warm}`);
  check(r.missing.length === 0, `face textures missing: ${r.missing}`);
  check(r.w === 32, `the PixelLab face is 32 px: ${r.w}`);
  // Hottest: just under the danger line (read from the game, so a rebalance does not break this).
  const hot = await p.evaluate(async () => { const { CLIMATE } = await import('./src/config.js'); const s = game.scene.getScene('game');
    const at = f => { s.hud.setHeat(f * CLIMATE.dangerLine, 0); return s.hud.face.texture.key; };
    return [at(0.6), at(0.95)]; });
  check(hot[0] === 'face-hot-0' && hot[1] === 'face-melting-0', `stressed then crying: ${hot}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS faces');
})();
