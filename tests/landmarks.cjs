// City skylines (the user, 2026-10-24): every city has a PixelLab skyline of its landmarks, and in flight it is big
// (>= 80 px tall), a little hazy, with its base set back behind the city row, so it reads as far away.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/landmarks.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], fails = [], check = (c, m) => { if (!c) fails.push(m); };
  p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'],
    landings: 9, priceVersion: 2, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } })); });
  await p.goto(URL); await ready(p);
  const r = await p.evaluate(async () => {
    const s = game.scene.getScene('game'), { CITIES } = await import('./src/cities.js'), { LANDMARKS } = await import('./src/landmarks.js');
    const missing = CITIES.map(c => c.name).filter(n => !LANDMARKS[n] || !s.textures.exists(LANDMARKS[n].key) || s.textures.get(LANDMARKS[n].key).key === '__MISSING');
    const before = s.landmarks.length;
    s.addRunway(400, 'TOKYO');
    const img = s.landmarks[s.landmarks.length - 1];
    return { cities: CITIES.length, missing, added: s.landmarks.length - before, key: img && img.texture.key,
      h: img && img.displayHeight, alpha: img && img.alpha, base: img && img.y + img.displayHeight * (1 - img.originY), sky: 512 - 48 };
  });
  check(r.cities === 104 && r.missing.length === 0, `every city has a loaded skyline: missing ${r.missing}`);
  check(r.added === 1 && r.key === 'landmark-tokyo', `a runway gets its city's skyline: ${r.added} ${r.key}`);
  check(r.h >= 80, `big on screen (>= 80 px): ${r.h}`);
  check(r.alpha < 1 && r.alpha > 0.6, `a little hazy: alpha ${r.alpha}`);
  check(r.base < r.sky && r.base > r.sky - 30, `base set back behind the city row (above the ground line, below its top): ${r.base} vs ${r.sky}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS landmarks');
})();
