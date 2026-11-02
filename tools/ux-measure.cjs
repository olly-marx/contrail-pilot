// One-off MEASUREMENT (not a gate): research/UX-MASTER-PLAN.md section F3. Renders each screen at 390x667 and 320x568 with a
// DECLARED "rich" save (7 missions done this flight, a new animal, a badge, 3 lands discovered, plenty of seeds so upgrades are
// affordable) and prints a markdown table: screen | viewport | scrollHeight | clientHeight | first-card top | primary-button
// bottom | bar top | text < 7 px | overlaps | clipped.
// Run: python3 -m http.server 8137 & node tools/ux-measure.cjs > out.md   (URL=... CHROME=... override)
// "overlap" = two visible text/button/picture boxes whose rects intersect by more than 4 px^2 and are not ancestor/descendant;
// "clipped" = a text element whose scrollWidth/Height exceeds its box (text cut). Both counted at scrollTop 0.
const { chromium } = require('playwright-core');
const { ready } = require('../tests/lib/ready.js');
const URL = process.env.URL || 'http://localhost:8137/';
const VIEWPORTS = [[390, 667], [320, 568]];
const MISSIONS7 = ['Dodge 3 icy patches at night', 'A whole night with no contrail over Australian bush', 'Pass 4 storm gaps in one flight',
  'Spot a wedge-tailed eagle from the air', 'Plant 3 kinds of tree', 'Land at PERTH', 'Buy a helper system for your plane'];

