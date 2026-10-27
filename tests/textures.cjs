// Every texture the game uses must exist once the scene is up: each PNG in assets/ and each
// texture drawn in code. Guards against a loader change silently skipping code-drawn textures
// (which shows green missing-texture boxes in play).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/textures.cjs
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const URL = process.env.URL || 'http://localhost:8000/';

const root = path.join(__dirname, '..');
// Scope is declared by folder: assets/*.png are game textures and must all load; assets/ui/ holds
// HTML-only icons (used from CSS), so it is deliberately not scanned (readdirSync is not recursive).
const pngs = fs.readdirSync(path.join(root, 'assets')).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4));
const src = fs.readFileSync(path.join(root, 'src/GameScene.js'), 'utf8');
const drawn = [...src.matchAll(/\bgen\('([\w-]+)'/g)].map(m => m[1]);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true })); });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(URL);
  // Wait for the loader and makeTextures() to finish (380+ PNGs since 2026-10-21: in CI 0.8 s was not
  // enough and everything still loading counted as missing). 'puff' is drawn in code after loading.
  await p.waitForFunction(() => { const s = window.game && game.scene.getScene('game'); return s && s.sys.isActive() && s.textures.exists('puff') && !s.load.isLoading(); }, null, { timeout: 60000 }).catch(() => {});
  const want = [...new Set([...pngs, ...drawn])];
  // Region animals and trees load on demand (2026-10-23): ask for every land's, then wait for the loader.
  await p.evaluate(async () => { const s = game.scene.getScene('game'), { WILDLIFE } = await import('./src/wildlife.js');
    if (s.queueArt([...new Set(WILDLIFE.map(w => w.region))])) await new Promise(res => { s.load.once('complete', res); s.load.start(); }); });
  const missing = await p.evaluate(keys => { const s = game.scene.getScene('game'); return keys.filter(k => !s.textures.exists(k)); }, want);
  console.log({ checked: want.length, drawnInCode: drawn.length, missing, errs });
  await b.close();
  if (drawn.length === 0) { console.log('FAIL: found no code-drawn textures; has gen() been renamed?'); process.exit(1); }
  if (missing.length || errs.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
