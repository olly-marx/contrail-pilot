// STORY COMPLETE ON THE RESULTS CARD (0.79.0; Oliver, 2026-11-24: 'when you complete a story ... it flashes the story complete, and then it basically adds the amount to the top sum
// so that you can sort of see what rewards you got'; src/ui.js storyCompleteBeat). 390x844, the stories-ui save: ACCEPT a story, land at every stop by hand. On the last landing:
//   1. the bank line first counts to the flight's takings WITHOUT the story's prize (sampled while the card builds);
//   2. a STORY COMPLETE banner flashes on the story block;
//   3. then the bank ends on the whole sum, the story's prize included.
// A stop that is not the last one gets no banner. Plants (tools/plants.tsv): no beat; the prize not held back. Run: python3 -m http.server 8000 & node tests/storydone-ui.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const SAVE = { areas: ['weurope', 'africa'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'],
  freeGiven: true, freeProjectGiven: true, landings: 120, flights: 200, seeds: 300, crystals: 20, bestDistance: 25000, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, SAVE);
  try {
    await p.goto(URL); await ready(p); await p.waitForTimeout(600);
    await p.evaluate(() => game.registry.get('ui').go('missions')); await p.waitForTimeout(400);
    await p.click('#mList [data-saccept]'); await p.waitForTimeout(400);
    const o = await p.evaluate(() => { const s = game.registry.get('save'); return s.storyBoard.find(x => x && x.id === s.storyActive); });
    if (!o) throw new Error('no story accepted');
    // Land at a stop and watch the card build: the bank line's numbers and whether the banner ever shows.
    const land = city => p.evaluate(async city => { const g = game.scene.getScene('game'), seen = { gains: [], banner: false };
      const t = setInterval(() => { const e = document.getElementById('rGain'); if (e) seen.gains.push(e.textContent); if (document.querySelector('#rStory .rc-sbanner')) seen.banner = true; }, 30);
      g.state = 'playing'; g.landedAt = city; g.airportIndex = 0; g.airportsSkipped = 0; g.finish({ landed: true });
      await new Promise(r => setTimeout(r, 5000)); clearInterval(t);
      const v = game.registry.get('ui').resultView; return { ...seen, final: document.getElementById('rGain').textContent, bank: v && v.bank.seeds, story: v && v.story && { mood: v.story.mood, seeds: v.story.seeds } }; }, city);
    for (let i = 0; i < o.stops.length - 1; i++) {
      const r = await land(o.stops[i]);
      check(!r.banner, `stop ${i + 1} of ${o.stops.length} (${o.stops[i]}) is not the last: no STORY COMPLETE banner: ${JSON.stringify(r.story)}`);
      await p.evaluate(() => game.registry.get('ui').go('fly')); await p.waitForTimeout(200);
    }
    const last = await land(o.stops[o.stops.length - 1]);
    const nums = last.gains.map(g => +String(g).replace(/[^0-9]/g, '')).filter(n => !Number.isNaN(n));
    check(last.story && last.story.mood === 'done' && last.story.seeds > 0, `FIXTURE: the last stop completes the story with a prize: ${JSON.stringify(last.story)}`);
    check(last.banner, '2. the STORY COMPLETE banner shows on the story block');
    check(nums.includes(last.bank - last.story.seeds), `1. the bank first stops at the takings without the story's ${last.story && last.story.seeds} (want ${last.bank - (last.story && last.story.seeds)} among ${[...new Set(nums)].slice(0, 30)})`);
    check(+String(last.final).replace(/[^0-9]/g, '') === last.bank, `3. the bank ends on the whole sum ${last.bank}: ${last.final}`);
  } catch (e) { check(false, `an exception stopped the run: ${String(e).split('\n')[0].slice(0, 160)}`); }
  check(!errs.length, `no page errors: ${errs.slice(0, 2).join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL storydone-ui\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('PASS storydone-ui: completing a story flashes STORY COMPLETE on the results card and counts its prize into the bank after the rest');
})();
