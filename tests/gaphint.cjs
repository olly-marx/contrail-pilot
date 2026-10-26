// The next-gap hint (eras stage 7, 2026-10-23): with at least level 1 in ALL THREE systems, storm
// columns are made further ahead (off screen) and a gate glows at the right edge at their gap's
// height before they scroll in; stronger with the lowest of the three levels. Otherwise: today's game.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/gaphint.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const fly = async systems => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(sy => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
      flights: 20, landings: 6, seeds: 200, flightSeconds: 8000, levels: { trees: 1 }, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: sy, gadgets: {} } })); }, systems);
    await p.goto(URL); await ready(p); await p.waitForTimeout(300);
    await p.click('#goBtn');
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
    const r = await p.evaluate(() => new Promise(res => {
      const s = game.scene.getScene('game'), y0 = s.plane.y; s.graceUntil = 1e12;
      s.events.on('preupdate', () => { s.plane.y = y0; s.plane.vy = 0; });
      let maxX = 0, hinted = false;
      const t = setInterval(() => {
        for (const st of s.storms) maxX = Math.max(maxX, st.rects[0].x);
        if (s.gapHintGfx && s.gapHintGfx.commandBuffer.length > 0) hinted = true;
      }, 30);
      setTimeout(() => { clearInterval(t); res({ level: s.kit.hintLevel, maxX: Math.round(maxX), hinted, W: s.scale.width }); }, 6000);
    }));
    r.errs = errs;
    await p.close();
    return r;
  };
  const none = await fly({ forecast: 6, atc: 6 });            // two of three: no hint
  const full = await fly({ forecast: 6, atc: 6, ops: 6 });
  check(none.level === 0 && !none.hinted && none.maxX <= 300, `without all three systems: no hint, storms made just off screen: ${JSON.stringify(none)}`);
  check(full.level === 6 && full.hinted && full.maxX > 340, `all three at 6: storms made well ahead and the gate glows: ${JSON.stringify(full)}`);
  check(!none.errs.length && !full.errs.length, `page errors: ${none.errs} ${full.errs}`);
  console.log({ fails, none, full });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
