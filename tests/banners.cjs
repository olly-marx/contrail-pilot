// Day/night banners: "Night is coming!" / "Sunrise!" show for the first DAYNIGHT.bannerTimes of
// each per device, then stop (the sky and the sound still change). Counted across reloads.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/banners.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 5 })); } });
  // Step the clock through `n` day->dusk->night->dawn cycles; return the banner titles shown.
  const cycles = n => p.evaluate(async n => {
    const { DAYNIGHT: D } = await import('./src/config.js');
    const s = game.scene.getScene('game'), shown = [], real = s.ui.toast.bind(s.ui);
    s.ui.toast = (title, ...rest) => { shown.push(title); real(title, ...rest); };
    const at = t => { s.clock = t; s.updateDayNight(0); };
    for (let i = 0; i < n; i++) {
      const c = i * (D.daySeconds + D.nightSeconds);
      at(c + 1); at(c + D.daySeconds - D.blendSeconds / 2);                          // day, dusk
      at(c + D.daySeconds + 1); at(c + D.daySeconds + D.nightSeconds - D.blendSeconds / 2);   // night, dawn
    }
    s.ui.toast = real;
    return shown;
  }, n);
  const startFlight = async () => { await p.click('#goBtn'); for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100); };

  await p.goto(URL); await p.waitForTimeout(800); await startFlight();
  const first = await cycles(2);
  check(first.filter(t => /Night/.test(t)).length === 2 && first.filter(t => /Sunrise/.test(t)).length === 2, `first 2 cycles should show both banners twice: ${first}`);
  // Saved across a reload (a new flight on another day).
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.finish({ landed: true }); });
  await p.waitForTimeout(1500); await p.reload(); await p.waitForTimeout(800); await startFlight();
  const later = await cycles(3);
  check(later.filter(t => /Night/.test(t)).length === 1 && later.filter(t => /Sunrise/.test(t)).length === 1, `after 3 of each, banners should stop: next 3 cycles showed ${JSON.stringify(later)}`);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS banners');
})();
