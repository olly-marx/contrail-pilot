// THE HOME BOX 'NEXT CROSSING' AND THE CROSSINGS SCREEN (src/ui.js renderHub / openCrossings, src/crossingview.js boxView; CROSSINGS V2). Real taps at 390x844 and 320x568, a season 2 save with the lessons done.
//   A. Era and Plane done, Nature open: HOME shows the box (route 'WARSAW > STOCKHOLM', the word Easy, three ticks with the first two filled, the line 'Plant trees. Nature N of 30'); TAKE OFF is still on screen above the bar
//      (the box must not push it off a 320x568 phone); a tap on the box opens the CROSSINGS screen with the same route and one button, NATURE, which opens NATURE.
//   B. Nature met too (the lever SEASON.offer.biodiversity = 0): the moment sheet ('A NEW WAY OPENS') opens by itself and marks the crossing told; then the box is gold and says 'Ready!' and its tap opens the screen with CROSS TO STOCKHOLM.
//   C. Lessons not done: no box (the first hour stays quiet).   D. A free part waiting (a pictured must-do lead row, TAKE OFF locked): no box (HOME would scroll: tests/fitscreen.cjs).
// Plants: tools/plants.tsv, test `crossboxui`. Run: python3 -m http.server 8000 & node tests/crossboxui.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = lessons => ({ areas: ['weurope'], homeArea: 'weurope', homeCity: 'WARSAW', city: 'WARSAW', visited: ['WARSAW'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, areaBest: { weurope: 99999 }, missionsDone: lessons ? ['L1', 'L2', 'L3', 'L4', 'L5'] : ['L1'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  const open = async (s, W, H) => {
    const ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, s);
    await p.goto(URL); await ready(p); await p.waitForTimeout(1200); return { ctx, p };
  };
  const home = p => p.evaluate(() => { const h = document.getElementById('hubCross'), g = document.getElementById('goBtn').getBoundingClientRect(), tb = document.getElementById('tabbar'), tr = tb ? tb.getBoundingClientRect() : { top: innerHeight };
    const r = e => { const q = e.getBoundingClientRect(); return [Math.round(q.top), Math.round(q.bottom)]; }; return { rects: { box: r(h), go: r(document.getElementById('goBtn')), barTop: Math.round(tr.top), innerH: innerHeight, overflow: Math.round(g.bottom - tr.top) }, shown: !h.hidden && h.getClientRects().length > 0, text: h.innerText.replace(/\s+/g, ' ').trim(), on: [...h.querySelectorAll('.hc-tick')].map(e => e.classList.contains('on')), gold: h.classList.contains('ready'), goVisible: g.height > 0 && g.bottom <= tr.top + 1 && g.bottom <= innerHeight }; });
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`;
      { const { ctx, p } = await open(seed(true), W, H); const h = await home(p); log.push(`${tag} A: ${JSON.stringify(h)}`); if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/home-A-${W}.png` });
        check(h.shown && /NEXT CROSSING/.test(h.text) && /WARSAW > STOCKHOLM/.test(h.text) && /Easy/.test(h.text), `${tag} A: the box is not on HOME with the route and the word: ${JSON.stringify(h)}`);
        check(h.on.join() === 'true,true,false' && /Plant trees\. Nature \d+ of 30/.test(h.text), `${tag} A: the ticks or the plain line are wrong: ${JSON.stringify([h.on, h.text])}`);
        check(h.goVisible, `${tag} A: TAKE OFF is not fully on screen above the bar with the box showing`);
        if (!h.shown) { await ctx.close(); continue; }   // (no box to tap: the checks above already failed; a tap would only time out)
        await p.click('#hubCross'); await p.waitForTimeout(500);
        const sh = await p.evaluate(() => { const e = document.getElementById('sheet'); return e ? { text: e.innerText.replace(/\s+/g, ' ').trim(), btn: (e.querySelector('.sheet-action') || {}).innerText || '' } : null; });
        check(sh && /WARSAW > STOCKHOLM/.test(sh.text) && sh.btn.trim() === 'NATURE', `${tag} A: the CROSSINGS screen is wrong: ${JSON.stringify(sh)}`);
        if (sh) { await p.click('#sheet .sheet-action'); await p.waitForTimeout(700); check(await p.evaluate(() => !document.getElementById('nature').hidden), `${tag} A: the NATURE button did not open NATURE`); }
        check(!p.errs.length, `${tag} A: page errors ${p.errs.join('; ')}`); await ctx.close(); }
      { const { ctx, p } = await open(seed(true), W, H);
        await p.evaluate(async () => { (await import('/src/season.js')).SEASON.offer.biodiversity = 0; game.registry.get('ui').showTitle(); }); await p.waitForTimeout(600);
        // the moment fires by itself on the next screen the player sees (src/ui.js maybeCrossingSheet): the sheet is already open, and the crossing is marked told
        const m1 = await p.evaluate(() => { const e = document.getElementById('sheet'); return { sheet: e ? e.innerText.replace(/\s+/g, ' ') : '', told: (JSON.parse(localStorage.getItem('contrailPilot.v2')).crossingTold || []).join() }; });
        check(/A NEW WAY OPENS/.test(m1.sheet) && m1.told === 'warsaw-stockholm', `${tag} B: the moment sheet did not open by itself or the crossing is not marked told: ${JSON.stringify(m1)}`);
        await p.evaluate(() => { const e = document.getElementById('sheet'); if (e) e.remove(); game.registry.get('ui').showTitle(); }); await p.waitForTimeout(500);
        const h = await home(p); log.push(`${tag} B: ${JSON.stringify(h)}`); if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/home-B-${W}.png` });
        const upn = await p.evaluate(() => (document.getElementById('hubNext') || { innerText: '' }).innerText.replace(/\s+/g, ' '));
        check(!/Cross to STOCKHOLM/.test(upn), `${tag} B: UP NEXT repeats the ready crossing under the box: ${upn}`);
        check(h.shown && h.gold && /Ready!/.test(h.text) && h.on.join() === 'true,true,true', `${tag} B: a ready crossing is not gold with 'Ready!' and three ticks: ${JSON.stringify(h)}`);
        if (!h.shown) { await ctx.close(); continue; }
        await p.click('#hubCross'); await p.waitForTimeout(500);
        const m2 = await p.evaluate(() => { const e = document.getElementById('sheet'); return e ? { text: e.innerText.replace(/\s+/g, ' '), btn: (e.querySelector('.sheet-action') || {}).innerText || '' } : null; });
        check(m2 && /WARSAW > STOCKHOLM/.test(m2.text) && /CROSS TO STOCKHOLM/.test(m2.btn), `${tag} B: the tap on a ready, already announced crossing does not open the CROSSINGS screen with CROSS TO STOCKHOLM: ${JSON.stringify(m2)}`);
        await ctx.close(); }
      { const { ctx, p } = await open({ ...seed(true), freeUpgrade: true }, W, H); const h = await home(p); log.push(`${tag} D: ${JSON.stringify(h)}`);   // a free part is waiting: its pictured lead row and the locked TAKE OFF come first, the box waits (HOME must not scroll)
        check(!h.shown, `${tag} D: the box shows while a free part is waiting (HOME overflows): ${JSON.stringify(h)}`); await ctx.close(); }
      { const { ctx, p } = await open(seed(false), W, H); const h = await home(p); log.push(`${tag} C: ${JSON.stringify(h)}`);
        check(!h.shown, `${tag} C: the box shows while lessons remain: ${JSON.stringify(h)}`); await ctx.close(); }
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL crossboxui:\n - ${fails.join('\n - ')}` : 'PASS crossboxui: the HOME box shows the ticks and one line and keeps TAKE OFF on screen at 390 and 320; its tap opens the CROSSINGS screen; ready is gold; the first hour has no box');
  process.exit(fails.length ? 1 : 0);
})();
