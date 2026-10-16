// Every texture the game uses must exist once the scene is up: each PNG in assets/ and each
// texture drawn in code. Guards against a loader change silently skipping code-drawn textures
// (which shows green missing-texture boxes in play).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/textures.cjs
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';

const root = path.join(__dirname, '..');
const pngs = fs.readdirSync(path.join(root, 'assets')).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4));
const src = fs.readFileSync(path.join(root, 'src/GameScene.js'), 'utf8');
const drawn = [...src.matchAll(/\bgen\('([\w-]+)'/g)].map(m => m[1]);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true })); });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL); await p.waitForTimeout(800);
  const want = [...new Set([...pngs, ...drawn])];
  const missing = await p.evaluate(keys => { const s = game.scene.getScene('game'); return keys.filter(k => !s.textures.exists(k)); }, want);
  console.log({ checked: want.length, drawnInCode: drawn.length, missing, errs });
  await b.close();
  if (drawn.length === 0) { console.log('FAIL: found no code-drawn textures; has gen() been renamed?'); process.exit(1); }
  if (missing.length || errs.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
