// Shared by tests/fitscreen.cjs, overlap.cjs, taptargets.cjs and tools/ux-measure.cjs (research/UX-MASTER-PLAN.md F2/F3).
// Lives under tools/ (not tests/lib/) on purpose: a change in tests/lib/ means "run ALL browser tests" in the gate planner.
const { chromium } = require('playwright-core');
const { ready } = require('../tests/lib/ready.js');
const MISSIONS7 = ['Dodge 3 icy patches at night', 'A whole night with no contrail over Australian bush', 'Pass 4 storm gaps in one flight',
  'Spot a wedge-tailed eagle from the air', 'Plant 3 kinds of tree', 'Land at PERTH', 'Buy a helper system for your plane'];

// The declared rich save: lessons done, plenty of seeds (upgrades affordable), 3 lands discovered, 7 mission prizes + a badge unclaimed.
async function openPage(browser, W, H, url) {
  const p = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: true });
  p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); });
  await p.goto(url); await ready(p); await p.waitForTimeout(800);
  await p.click('#startChoice [data-area="weurope"]').catch(() => {}); await p.click('#startChoice [data-city]').catch(() => {}); await p.waitForTimeout(1200);
  await p.evaluate(missions => {
    const s = game.registry.get('save'), ui = game.registry.get('ui');
    Object.assign(s, { tutorialDone: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], seeds: 5000, crystals: 200, freeUpgrade: false, freeGiven: true, landings: 12, bestDistance: 8000,
      discovered: { woodland: 1, bush: 1, mediterranean: 1 }, areas: ['weurope', 'australia'],
      tours: ['hangar', 'name', 'r-boards', 'r-bonus', 'r-free', 'r-nature', 'r-parcels', 'r-res1', 'r-res2', 'r-school', 'r-systems', 'r-takeoff1', 'r-takeoff2'] });
    s.unclaimed = missions.map((t, i) => ({ key: `mission:rich${i}`, kind: 'mission', id: `rich${i}`, label: t, seeds: 15 + 5 * i, crystals: 1 }))
      .concat([{ key: 'badge:frequent:1', kind: 'badge', id: 'frequent', tier: 1, label: 'Frequent Flyer', seeds: 20, crystals: 2 }]);
    ui.tour.busy = true;
  }, MISSIONS7);
  return p;
}