const inPage = {
  // measure the visible screen element `root`; `primary` and `card` are selectors ('' = none)
  measure: ({ root, primary, card }) => {
    const R = document.querySelector(root), vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
    const rootBox = R.getBoundingClientRect();
    const all = [...R.querySelectorAll('*')].filter(e => {
      if (!vis(e)) return false;
      for (let a = e.parentElement; a && a !== R; a = a.parentElement) if (!vis(a)) return false;   // hidden ancestor
      return true;
    });
    R.scrollTop = 0;
    const hasText = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    // A box is a LEAF (no text/button/picture box inside it): a whole-row tap button is a container, not a thing a name can sit under.
    // Text elements use the extent of their text (Range rects, so padding that merely reserves room is not counted); buttons/pictures their border box.
    const isBox = e => hasText(e) || e.tagName === 'BUTTON' || e.tagName === 'IMG' || e.tagName === 'CANVAS';
    const cand = all.filter(isBox);
    const leaves = cand.filter(e => !cand.some(o => o !== e && e.contains(o)));
    const extent = e => { if (e.tagName === 'BUTTON' || e.tagName === 'IMG' || e.tagName === 'CANVAS') return e.getBoundingClientRect();
      const rg = document.createRange(); let L = 1e9, T = 1e9, Rr = -1e9, B = -1e9;
      for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); for (const q of rg.getClientRects()) { if (q.width < 1) continue; L = Math.min(L, q.left); T = Math.min(T, q.top); Rr = Math.max(Rr, q.right); B = Math.max(B, q.bottom); } }
      return L > Rr ? e.getBoundingClientRect() : { left: L, top: T, right: Rr, bottom: B }; };
    const label = e => ((e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 22) || e.className || e.tagName);
    let overlaps = 0; const ex = [];
    for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
      const p = extent(leaves[i]), q = extent(leaves[j]);
      const w = Math.min(p.right, q.right) - Math.max(p.left, q.left), h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (w > 2 && h > 2) { overlaps++; if (ex.length < 3) ex.push(`"${label(leaves[i])}" x "${label(leaves[j])}"`); }
    }
    const boxes = leaves;
    let small = 0, clipped = 0; const cex = [];
    for (const e of all) if (hasText(e)) {
      if (parseFloat(getComputedStyle(e).fontSize) < 7) small++;
      if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== 'inline' || e.scrollHeight > e.clientHeight + 2 && e.clientHeight > 0 && getComputedStyle(e).display !== 'inline') { clipped++; if (cex.length < 2) cex.push((e.textContent || '').trim().slice(0, 24)); }
    }
    const rect = s => { const e = s && document.querySelector(root + ' ' + s); const v = e && [...document.querySelectorAll(root + ' ' + s)].find(vis); return v ? v.getBoundingClientRect() : null; };
    const pr = rect(primary), cd = rect(card), bar = document.getElementById('tabbar');
    return { scrollHeight: R.scrollHeight, clientHeight: R.clientHeight, scrollTop: R.scrollTop,
      cardTop: cd ? Math.round(cd.top) : null, cardBottom: cd ? Math.round(cd.bottom) : null, primBottom: pr ? Math.round(pr.bottom) : null,
      primTop: pr ? Math.round(pr.top) : null, barTop: bar && !bar.hidden ? Math.round(bar.getBoundingClientRect().top) : null,
      small, overlaps, clipped, ex: ex.join('; '), cex: cex.join('; '), boxes: boxes.length, vh: innerHeight };
  },
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const rows = []; const notes = [];
  for (const [W, H] of VIEWPORTS) {
    const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: true });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); });
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    await p.click('#startChoice [data-area="weurope"]').catch(() => {}); await p.click('#startChoice [data-city]').catch(() => {}); await p.waitForTimeout(1200);
    // The declared rich save.
    await p.evaluate(missions => {
      const s = game.registry.get('save'), ui = game.registry.get('ui');
      Object.assign(s, { tutorialDone: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], seeds: 5000, crystals: 200, freeUpgrade: false, freeGiven: true, landings: 12, bestDistance: 8000,
        discovered: { woodland: 1, bush: 1, mediterranean: 1 }, areas: ['weurope', 'australia'].filter((x, i) => !i || true),
        tours: ['hangar', 'name', 'r-boards', 'r-bonus', 'r-free', 'r-nature', 'r-parcels', 'r-res1', 'r-res2', 'r-school', 'r-systems', 'r-takeoff1', 'r-takeoff2'] });
      s.unclaimed = missions.map((t, i) => ({ key: `mission:rich${i}`, kind: 'mission', id: `rich${i}`, label: t, seeds: 15 + 5 * i, crystals: 1 }))
        .concat([{ key: 'badge:frequent:1', kind: 'badge', id: 'frequent', tier: 1, label: 'Frequent Flyer', seeds: 20, crystals: 2 }]);
      ui.tour.busy = true;
    }, MISSIONS7);
    const settle = ms => p.waitForTimeout(ms);
    const meas = async (name, spec) => { await settle(700);
      const m = await p.evaluate(inPage.measure, spec); rows.push({ name, W, H, ...m }); return m; };

    // RESULTS: three declared variants (rich landed, plain landed, crash).
    for (const kind of ['rich', 'plain', 'crash']) {
      await p.evaluate(({ kind, MISSIONS7 }) => {
        const mk = k => ({ landed: k !== 'crash', landedAt: 'MELBOURNE', from: 'LONDON', reason: 'Crashed into the ground', distance: 9990, heat: 20,
          breakdown: { co2: 152, night: 7, sun: 34, trees: 8 }, earned: k === 'plain' ? [{ label: 'Seeds', n: 23 }] : [{ label: 'Seeds', n: 23 }, { label: 'Long flight bonus', n: 40 }, { label: 'Cool Earth', n: 3 }, { label: 'Passenger fares', n: 12 }],
          mult: 3.4, newRecord: k === 'rich', kinds: 3, natureGains: k === 'plain' ? [] : [{ name: 'Australian bush', gain: 4 }], crystals: 7, flyMinutes: 1.6, eraOpened: null, newPlane: null, school: false,
          rewards: k === 'rich' ? game.registry.get('save').unclaimed.slice() : [], foundIds: k === 'rich' ? ['murraycod'] : [],
          missions2: k === 'rich' ? { done: MISSIONS7, next: 'Buy a helper system' } : { done: [], next: 'Buy a helper system' }, mission: null });
        const ui = game.registry.get('ui'); window.__resDone = false;
        const pr = ui.showResults(mk(kind)); setTimeout(() => { ui.skipReveal = true; }, 50);
        pr.then(() => { window.__resDone = true; });
      }, { kind, MISSIONS7 });
      await p.waitForFunction(() => window.__resDone, null, { timeout: 15000 }).catch(() => notes.push(`results ${kind} ${W}: reveal did not finish`));
      await meas(`RESULTS ${kind}`, { root: '#results', primary: '#againBtn', card: '#rMission' });
    }
    // HOME
    await p.evaluate(() => game.registry.get('ui').go('fly')); await meas('HOME', { root: '#title', primary: '#goBtn', card: '#hubNext' });
    // MISSIONS
    await p.evaluate(() => game.registry.get('ui').go('missions')); await meas('MISSIONS', { root: '#missions', primary: '.mrow', card: '.mrow' });
    // HANGAR (three sub-tabs, tapped)
    await p.evaluate(() => game.registry.get('ui').go('hangar')); await settle(1200);
    for (const tab of ['plane', 'systems', 'gadgets']) {
      await p.click(`#hFleet [data-ftab="${tab}"]`).catch(() => notes.push(`hangar ${tab}: tab not tappable`)); await settle(500);
      await meas(`HANGAR ${tab}`, { root: '#hangar', primary: '#hFleet .rowc-price', card: '#hFleet .rowc' });
    }
    // NATURE: the home land as it opens, then each discovered land with every tier forced open (as rowfit does).
    await p.evaluate(() => game.registry.get('ui').go('nature')); await settle(900);
    await meas('NATURE (as opened)', { root: '#nature', primary: '#wProjects .rowc-price', card: '#wProjects .rowc' });
    for (const r of ['bush', 'woodland', 'mediterranean']) {
      await p.evaluate(r => { const ui = game.registry.get('ui'), w = ui.wild || ui.nature; const t = document.querySelector(`#wRegions [data-region="${r}"]`); if (t) t.click(); if (w) { w.bio = () => 100; w.openTiers = [1, 2, 3]; w.renderProjects && w.renderProjects(); } }, r);
      await settle(600); await meas(`NATURE ${r} (tiers open)`, { root: '#nature', primary: '#wProjects .rowc-price', card: '#wProjects .rowc' });
    }
    // BOARDS
    await p.evaluate(() => game.registry.get('ui').go('boards')); await meas('BOARDS', { root: '#boards', primary: '', card: '' });
    if (errs.length) notes.push(`page errors at ${W}: ${errs.slice(0, 2).join(' | ')}`);
    await p.close();
  }
  await b.close();
  const out = ['| screen | viewport | scrollHeight | clientHeight | scrollTop | first-card top | primary bottom | bar top | text < 7 px | overlaps | clipped | verdict | examples |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of rows) {
    const over = r.scrollHeight > r.clientHeight + 1;
    const hidden = r.primBottom != null && r.barTop != null && r.primBottom > r.barTop;
    const verdict = [over && 'SCROLLS', hidden && 'PRIMARY UNDER BAR', r.overlaps && 'OVERLAP', r.clipped && 'CLIPPED', r.small && 'SMALL TEXT'].filter(Boolean).join(' + ') || 'ok';
    out.push(`| ${r.name} | ${r.W}x${r.H} | ${r.scrollHeight} | ${r.clientHeight} | ${r.scrollTop} | ${r.cardTop ?? '-'} | ${r.primBottom ?? '-'} | ${r.barTop ?? '-'} | ${r.small} | ${r.overlaps} | ${r.clipped} | ${verdict} | ${[r.ex, r.cex].filter(Boolean).join(' / ') || ''} |`);
  }
  console.log(out.join('\n')); if (notes.length) console.log('\nNOTES:\n- ' + notes.join('\n- '));
})();
