// The shared row (research/DESIGN-HANGAR-NATURE.md, approved by the user 2026-11-01): rules 1, 3 and 4, at 375x667 and 390x844.
//   1. text fits: every .rowc name, sub line and price is ONE line and not cut (scrollWidth <= clientWidth), and so is the
//      preview strip's text in NATURE;
//   3. no broken pictures: every <img> on the hangar and NATURE screens has loaded (naturalWidth > 0) — the blue "?";
//   4. rows line up: in each list, every .rowc-name starts at the same x and every price has the same x and width.
// NATURE: every land (all projects shown: tiers forced open). Hangar: PLANE, SYSTEMS, GADGETS, once its rows are .rowc
// (HANGAR=1 requires them; until the plane build's half lands the hangar part reports 'no .rowc rows yet').
// Run: python3 -m http.server 8000 & node tests/rowfit.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  let rowsSeen = 0, landsSeen = 0, hangarRows = 0;
  for (const [W, H] of [[375, 667], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: true });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); });
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    await p.click('#startChoice [data-area="weurope"]').catch(() => {}); await p.click('#startChoice [data-city]').catch(() => {}); await p.waitForTimeout(1200);
    const regions = await p.evaluate(() => { const s = game.registry.get('save'); const R = [...document.querySelectorAll('#wRegions [data-region]')].map(x => x.dataset.region);
      Object.assign(s, { tutorialDone: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], seeds: 99999, crystals: 999, levels: { trees: 1 },
        discovered: Object.fromEntries(['woodland', 'mediterranean', 'desert', 'monsoon', 'eastasia', 'boreal', 'plains', 'tundra', 'savanna', 'rainforest', 'islandforest', 'bush', 'steppe', 'polynesia'].map(r => [r, 1])),
        tours: ['hangar', 'name', 'r-boards', 'r-bonus', 'r-free', 'r-nature', 'r-parcels', 'r-res1', 'r-res2', 'r-school', 'r-systems', 'r-takeoff1', 'r-takeoff2'] });
      const ui = game.registry.get('ui'); ui.tour.busy = true; ui.go('nature');
      return [...document.querySelectorAll('#wRegions [data-region]')].map(x => x.dataset.region); });
    const measure = sel => p.evaluate(sel => {
      const out = { rows: 0, bad: [], names: new Set(), prices: new Set(), imgs: [] };
      for (const r of document.querySelectorAll(sel)) {
        if (!r.offsetParent) continue; out.rows++;
        for (const c of r.querySelectorAll('.rowc-name, .rowc-sub, .rowc-price')) {
          const lh = parseFloat(getComputedStyle(c).lineHeight) || parseFloat(getComputedStyle(c).fontSize) * 1.3;
          if (c.scrollWidth > c.clientWidth + 1 || c.getBoundingClientRect().height > lh * 1.6) out.bad.push(`${c.className}: "${c.textContent.trim()}" (${c.scrollWidth}>${c.clientWidth} or ${Math.round(c.getBoundingClientRect().height)}px tall)`);
          if (c.getBoundingClientRect().right > r.getBoundingClientRect().right + 1) out.bad.push(`${c.className} spills out of its row: "${c.textContent.trim()}"`);
        }
        const n = r.querySelector('.rowc-name'), pr = r.querySelector('.rowc-price');
        if (n) out.names.add(Math.round(n.getBoundingClientRect().left));
        if (pr) out.prices.add(`${Math.round(pr.getBoundingClientRect().left)}/${Math.round(pr.getBoundingClientRect().width)}`);
      }
      for (const i of document.querySelectorAll('#nature img, #hangar img')) if (i.offsetParent && i.getAttribute('src') && i.complete && !i.naturalWidth) out.imgs.push(i.getAttribute('src'));
      return { ...out, names: [...out.names], prices: [...out.prices] };
    }, sel);
    for (const r of regions) {
      await p.evaluate(r => { const ui = game.registry.get('ui'), w = ui.wild || ui.nature; const t = document.querySelector(`#wRegions [data-region="${r}"]`); if (t) t.click(); if (w) { w.openTiers = [1, 2, 3]; w.renderProjects && w.renderProjects(); } }, r);
      await p.waitForTimeout(700);
      const m = await measure('#wProjects .rowc');
      if (!m.rows) continue; landsSeen++; rowsSeen += m.rows;
      check(!m.bad.length, `${W}px NATURE ${r}: text does not fit: ${m.bad.slice(0, 4).join(' | ')}`);
      check(m.names.length <= 1 && m.prices.length <= 1, `${W}px NATURE ${r}: rows do not line up (names at ${m.names}, prices ${m.prices})`);
      check(!m.imgs.length, `${W}px NATURE ${r}: broken pictures ${m.imgs}`);
      const first = await p.$('#wProjects .project:not(.maxed) .rowc-tap');
      if (first) { await first.click(); await p.waitForTimeout(400);
        const st = await p.evaluate(() => { const s = document.getElementById('wStrip'); return s && !s.hidden ? [...s.querySelectorAll('.ws-name, .ws-chain, .linkbtn')].filter(c => c.scrollWidth > c.clientWidth + 1).map(c => c.textContent.trim()) : ['(no strip)']; });
        check(!st.length, `${W}px NATURE ${r}: the preview strip's text does not fit: ${st}`);
        await first.click(); await p.waitForTimeout(200); }
    }
    await p.evaluate(() => game.registry.get('ui').go('hangar')); await p.waitForTimeout(1200);
    for (const tab of ['plane', 'systems', 'gadgets']) {
      await p.click(`#hFleet [data-ftab="${tab}"]`).catch(() => {}); await p.waitForTimeout(600);
      const m = await measure('#hFleet .rowc'); hangarRows += m.rows;
      check(!m.bad.length, `${W}px HANGAR ${tab}: text does not fit: ${m.bad.slice(0, 4).join(' | ')}`);
      check(m.names.length <= 1 && m.prices.length <= 1, `${W}px HANGAR ${tab}: rows do not line up (names at ${m.names}, prices ${m.prices})`);
      check(!m.imgs.length, `${W}px HANGAR ${tab}: broken pictures ${m.imgs}`);
    }
    check(!errs.length, `${W}px page errors ${errs}`);
    await p.close();
  }
  check(landsSeen >= 20 && rowsSeen >= 100, `enough NATURE rows were measured (${landsSeen} land views, ${rowsSeen} rows); else this proves nothing`);
  if (process.env.HANGAR) check(hangarRows > 0, 'the hangar uses .rowc rows');
  await b.close();
  console.log(fails.length ? `FAIL rowfit:\n - ${fails.join('\n - ')}` : `PASS rowfit: ${rowsSeen} NATURE rows in ${landsSeen} land views fit, line up, all pictures load; hangar ${hangarRows ? `${hangarRows} rows` : 'no .rowc rows yet'}`);
  process.exit(fails.length ? 1 : 0);
})();
