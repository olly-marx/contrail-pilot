// Feature switch check: with FEATURES.citizenZoo off (the default), no Citizen Zoo text, link,
// logo or grown-up gate appears anywhere: title, About, hangar, info pop-ups, facts. With
// ?citizenzoo on the URL it all comes back.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/features.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };

  async function scan(query) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, tours: ['*'], muted: true, landings: 5, planted: { spruce: 2, birch: 2 } })); });
    await p.goto(URL + query); await p.waitForTimeout(700);
    // Everything a player can read: visible page text, every info pop-up, and every fact list.
    const seen = [];
    const visibleText = () => p.evaluate(() => document.body.innerText);
    seen.push(await visibleText());
    await p.click('#aboutBtn'); await p.waitForTimeout(150); seen.push(await visibleText()); await p.click('#aboutClose');
    // The hangar (plane upgrades) and the NATURE screen (tree upgrades, habitat projects, animals).
    for (const tab of ['#tabHangar', '#tabNature']) {
      await p.click(tab); await p.waitForTimeout(200); seen.push(await visibleText());
      for (const sel of ['data-pinfo', 'data-species']) for (const id of await p.$$eval(`[${sel}]`, (bs, sel) => bs.map(x => x.getAttribute(sel)), sel)) {
        await p.click(`[${sel}="${id}"]`); await p.waitForTimeout(80);
        seen.push(await visibleText());
        await p.click('#wInfoClose');
      }
      for (const id of await p.$$eval('[data-info]', bs => bs.filter(x => x.offsetParent !== null).map(x => x.dataset.info))) {
        await p.click(`[data-info="${id}"]`); await p.waitForTimeout(100);
        seen.push(await visibleText());
        seen.push((await p.$$eval('#iLinks a', as => as.map(a => a.href))).join(' '));
        await p.click('#iClose');
      }
    }
    const facts = await p.evaluate(async () => { const n = await import('./src/nature.js'), u = await import('./src/upgrades.js');
      const h = await import('./src/habitats.js');
      return [...n.PROJECTS.map(x => x.fact + ' ' + x.src.map(s => s[0]).join(' ')), ...Object.values(h.UK_SPECIES).map(x => (x.fact || '') + ' ' + (x.src || []).map(s => s[0]).join(' ')), ...n.NATURE_FACTS, ...Object.values(n.SPECIES).map(x => x.fact), ...u.LINES.map(l => l.info.fact)].join(' '); });
    seen.push(facts);
    await p.click('#tabHangar'); await p.waitForTimeout(150);   // the grown-up gate is in the hangar
    const gateShown = await p.isVisible('#realTreeBtn');
    await p.close();
    return { text: seen.join('\n'), gateShown, errs };
  }

  const off = await scan('');
  check(!/citizen/i.test(off.text), `with the switch off, "Citizen Zoo" should appear nowhere: ...${(off.text.match(/.{0,60}citizen.{0,40}/i) || [''])[0]}...`);
  check(!off.gateShown, 'with the switch off, the grown-up gate should be hidden');
  check(!off.errs.length, `page errors (off): ${off.errs}`);
  const on = await scan('?citizenzoo');
  check(/citizenzoo\.org/.test(on.text) && /Citizen Zoo works with beavers/.test(on.text), 'with ?citizenzoo, the Citizen Zoo links and facts should come back');
  check(on.gateShown, 'with ?citizenzoo, the grown-up gate should be back');
  check(!on.errs.length, `page errors (on): ${on.errs}`);

  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
