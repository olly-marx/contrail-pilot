// Badge medals (the user, 2026-10-24: PixelLab pictures): every badge tier, the locked and the secret medal are
// 64x64 pictures that load, and the badge list shows them at 64 px (whole pixels, not stretched 1.5x).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/badgeart.cjs
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
    priceVersion: 2, badgeTiers: { forester: 2, oops: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } })); });
  await p.goto(URL); await ready(p);
  const r = await p.evaluate(async () => {
    const { BADGES, medal } = await import('./src/badges.js');
    const srcs = [...BADGES.flatMap(b => Array.from({ length: b.tiers.length || 1 }, (_, i) => medal(b.id, i + 1))), 'assets/ui/badge-locked.png', 'assets/ui/badge-secret.png'];
    const size = src => new Promise(res => { const i = new Image(); i.onload = () => res([i.width, i.height]); i.onerror = () => res(null); i.src = src; });
    const bad = [];
    for (const s of srcs) { const z = await size(s); if (!z || z[0] !== 64 || z[1] !== 64) bad.push(`${s.split('/').pop()}:${z}`); }
    game.registry.get('ui').go('hangar'); await new Promise(r => setTimeout(r, 300));
    const img = document.querySelector('#hBadges .badge2 img'), cs = img && getComputedStyle(img);
    return { n: srcs.length, bad, shown: cs ? [cs.width, cs.height] : null };
  });
  check(r.n >= 40 && r.bad.length === 0, `every medal is a 64x64 picture that loads: ${r.bad.join(' ')} (of ${r.n})`);
  check(r.shown && r.shown[0] === '64px' && r.shown[1] === '64px', `the badge list shows them at 64 px: ${r.shown}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS badgeart (${r.n} medals)`);
})();
