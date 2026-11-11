// The pixel font is drawn for multiples of 8 px. At 7 px the B of 'Bronze' on a locked badge card lost a row and read 'Dronze' (the user, 2026-11-10; style.css .badge2).
// The user's decision (2026-11-11): the BADGE CARDS go to 8 px; the TAB BAR stays as it was (7 px, 6 px on a 320 phone: 'DOARDS' stays on small phones, no rename; at 8 px MISSIONS collided with HANGAR).
// Real page, 390x844 and 320x568, season 2, BOARDS > BADGES (a real tap on the sub-tab). Checks, in order:
//  FIXTURE: the BADGES page shows badge cards and the tab bar shows at least 5 tabs.
//  1. the badge names (.badge2 b) are drawn at 8 px or more.
//  2. the badge text under them (.badge2 span, where a locked card says 'Bronze: ...') is drawn at 8 px or more, and a locked many-tier card does read 'Bronze: ...'.
//  3. no card's content is wider than the card (names, text).
//  4. the tab bar is unchanged: 7 px at 390, 6 px at 320 (pinned only so the card change cannot drag it along).
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
          const tabs = [...document.querySelectorAll('#tabbar .tab')].filter(vis).map(e => ({ t: (e.innerText || e.textContent).trim(), fs: parseFloat(getComputedStyle(e).fontSize) }));
          const cards = [...document.querySelectorAll('.badge2')].filter(vis).map(e => { const l = e.querySelector('b'), sp = e.querySelector('span'); return { got: e.classList.contains('got'), name: l ? l.textContent.trim() : '', bfs: l ? parseFloat(getComputedStyle(l).fontSize) : 0, text: sp ? sp.textContent.trim() : '', sfs: sp ? parseFloat(getComputedStyle(sp).fontSize) : 0, over: Math.max(l ? l.scrollWidth : 0, sp ? sp.scrollWidth : 0, e.scrollWidth) - e.clientWidth, cw: e.clientWidth }; });
          return { tabs, cards };
        });
        check(m.tabs.length >= 5 && m.cards.length > 0, `${tag}: FIXTURE: BOARDS shows badge cards and at least 5 tabs (tabs ${m.tabs.length}, cards ${m.cards.length})`);
        if (fails.length) { await p.screenshot({ path: `${SHOTS}/${tag}-fixture-red.png` }); await ctx.close(); continue; }
        const smallB = m.cards.filter(x => x.bfs < 8), smallS = m.cards.filter(x => x.sfs < 8);
        check(smallB.length === 0, `${tag}: the badge names (.badge2 b) are drawn at 8 px or more: ${JSON.stringify(smallB.slice(0, 3).map(x => [x.name, x.bfs]))}`);
        const bronze = m.cards.find(x => !x.got && /^Bronze:/.test(x.text));
        check(smallS.length === 0, `${tag}: the badge text (.badge2 span, 'Bronze: ...') is drawn at 8 px or more: ${JSON.stringify(smallS.slice(0, 3).map(x => [x.text.slice(0, 20), x.sfs]))}`);
        check(!!bronze, `${tag}: a locked many-tier badge card reads 'Bronze: ...': ${JSON.stringify(m.cards.filter(x => !x.got).slice(0, 3).map(x => x.text.slice(0, 24)))}`);
        const wide = m.cards.filter(x => x.over > 0);
        check(wide.length === 0, `${tag}: no badge card's content is wider than the card: ${JSON.stringify(wide.slice(0, 4).map(x => [x.name, x.over, x.cw]))}`);
        const want = W <= 340 ? 6 : 7, tabsChanged = m.tabs.filter(x => x.fs !== want);
        check(tabsChanged.length === 0, `${tag}: the tab bar is unchanged (${want} px): ${JSON.stringify(tabsChanged.map(x => [x.t, x.fs]))}`);
        console.log(`MEASURE ${tag}: ${m.cards.length} cards, names at ${[...new Set(m.cards.map(x => x.bfs))]} px, text at ${[...new Set(m.cards.map(x => x.sfs))]} px, widest overflow ${Math.max(...m.cards.map(x => x.over))} px (card width ${m.cards[0].cw}); tabs at ${[...new Set(m.tabs.map(x => x.fs))]} px; first locked: ${JSON.stringify(m.cards.filter(x => !x.got).slice(0, 2).map(x => [x.name, x.text.slice(0, 40)]))}`);
        await p.screenshot({ path: `${SHOTS}/${tag}-boards.png` });
        await p.evaluate(() => { const g = document.querySelector('.badge-grid'); if (g) g.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300);
        await p.screenshot({ path: `${SHOTS}/${tag}-badge-grid.png` });
      } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); await p.screenshot({ path: `${SHOTS}/${tag}-exception.png` }).catch(() => {}); }
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL badgefont:\n - ${fails.join('\n - ')}` : 'PASS badgefont: the badge names and texts are drawn at 8 px, a locked card reads Bronze, nothing overflows, the tab bar is unchanged (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
