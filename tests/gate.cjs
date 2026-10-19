// Grown-up gate: a short tap does nothing; holding 2 s (mouse or touch) reveals a real link to
// Citizen Zoo (so the site opens from a direct tap, which phones don't block); the game itself
// never calls window.open for it.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/gate.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  for (const mode of ['mouse', 'touch']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: mode === 'touch', isMobile: mode === 'touch' });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true }));
      window.__opened = 0; window.open = () => { window.__opened++; return null; }; });
    await p.goto(URL); await p.waitForTimeout(700);
    await p.click('#hangarBtn'); await p.waitForTimeout(300);
    await p.locator('#realTreeBtn').scrollIntoViewIfNeeded();
    const box = await p.locator('#realTreeBtn').boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
    const cdp = mode === 'touch' ? await ctx.newCDPSession(p) : null;
    const press = async ms => {
      if (mode === 'mouse') { await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); }
      else { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await p.waitForTimeout(ms); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
      await p.waitForTimeout(200);
    };
    await press(300);
    check(!(await p.isVisible('#realTreeLink')), `${mode}: a short tap should not unlock the link`);
    await press(2300);
    check(await p.isVisible('#realTreeLink'), `${mode}: holding 2 s should show the Citizen Zoo link`);
    const href = await p.getAttribute('#realTreeLink', 'href');
    check(/citizenzoo\.org/.test(href || ''), `${mode}: the link should go to Citizen Zoo, got ${href}`);
    check(await p.evaluate(() => window.__opened) === 0, `${mode}: the game should not open the site from a timer (blocked on phones)`);
    check(errs.length === 0, `${mode}: page errors ${errs}`);
    await ctx.close();
  }
  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
