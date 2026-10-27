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
  const rec = { ever: { longest: 4321, cool: 12, longestCrash: 900, shortest: 150, bird: 2, crashes: 5 }, week: { start: '2026-10-26', longest: 2500, cool: 3, longestCrash: 400, shortest: 400, bird: 1, crashes: 1, kindsBase: [], missionsBase: 5 }, fresh: ['longest', 'shortest'] };
  p = await open({ ...base, landings: 3, planted: { oak: 2, birch: 1 }, missionsDone: [...base.missionsDone, 'weurope:shade', 'weurope:bring'], records: rec });
  check(await tab(p), 'BOARDS appears after the 3rd landing');
  await p.click('#tabBoards'); await p.waitForTimeout(500);

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
  check(/bird strike/i.test(what.rule) && /YOUR records/.test(what.msg), `a tap shows the rule; the first visit says YOUR records: ${JSON.stringify(what)}`);
  await p.click('#hubBack').catch(() => {}); await p.evaluate(() => game.registry.get('ui').go('fly')); await p.waitForTimeout(300);
  await p.click('#tabBoards'); await p.waitForTimeout(400);
  const again = await p.evaluate(() => ({ marks: document.querySelectorAll('#bBoards .new').length, msg: document.getElementById('bMsg').textContent }));
  check(again.marks === 0 && !/YOUR records/.test(again.msg), `NEW RECORD! and the first-visit line are gone on the second visit: ${JSON.stringify(again)}`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await p.close(); await b.close();
  console.log(fails.length ? `FAIL records-screen:\n - ${fails.join('\n - ')}` : 'PASS records-screen: BOARDS after the 3rd landing, 4 good + 4 oops cards, THIS WEEK / EVER, own numbers, NEW RECORD! once, rules on tap');
  process.exit(fails.length ? 1 : 0);
})();
