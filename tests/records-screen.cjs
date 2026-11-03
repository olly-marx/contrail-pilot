// MY RECORDS on screen (src/recordsui.js; the boards for season 2, the user's answers 2026-10-27). The game as shipped, phone size.
//   1. BOARDS is hidden until the 3rd landing, and there after it;
//   2. the screen shows 4 good + 4 oops cards, THIS WEEK / EVER (no 4 periods, no points, no "how points work");
//   3. the numbers are the player's own (EVER and THIS WEEK differ), a never-happened board shows a dash;
//   4. NEW RECORD! marks the board just beaten, and is gone the next time the screen is opened;
//   5. tapping a card says its one-line rule; the first visit says these are YOUR records.
// PLANTS (tools/plants.tsv, test `records-screen`; each must FAIL this test). Run: python3 -m http.server 8000 & node tests/records-screen.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  const base = { tutorialDone: true, muted: true, seenTips: ['x-bars'], tours: ['*'], priceVersion: 2, flights: 6, seeds: 100, fleet, areas: ['weurope'], homeArea: 'weurope', city: 'LONDON', freeGiven: true, freeUpgrade: false, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'] };
  const open = async save => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); }, save);   // season 2 keeps its save under s2:
    await p.goto(URL); await ready(p); await p.waitForTimeout(700);
    return p;
  };
  const tab = p => p.evaluate(() => { const t = document.getElementById('tabBoards'); return !!t && !t.hidden && t.getBoundingClientRect().width > 0; });

  // 1. Hidden before the 3rd landing; there after it.
  let p = await open({ ...base, landings: 2 });
  check(!(await tab(p)), 'BOARDS is hidden before the 3rd landing');
  await p.close();
  // THIS WEEK is the week of TODAY (the game rolls a save's week over on a new Monday, UTC like ui.js): a fixed '2026-10-26' made this test fail from Monday 2 Nov 2026 on (CI run 165).
  const weekStart = (d => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); })(new Date().toISOString().slice(0, 10));
  const rec = { ever: { longest: 4321, cool: 12, longestCrash: 900, shortest: 150, bird: 2, crashes: 5 }, week: { start: weekStart, longest: 2500, cool: 3, longestCrash: 400, shortest: 400, bird: 1, crashes: 1, kindsBase: [], missionsBase: 5 }, fresh: ['longest', 'shortest'] };
  p = await open({ ...base, landings: 3, planted: { oak: 2, birch: 1 }, missionsDone: [...base.missionsDone, 'weurope:shade', 'weurope:bring'], records: rec });
  check(await tab(p), 'BOARDS appears after the 3rd landing');
  // (R9: NEW RECORD! comes from src/fresh.js keys; a record beaten BEFORE the load would be marked seen by the one-time migration, so two records are beaten now, in the session)
  await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.records.beaten = ['record:longest:ever:4321', 'record:shortest:ever:150']; ui.go('fly'); }); await p.waitForTimeout(200);
  await p.click('#tabBoards'); await p.waitForTimeout(500);
  const toast1 = await p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; });   // (R9: the first-visit line is a toast)

  // 2. 4 good + 4 oops cards, 2 periods, no points.
  const s1 = await p.evaluate(() => ({ shown: !document.getElementById('boards').hidden, cards: [...document.querySelectorAll('#bBoards .btn.rec')].map(e => e.querySelector('b').textContent),
    oops: document.querySelectorAll('#bBoards .btn.rec.oops').length, periods: [...document.querySelectorAll('#bPeriods .btn')].map(e => e.textContent), points: /points/i.test(document.getElementById('boards').innerText), infoBtn: !document.getElementById('bInfo').hidden,
    title: document.querySelector('#boards h2').textContent }));
  check(s1.shown && s1.cards.length === 8 && s1.oops === 4, `4 good + 4 oops cards: ${JSON.stringify(s1)}`);
  check(JSON.stringify(s1.cards) === JSON.stringify(['FURTHEST FLIGHT', 'TREE KINDS', 'COOL SKIES', 'MISSIONS', 'LONGEST CRASH', 'SHORTEST FLIGHT', 'BIRD MAGNET', 'MOST CRASHES']), `the 8 boards in order: ${JSON.stringify(s1.cards)}`);
  check(JSON.stringify(s1.periods) === JSON.stringify(['THIS WEEK', 'EVER']) && !s1.points && !s1.infoBtn, `two periods, no points, no "how points work": ${JSON.stringify({ p: s1.periods, points: s1.points, info: s1.infoBtn })}`);

  // 3. Own numbers: THIS WEEK first, then EVER.
  const nums = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#bBoards .btn.rec')].map(e => [e.dataset.board, e.querySelector('.val').textContent])));
  const wk = await nums();
  check(wk.longest === '2,500 km' && wk.bird === '1 strike' && wk.crashes === '1 crash' && wk.shortest === '400 km', `THIS WEEK numbers: ${JSON.stringify(wk)}`);
  check(wk.kinds === '2 kinds' && wk.missions === '2 done', `KINDS (2 kinds planted since the week began: oak, birch) and MISSIONS (2 done since): ${JSON.stringify(wk)}`);
  await p.click('#bPeriods [data-period="ever"]', { timeout: 4000 }).catch(() => fails.push('there is no EVER period button')); await p.waitForTimeout(200);
  const ev = await nums();
  check(ev.longest === '4,321 km' && ev.bird === '2 strikes' && ev.crashes === '5 crashes' && ev.shortest === '150 km' && ev.longestCrash === '900 km', `EVER numbers: ${JSON.stringify(ev)}`);
  check(ev.missions === '7 done' && ev.kinds === '2 kinds', `EVER: 7 missions done, 2 kinds (oak, birch): ${JSON.stringify(ev)}`);

  // 4. NEW RECORD! on the boards just beaten, and gone on the next visit.
  const marks = await p.evaluate(() => [...document.querySelectorAll('#bBoards .btn.rec')].filter(e => e.querySelector('.new')).map(e => e.dataset.board).sort());
  check(JSON.stringify(marks) === JSON.stringify(['longest', 'shortest']), `NEW RECORD! on the two boards beaten: ${JSON.stringify(marks)}`);
  // 5. A card says its rule; the first visit says these are YOUR records.
  await p.click('#bBoards [data-board="bird"]'); await p.waitForTimeout(150);
  const what = await p.evaluate(() => ({ rule: document.getElementById('bWhat').textContent, msg: document.getElementById('bMsg').textContent }));
  check(/bird strike/i.test(what.rule) && /YOUR records/.test(toast1) && /Pick a name in PILOT/.test(what.msg), `a tap shows the rule; the first visit TOASTS YOUR records; a device with no pilot name is told in the standing line to pick one (online is back): ${JSON.stringify({ what, toast1 })}`);
  await p.click('#hubBack').catch(() => {}); await p.evaluate(() => game.registry.get('ui').go('fly')); await p.waitForTimeout(300);
  await p.click('#tabBoards'); await p.waitForTimeout(400);
  const again = await p.evaluate(() => ({ marks: document.querySelectorAll('#bBoards .new').length, msg: document.getElementById('bMsg').textContent, toast: (t => t && !t.hidden ? t.textContent : '')(document.getElementById('toast')) }));
  check(again.marks === 0 && !/YOUR records/.test(again.msg + again.toast), `NEW RECORD! and the first-visit toast are gone on the second visit: ${JSON.stringify(again)}`);
  // 6. R9: RECORDS / BADGES sub-tabs. A badge tier earned since the last visit lights a dot on BADGES (the bar's BOARDS too) while RECORDS shows;
  // BADGES shows the grid at 7 px minimum with a dot on the new badge; a tap opens its sheet; the next visit has no dots; the hangar has no badge grid.
  const st = () => p.evaluate(() => ({ tabs: [...document.querySelectorAll('#bSubtabs .subtab')].map(e => e.textContent + (e.querySelector('.dot') ? '*' : '')), bar: !document.getElementById('dBoards').hidden }));
  const s0 = await st();
  check(JSON.stringify(s0.tabs) === JSON.stringify(['RECORDS', 'BADGES']) && !s0.bar, `two sub-tabs, no dots yet: ${JSON.stringify(s0)}`);
  await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.badgeTiers = { ...(ui.save.badgeTiers || {}), forester: 2 }; ui.go('fly'); });
  await p.waitForTimeout(200);
  check(await p.evaluate(() => !document.getElementById('dBoards').hidden), 'a badge tier earned lights the BOARDS dot on the bar');
  await p.click('#tabBoards'); await p.waitForTimeout(300);
  check(JSON.stringify((await st()).tabs) === JSON.stringify(['RECORDS', 'BADGES*']), `RECORDS is showing: the dot is on BADGES: ${JSON.stringify(await st())}`);
  await p.click('[data-btab=badges]'); await p.waitForTimeout(300);
  const bd = await p.evaluate(() => { const g = [...document.querySelectorAll('#bBadges .badge2')], f = e => parseFloat(getComputedStyle(e).fontSize); return { n: g.length, small: g.filter(e => f(e) < 7 || [...e.querySelectorAll('b,span')].some(x => f(x) < 7)).length, dots: [...document.querySelectorAll('#bBadges .badge2 .dot')].map(d => d.parentElement.dataset.badge), bar: !document.getElementById('dBoards').hidden, hangar: !!document.getElementById('hBadges') }; });
  check(bd.n >= 20 && bd.small === 0 && JSON.stringify(bd.dots) === '["forester"]' && !bd.bar && !bd.hangar, `BADGES: the grid at >= 7 px, a dot on the new badge only, the bar dot cleared, no badge grid in the hangar: ${JSON.stringify(bd)}`);
  await p.click('#bBadges [data-badge=forester]'); await p.waitForTimeout(200);
  check(await p.evaluate(() => /Forester|forester/i.test((document.getElementById('sheet') || {}).textContent || '') && !!document.querySelector('#sheet .sheet-ok')), 'tapping a badge opens its sheet');
  await p.click('#sheet .sheet-ok'); await p.waitForTimeout(150);
  await p.evaluate(() => game.registry.get('ui').go('fly')); await p.waitForTimeout(200); await p.click('#tabBoards'); await p.waitForTimeout(300); await p.click('[data-btab=badges]'); await p.waitForTimeout(250);
  check(await p.evaluate(() => document.querySelectorAll('#bBadges .badge2 .dot').length) === 0, 'the next visit has no badge dot (it was seen)');
  check(!p.errs.length, `page errors: ${p.errs}`);
  await p.close(); await b.close();
  console.log(fails.length ? `FAIL records-screen:\n - ${fails.join('\n - ')}` : 'PASS records-screen: BOARDS after the 3rd landing, 4 good + 4 oops cards, THIS WEEK / EVER, own numbers, NEW RECORD! once, rules on tap');
  process.exit(fails.length ? 1 : 0);
})();
