// "+N MORE" OPENS EVERY NEW THING AS PICTURE CARDS, AND SEE IT IN NATURE LANDS ON THAT ANIMAL (the owner, 2026-11-18). src/ui.js showResults (chipPic, allSheet,
// chipSheet, natureOn), src/wild.js (speciesLand, WildScreen.showSpecies), style.css (.rc-grid, .rc-gcard, .w-card.w-spot). The summary card keeps its chips and
// its "+N" chip (tests/chipsfit.cjs); the "+N" chip now opens a grid pop-up of EVERY new thing of the flight (animal portraits, badge medals, a star for a first)
// with the name under each; a card opens that thing's own sheet; OK there returns to the grid; SEE IT IN NATURE opens NATURE on the animal's own land, its card
// in the found grid scrolled into view and lit, its info open. A synthetic result (5 new animals, 4 from the UK and the guanaco from Patagonia, + a badge + a first)
// goes through ui.showResults at 320x568 and 390x844 (the shipped game: tests/lib/shipped.js). Named lines, in order:
//   FIXTURE  the chip row opens with a "+N" chip
//   1. "+N" opens a grid with ALL the new things (7 cards: 5 animals, the badge, the first), each with its picture (img, or the star) and its full name
//   2. every card is a real tap (>= 44 x 44 px) and inside the screen; the pop-up does not overflow the screen
//   3. tapping the guanaco's card opens its sheet (NEW ANIMAL, Guanaco, SEE IT IN NATURE)
//   4. OK on that sheet returns to the grid
//   5. tapping the badge card opens the badge's sheet (NEW BADGE, no nature button)
//   6. SEE IT IN NATURE (guanaco): NATURE shows Patagonia (the steppe), the guanaco's card is lit and on screen, its info is open and names it
//   7. the light goes after the info is closed
//   8. a flight with 14 new animals: the grid scrolls inside the pop-up (at 320x568; at 390x844 all 14 fit), which still fits the screen, and every card is >= 44 px
//   9. an animal two open lands list opens on its OWN land: the red panda (WILDLIFE region eastasia, also listed in monsoon, which comes first) opens East Asia
// Env: SHOTS=<prefix> also saves screenshots (deviceScaleFactor 2) of the card, the grid and the nature landing (<prefix>-*.png at 390x844, <prefix>-320-*.png at 320x568).
// Run: python3 -m http.server 8000 & node tests/morechips.cjs   (plants: tools/plants.tsv, test morechips)
require('./lib/shipped.js');
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const found = { rabbit: 1, hedgehog: 1, fox: 1, deer: 1, guanaco: 1 };
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'WARSAW', city: 'WARSAW', visited: ['WARSAW'], discovered: { steppe: true, monsoon: true, eastasia: true }, found: { ...found, redpanda: 1 }, tutorialDone: true, muted: true, priceVersion: 2,
  seenTips: ['x-bars'], tours: ['*'], freeGiven: true, freeProjectGiven: true, freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'],
  fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
