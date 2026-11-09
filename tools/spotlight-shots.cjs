// Screenshots of every rails/tour step on seeded saves (research/SPOTLIGHT-SUBJECT.md): what is lit, where the bubble sits. Usage:
//   URL=http://127.0.0.1:<port>/ NODE_PATH=... OUT=shots/before node tools/spotlight-shots.cjs [W,H ...]   (default 390x844 and 320x568)
// For each case it opens the screen, then repeats: screenshot -> record the step (text, ring, bubble, the dim hole) -> advance (OK button, else a real tap at the ring's centre) until the tour ends or `max` steps.
// Steps that need typing (the name form) stop after 2 steps. Output: <OUT>/<case>-<n>-<W>.png and <OUT>/steps.jsonl. READ-ONLY on the game: each case uses its own throwaway page.
const { chromium } = require('playwright-core'); const fs = require('fs');
const { ready } = require('../tests/lib/ready.js');
const URL = process.env.URL, OUT = process.env.OUT || 'shots/spot'; fs.mkdirSync(OUT, { recursive: true });
const sizes = (process.argv.slice(2).length ? process.argv.slice(2) : ['390x844', '320x568']).map(s => s.split('x').map(Number));
const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
const DONE = ['r-school', 'r-free', 'r-takeoff1', 'r-res1', 'r-takeoff2', 'r-res2', 'r-nature', 'name', 'r-systems', 'r-bonus', 'r-parcels', 'r-map', 'r-boards', 'hangar', 'nature-lead'];
const without = (...ids) => DONE.filter(t => !ids.includes(t));
const base = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON', 'PARIS'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['x-bars'], freeGiven: true, freeProjectGiven: true, freeUpgrade: false,
  seeds: 80, crystals: 3, landings: 2, flights: 3, shownLines: ['cabin', 'fuel', 'engine', 'gear', 'trees'], tours: DONE, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], unclaimed: [], fleet };
const RES = { landed: true, landedAt: 'PARIS', from: 'LONDON', reason: '', distance: 1200, heat: 5, breakdown: { co2: 60, night: 0, sun: 30, trees: 10 }, earned: [{ label: 'Seeds', n: 23 }], mult: 1, kinds: 0, natureGains: [], rewards: [], missions2: { done: [], next: null }, crystals: 1, cargo: 23 };
// id, save overrides, screen ('title' | 'hangar' | 'nature' | 'results'), max steps
const CASES = [
  ['r-school', { freeUpgrade: true, landings: 1, flights: 1, missionsDone: [], tours: [] }, 'results', 2],
  ['r-hangar', { freeUpgrade: true, landings: 1, flights: 1, missionsDone: [], tours: ['r-school'] }, 'title', 2],
  ['r-free', { freeUpgrade: true, landings: 1, flights: 1, missionsDone: [], tours: ['r-school', 'r-hangar'] }, 'hangar', 6],   // 1: tap the Engines row, 2: FREE! (a real purchase), 3: the payoff card's OK (#payOk), 4: the hangar's TAKE OFF
  ['r-takeoff1-hangar', { landings: 1, flights: 1, missionsDone: [], tours: without('r-takeoff1') }, 'hangar', 2],
  ['r-takeoff1-hub', { landings: 1, flights: 1, missionsDone: [], tours: without('r-takeoff1') }, 'title', 2],
  ['r-res1', { missionsDone: ['L1'], landings: 2, tours: without('r-res1') }, 'results', 4],
  ['r-takeoff2', { missionsDone: ['L1'], landings: 2, tours: without('r-takeoff2') }, 'title', 2],
  ['r-res2', { missionsDone: ['L1', 'L2'], landings: 3, tours: without('r-res2') }, 'results', 2],
  ['r-nature', { missionsDone: ['L1', 'L2'], landings: 3, freeProjectGiven: false, tours: without('r-nature') }, 'nature', 6],
  ['r-bonus', { missionsDone: ['L1', 'L2', 'L3', 'L4'], landings: 5, tours: without('r-bonus') }, 'results', 2],
  ['r-systems', { missionsDone: ['L1', 'L2', 'L3'], landings: 4, tours: without('r-systems') }, 'title', 4],
  ['r-parcels', { missionsDone: ['L1', 'L2', 'L3', 'L4'], landings: 5, levels: { trees: 0 }, tours: without('r-parcels') }, 'nature', 2],
  ['r-map', { landings: 6, tours: without('r-map') }, 'title', 2],
  ['r-boards', { landings: 7, tours: without('r-boards') }, 'title', 2],
  ['name', { landings: 5, tours: without('name') }, 'title', 3],
  ['newlines', { landings: 4, shownLines: ['cabin'], tours: DONE }, 'title', 4],
];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const log = fs.createWriteStream(`${OUT}/steps.jsonl`, { flags: 'a' });
  try {
    for (const [W, H] of sizes) for (const [id, over, screen, max] of CASES) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: false }), p = await ctx.newPage();
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, { ...base, ...over });
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(900);
        await p.evaluate(([screen, RES]) => { const ui = game.registry.get('ui'); ui.tour.busy = false; if (screen === 'hangar') ui.showHangar(); else if (screen === 'nature') ui.go('nature'); else if (screen === 'results') { ui.showResults(RES); setTimeout(() => { ui.skipReveal = true; }, 60); } else ui.showTitle(); }, [screen, RES]);
        for (let n = 1; n <= max; n++) {
          const up = await p.waitForFunction(() => { const t = document.getElementById('tour'); return t && !t.hidden && t.querySelector('.tbubble p') && t.querySelector('.tbubble p').textContent; }, null, { timeout: n === 1 ? 6000 : 3000 }).then(() => true).catch(() => false);
          if (!up) { log.write(JSON.stringify({ id, W, H, n, none: true }) + '\n'); break; }
          await p.waitForTimeout(500);
          const info = await p.evaluate(() => { const t = document.getElementById('tour'), q = s => t.querySelector(s), r = e => { if (!e) return null; const x = e.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.top), Math.round(x.right), Math.round(x.bottom)]; };
            const ok = q('.tbubble .btn'); return { text: q('.tbubble p').textContent, ring: r(q('.tring')), bubble: r(q('.tbubble')), okShown: !!ok && !ok.hidden, bar: r(document.querySelector('.tabbar:not([hidden])')) }; });
          await p.screenshot({ path: `${OUT}/${id}-${n}-${W}.png` }); log.write(JSON.stringify({ id, W, H, n, ...info }) + '\n');
          if (id === 'name' && n >= 2) break;
          if (info.okShown) await p.click('#tour .tbubble .btn'); else if (info.ring) await p.mouse.click((info.ring[0] + info.ring[2]) / 2, (info.ring[1] + info.ring[3]) / 2);
          await p.waitForTimeout(800);
        }
      } catch (e) { log.write(JSON.stringify({ id, W, H, error: String(e).slice(0, 160) }) + '\n'); }
      await ctx.close();
    }
  } finally { log.end(); await b.close(); const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png')); console.log(`${files.length} screenshots, ${(files.reduce((a, f) => a + fs.statSync(`${OUT}/${f}`).size, 0) / 1048576).toFixed(1)} MB in ${OUT}`); }
})();
