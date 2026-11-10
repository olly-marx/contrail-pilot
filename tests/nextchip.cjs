// THE DEFAULT DESTINATION ON HOME (src/destination.js, src/ui.js renderHub / openDestinationSheet; ROUTING V2 step 2). Real taps at 390x844 and 320x568, a season 2 save in LONDON with only LONDON visited:
// A. with nothing chosen the route chip says 'Next: <the nearest unvisited city> change' (not the old 'LONDON > X' line) and fits the screen; B. a tap opens the FLY TO sheet: NEXT, the city, its stops, CHANGE and FLY;
// C. CHANGE closes it and says 'Tap a city on the globe.'; D. FLY starts a flight whose path begins with the shortest way to that city and sets no aim; E. a destination the player chose reads 'GOING TO' with STOP and the chip keeps the route line;
// F. with every city visited the chip keeps the old route line. Plants: tools/plants.tsv, test `nextchip`. Run: python3 -m http.server 8000 & node tests/nextchip.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
      await p.goto(URL); await ready(p);
      await p.waitForFunction(() => { const b = document.getElementById('hubRoute'); return !!b && b.offsetParent !== null; }, null, { timeout: 15000 }).catch(() => null);
      const closeSheet = () => p.evaluate(() => { const e = document.getElementById('sheet'); if (e) e.remove(); });
      const openChip = async () => { await closeSheet(); await p.click('#hubRoute', { timeout: 5000 }).catch(() => check(false, `${tag}: the route chip could not be tapped`)); await p.waitForTimeout(400); };
      const chip = () => p.evaluate(() => { const e = document.getElementById('hubRoute'), r = e.getBoundingClientRect(); return { text: e.innerText.replace(/\s+/g, ' ').trim(), inside: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1, h: Math.round(r.height) }; });
      // G. an open city mission still aims the flight (step 3 retires that): the chip keeps the route line and the sheet says MISSION with the mission's city, never a different default
      const g0 = await chip(); await openChip(); const gs = await p.evaluate(() => (document.getElementById('sheet') || { innerText: '' }).innerText.replace(/\s+/g, ' ')); await closeSheet();
      log.push(`${tag} G: ${JSON.stringify([g0.text, gs])}`);
      check(/\(mission\)/.test(g0.text) && /^MISSION/.test(gs) && gs.includes(g0.text.split('▶')[1].trim().split(' ')[0]), `${tag} G: with a mission aim the chip keeps the route line and the sheet says MISSION and the same city: ${JSON.stringify([g0.text, gs])}`);
      await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.skipAim = true; ui.showTitle(); }); await p.waitForTimeout(600);   // the player skips the mission route: now nothing is chosen
      const exp = await p.evaluate(async () => { const D = await import('/src/destination.js'), R = await import('/src/route.js'), s = game.registry.get('ui').save, L = R.linksFor(s), t = D.defaultTargetFrom(L, s.city, s.visited), way = t && R.pathTo(s.city, t, L); return { t, hops: way ? way.length - 1 : 0, linked: !!t && L[s.city].includes(t) || (way && way.length > 2) }; });
      check(!!exp.t, `${tag}: no default destination from LONDON in the test save`);
      const c0 = await chip(); log.push(`${tag} A: ${JSON.stringify(c0)}`);
      check(c0.text.startsWith(`Next: ${exp.t}`) && /change/i.test(c0.text) && !/▶/.test(c0.text) && c0.inside, `${tag} A: the chip must say 'Next: ${exp.t} change' and fit: ${JSON.stringify(c0)}`);
      // B. the sheet
      await openChip();
      const sh = await p.evaluate(() => { const e = document.getElementById('sheet'); return { text: e ? e.innerText.replace(/\s+/g, ' ').trim() : '', change: !!document.getElementById('dsChange'), fly: !!(e && [...e.querySelectorAll('button')].find(x => /^FLY$/i.test(x.innerText.trim()))), stop: !!document.getElementById('dsStop') }; });
      log.push(`${tag} B: ${JSON.stringify(sh)}`);
      const cbox = await p.evaluate(() => { const b = document.getElementById('dsChange'), r = b && b.getBoundingClientRect(); return r ? [Math.round(r.width), Math.round(r.height)] : null; });
      check(cbox && cbox[0] >= 40 && cbox[1] >= 40, `${tag} B: CHANGE is a real button, at least 40 x 40 px (not a 7 px link): ${JSON.stringify(cbox)}`);
      check(new RegExp(`NEXT.*${exp.t}.*\\d stops?`).test(sh.text) && sh.change && sh.fly && !sh.stop, `${tag} B: the sheet must show NEXT, ${exp.t}, its stops, CHANGE and FLY (no STOP): ${JSON.stringify(sh)}`);
      // C. CHANGE
      await p.click('#dsChange', { timeout: 4000 }).catch(() => check(false, `${tag} C: the sheet has no CHANGE button`)); await p.waitForTimeout(400);
      const ch = await p.evaluate(() => ({ sheet: !!document.getElementById('sheet') && !document.getElementById('sheet').hidden && document.getElementById('sheet').innerText.length > 0, toast: document.body.innerText.includes('Tap a city on the globe') }));
      check(ch.toast, `${tag} C: CHANGE must say 'Tap a city on the globe.': ${JSON.stringify(ch)}`);
      // E. a chosen destination (before D: D starts the flight)
      await p.evaluate(t => { const ui = game.registry.get('ui'); ui.save.aimCity = t; ui.showTitle(); }, exp.t); await p.waitForTimeout(600);
      const c1 = await chip(); await openChip();
      const e1 = await p.evaluate(() => ({ text: document.getElementById('sheet') ? document.getElementById('sheet').innerText.replace(/\s+/g, ' ') : '', stop: !!document.getElementById('dsStop') }));
      log.push(`${tag} E: ${JSON.stringify([c1, e1])}`);
      check(/▶/.test(c1.text) && !/^Next:/.test(c1.text) && new RegExp(`GOING TO.*${exp.t}`).test(e1.text) && e1.stop, `${tag} E: a chosen destination keeps the route line and the sheet says GOING TO with STOP: ${JSON.stringify([c1.text, e1])}`);
      await p.click('#dsStop', { timeout: 4000 }).catch(() => check(false, `${tag} E: no STOP button`)); await p.waitForTimeout(500);
      check((await p.evaluate(() => game.registry.get('ui').save.aimCity)) == null, `${tag} E: STOP did not clear the destination`);
      // D. FLY on the default
      await openChip();
      const flyBtn = await p.evaluate(() => { const e = document.getElementById('sheet'), b = e && [...e.querySelectorAll('button')].find(x => /^FLY$/i.test(x.innerText.trim())); if (!b) return false; b.click(); return true; });
      check(flyBtn, `${tag} D: the FLY TO sheet has no FLY button`);
      if (flyBtn) await started(p).catch(() => null);
      const fl = await p.evaluate(async () => { const sc = game.scene.getScene('game'), D = await import('/src/destination.js'), R = await import('/src/route.js'), s = game.registry.get('ui').save, L = R.linksFor(s), want = R.pathTo(sc.path[0], D.defaultTargetFrom(L, sc.path[0], s.visited), L); return { state: sc.state, path: sc.path.slice(0, 6), want, aim: s.aimCity || null }; });
      log.push(`${tag} D: ${JSON.stringify(fl)}`);
      check(['takeoff', 'playing'].includes(fl.state) && fl.aim === null && fl.want && JSON.stringify(fl.path.slice(0, fl.want.length)) === JSON.stringify(fl.want), `${tag} D: FLY must start a flight whose path begins with the shortest way to the default and set no aim: ${JSON.stringify(fl)}`);
      // F. everything visited: the old route line
      await p.goto(URL); await ready(p);
      await p.evaluate(async () => { const R = await import('/src/route.js'), ui = game.registry.get('ui'); ui.save.visited = Object.keys(R.linksFor(ui.save)); ui.showTitle(); }); await p.waitForTimeout(600);
      const c2 = await chip(); log.push(`${tag} F: ${JSON.stringify(c2)}`);
      check(/▶/.test(c2.text) && !/^Next:/.test(c2.text), `${tag} F: with every city visited the chip keeps the route line: ${JSON.stringify(c2)}`);
      check(!p.errs.length, `${tag} page errors: ${p.errs}`);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL nextchip:\n - ${fails.join('\n - ')}` : 'PASS nextchip: the chip names the nearest unvisited city, its sheet shows stops with CHANGE and FLY, FLY starts the shortest way with no aim, a chosen destination reads GOING TO with STOP, all visited keeps the route line; at 390 and 320');
  process.exit(fails.length ? 1 : 0);
})();