// Render one RESULTS variant through the game's own showResults (reveal skipped).
async function showVariant(p, kind) {
  await p.evaluate(({ kind, MISSIONS7 }) => {
    const ui = game.registry.get('ui'), s = game.registry.get('save');
    s.freeUpgrade = kind === 'first';
    const done = { rich: MISSIONS7, seven: MISSIONS7, animalbadge: [MISSIONS7[0]], plain: [], crash: [], first: [], school: [] }[kind];
    const r = { landed: kind !== 'crash', landedAt: 'MELBOURNE', from: 'LONDON', reason: 'Crashed into the ground', distance: 9990, heat: 20,
      breakdown: { co2: 152, night: 7, sun: 34, trees: 8 },
      earned: ['plain', 'crash', 'first', 'school'].includes(kind) ? [{ label: 'Seeds', n: 23 }] : [{ label: 'Seeds', n: 23 }, { label: 'Long flight bonus', n: 40 }, { label: 'Cool Earth', n: 3 }, { label: 'Passenger fares', n: 12 }],
      mult: 3.4, newRecord: kind === 'rich', kinds: 3, natureGains: ['plain', 'crash'].includes(kind) ? [] : [{ name: 'Australian bush', gain: 4 }], crystals: 7, flyMinutes: kind === 'school' ? 0 : 1.6,
      eraOpened: null, newPlane: null, school: kind === 'school',
      rewards: kind === 'rich' || kind === 'seven' ? s.unclaimed.slice() : kind === 'animalbadge' ? s.unclaimed.filter((u, i) => i === 0 || u.kind === 'badge') : [],
      foundIds: kind === 'rich' || kind === 'animalbadge' ? ['murraycod'] : [], missions2: { done, next: 'Buy a helper system' }, mission: null };
    window.__resDone = false; const pr = ui.showResults(r); setTimeout(() => { ui.skipReveal = true; }, 50); pr.then(() => { window.__resDone = true; });
  }, { kind, MISSIONS7 });
  await p.waitForFunction(() => window.__resDone, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(700);
}

// Measured IN the page. spec = { root, primary, first }. Returns the numbers the table and the gates need.
function measure(spec) {
  const R = document.querySelector(spec.root), vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  R.scrollTop = 0;
  const all = [...R.querySelectorAll('*')].filter(e => { if (!vis(e)) return false; for (let a = e.parentElement; a && a !== R; a = a.parentElement) if (!vis(a)) return false; return true; });
  const hasText = e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const isBox = e => hasText(e) || e.tagName === 'BUTTON' || e.tagName === 'IMG' || e.tagName === 'CANVAS';
  const cand = all.filter(isBox), leaves = cand.filter(e => !cand.some(o => o !== e && e.contains(o)));
  const extent = e => { if (e.tagName === 'BUTTON' || e.tagName === 'IMG' || e.tagName === 'CANVAS') return e.getBoundingClientRect();
    const rg = document.createRange(); let L = 1e9, T = 1e9, Rr = -1e9, B = -1e9;
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); for (const q of rg.getClientRects()) { if (q.width < 1) continue; L = Math.min(L, q.left); T = Math.min(T, q.top); Rr = Math.max(Rr, q.right); B = Math.max(B, q.bottom); } }
    return L > Rr ? e.getBoundingClientRect() : { left: L, top: T, right: Rr, bottom: B }; };
  const label = e => ((e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24) || e.className || e.tagName);
  const overlapList = [];
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const pic = e => e.tagName === 'IMG' || e.tagName === 'CANVAS';
    if (pic(leaves[i]) && pic(leaves[j])) continue;   // stacked art (a plane + its ghost layers, a globe's layers) overlaps by design
    const p = extent(leaves[i]), q = extent(leaves[j]);
    const w = Math.min(p.right, q.right) - Math.max(p.left, q.left), h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
    if (w > 2 && h > 2) overlapList.push(`"${label(leaves[i])}" x "${label(leaves[j])}"`);
  }
  // clipped = text cut: a box that hides overflow yet has more content than room, or text drawn off the screen's side.
  const clippedList = [];
  for (const e of all) if (hasText(e)) {
    const cs = getComputedStyle(e), hides = cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
    const x = extent(e);
    if ((hides && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2) && e.clientHeight > 0) || x.right > innerWidth + 1 || x.left < -1) clippedList.push(label(e));
  }
  const smallList = all.filter(e => hasText(e) && parseFloat(getComputedStyle(e).fontSize) < 7).map(label);
  const taps = all.filter(e => (e.tagName === 'BUTTON' || e.tagName === 'A' || e.classList.contains('rowc-tap') || e.hasAttribute('data-go') || e.hasAttribute('data-ftab')) && !e.disabled)
    .filter(e => { const r = e.getBoundingClientRect(); return r.width < 40 || r.height < 40; }).map(e => `${label(e)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
  const pick = s => s ? [...document.querySelectorAll(spec.root + ' ' + s)].find(vis) : null;
  const pr = pick(spec.primary), fc = pick(spec.first), bar = document.getElementById('tabbar');
  const barTop = bar && !bar.hidden ? bar.getBoundingClientRect().top : innerHeight;
  return { scrollHeight: R.scrollHeight, clientHeight: R.clientHeight, scrollTop: R.scrollTop, barTop: Math.round(barTop), vh: innerHeight, boxes: leaves.length,
    primTop: pr ? Math.round(pr.getBoundingClientRect().top) : null, primBottom: pr ? Math.round(pr.getBoundingClientRect().bottom) : null,
    firstTop: fc ? Math.round(fc.getBoundingClientRect().top) : null, firstBottom: fc ? Math.round(fc.getBoundingClientRect().bottom) : null,
    overlaps: overlapList, clipped: clippedList, small: smallList, smallTaps: taps };
}

// Open a screen by its SCREENS key (a real tap on the bar where there is one); returns the list of [name, spec-extra] views to measure.
async function views(p, key, S) {
  const out = [], spec = S[key], m = async (name) => { await p.waitForTimeout(600); out.push({ name, m: await p.evaluate(measure, spec) }); };
  const go = tab => p.evaluate(t => game.registry.get('ui').go(t), tab);
  if (key === 'results') { for (const k of ['rich', 'seven', 'animalbadge', 'plain', 'crash', 'first', 'school']) { await showVariant(p, k); await m(`results/${k}`); } }
  else if (key === 'home') { await go('fly'); await m('home');
    // R3: a free part waiting is a lead row with its lesson picture and a locked TAKE OFF: it must fit too (the 320x568 overflow was found by hand, not by this gate)
    await p.evaluate(() => { game.registry.get('save').freeUpgrade = true; game.registry.get('ui').go('fly'); }); await m('home/free part');
    await p.evaluate(() => { game.registry.get('save').freeUpgrade = false; game.registry.get('ui').go('fly'); }); }
  else if (key === 'missions') { await go('missions'); await m('missions'); }
  else if (key === 'boards') { await go('boards'); await m('boards'); }
  else if (key === 'hangar') { await go('hangar'); await p.waitForTimeout(1000);
    for (const tab of ['plane', 'systems', 'gadgets']) { await p.click(`#hFleet [data-ftab="${tab}"]`).catch(() => {}); await p.waitForTimeout(400); await m(`hangar/${tab}`); } }
  else if (key === 'nature') { await go('nature'); await p.waitForTimeout(800); await m('nature/as opened');
    for (const r of ['bush', 'woodland', 'mediterranean']) {
      await p.evaluate(r => { const ui = game.registry.get('ui'), w = ui.wild || ui.nature; const t = document.querySelector(`#wRegions [data-region="${r}"]`); if (t) t.click(); if (w) { w.bio = () => 100; w.openTiers = [1, 2, 3]; w.renderProjects && w.renderProjects(); } }, r);
      await m(`nature/${r} (tiers open)`); } }
  return out;
}