const RES = { landed: true, landedAt: 'PARIS', distance: 900, earned: [{ label: 'Seeds', n: 20 }], rewards: [{ kind: 'badge', id: 'longhaul', tier: 1, label: 'Long Haul', seeds: 10, crystals: 1 }],
  breakdown: { co2: 0, night: 0, sun: 0, trees: 0 }, heat: 0, crystals: 0, foundIds: Object.keys(found), missions2: { done: ['Birds 1, plane 0. Fly over or under them next time!'], next: null }, school: false };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [];
  try {
    for (const [W, H] of [[320, 568], [390, 844]]) {
      const tag = `${W}x${H}`, check = (c, m) => { if (!c) fails.push(`${tag}: ${m}`); };
      const shots = process.env.SHOTS ? `${process.env.SHOTS}${W === 390 ? '' : `-${W}`}` : '';
      const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: shots ? 2 : 1 }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(800);
        await p.evaluate(r => { const ui = game.registry.get('ui'); ui.tour.busy = true; ui.showResults(r); setTimeout(() => { ui.skipReveal = true; }, 60); }, RES);
        await p.waitForFunction(() => { const e = document.getElementById('rChips'); return e && !e.hidden && e.querySelector('[data-more]'); }, null, { timeout: 8000 }).catch(() => {});
        await p.waitForTimeout(1500);
        const more = await p.$('#rChips [data-more]');
        check(!!more, 'FIXTURE: the chip row opens with a "+N" chip');
        if (!more) throw new Error('no +N chip');
        if (shots) await p.screenshot({ path: `${shots}-card.png` });
        await more.click(); await p.waitForTimeout(300);
        const grid = () => p.evaluate(() => { const sh = document.getElementById('sheet'), g = sh && sh.querySelector('.rc-grid'); if (!g) return null; const box = sh.querySelector('.sheet').getBoundingClientRect();
          return { sheet: { top: box.top, bottom: box.bottom, left: box.left, right: box.right }, cards: [...g.querySelectorAll('.rc-gcard')].map(c => { const q = c.getBoundingClientRect();
            return { kind: c.dataset.kind, name: c.querySelector('span').textContent, pic: !!c.querySelector('img[src]:not([src=""]), .rc-star'), w: Math.round(q.width), h: Math.round(q.height), inside: q.left >= 0 && q.right <= innerWidth && q.top >= 0 && q.bottom <= innerHeight }; }) }; });
        const g = await grid();
        log.push(`${tag} grid ${JSON.stringify(g)}`);
        const names = g ? g.cards.map(c => c.name) : [];
        check(g && g.cards.length === 7 && ['Rabbit', 'Hedgehog', 'Red fox', 'Red deer', 'Guanaco', 'Long Haul', 'Birds 1, plane 0'].every(n => names.includes(n)) && g.cards.filter(c => c.kind === 'animal').length === 5
          && g.cards.some(c => c.kind === 'badge') && g.cards.some(c => c.kind === 'first') && g.cards.every(c => c.pic), `1. "+N" opens a grid of all 7 new things, each with its picture and name: ${JSON.stringify(g)}`);
        check(g && g.cards.every(c => c.w >= 44 && c.h >= 44 && c.inside) && g.sheet.top >= 0 && g.sheet.bottom <= H && g.sheet.left >= 0 && g.sheet.right <= W, `2. every card is a >= 44 px tap inside the screen, the pop-up fits: ${JSON.stringify(g)}`);
        if (shots) await p.screenshot({ path: `${shots}-grid.png` });
        const sheetOf = () => p.evaluate(() => { const sh = document.getElementById('sheet'); return sh ? { eyebrow: (sh.querySelector('.eyebrow') || {}).textContent, title: sh.querySelector('.sheet-title').textContent, action: (sh.querySelector('.sheet-action') || {}).textContent || '', grid: !!sh.querySelector('.rc-grid') } : null; });
        await p.click('#sheet .rc-gcard[data-kind="animal"]:has-text("Guanaco")'); await p.waitForTimeout(200);
        const s1 = await sheetOf();
        check(s1 && s1.eyebrow === 'NEW ANIMAL' && s1.title === 'Guanaco' && s1.action === 'SEE IT IN NATURE', `3. the guanaco's card opens its sheet: ${JSON.stringify(s1)}`);
        await p.click('#sheet .sheet-ok'); await p.waitForTimeout(200);
        const s2 = await sheetOf();
        check(s2 && s2.grid, `4. OK returns to the grid: ${JSON.stringify(s2)}`);
        await p.click('#sheet .rc-gcard[data-kind="badge"]'); await p.waitForTimeout(200);
        const s3 = await sheetOf();
        check(s3 && s3.eyebrow === 'NEW BADGE' && s3.title === 'Long Haul' && !s3.action, `5. the badge's card opens the badge's sheet: ${JSON.stringify(s3)}`);
        await p.click('#sheet .sheet-ok'); await p.waitForTimeout(200);
        await p.click('#sheet .rc-gcard[data-kind="animal"]:has-text("Guanaco")'); await p.waitForTimeout(200);
        await p.click('#sheet .sheet-action'); await p.waitForTimeout(500);
        const n = await p.evaluate(() => { const card = document.querySelector('#wFound [data-species="guanaco"]'), q = card && card.getBoundingClientRect(), info = document.getElementById('wInfo');
          return { nature: !document.getElementById('nature').hidden, land: game.registry.get('ui').wild.region, landName: document.getElementById('wLandName').textContent, sheet: !!document.getElementById('sheet'),
            lit: !!card && card.classList.contains('w-spot'), onScreen: !!q && q.bottom > 0 && q.top < innerHeight, info: !info.hidden, infoTitle: (info.querySelector('h2') || {}).textContent }; });
        log.push(`${tag} nature ${JSON.stringify(n)}`);
        check(n.nature && n.land === 'steppe' && !n.sheet && n.lit && n.onScreen && n.info && n.infoTitle === 'Guanaco', `6. SEE IT IN NATURE lands on the guanaco: its land, its card lit and on screen, its info open: ${JSON.stringify(n)}`);
        if (shots) { await p.screenshot({ path: `${shots}-nature-info.png` }); }
        await p.click('#wInfoClose'); await p.waitForTimeout(300);
        if (shots) await p.screenshot({ path: `${shots}-nature.png` });
        await p.waitForTimeout(1600);
        const off = await p.evaluate(() => !document.querySelector('#wFound .w-spot'));
        check(off, '7. the light goes after the info is closed');
        const rp = await p.evaluate(() => { const ui = game.registry.get('ui'); document.getElementById('wInfo').hidden = true; ui.natureOn('redpanda'); return { land: ui.wild.region, info: (document.querySelector('#wInfo h2') || {}).textContent }; });
        check(rp.land === 'eastasia' && rp.info === 'Red panda', `9. the red panda opens on its own land (eastasia), not the first land that lists it: ${JSON.stringify(rp)}`);
        await p.evaluate(() => { document.getElementById('wInfo').hidden = true; });
        const many = { ...RES, rewards: [], missions2: { done: [], next: null }, foundIds: ['rabbit', 'hedgehog', 'fox', 'deer', 'cow', 'sheep', 'guanaco', 'culpeo', 'sealion', 'uplandgoose', 'mara', 'magellanicpenguin', 'pudu', 'geoffroyscat'] };
        await p.evaluate(r => { const ui = game.registry.get('ui'); ui.showResults(r); setTimeout(() => { ui.skipReveal = true; }, 60); }, many);
        await p.waitForTimeout(2000);
        await p.click('#rChips [data-more]'); await p.waitForTimeout(300);
        const m = await p.evaluate(() => { const sh = document.querySelector('#sheet .sheet'), g = sh && sh.querySelector('.rc-grid'); if (!g) return null; const q = sh.getBoundingClientRect();
          return { n: g.querySelectorAll('.rc-gcard').length, top: q.top, bottom: q.bottom, scrolls: g.scrollHeight > g.clientHeight + 1, small: [...g.querySelectorAll('.rc-gcard')].filter(c => c.offsetWidth < 44 || c.offsetHeight < 44).length,
            ok: !!sh.querySelector('.sheet-ok') && sh.querySelector('.sheet-ok').getBoundingClientRect().bottom <= innerHeight }; });
        log.push(`${tag} many ${JSON.stringify(m)}`);
        check(m && m.n === 14 && m.top >= 0 && m.bottom <= H && (m.scrolls || W > 320) && !m.small && m.ok, `8. 14 new animals: the grid scrolls inside a pop-up that fits, cards >= 44 px, OK on screen: ${JSON.stringify(m)}`);
        check(!p.errs.length, `page errors: ${p.errs.join('; ')}`);
      } catch (e) { fails.push(`${tag}: exception ${String(e).split('\n')[0]}`); }
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL morechips:\n - ${fails.join('\n - ')}` : 'PASS morechips: "+N" opens every new thing as picture cards; SEE IT IN NATURE lands on that animal');
  process.exit(fails.length ? 1 : 0);
})();
