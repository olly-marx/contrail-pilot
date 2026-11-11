// The pixel font is drawn for multiples of 8 px. At 7 px the B of 'Bronze' on a locked badge card lost a row and read 'Dronze' (the user, 2026-11-10; style.css .badge2).
// The user's decision (2026-11-11), applied by the Coordinator after the measurement: the text on the BADGE CARDS goes to 8 px on phones WIDER THAN 340 px only; a 320 phone stays exactly as it was ('Dronze' stays there: at 8 px 'Bumpy Ride' spilled 7 px and 'Globetrotter' 15 px);
// the TAB BAR stays as it was (7 px, 6 px on a 320 phone: 'DOARDS' stays on small phones, no rename; at 8 px MISSIONS collided with HANGAR).
// The overflow rule: a card may spill no more than it does on main (the old CSS, put back here as a style tag for the baseline) plus 2 px; an 8 px size must not make cards spill that did not.
// Real page, 390x844 and 320x568, season 2, BOARDS > BADGES (a real tap on the sub-tab). Checks, in order:
//  FIXTURE: the BADGES page shows badge cards and the tab bar shows at least 5 tabs.
//  1. above 340 px wide the badge text under the name (.badge2 span, where a locked card says 'Bronze: ...') is drawn at 8 px; at 340 px or less it is unchanged (7 px); a locked many-tier card does read 'Bronze: ...'.
//  2. the badge names (.badge2 b) are not drawn smaller than 7 px.
//  3. no card spills more than on main by more than 2 px (per card name).
//  4. the tab bar is unchanged: 7 px at 390, 6 px at 320 (pinned only so the card change cannot drag it along).
// Screenshots go to $SHOTS, default <tmpdir>/badgefont-shots (skipped, not failed, when the directory cannot be made). Run: python3 -m http.server 8000 & node tests/badgefont.cjs   (plants: tools/plants.tsv, test badgefont)
const { chromium } = require('playwright-core');
const fs = require('fs');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const os = require('os'), path = require('path');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'badgefont-shots');   // (not under /home: a CI runner has no such directory; the branch run found it, 2026-11-11)
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  let shotsOk = true; try { fs.mkdirSync(SHOTS, { recursive: true }); } catch (e) { shotsOk = false; console.log(`NOTE: screenshots off, cannot make ${SHOTS}: ${e.code || e}`); }   // (a screenshot is a courtesy: never a failure)
  const shot = (p, name) => (shotsOk ? p.screenshot({ path: `${SHOTS}/${name}` }).catch(() => {}) : Promise.resolve());
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  check(!!process.env.SHOTS || !SHOTS.startsWith('/home/'), `THE SCREENSHOTS DIRECTORY: the default (${SHOTS}) is not under /home: a CI runner has no such directory (the branch run of 0.54.0 failed with EACCES on it)`);
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
          const cardsNow = () => [...document.querySelectorAll('.badge2')].filter(vis).map(e => { const l = e.querySelector('b'), sp = e.querySelector('span'); return { got: e.classList.contains('got'), name: l ? l.textContent.trim() : '', bfs: l ? parseFloat(getComputedStyle(l).fontSize) : 0, text: sp ? sp.textContent.trim() : '', sfs: sp ? parseFloat(getComputedStyle(sp).fontSize) : 0, spill: Math.max(0, Math.max(l ? l.scrollWidth : 0, sp ? sp.scrollWidth : 0, e.scrollWidth) - e.clientWidth), cw: e.clientWidth }; });
          const tabs = [...document.querySelectorAll('#tabbar .tab')].filter(vis).map(e => ({ t: (e.innerText || e.textContent).trim(), fs: parseFloat(getComputedStyle(e).fontSize) }));
          const cards = cardsNow();
          // the baseline: the old badge CSS (main 2f6f7a3) put back on top, measured, taken off again
          const st = document.createElement('style'); st.textContent = '.badge2 { font-size: 7px !important; } .badge2 b { font-size: 7px !important; } .badge-grid { grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)) !important; }'; document.head.appendChild(st);
          const base = Object.fromEntries(cardsNow().map(c => [c.name, c.spill])); st.remove();
          return { tabs, cards, base };
        });
        check(m.tabs.length >= 5 && m.cards.length > 0, `${tag}: FIXTURE: BOARDS shows badge cards and at least 5 tabs (tabs ${m.tabs.length}, cards ${m.cards.length})`);
        if (fails.length) { await shot(p, `${tag}-fixture-red.png`); await ctx.close(); continue; }
        const wideScreen = W > 340, textNow = [...new Set(m.cards.map(x => x.sfs))], bronze = m.cards.find(x => !x.got && /^Bronze:/.test(x.text));
        if (wideScreen) check(textNow.length === 1 && textNow[0] === 8, `${tag}: above 340 px wide the badge text (.badge2 span, 'Bronze: ...') is drawn at 8 px: ${JSON.stringify(textNow)}`);
        else check(textNow.length === 1 && textNow[0] === 7, `${tag}: at 320 the badge text is unchanged, 7 px: ${JSON.stringify(textNow)}`);
        check(!!bronze, `${tag}: a locked many-tier badge card reads 'Bronze: ...': ${JSON.stringify(m.cards.filter(x => !x.got).slice(0, 3).map(x => x.text.slice(0, 24)))}`);
        const smallB = m.cards.filter(x => x.bfs < 7);
        check(smallB.length === 0, `${tag}: the badge names (.badge2 b) are not drawn smaller than 7 px: ${JSON.stringify(smallB.slice(0, 3).map(x => [x.name, x.bfs]))}`);
        const worse = m.cards.filter(x => x.spill > (m.base[x.name] || 0) + 2);
        check(worse.length === 0, `${tag}: no card spills more than on main (+2 px): ${JSON.stringify(worse.slice(0, 4).map(x => [x.name, 'now', x.spill, 'main', m.base[x.name] || 0]))}`);
        const want = W <= 340 ? 6 : 7, tabsChanged = m.tabs.filter(x => x.fs !== want);
        check(tabsChanged.length === 0, `${tag}: the tab bar is unchanged (${want} px): ${JSON.stringify(tabsChanged.map(x => [x.t, x.fs]))}`);
        console.log(`MEASURE ${tag}: ${m.cards.length} cards, names at ${[...new Set(m.cards.map(x => x.bfs))]} px, text at ${[...new Set(m.cards.map(x => x.sfs))]} px, spill now ${JSON.stringify(m.cards.filter(x => x.spill > 0).map(x => [x.name, x.spill]))} / on main ${JSON.stringify(Object.entries(m.base).filter(([, v]) => v > 0))}; tabs at ${[...new Set(m.tabs.map(x => x.fs))]} px`);
        await shot(p, `${tag}-boards.png`);
        await p.evaluate(() => { const g = document.querySelector('.badge-grid'); if (g) g.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300);
        await shot(p, `${tag}-badge-grid.png`);
      } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); await shot(p, `${tag}-exception.png`); }
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL badgefont:\n - ${fails.join('\n - ')}` : 'PASS badgefont: the badge text is 8 px above 340 px wide and unchanged at 320, a locked card reads Bronze, no card spills more than on main, the tab bar is unchanged');
  process.exit(fails.length ? 1 : 0);
})();