// Run `check(view, key, W, H) -> list of problem strings` over every declared screen at every size, then apply the
// enforce/pending rule (see src/screens.js). `which` is the enforce flag name ('fit' | 'overlap' | 'taps'). Returns { fails, notes }.
async function runGate({ which, check, url, chrome }) {
  const { SCREENS, VIEWPORTS } = await import('../src/screens.js');
  const b = await chromium.launch({ executablePath: chrome || process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], notes = []; const bad = {};   // bad[screen] = list of problems seen (all sizes)
  let measured = 0;
  for (const [W, H] of VIEWPORTS) {
    const p = await openPage(b, W, H, url);
    for (const key of Object.keys(SCREENS)) {
      const vs = await views(p, key, SCREENS);
      for (const v of vs) { measured += v.m.boxes; for (const pr of check(v.m, SCREENS[key], W, H)) (bad[key] = bad[key] || []).push(`${W}x${H} ${v.name}: ${pr}`); }
      if (!vs.length) fails.push(`${W}x${H} ${key}: no view could be opened`);
    }
    if (p.errs.length) fails.push(`${W}x${H} page errors: ${p.errs.slice(0, 2)}`);
    await p.close();
  }
  await b.close();
  if (measured < 200) fails.push(`only ${measured} boxes were measured: the screens were not really rendered, this proves nothing`);
  for (const [key, s] of Object.entries(SCREENS)) {
    const list = bad[key] || [], on = s.enforce[which];
    if (on && list.length) fails.push(`${key} (${which}) is ENFORCED and violated:\n     ${list.slice(0, 6).join('\n     ')}`);
    else if (!on && !list.length) fails.push(`${key} (${which}) is PENDING (until ${s.from}) but now passes: set enforce.${which} = true in src/screens.js`);
    else if (!on) notes.push(`${key} (${which}) pending until ${s.from}: red on purpose (${list.length} problems, e.g. ${list[0]})`);
  }
  return { fails, notes };
}
module.exports = { openPage, showVariant, measure, views, runGate, MISSIONS7 };
