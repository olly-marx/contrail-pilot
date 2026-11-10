// THE ROUTE ON THE MAP (src/globe.js setPath/routePath, src/ui.js showCityCard/renderHub; ROUTE ON THE MAP R1). Real taps at 390x844 and 320x568, a season 2 save in LONDON:
// A. a tap on a city 2 or more stops away draws the WHOLE route on the globe that is there (the globe's drawn path equals the shortest way to it); B. closing the card puts the flight's own route back;
// C. a destination set from afar (GO TO a city 7 or more stops away) keeps the whole route on HOME, not cut at 5 cities. Plants: tools/plants.tsv, test `routeonmap`. Run: python3 -m http.server 8000 & node tests/routeonmap.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope', 'mideast', 'africa', 'sasia', 'easia'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
      try {
        await p.goto(URL); await ready(p);
        await p.waitForFunction(() => !!document.getElementById('hubGlobe') && !!document.getElementById('hubGlobe').__globe, null, { timeout: 15000 }).catch(() => null);
        const flightPath = await p.evaluate(() => document.getElementById('hubGlobe').__globe.routePath());
        // D. every city is a real dot: 2 x 2 canvas pixels or more (a city that is not on the route and not next door)
        const dot = await p.evaluate(async () => { const cv = document.getElementById('hubGlobe'), g = cv.__globe, R = await import('/src/route.js'), s = game.registry.get('ui').save, L = R.linksFor(s), path = g.routePath(); let pick = null;
          for (const c of R.ROUTE) { if (path.includes(c.name) || !(c.name in L) || (L[path[0]] || []).includes(c.name)) continue; const q = g.cityPos(c.name); if (q) { pick = { name: c.name, q }; break; } }
          if (!pick) return null; const r = cv.getBoundingClientRect(), k = cv.width / r.width, cx = Math.round((pick.q.x - r.left) * k), cy = Math.round((pick.q.y - r.top) * k), d = cv.getContext('2d').getImageData(cx - 2, cy - 2, 5, 5).data;
          let bright = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) bright++; return { name: pick.name, bright }; });
        check(dot && dot.bright >= 4, `${tag} D: a city is a 2 x 2 pixel dot or bigger (a 1 pixel dot has 1 to 2 bright pixels): ${JSON.stringify(dot)}`);
        // A. the farthest visible city that is 2 or more stops away
        const target = await p.evaluate(async () => { const g = document.getElementById('hubGlobe').__globe, R = await import('/src/route.js'), P = await import('/src/pickcity.js'), s = game.registry.get('ui').save; let best = null;
          for (const c of R.ROUTE) { const q = g.cityPos(c.name), w = P.routeOf(s, c.name); if (q && w && w.length >= 3 && (!best || w.length > best.n)) best = { name: c.name, x: q.x, y: q.y, n: w.length, way: w }; } return best; });
        check(!!target, `${tag} A: no visible city 2 or more stops away to tap`);
        if (target) {
          await p.mouse.click(target.x, target.y); await p.waitForTimeout(500);
          const shown = await p.evaluate(() => ({ drawn: document.getElementById('hubGlobe').__globe.routePath(), sheet: !!document.getElementById('hubCard') && !document.getElementById('hubCard').hidden }));
          log.push(`${tag} A: ${JSON.stringify([target.name, target.way, shown])}`);
          const tapped = await p.evaluate(() => document.getElementById('hubCard') ? document.getElementById('hubCard').innerText.replace(/\s+/g, ' ') : '');
          check(shown.sheet && JSON.stringify(shown.drawn) === JSON.stringify(target.way), `${tag} A: tapping ${target.name} must draw its whole route on the globe: drawn ${JSON.stringify(shown.drawn)} vs ${JSON.stringify(target.way)} (card: ${tapped.slice(0, 60)})`);
          const fitBox = await p.evaluate(() => { const g = document.getElementById('goBtn').getBoundingClientRect(), tb = document.getElementById('tabbar').getBoundingClientRect(), c = document.getElementById('hubCard').getBoundingClientRect(), gl = document.getElementById('hubGlobe').getBoundingClientRect(); return { goBottom: Math.round(g.bottom), barTop: Math.round(tb.top), rowTop: Math.round(c.top), globeBottom: Math.round(gl.bottom), rowH: Math.round(c.height), noSheet: !document.getElementById('sheet') }; });
          check(fitBox.goBottom <= fitBox.barTop + 1 && fitBox.rowTop >= fitBox.globeBottom - 1 && fitBox.noSheet, `${tag} A: with the row open TAKE OFF is still above the bar, the row is under the globe and no modal covers the globe: ${JSON.stringify(fitBox)}`);
          // R3: the tapped city and the airports on its way are named beside their dots (the destination first, at most 6 names, inside the globe)
          const labels = await p.evaluate(() => { const wr = document.querySelector('.hub-globe-wrap').getBoundingClientRect(); return [...document.querySelectorAll('#hubLabels .globe-label')].map(e => { const r = e.getBoundingClientRect(); return { t: e.textContent, dest: e.classList.contains('dest'), inside: r.left >= wr.left - 1 && r.right <= wr.right + 1 && r.top >= wr.top - 1 && r.bottom <= wr.bottom + 1 }; }); });
          log.push(`${tag} labels: ${JSON.stringify(labels)}`);
          check(labels.length >= 1 && labels.length <= 6 && labels.some(l => l.dest && l.t === target.name) && labels.every(l => l.inside), `${tag} R3: the tapped city is labelled (and at most 6 names, all inside the globe): ${JSON.stringify(labels)}`);
          check(labels.slice(1).every(l => target.way.includes(l.t) && l.t !== target.name), `${tag} R3: the other names are airports on the route: ${JSON.stringify(labels)}`);
          await p.click('#hubSpinR', { timeout: 5000 }).catch(() => null); await p.waitForTimeout(300);
          check((await p.evaluate(() => document.querySelectorAll('#hubLabels .globe-label').length)) === 0, `${tag} R3: spinning the globe clears the names (the picture moves, the names would not)`);
          // B. closing puts the flight's own route back
          await p.click('#ccX', { timeout: 5000 }).catch(() => check(false, `${tag} B: the card has no close button`)); await p.waitForTimeout(500);
          const back = await p.evaluate(() => document.getElementById('hubGlobe').__globe.routePath());
          check((await p.evaluate(() => document.querySelectorAll('#hubLabels .globe-label').length)) === 0, `${tag} B: no names are left after closing`);
          check(JSON.stringify(back) === JSON.stringify(flightPath), `${tag} B: closing the card must put the flight's route back: ${JSON.stringify(back)} vs ${JSON.stringify(flightPath)}`);
        }
        // C. a destination 7 or more stops away keeps its whole route on HOME
        const far = await p.evaluate(async () => { const R = await import('/src/route.js'), P = await import('/src/pickcity.js'), ui = game.registry.get('ui'), s = ui.save; let best = null;
          for (const c of R.ROUTE) { const w = P.routeOf(s, c.name); if (w && (!best || w.length > best.length)) best = w; }
          if (best) { s.aimCity = best[best.length - 1]; ui.showTitle(); } return best; });
        await p.waitForTimeout(700);
        const homeRoute = await p.evaluate(() => document.getElementById('hubGlobe').__globe.routePath());
        log.push(`${tag} C: ${JSON.stringify([far, homeRoute])}`);
        check(far && far.length >= 8, `${tag} C: the test save has a city 7 or more stops away: ${far && far.length}`);
        check(far && JSON.stringify(homeRoute) === JSON.stringify(far), `${tag} C: a destination ${far && far.length - 1} stops away must keep its whole route on HOME (not cut at 5 cities): drawn ${homeRoute.length} cities, route ${far && far.length}`);
        check(!p.errs.length, `${tag} page errors: ${p.errs}`);
      } catch (e) { check(false, `${tag}: an exception stopped the run after the checks above: ${String(e).split('\n')[0].slice(0, 140)}`); }
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL routeonmap:\n - ${fails.join('\n - ')}` : 'PASS routeonmap: a tapped city draws its whole route on the globe, closing puts the flight\'s route back, a far destination keeps its whole route on HOME; at 390 and 320');
  process.exit(fails.length ? 1 : 0);
})();
