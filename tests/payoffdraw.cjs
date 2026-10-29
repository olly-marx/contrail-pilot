// The first upgrade's payoff always DRAWS the plane (the user's playtest, 2026-10-29, live 0.21.3 on a phone: an empty cream
// frame, the label floating above the card, "mega lame"). Cause: the payoff's timeline (zoom at 0.9 s, label at 1.6 s) ran
// before its two pictures had loaded. Here the two pictures are DELAYED 3 s (a slow phone). Asserts, at 390x844, ?preview=1
// and not: once the part has arrived (.arrive), the before and after pictures are both loaded and non-blank, and the label is
// inside the card; the words are about the look. Run: python3 -m http.server 8000 & node tests/payoffdraw.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  for (const q of ['?preview=1', '']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); });
    await p.goto(URL + q); await ready(p); await p.waitForTimeout(800);
    await p.click('#startChoice [data-area="aotearoa"]').catch(() => {}); await p.click('#startChoice [data-city="AUCKLAND"]').catch(() => {}); await p.waitForTimeout(1200);
    await p.evaluate(() => { const s = game.registry.get('save'); Object.assign(s, { tutorialDone: true, freeGiven: true, freeUpgrade: true }); const t = document.getElementById('tour'); if (t) t.hidden = true; const ui = game.registry.get('ui'); ui.tour.busy = true; ui.go('hangar'); });
    await p.waitForTimeout(1500);
    await p.click('[data-ftap^="plane:"][data-ftap$=".engines"]'); await p.waitForTimeout(800);
    // A slow phone: from now on the two payoff pictures take 3 s (and the hangar's copies are dropped, so nothing is cached in the page).
    await p.route(/plane-hangar-comet\.png|hangar-comet-intakes\.png/, async r => { await new Promise(z => setTimeout(z, 3000)); r.continue(); });
    await p.evaluate(() => { for (const i of document.querySelectorAll('img')) if (/plane-hangar-comet|hangar-comet-intakes/.test(i.src)) i.removeAttribute('src'); });
    const cdp = await p.context().newCDPSession(p); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await p.click('#hPreviewBuy');
    let seen = null;
    for (let i = 0; i < 60 && !seen; i++) {
      await p.waitForTimeout(150);
      seen = await p.evaluate(() => { const el = document.getElementById('payoff'); if (!el || el.hidden || !el.classList.contains('labelled')) return null;
        const ink = img => { if (!img || !img.naturalWidth) return 0; const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 40) n++; return n; };
        const lab = document.getElementById('payLabel'), card = el.querySelector('.payoff-card').getBoundingClientRect(), l = lab.getBoundingClientRect(), shown = getComputedStyle(lab).display !== 'none';
        return { before: ink(document.getElementById('payBefore')), after: ink(el.querySelector('.pay-part')), labelInCard: !shown || (l.top >= card.top - 1 && l.bottom <= card.bottom + 1),
          text: document.getElementById('payText').textContent, label: lab.textContent }; });
    }
    const tag = q || '(no preview)';
    check(!!seen, `${tag}: the payoff reached its words and OK`);
    if (seen) {
      check(seen.before > 5000 && seen.after > 5000, `${tag}: before and after pictures are drawn when the words show (ink ${seen.before} / ${seen.after})`);
      check(seen.labelInCard, `${tag}: the label sits inside the card, on the plane`);
      check(/jet engines/i.test(seen.label + seen.text) && !/cleaner now/i.test(seen.text), `${tag}: the words are about the look: "${seen.label}" / "${seen.text}"`);
    }
    check(!errs.length, `${tag}: page errors ${errs}`);
    if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/payoff${q ? '-preview' : ''}.png` });
    await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL payoffdraw:\n - ${fails.join('\n - ')}` : 'PASS payoffdraw: with 3 s pictures the payoff waits, draws the plane before and after, the label stays on the card (preview and not)');
  process.exit(fails.length ? 1 : 0);
})();
