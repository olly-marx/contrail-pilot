// A rails step keeps its target where a finger can reach it (tour.js keepVisible), even when nothing in the normal rails run
// happens to need it (the plant sweep, 2026-11-02: after the redesign no onrails step put a target in the danger bands, so
// removing keepVisible changed nothing there). Deterministic, at 375x667:
//   A. HANGAR: a row placed BEHIND the bottom tab bar (on screen, so the step's own scrollIntoView does not fire): a step on it
//      must bring it above the bar;
//   B. NATURE: a project row scrolled UNDER the pinned land: a step on it must uncover it.
// Run at 375x667 AND 320x568: at 320x568 the pinned block's bottom is past the middle of the screen, so a rails step that only aimed for
// the middle (the old code) left the FREE! button covered (onrails320 N3-N5; diagnosed 2026-11-03).
// Run: python3 -m http.server 8000 & node tests/keepvisible.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  for (const [W, H] of [[375, 667], [320, 568]]) {
  const check = (c, m) => { if (!c) fails.push(`${W}x${H}: ${m}`); };
  const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(800);
  await p.click('#startChoice [data-area="weurope"]').catch(() => {}); await p.click('#startChoice [data-city]').catch(() => {}); await p.waitForTimeout(1200);
  await p.evaluate(() => { const s = game.registry.get('save'); Object.assign(s, { tutorialDone: true, freeGiven: true, freeUpgrade: false, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], seeds: 999,
    tours: ['hangar', 'name', 'r-boards', 'r-bonus', 'r-free', 'r-nature', 'r-parcels', 'r-res1', 'r-res2', 'r-school', 'r-systems', 'r-takeoff1', 'r-takeoff2', 'r-payoff'] });
    const ui = game.registry.get('ui'); ui.tour.busy = false; ui.go('hangar'); });
  await p.waitForTimeout(1200);
  // Put `sel`'s element in a band (A: its bottom behind the tab bar; B: its middle under NATURE's pinned block), then run one step on it.
  const run = (sel, band) => p.evaluate(async ({ sel, band }) => {
    const t = document.querySelector(sel), ov = t.closest('.overlay'), bar = document.querySelector('.tabbar:not([hidden])').getBoundingClientRect();
    if (band === 'bar') ov.scrollTop += t.getBoundingClientRect().bottom - (bar.top + Math.min(20, bar.height / 2));   // bottom 20 px behind the bar, top above it
    else {   // B: make the pinned land reach PAST the middle of the visible band (as it does in the real rails: measured at 320x568, its bottom was 299 against a middle of 254), room to scroll, then put the row's top in the middle of the pinned land
      const pe = document.querySelector('.wpin'), mid = (12 + (bar.top - 12)) / 2, need = mid + 40 - pe.getBoundingClientRect().top;
      if (pe.getBoundingClientRect().height < need) pe.style.minHeight = `${need}px`;
      document.querySelector('#nature .panel').style.paddingBottom = '700px'; await new Promise(r => setTimeout(r, 100));
      const pin = pe.getBoundingClientRect(); ov.scrollTop += t.getBoundingClientRect().top - (pin.top + pin.height / 2); }
    await new Promise(r => setTimeout(r, 200));
    const r0 = t.getBoundingClientRect();
    const before = band === 'bar' ? r0.bottom > bar.top && r0.bottom <= innerHeight : (() => { const e = document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2); return !!e && !t.contains(e) && e !== t; })();
    const ui = game.registry.get('ui'); ui.tour.run('kv-test', [{ target: sel, text: 'test', ok: true, tap: true }]);   // (tap: true keeps the target tappable: since R1 an OK-only step makes its target pointer-events:none, and the check below hit-tests the row)
    await new Promise(r => setTimeout(r, 900));
    const r1 = t.getBoundingClientRect(), barTop = document.querySelector('.tabbar:not([hidden])').getBoundingClientRect().top;
    const after = band === 'bar' ? r1.bottom <= barTop + 1 && r1.top >= 0 : (() => { const e = document.elementsFromPoint(r1.left + r1.width / 2, r1.top + r1.height / 2).find(x => !x.closest('#tour')); return !!e && (e === t || t.contains(e)); })();
    const ok = document.querySelector('#tour .tbubble .btn'); if (ok) ok.click();
    await new Promise(r => setTimeout(r, 400));
    return { before, after, r0: [Math.round(r0.top), Math.round(r0.bottom)], r1: [Math.round(r1.top), Math.round(r1.bottom)], barTop: Math.round(barTop) };
  }, { sel, band });
  const rowSel = await p.evaluate(() => { const r = [...document.querySelectorAll('#hFleet .rowc[data-row]')].pop(); return r ? `#hFleet .rowc[data-row="${r.dataset.row}"] .rowc-tap` : null; });
  check(!!rowSel, 'a hangar row to test with');
  if (rowSel) { const a = await run(rowSel, 'bar');
    check(a.before, `A: the test put the row behind the tab bar first (else it proves nothing): ${JSON.stringify(a)}`);
    check(a.after, `A: a rails step brings a row from behind the tab bar to above it: ${JSON.stringify(a)}`); }
  await p.evaluate(() => { const ui = game.registry.get('ui'); ui.go('nature'); ui.wild.bio = () => 100; ui.wild.openTiers = [1, 2, 3]; ui.wild.renderProjects(); });
  await p.waitForTimeout(900);
  const projSel = await p.evaluate(() => { const r = [...document.querySelectorAll('#wProjects .project[data-pline]')][3]; return r ? `#wProjects .project[data-pline="${r.dataset.pline}"] .rowc-tap` : null; });
  check(!!projSel, 'a NATURE row to test with');
  if (projSel) { const c = await run(projSel, 'pin');
    check(c.before, `B: the test put the row under the pinned land first (else it proves nothing): ${JSON.stringify(c)}`);
    check(c.after, `B: a rails step uncovers a row from under the pinned land: ${JSON.stringify(c)}`); }
  check(!errs.length, `page errors ${errs}`);
  await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL keepvisible:\n - ${fails.join('\n - ')}` : 'PASS keepvisible: at 375x667 and 320x568 a rails step brings a row out from behind the tab bar and from under the pinned land');
  process.exit(fails.length ? 1 : 0);
})();
