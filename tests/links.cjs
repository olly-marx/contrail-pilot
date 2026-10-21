// Links check: every "Learn more" link used by an upgrade exists and has a real URL (no "coming
// soon" in a demo), and the title's About page opens with the AEIS, Brahmal and Citizen Zoo links.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/links.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, tours: ['*'], muted: true })); });
  await p.goto(URL); await p.waitForTimeout(700);

  const r = await p.evaluate(async () => {
    const { LINKS } = await import('./src/links.js'); const { LINES } = await import('./src/upgrades.js');
    const used = [...new Set(LINES.flatMap(l => l.info.links))];
    return { missing: used.filter(k => !LINKS[k]), noUrl: used.filter(k => LINKS[k] && !LINKS[k].url), bad: used.filter(k => LINKS[k] && LINKS[k].url && !/^https:\/\//.test(LINKS[k].url)) };
  });
  check(!r.missing.length, `upgrade links with no entry in links.js: ${r.missing}`);
  check(!r.noUrl.length, `upgrade links still "coming soon": ${r.noUrl}`);
  check(!r.bad.length, `links that are not https: ${r.bad}`);

  await p.click('#aboutBtn'); await p.waitForTimeout(200);
  check(await p.isVisible('#about'), 'about us should open the About page');
  const hrefs = await p.$$eval('#about a', as => as.map(a => a.href));
  for (const want of ['imperial.ac.uk/aerospace-environmental-impacts', 'imperial.ac.uk/brahmal-institute'])   // Citizen Zoo: see features.cjs
    check(hrefs.some(h => h.includes(want)), `About page should link to ${want}`);
  check(/AEIS/.test(await p.textContent('#title .credit')), 'title should credit the AEIS group');
  // Logos load (a missing file would show as a broken image).
  const logos = await p.$$eval('#about img.logo, #title img.logo-mark', is => is.filter(i => !i.closest('[hidden]')).map(i => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 })));
  check(logos.length >= 3 && logos.some(l => /logo-aeis/.test(l.src)) && logos.every(l => l.ok), `logos should load: ${JSON.stringify(logos)}`);
  await p.click('#aboutClose'); check(!(await p.isVisible('#about')), 'OK should close About');

  check(errs.length === 0, `page errors: ${errs}`);
  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
