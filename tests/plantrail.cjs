// THE FIRST TREE (the user, 2026-11-09: the planting tutorial "doesn't really show you how to plant a tree"). Three parts, real page, 390x844, rails ON:
//   a. HOME, tree seeds bought and no tree planted: the rail 'r-plant1' lights TAKE OFF with 'Your tree seeds are on board...'; tapping it starts the flight.
//   b. in flight, soil ahead and no tree planted yet: a strip says 'Brown soil ahead! Tap PLANT...' EVERY time soil comes into range (the player already saw the tip once: seenTips has tree-1), and an arrow is drawn over the
//      button; after a tree has been planted the arrow is gone and a new patch of soil shows no strip.
//   c. results after the flight that planted the first tree: the rail 'r-plant2' says 'Your first tree is planted!' on the Earth card; an older player (a tree already planted) gets no rail.
// Plants: tools/plants.tsv, test `plantrail`. Run: python3 -m http.server 8000 & node tests/plantrail.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const TOURS = ['name', 'r-school', 'r-free', 'r-payoff', 'r-res1', 'r-takeoff2', 'nature-lead', 'r-res2', 'r-nature', 'r-systems', 'r-bonus', 'r-parcels', 'r-boards', 'nature-swipe', 'globe-hint', 'r-map'];
const seed = extra => ({ areas: ['weurope'], homeArea: 'weurope', homeCity: 'AMSTERDAM', city: 'AMSTERDAM', visited: ['AMSTERDAM'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['tree-1', 'x-bars', 'airport', 'takeoff'], tours: TOURS,
  freeGiven: true, freeProjectGiven: true, freeUpgrade: false, landings: 6, flights: 8, seeds: 40, crystals: 4, missionsDone: ['L1', 'L2', 'L3', 'L4'], levels: { trees: 1 }, planted: {}, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, ...extra });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  const open = async s => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, s);
    await p.goto(URL); await ready(p); await p.waitForTimeout(1200);
    return { ctx, p };
  };
  const rail = p => p.evaluate(() => { const ui = game.registry.get('ui'); return { busy: !!(ui.tour && ui.tour.busy), target: ui.tour && ui.tour.target ? ui.tour.target.id : null, text: (document.querySelector('#tour .tbubble') || {}).innerText || '' }; });
  try {
    { const { ctx, p } = await open(seed({}));   // a + b
      const r = await rail(p); log.push(`a: ${JSON.stringify(r)}`);
      check(r.busy && r.target === 'goBtn' && /You carry \d+ trees/.test(r.text), `a: HOME does not light TAKE OFF with the tree-seeds line: ${JSON.stringify(r)}`);
      await p.click('#goBtn');
      const flying = await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s && s.state === 'playing'; }, null, { timeout: 25000 }).then(() => true).catch(() => false);
      check(flying, 'a: tapping the lit TAKE OFF did not start the flight');
      if (flying) {
        const one = await p.evaluate(async () => {
          const s = game.scene.getScene('game'); s.graceUntil = 1e12; s.hitsStorm = () => false; s.hitBird = () => false; s.parcels = Math.max(s.parcels, 3); s.distancePx = 1000; s.closeTip(); s.tipQueue = [];   // (a real distance: a huge one throws in the leg maths)
          s.showPlot({ x: 400 }); await new Promise(r => setTimeout(r, 1800));
          const strip = document.getElementById('coach'), arrow = s.dropArrowGfx;
          return { strip: !strip.hidden && /PLANT/.test(strip.innerText), text: strip.innerText, arrow: !!(arrow && arrow.commandBuffer && arrow.commandBuffer.length), noTree: s.noTreeYet() };
        });
        log.push(`b first soil: ${JSON.stringify(one)}`);
        check(one.noTree && one.strip, `b: soil ahead and no tree yet, but the strip does not say PLANT (tip text "${one.text}")`);
        check(one.arrow, 'b: no arrow is drawn over the PLANT button while soil is ahead and no tree has landed');
        const two = await p.evaluate(async () => {   // close it, a second patch of soil: the strip comes again (the tip was shown before)
          const s = game.scene.getScene('game'); s.closeTip(); await new Promise(r => setTimeout(r, 500)); s.showPlot({ x: 800 }); await new Promise(r => setTimeout(r, 1800));
          return { strip: !document.getElementById('coach').hidden && /PLANT/.test(document.getElementById('coach').innerText) };
        });
        check(two.strip, 'b: the second patch of soil shows no strip (the tip must come back until a tree has landed)');
        const three = await p.evaluate(async () => {   // a tree lands: no arrow, no strip
          const s = game.scene.getScene('game'); s.planted = 1; s.save.planted = { oak: 1 }; s.closeTip();   /* (the tree first: a queued soil strip must then be dropped) */ await new Promise(r => setTimeout(r, 400)); s.showPlot({ x: 1200 }); await new Promise(r => setTimeout(r, 1800));
          const a = s.dropArrowGfx; return { strip: !document.getElementById('coach').hidden && /PLANT/.test(document.getElementById('coach').innerText), arrow: !!(a && a.commandBuffer && a.commandBuffer.length) };
        });
        check(!three.strip && !three.arrow, `b: after a tree has landed the arrow or the strip is still shown: ${JSON.stringify(three)}`);
        await p.evaluate(() => { const s = game.scene.getScene('game'); s.graceUntil = 0; s.landedAt = s.path[1]; s.finish({ landed: true }); });
        await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 15000 }).catch(() => {});
        await p.waitForFunction(() => { const u = game.registry.get('ui'); return u.tour && u.tour.busy; }, null, { timeout: 9000 }).catch(() => {});   // (the results reveal takes about 2 s before the rails look)
        const c = await rail(p); log.push(`c: ${JSON.stringify(c)}`);
        log.push(`c state: ${JSON.stringify(await p.evaluate(() => { const ui = game.registry.get('ui'); return { lastPlanted: ui.lastPlanted, trees: JSON.stringify(ui.save.planted), done: (ui.save.tours || []).filter(x => /^r-/.test(x)).join(), resultsShown: !document.getElementById('results').hidden, busy: ui.tour.busy }; }))}`);
        check(c.busy && c.target === 'rEarth' && /Your first tree! It grows up in \d+ flights/.test(c.text) && /not saved/.test(c.text), `c: the results do not say the first tree grows up and that unplanted trees are not saved, on the Earth card: ${JSON.stringify(c)}`);
      }
      check(!p.errs.length, `page errors: ${p.errs.join('; ')}`); await ctx.close(); }
    { const { ctx, p } = await open(seed({ planted: { oak: 3 } }));   // control: an older player with trees
      const r = await rail(p); log.push(`control: ${JSON.stringify(r)}`);
      check(!(r.busy && r.target === 'goBtn' && /You carry \d+ trees/.test(r.text)), `control: a player who has planted trees is told to take off to plant them: ${JSON.stringify(r)}`); await ctx.close(); }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL plantrail:\n - ${fails.join('\n - ')}` : 'PASS plantrail: HOME lights TAKE OFF with the seeds, the flight points at PLANT until a tree lands, the results say the first tree is planted');
  process.exit(fails.length ? 1 : 0);
})();
