// RELEASE C: WHERE THE CROSSING PRIZE IS SHOWN (src/ui.js renderHub / openCrossings, src/crossingview.js boxView, src/crossingend.js endView). Real taps, 390x844 and 320x568, a season 2 save in ROME (the next crossing is
// ROME > TUNIS, Easy, which pays 100 seeds and 12 ice crystals). Named lines, in order:
//   FIXTURE  the NEXT CROSSING box is on HOME
//   A. the HOME box says 'Prize: 100 seeds' next to the word Easy, and TAKE OFF is still on screen above the bar (the longer right cell must not push it off a short phone)
//   B. a tap on the box opens the CROSSINGS screen, and it says 'Prize: 100 seeds' too
//   C. a landed crossing's own card says '+100 seeds' and '+12 ice crystals', fits the screen, and the bank got the 100 seeds and 12 crystals
//   D. the lap landed (the ENDING screen, src/ui.js showEnding) says '+2,000 seeds' and '+250 ice crystals', and fits the screen
// Screenshots: SHOTS, else <tmpdir>/crossrewardui-shots. Run: python3 -m http.server 8000 & node tests/crossrewardui.cjs   (plants: tools/plants.tsv, test crossrewardui)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const fs = require('fs'), os = require('os'), path = require('path');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'crossrewardui-shots');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'ROME', city: 'ROME', visited: ['ROME'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, areaBest: { weurope: 99999 }, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], crossingTold: ['mediterranean'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  let shotsOk = true; try { if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS); } catch (e) { shotsOk = false; console.log(`NOTE: screenshots off, cannot make ${SHOTS}: ${e.code || e}`); }   // (not recursive: that can loop on an uncreatable path)
  const snap = p => (shotsOk ? p.screenshot().catch(() => null) : Promise.resolve(null));   // the picture is TAKEN at the moment checked and WRITTEN after the checks: a failing run (a plant!) writes FAIL-<name>, so it never overwrites the shot of a passing run
  const keep = (buf, name) => { if (shotsOk && buf) try { fs.writeFileSync(`${SHOTS}/${fails.length ? 'FAIL-' : ''}${name}`, buf); } catch (e) { /* no shot */ } };
  const open = async (W, H) => {
    const ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
    await p.goto(URL); await ready(p); await p.waitForTimeout(1200); return { ctx, p };
  };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`;
      { const { ctx, p } = await open(W, H); let stage = 'HOME';
        try {
          let bufScreen = null;
          const h = await p.evaluate(() => { const bx = document.getElementById('hubCross'), g = document.getElementById('goBtn').getBoundingClientRect(), tb = document.getElementById('tabbar'), tr = tb ? tb.getBoundingClientRect() : { top: innerHeight }, r = bx.getBoundingClientRect();
            return { shown: !bx.hidden && bx.getClientRects().length > 0, text: bx.innerText.replace(/\s+/g, ' ').trim(), goVisible: g.bottom <= tr.top + 1 && g.top >= 0, inside: r.left >= 0 && r.right <= innerWidth }; });
          const bufHome = await snap(p);
          check(h.shown, `${tag}: FIXTURE: the NEXT CROSSING box is not on HOME: ${JSON.stringify(h)}`);
          if (h.shown) {
            check(/Easy/.test(h.text) && /Prize: 100 seeds/.test(h.text) && h.inside, `${tag} A: the HOME box does not say 'Prize: 100 seeds' next to Easy inside the screen: ${JSON.stringify(h)}`);
            check(h.goVisible, `${tag} A: TAKE OFF is not fully on screen above the bar with the prize showing`);
            stage = 'tap box'; await p.click('#hubCross'); await p.waitForTimeout(500);
            const sh = await p.evaluate(() => { const e = document.getElementById('sheet'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; });
            bufScreen = await snap(p);
            check(!!sh && /ROME > TUNIS/.test(sh) && /Prize: 100 seeds/.test(sh), `${tag} B: the CROSSINGS screen does not say 'Prize: 100 seeds': ${JSON.stringify(sh)}`);
          }
          check(!p.errs.length, `${tag}: page errors (home) ${p.errs.slice(0, 2)}`);
          keep(bufHome, `${tag}-home-box.png`); keep(bufScreen, `${tag}-crossings-screen.png`);
        } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
        await ctx.close(); }
      { const { ctx, p } = await open(W, H); let stage = 'start the crossing';
        try {
          await p.evaluate(async () => { const V = await import('/src/crossingview.js'), ui = game.registry.get('ui'); ui.tour.busy = true; ui.flyCrossing(V.crossingById(game.registry.get('save'), 'mediterranean', { unlock: true })); });
          await p.waitForFunction(() => { const g = game.scene.getScene('game'); return g && g.crossing && ['takeoff', 'playing'].includes(g.state); }, null, { timeout: 20000 }).catch(() => {});
          const before = await p.evaluate(() => { const s = game.registry.get('save'); return { seeds: s.seeds || 0, crystals: s.crystals || 0 }; });
          stage = 'land'; await p.evaluate(() => { const g = game.scene.getScene('game'); g.graceUntil = 0; g.landedAt = g.path[1]; g.finish({ landed: true }); });
          await p.waitForFunction(() => { const e = document.getElementById('crossEnd'); return e && !e.hidden; }, null, { timeout: 12000 });
          await p.waitForTimeout(600); const bufLand = await snap(p);
          const e = await p.evaluate(() => { const el = document.getElementById('crossEnd'), c = el.querySelector('.payoff-card').getBoundingClientRect(), s = JSON.parse(localStorage.getItem('contrailPilot.v2')); return { text: el.innerText.replace(/\s+/g, ' '), top: c.top, bottom: c.bottom, h: innerHeight, seeds: s.seeds || 0, crystals: s.crystals || 0 }; });
          check(/\+100 seeds/.test(e.text) && /\+12 ice crystals/.test(e.text), `${tag} C: the landing card does not say '+100 seeds' and '+12 ice crystals': ${e.text}`);
          check(e.top >= 0 && e.bottom <= e.h, `${tag} C: the landing card does not fit the screen (${Math.round(e.top)}-${Math.round(e.bottom)} of ${e.h})`);
          check(e.seeds >= before.seeds + 100 && e.crystals >= before.crystals + 12, `${tag} C: the bank did not get the prize: before ${JSON.stringify(before)}, after ${e.seeds}/${e.crystals}`);
          check(!p.errs.length, `${tag}: page errors (landing) ${p.errs.slice(0, 2)}`);
          keep(bufLand, `${tag}-landing-card.png`);
        } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
        await ctx.close(); }
      { const { ctx, p } = await open(W, H); let stage = 'the ending';
        try {
          await p.evaluate(() => game.registry.get('ui').showResults({ landed: true, landedAt: 'ROME', distance: 900, earned: [], rewards: [], breakdown: { co2: 0, night: 0, sun: 0, trees: 0 }, heat: 0, crystals: 0, planted: 0, missions2: { done: [], next: null }, school: false,
            crossing: { id: 'lap', kind: 'lap', landed: true, to: 'ROME', prize: { seeds: 2000, crystals: 250 } } }));
          await p.waitForTimeout(800); const bufEnd = await snap(p);
          const e = await p.evaluate(() => { const el = document.getElementById('ending'); if (!el || el.hidden) return null; const c = el.querySelector('.payoff-card').getBoundingClientRect(); return { text: el.innerText.replace(/\s+/g, ' '), top: c.top, bottom: c.bottom, h: innerHeight }; });
          check(!!e && /\+2,000 seeds/.test(e.text) && /\+250 ice crystals/.test(e.text), `${tag} D: the ending screen does not say '+2,000 seeds' and '+250 ice crystals': ${JSON.stringify(e)}`);
          const vis = await p.evaluate(() => { const el = document.getElementById('ending'), pz = el && el.querySelector('.ending-prize'); if (!pz) return { found: false };
            const card = el.querySelector('.payoff-card').getBoundingClientRect(), r = pz.getBoundingClientRect(), cs = getComputedStyle(pz), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return { found: true, shown: cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 && r.width > 0 && r.height > 0, inside: r.top >= card.top && r.bottom <= card.bottom && r.left >= card.left && r.right <= card.right, onTop: !!hit && pz.contains(hit), text: pz.innerText.replace(/\s+/g, ' ') }; });
          check(vis.found && vis.shown && vis.inside && vis.onTop && /\+2,000 seeds/.test(vis.text) && /\+250 ice crystals/.test(vis.text), `${tag} D: the two prize lines are not VISIBLE inside the ending card (shown, inside the card, not under another element): ${JSON.stringify(vis)}`);
          const cel = await p.evaluate(() => { const c = document.querySelector('#ending .payoff-card'); return c ? c.dataset.celebrated || '' : null; });
          check(cel === '1', `${tag} D: the ending card plays the lap's celebration (src/celebrate.js 'lap-landed'; data-celebrated '${cel}')`);
          const sp = await p.evaluate(() => { const ps = [...document.querySelectorAll('#ending .payoff-card p')], cs = ps.map(q => getComputedStyle(q));
            const lh = ps.map((q, i) => { const f = parseFloat(cs[i].fontSize), l = parseFloat(cs[i].lineHeight); return { cls: q.className, ratio: +(l / f).toFixed(2) }; });
            const gaps = ps.slice(1).map((q, i) => Math.round(q.getBoundingClientRect().top - ps[i].getBoundingClientRect().bottom)); return { lh, gaps }; });
          check(sp.lh.every(x => x.ratio >= 1.25) && sp.gaps.every(g => g >= 8), `${tag} D: the ending card's lines are spaced (line height at least 1.25 x the font, at least 8 px between paragraphs; the lines sat tight at 320, 2026-11-11): ${JSON.stringify(sp)}`);
          check(!e || (e.top >= 0 && e.bottom <= e.h), `${tag} D: the ending card does not fit the screen (${e && Math.round(e.top)}-${e && Math.round(e.bottom)} of ${e && e.h})`);
          check(!p.errs.length, `${tag}: page errors (ending) ${p.errs.slice(0, 2)}`);
          keep(bufEnd, `${tag}-ending.png`);
        } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
        await ctx.close(); }
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL crossrewardui:\n - ${fails.join('\n - ')}` : 'PASS crossrewardui: the crossing prize is shown on the HOME box and the CROSSINGS screen, named on the landing card, and paid (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
