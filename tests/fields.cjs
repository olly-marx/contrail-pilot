// Wild-area fields for every region that has one (the user, 2026-10-24: a simple flat field like the UK's, with the
// region's own PixelLab backdrop on the horizon). Each region in the list shows its field picture (which loads) and
// not the "being drawn" note; a region without a field still shows the note.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/fields.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const WITH = ['woodland', 'mediterranean', 'desert', 'monsoon', 'eastasia', 'boreal', 'plains', 'tundra', 'savanna', 'rainforest', 'islandforest'], WITHOUT = [];   // every region since 0.10.8

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], missing = [], fails = [], check = (c, m) => { if (!c) fails.push(m); };
  p.on('pageerror', e => errs.push(String(e)));
  p.on('response', r => { if (r.status() === 404) missing.push(r.url().split('/').pop()); });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const discovered = Object.fromEntries([...WITH, ...WITHOUT].map(r => [r, 1]));
  await p.addInitScript(d => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'],
    tours: ['*'], freeGiven: true, priceVersion: 2, discovered: d, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } })); }, discovered);
  await p.goto(URL); await ready(p); await p.click('#tabNature'); await p.waitForTimeout(800);
  for (const r of [...WITH, ...WITHOUT]) {
    await p.click(`#wRegions [data-region="${r}"]`); await p.waitForTimeout(250);
    const s = await p.evaluate(() => { const f = document.querySelector('#wScene .wfield'); const bg = f ? f.style.backgroundImage : '';
      return { bg, note: !!document.querySelector('#wScene .w-empty') && /being drawn/.test(document.querySelector('#wScene').textContent) }; });
    const ok = await p.evaluate(src => new Promise(res => { if (!src) return res(false); const i = new Image(); i.onload = () => res(i.width === 288 && i.height === 170); i.onerror = () => res(false); i.src = src; }),
      (s.bg.match(/url\(["']?([^"')]+)/) || [])[1]);
    if (WITH.includes(r)) check(new RegExp(`field-${r}\\.png`).test(s.bg) && ok && !s.note, `${r}: shows its 288x170 field: ${JSON.stringify(s)} loaded=${ok}`);
    else check(s.note && !s.bg, `${r}: no field yet, says it is being drawn: ${JSON.stringify(s)}`);
  }
  check(missing.length === 0, `missing files: ${missing}`);   // (every project icon is drawn since the PixelLab projects)
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS fields');
})();
