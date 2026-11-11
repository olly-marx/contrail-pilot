// The pixel font is drawn for multiples of 8 px. At 7 px (and 6 px on a 320 phone) the B of 'Bronze' / 'BOARDS' lost a row and read 'Dronze' / 'DOARDS' (the user, 2026-11-10; style.css .badge2, .tab).
// Real page, 390x844 and 320x568, season 2, a save with every tab and the badge cards showing. Checks, in order:
//  FIXTURE: the BOARDS screen has badge cards and the tab bar shows at least 5 tabs.
//  1. the computed font-size of the badge labels (.badge2 b) and of every tab is at least 8 px (a 7 px or 6 px size cannot come back silently).
//  2. no tab's text is wider than its tab (scrollWidth <= clientWidth + 1): the bigger size must not spill at this width.
//  3. no badge label is wider than its card.
// Screenshots go to ~/contrail-research/badgefont-shots/. Run: python3 -m http.server 8000 & node tests/badgefont.cjs   (plants: tools/plants.tsv, test badgefont)
const { chromium } = require('playwright-core');
const fs = require('fs');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const SHOTS = process.env.SHOTS || '/home/ojm/contrail-research/badgefont-shots';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
      let stage = 'load';
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(800);
        stage = 'open BOARDS, then the BADGES sub-tab (a real tap; src/recordsui.js subtabs: RECORDS / BADGES)'; await p.evaluate(() => game.registry.get('ui').go('boards')); await p.waitForTimeout(900);
        await p.click('#bSubtabs [data-btab="badges"]'); await p.waitForTimeout(500);
        const m = await p.evaluate(() => {
          const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return !e.hidden && cs.display !== 'none' && r.width > 0 && r.height > 0; };
          const tabs = [...document.querySelectorAll('#tabbar .tab')].filter(vis).map(e => ({ t: e.innerText.trim() || e.textContent.trim(), fs: parseFloat(getComputedStyle(e).fontSize), sw: e.scrollWidth, cw: e.clientWidth, spanOver: [...e.querySelectorAll('span')].some(s => s.scrollWidth > s.clientWidth + 1) }));
          const cards = [...document.querySelectorAll('.badge2')].filter(vis).map(e => { const l = e.querySelector('b'); return { t: l ? l.textContent.trim() : '', fs: l ? parseFloat(getComputedStyle(l).fontSize) : 0, lw: l ? l.scrollWidth : 0, cw: e.clientWidth }; });
          return { tabs, cards };
        });
        check(m.tabs.length >= 5 && m.cards.length > 0, `${tag}: FIXTURE: BOARDS shows badge cards and at least 5 tabs (tabs ${m.tabs.length}, cards ${m.cards.length})`);
        if (fails.length) { await p.screenshot({ path: `${SHOTS}/${tag}-fixture-red.png` }); await ctx.close(); continue; }
        const smallTabs = m.tabs.filter(x => x.fs < 8), smallCards = m.cards.filter(x => x.fs < 8);
        check(smallTabs.length === 0 && smallCards.length === 0, `${tag}: the tab and badge labels are drawn at 8 px or more: tabs ${JSON.stringify(smallTabs.map(x => [x.t, x.fs]))}, badge labels ${JSON.stringify(smallCards.slice(0, 3).map(x => [x.t, x.fs]))}`);
        const wideTabs = m.tabs.filter(x => x.sw > x.cw + 1 || x.spanOver);
        check(wideTabs.length === 0, `${tag}: no tab text is wider than its tab: ${JSON.stringify(wideTabs.map(x => [x.t, x.sw, x.cw]))}`);
        const wideCards = m.cards.filter(x => x.lw > x.cw);
        check(wideCards.length === 0, `${tag}: no badge label is wider than its card: ${JSON.stringify(wideCards.slice(0, 4).map(x => [x.t, x.lw, x.cw]))}`);
        console.log(`MEASURE ${tag}: tabs ${JSON.stringify(m.tabs.map(x => [x.t, x.fs, x.sw, x.cw]))}; badge labels widest ${JSON.stringify(m.cards.slice().sort((a, b) => b.lw - a.lw).slice(0, 3).map(x => [x.t, x.fs, x.lw, x.cw]))}`);
        await p.screenshot({ path: `${SHOTS}/${tag}-boards.png` });
        await p.evaluate(() => { const g = document.querySelector('.badge-grid'); if (g) g.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300);
        await p.screenshot({ path: `${SHOTS}/${tag}-badge-grid.png` });
      } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); await p.screenshot({ path: `${SHOTS}/${tag}-exception.png` }).catch(() => {}); }
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL badgefont:\n - ${fails.join('\n - ')}` : 'PASS badgefont: the tab bar and the badge labels are drawn at 8 px and fit their tabs and cards (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
