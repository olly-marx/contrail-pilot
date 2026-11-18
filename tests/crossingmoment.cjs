// The crossing moment, with REAL taps at 375x667 and 320x568 (R-A of the UX plan; the user's playtest of 0.29.0: "the first crossing was not obvious").
// A weurope pilot has the flight and the trial done; nature is the last condition. Before: HOME says "Cross: nature 0 of 30", MISSIONS shows the three conditions, no
// sheet, no dot. THE MOMENT: funding a NATURE project completes the last condition: the one-time sheet appears THERE (no results card involved). LATER closes it and it never
// returns; the HOME box says Ready! (UP NEXT does not repeat the crossing), the HOME tab has a dot, a tap on the box opens the CROSSINGS screen (no flight starts), so does a tap on the globe's ring;
// FLY THE CROSSING starts the flight. The other path: a flight's results card shows it after the reveal. (The "last condition met" lever: SEASON.offer.biodiversity.)
// Run: python3 -m http.server 8000 & node tests/crossingmoment.cjs   (plants in tools/plants.tsv)
const { chromium } = require('playwright-core');
const U = require('../tools/uxlib.cjs');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const SETUP = () => { const s = game.registry.get('save'), ui = game.registry.get('ui');
    Object.assign(s, { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5', 'weurope:night', 'weurope:shade10'], areaBest: { weurope: 99999 },
      crossed: [], crossingTold: [], unclaimed: [], seeds: 500, crystals: 50, discovered: { woodland: 1 }, freeProjectGiven: false, freeUpgrade: false, found: {}, habitat: {} });
    ui.tour.busy = true; ui.showTitle(); };
  const sheet = p => p.evaluate(() => { const e = document.getElementById('sheet'); return e ? e.innerText.replace(/\s+/g, ' ') : null; });
  // THE MOMENT is the full-screen 'Crossing unlocked!' card since 2026-11-18 (src/crossunlock.js; Oliver: a big celebration, not the small sheet). A tap elsewhere still opens the small sheet.
  const moment = p => p.evaluate(() => { const e = document.getElementById('crossUnlock'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ') : null; });
  for (const [W, H] of [[375, 667], [320, 568]]) {
    const tag = `${W}x${H}`; let p = await U.openPage(b, W, H, URL);
    await p.evaluate(SETUP); await p.waitForTimeout(600);
    const sv = () => p.evaluate(() => { const s = game.registry.get('save'); return { told: s.crossingTold, fly: s.flyCrossing ? s.flyCrossing.id : null }; });
    // 1. BEFORE: the nearest condition on HOME, the three ticks on MISSIONS, no sheet, no dot.
    const home0 = await p.evaluate(() => ({ rows: [(document.getElementById('hubCross') || { innerText: '' }).innerText.replace(/\s+/g, ' ').trim()], dot: !document.getElementById('dFly').hidden }));
    check(home0.rows.some(r => /NEXT CROSSING.*Nature 0 of 30/.test(r)) && !home0.dot && !(await sheet(p)), `${tag}: before the moment the HOME box says which tick is open, no dot, no sheet: ${JSON.stringify(home0)}`);
    await p.click('#tabMissions'); await p.waitForTimeout(500);
    const ticks = await p.evaluate(() => ({ label: [...document.querySelectorAll('#mList .label')].map(e => e.textContent.trim()).find(t => /^CROSSINGS/.test(t)), route: (document.querySelector('#mCross .xcard .xc-route') || {}).textContent, rows: [...document.querySelectorAll('#mCross .xcard:first-child .xc-row')].map(e => e.innerText.replace(/\s+/g, ' ').trim()) }));   // (the crossing CARD, 2026-11-18: it replaced the 'CROSSING TO X' tick list)
    check(ticks.label === 'CROSSINGS' && ticks.route === 'ROME > TUNIS' && ticks.rows.length === 3 && /Era.*done/.test(ticks.rows[0]) && /Plane.*done/.test(ticks.rows[1]) && /Nature.*0 \/ 30/.test(ticks.rows[2]), `${tag}: MISSIONS shows the crossing's three conditions: ${JSON.stringify(ticks)}`);
    // 2. THE MOMENT, in NATURE: funding a project completes the last condition.
    await p.evaluate(async () => { (await import('/src/season.js')).SEASON.offer.biodiversity = 1; });   // the lever: nature is "met" by the next project
    await p.click('#tabNature'); await p.waitForTimeout(700);
    const fund = await p.$('#wProjects [data-project].free') || await p.$('#wProjects [data-project]:not([disabled])');
    check(!!fund, `${tag}: NATURE offers a project to fund`);
    if (fund) { await fund.click(); await p.waitForTimeout(900); }
    const sh = await moment(p), shSmall = await sheet(p);
    const loop = p.errs.some(e => /call stack/i.test(e));   // a markTold that marks nothing makes showCrossingSheet -> refreshDots -> maybeCrossingSheet call itself
    check(sh && /CROSSING UNLOCKED!/.test(sh) && /cross to TUNIS!/i.test(sh) && /Era, Plane and Nature/.test(sh) && /Easy/.test(sh) && !shSmall, `${tag}: ${loop ? 'the card re-opens itself in a loop (the moment is never marked told): ' + p.errs[0] : 'the Crossing unlocked! card never appeared (or has the wrong words, or the small sheet came instead) after the last condition was met in NATURE: ' + sh + ' / sheet ' + shSmall}`);
    if (!sh) { await p.close(); continue; }   // nothing below can be asked of a sheet that is not there: fail by NAME, not by a timeout
    const a = await sv(); check(a.told && a.told.join() === 'mediterranean' && !a.fly, `${tag}: ${a.fly ? 'a flight started' : 'the told mark was not saved (crossingTold is ' + JSON.stringify(a.told) + ')'}: the sheet must mark it told and start NO flight`);
    // 3. LATER closes it, and it never comes back.
    await p.waitForTimeout(2800); await p.click('#cuLater'); await p.waitForTimeout(300);
    await p.evaluate(() => { game.registry.get('ui').persist(); game.registry.get('ui').refreshDots(); }); await p.waitForTimeout(400);
    check(!(await sheet(p)) && !(await moment(p)), `${tag}: LATER closes it and a later save or screen change does not bring it back`);
    // 4. HOME: the NEXT CROSSING box says Ready! and UP NEXT does not repeat the crossing (CROSSINGS V2); the HOME tab has a dot; a tap on the box opens the CROSSINGS screen, not a flight.
    await p.click('#tabFly'); await p.waitForTimeout(500);
    const home1 = await p.evaluate(() => ({ box: (document.getElementById('hubCross') || { innerText: '' }).innerText.replace(/\s+/g, ' ').trim(), up: (document.getElementById('hubNext') || { innerText: '' }).innerText.replace(/\s+/g, ' ').trim(), dot: !document.getElementById('dFly').hidden, sheet: !!document.getElementById('sheet') }));
    check(/NEXT CROSSING.*TUNIS.*Ready!/.test(home1.box) && !/Cross to TUNIS/.test(home1.up) && !home1.sheet, `${tag}: HOME's box says Ready! and UP NEXT does not repeat the crossing: ${JSON.stringify(home1)}`);
    check(home1.dot, `${tag}: the HOME tab dot (#dFly) is not lit while a crossing is ready: ${JSON.stringify(home1)}`);
    await p.click('#hubCross'); await p.waitForTimeout(400);
    const b1 = await sv();
    check(!b1.fly, `${tag}: a flight started on the box tap (it must only open the CROSSINGS screen): ${JSON.stringify(b1)}`);
    check(!!(await sheet(p)), `${tag}: a tap on the box opened no sheet`);
    if (b1.fly || !(await sheet(p))) { await p.close(); continue; }
    await p.click('#sheet .sheet-ok'); await p.waitForTimeout(300);
    // 5. The globe: the ring is on the map and a real tap on it opens the sheet.
    const pos = await p.evaluate(() => { const g = document.getElementById('hubGlobe').__globe; return g && g.markPos ? g.markPos() : null; });
    check(!!pos, `${tag}: the crossing's ring is on the HOME globe`);
    if (pos) { await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(400); check(!!(await sheet(p)), `${tag}: a tap on the globe's ring opens the sheet`); }
    // 6. FLY THE CROSSING starts it.
    if (await sheet(p)) { await p.click('#sheet .sheet-action'); await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s && ['takeoff', 'playing'].includes(s.state); }, null, { timeout: 15000 }).catch(() => {}); }
    const c = await sv(); check(c.fly === 'mediterranean', `${tag}: FLY THE CROSSING starts the crossing flight: ${JSON.stringify(c)}`);
    check(!p.errs.length, `${tag}: no page errors: ${p.errs.slice(0, 2)}`);
    await p.close();
    // 7. The other way in: a flight's results card shows the moment after its reveal.
    p = await U.openPage(b, W, H, URL); await p.evaluate(SETUP); await p.evaluate(async () => { (await import('/src/season.js')).SEASON.offer.biodiversity = 0; const ui = game.registry.get('ui');
      window.__r = { landed: true, landedAt: 'AMSTERDAM', from: 'LONDON', reason: '', distance: 5200, heat: 20, breakdown: { co2: 120, night: 5, sun: 40, trees: 10 }, earned: [{ label: 'Seeds', n: 23 }], mult: 1, kinds: 0, natureGains: [], crystals: 2, flyMinutes: 1.6, eraOpened: null, newPlane: null, school: false, newRecord: false, rewards: [], foundIds: [], missions2: { done: [], next: null }, mission: null };
      ui.showResults(window.__r); setTimeout(() => { ui.skipReveal = true; }, 50); });
    await p.waitForFunction(() => document.getElementById('crossUnlock'), null, { timeout: 8000 }).catch(() => {});
    const afterFlight = await p.evaluate(() => ({ sheet: document.getElementById('crossUnlock') ? document.getElementById('crossUnlock').innerText.replace(/\s+/g, ' ') : null, results: !document.getElementById('results').hidden, row: (document.querySelector('#rNextRows .rc-row.must') || {}).innerText }));
    check(afterFlight.sheet && /CROSSING UNLOCKED!/.test(afterFlight.sheet) && afterFlight.results && /Cross to TUNIS/.test(afterFlight.row || ''), `${tag}: after a flight the results card shows the row and the sheet appears: ${JSON.stringify(afterFlight)}`);
    // 8. The card's own FLY THE CROSSING starts the crossing flight (the card, not the small sheet).
    if (afterFlight.sheet) { await p.waitForTimeout(2800); await p.click('#cuGo'); await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s && ['takeoff', 'playing'].includes(s.state); }, null, { timeout: 15000 }).catch(() => {});
      const g = await p.evaluate(() => ({ fly: (game.registry.get('save').flyCrossing || {}).id || game.registry.get('save').flyCrossing || null, card: !!document.getElementById('crossUnlock') }));
      check(/mediterranean/.test(JSON.stringify(g.fly)) && !g.card, `${tag}: the card's FLY THE CROSSING starts the crossing flight and the card goes: ${JSON.stringify(g)}`); }
    await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL crossingmoment:\n - ${fails.join('\n - ')}` : 'PASS crossingmoment: HOME and MISSIONS say what is near; the Crossing unlocked! card appears once, in NATURE or on the results card; the row and the globe ring open it; FLY THE CROSSING starts the flight');
  process.exit(fails.length ? 1 : 0);
})();
