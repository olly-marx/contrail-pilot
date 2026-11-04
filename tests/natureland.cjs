// The NATURE land nav (the user, 2026-11-04: "the tab row and swiping the picture were unclear"), real taps: a title row with the land's name and "n / m",
// 40 px arrows and one dot per OPENED land (a locked land is not shown), a tap alternative to swiping; a first visit says "swipe or tap the arrows" once;
// a dot on an arrow when another land has news. Run: python3 -m http.server 8000 & node tests/natureland.cjs   (plants: tools/plants.tsv, test `natureland`)
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const tap = (p, sel) => p.click(sel, { timeout: 3000 }).catch(() => fails.push(`cannot tap ${sel} (it is missing or hidden)`));   // a missing arrow is a clean failure, not a 30 s crash
  const T = ['hangar', 'name', 'r-boards', 'r-bonus', 'r-free', 'r-nature', 'r-parcels', 'r-res1', 'r-res2', 'r-school', 'r-systems', 'r-takeoff1', 'r-takeoff2', 'nature-lead', 'nature'];   // every other hint done (the rails stay out of the way); NOT 'nature-swipe'
  const mk = async (vw, vh, extra) => {
    const p = await b.newPage({ viewport: { width: vw, height: vh } }); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(x => { if (sessionStorage.i) return; sessionStorage.i = 1; localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'],
      flights: 30, landings: 9, seeds: 5, crystals: 0, flightSeconds: 1500, priceVersion: 2, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, ...x })); }, extra);
    await p.goto(URL); await ready(p); await p.waitForTimeout(500);
    return p;
  };
  const S = p => p.evaluate(() => { const q = x => document.querySelector(x), vis = e => !!e && !e.hidden && e.getBoundingClientRect().width > 0, r = e => e.getBoundingClientRect();
    return { name: (q('#wLandName') || {}).textContent || '', dots: [...document.querySelectorAll('#wRegions [data-region]')].map(d => d.dataset.region), on: (q('#wRegions .on') || {}).dataset?.region,
      prev: vis(q('#wPrevLand')), next: vis(q('#wNextLand')), prevOff: q('#wPrevLand').disabled, nextOff: q('#wNextLand').disabled, prevW: Math.round(r(q('#wPrevLand')).width), prevH: Math.round(r(q('#wPrevLand')).height),
      locked: document.querySelectorAll('#wRegions [disabled]').length, hint: vis(q('#wLandHint')) ? q('#wLandHint').textContent : '', ghost: q('#wScene').classList.contains('hint-swipe'),
      dotNext: !!q('#wNextLand .dot'), dotPrev: !!q('#wPrevLand .dot'), tours: (JSON.parse(localStorage.getItem('contrailPilot.v2')) || {}).tours }; });

  // 1. One land: no arrows, no dots, just the name.
  let p = await mk(390, 667, { tours: [] });
  await p.click('#tabNature'); await p.waitForTimeout(500);
  let s = await S(p);
  check(!s.prev && !s.next && s.name.trim() === 'Temperate woodland' && s.hint === '', `one land open: a title, no arrows, no hint: ${JSON.stringify(s)}`);
  await p.close();

  // 2. Three lands, a first visit (tours without 'nature-swipe'), 390x667 AND 320x568.
  for (const [W, H] of [[390, 667], [320, 568]]) {
    p = await mk(W, H, { tours: T, discovered: { mediterranean: 1, desert: 1 } });
    await p.click('#tabNature'); await p.waitForTimeout(600);
    s = await S(p);
    check(/Temperate woodland/.test(s.name) && /1 \/ 3/.test(s.name), `${W}: the title shows the land and its place ("${s.name.trim()}")`);
    check(s.prev && s.next && s.prevW >= 40 && s.prevH >= 40, `${W}: two arrows, at least 40 px (${s.prevW}x${s.prevH})`);
    check(s.prevOff && !s.nextOff, `${W}: the first land has no previous (prev disabled ${s.prevOff}, next disabled ${s.nextOff})`);
    check(s.dots.length === 3 && s.locked === 0 && !s.dots.includes('savanna'), `${W}: one dot per OPENED land, none for the locked ones: ${s.dots}`);
    check(/Swipe the picture or tap the arrows/.test(s.hint) && s.ghost, `${W}: the first visit says swipe or tap, and the picture shows it (${JSON.stringify({ h: s.hint, g: s.ghost })})`);
    check((s.tours || []).includes('nature-swipe'), `${W}: the hint is recorded as seen: ${s.tours}`);
    await tap(p, '#wNextLand'); await p.waitForTimeout(500);
    s = await S(p);
    check(/2 \/ 3/.test(s.name) && s.on === s.dots[1] && !s.prevOff && s.hint === '', `${W}: tapping the next arrow opens the next land and the hint goes (${s.name.trim()})`);
    await tap(p, '#wNextLand'); await p.waitForTimeout(500);
    s = await S(p);
    check(/3 \/ 3/.test(s.name) && s.nextOff, `${W}: the last land has no next (${s.name.trim()}, next disabled ${s.nextOff})`);
    await tap(p, '#wPrevLand'); await p.waitForTimeout(400); await tap(p, `#wRegions [data-region="${s.dots[0]}"]`); await p.waitForTimeout(400);
    s = await S(p);
    check(/1 \/ 3/.test(s.name), `${W}: a tap on a dot goes straight to that land (${s.name.trim()})`);
    // a second visit: no hint again
    await p.evaluate(() => { const ui = game.registry.get('ui'); ui.go('fly'); ui.go('nature'); }); await p.waitForTimeout(500);
    s = await S(p);
    check(s.hint === '' && !s.ghost, `${W}: the hint is for the first visit only (${JSON.stringify({ h: s.hint, g: s.ghost })})`);
    check(p.errs.length === 0, `${W}: page errors: ${p.errs.join(' | ')}`);
    await p.close();
  }

  // 3. A land discovered later: a dot on the arrow that leads to it, gone once it is visited.
  p = await mk(390, 667, { tours: ['*'], discovered: { mediterranean: 1 }, seeds: 5 });
  await p.click('#tabNature'); await p.waitForTimeout(500);
  await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.discovered.desert = 1; ui.save.seeds = 5000; ui.save.crystals = 500; ui.go('fly'); ui.go('nature'); }); await p.waitForTimeout(500);
  s = await S(p);
  check(s.dots.length === 3, `a third land is open (${s.dots})`);
  check(s.dotNext && !s.dotPrev, `the NEW land has a dot on the arrow that leads to it (next ${s.dotNext}, prev ${s.dotPrev})`);
  await tap(p, '#wNextLand'); await p.waitForTimeout(400); await tap(p, '#wNextLand'); await p.waitForTimeout(400);
  await p.evaluate(() => { const ui = game.registry.get('ui'); ui.go('fly'); ui.go('nature'); }); await p.waitForTimeout(500);
  s = await S(p);
  check(!s.dotNext && !s.dotPrev, `once the land has been visited the arrow dots are gone (${JSON.stringify({ n: s.dotNext, p: s.dotPrev })})`);
  check(p.errs.length === 0, `page errors: ${p.errs.join(' | ')}`);
  await p.close(); await b.close();
  if (fails.length) { console.log('FAIL natureland\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS natureland: a title with n / m, 40 px arrows, a dot per opened land, a first-visit hint once, a dot on the arrow for a new land');
})();
