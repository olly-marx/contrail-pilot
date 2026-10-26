// The PixelLab animals, ON for everyone (the user, 2026-10-24): animals that have a PixelLab version
// (src/pixellab.js) load from assets/pixellab/ in flight and on the NATURE cards. ?pixelart=off opts this device
// out (remembered); ?pixelart=on opts back in and also shows a small load-time / fps readout.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/pixelpreview.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const errs = [], fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => errs.push(String(e)));
  let urls = []; p.on('request', r => urls.push(r.url()));   // which image files the game fetched
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(([k]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear();
    localStorage.setItem(k, JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 9, priceVersion: 2, found: { fox: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } })); } }, [KEY]);
  // (Phaser keeps loaded images as blobs, so look at the files requested since the last page load.)
  const look = async () => ({ fox: urls.filter(u => /animal-fox-0\.png/.test(u)).join(' '), heron: urls.filter(u => /sky-heron-0\.png/.test(u)).join(' '),
    hud: await p.evaluate(() => !!document.getElementById('previewHud')) });
  const go = async u => { urls = []; await p.goto(u); await ready(p); };
  const card = async () => { await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(300);
    const r = await p.evaluate(() => (document.querySelector('[data-species="fox"] img') || {}).src || '');
    await p.evaluate(() => game.registry.get('ui').go('fly')); return r; };

  // 1. On by default: PixelLab art in flight and on the cards, but no readout.
  await go(URL); await p.waitForTimeout(700);
  let s = await look();
  check(/assets\/pixellab\/animal-fox-0\.png/.test(s.fox) && !s.hud && /pixellab/.test(await card()), `on by default, no readout: ${JSON.stringify(s)}`);
  // 2. ?pixelart=on: PixelLab art in flight and on the cards, the readout shows.
  await go(URL + '?pixelart=on'); await p.waitForTimeout(700);
  s = await look();
  check(/assets\/pixellab\/animal-fox-0\.png/.test(s.fox) && /assets\/pixellab\/sky-heron-0\.png/.test(s.heron) && s.hud, `on: PixelLab art + readout: ${JSON.stringify(s)}`);
  check(/assets\/pixellab\/ui\/portrait-animal-fox-0\.png/.test(await card()), 'on: the fox card is the PixelLab one');
  check(/PIXEL ART PREVIEW .* fps/.test(await p.textContent('#previewHud')), `readout: ${await p.textContent('#previewHud')}`);
  // 3. Remembered on this device: a plain reload keeps it on.
  await go(URL);
  check(/pixellab/.test((await look()).fox), 'stays on after a plain reload (this device remembers)');
  // 4. ?pixelart=off: back to the generated art.
  await go(URL + '?pixelart=off');
  s = await look();
  check(s.fox && !/pixellab/.test(s.fox) && !s.hud && !/pixellab/.test(await card()), `off: ${JSON.stringify(s)}`);
  // 5. The opt-out is remembered: a plain reload stays on the generated art.
  await go(URL);
  s = await look();
  check(s.fox && !/pixellab/.test(s.fox) && !s.hud, `stays off after a plain reload: ${JSON.stringify(s)}`);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS pixelpreview');
})();
