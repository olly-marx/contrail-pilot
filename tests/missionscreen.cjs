// Season 2 missions on screen (S3 of research/PROPOSAL-HOME-MISSIONS.md). Phone size.
// 1. a save with no start area gets the start choice as a FULL screen at once, and the hub after it;
// 2. a free upgrade LEADS into the hangar (the user): NEXT says so and opens the hangar, the tile pulses, TAKE OFF is
//    secondary, and "later" lets you fly on; 3. the MISSIONS tile opens the list (starred rows = the crossing trial);
// 4. an off-flight mission completes the moment you fund a project, with no flight; 5. the hangar tour starts on the hub.
// Run: python3 -m http.server 8000 & node tests/missionscreen.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  const base = { tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], priceVersion: 2, landings: 3, flights: 4, seeds: 300, crystals: 40, fleet };
  const open = async save => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); }, save);   // season 2 keeps its save under s2:
    await p.goto(URL); await ready(p); await p.waitForTimeout(600);
    return p;
  };
  const saveIn = p => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));   // (in the page the s2: prefix is already applied)
  // 1. The start choice: a full screen, at once.
  let p = await open({ ...base });
  const sc = await p.evaluate(() => { const e = document.getElementById('startChoice'); if (!e) return null; const r = e.getBoundingClientRect(); const bg = getComputedStyle(e).backgroundColor; return { w: r.width, h: r.height, opaque: /^rgb\(/.test(bg) || /, 1\)$/.test(bg), bg, hubShown: !document.getElementById('title').hidden && document.getElementById('title').getBoundingClientRect().height > 0 }; });
  check(sc && sc.w >= 380 && sc.h >= 830 && sc.opaque, `the start choice is an opaque full screen at once (not a pop-up over the hub): ${JSON.stringify(sc)}`);
  if (sc) { await p.click('#startChoice [data-area="weurope"]'); await p.click('#startChoice [data-city="LONDON"]'); await p.waitForTimeout(500); }
  const after = await p.evaluate(() => ({ gone: !document.getElementById('startChoice'), hub: !document.getElementById('title').hidden }));
  check(after.gone && after.hub && (await saveIn(p)).city === 'LONDON', `after choosing: the hub, from LONDON: ${JSON.stringify(after)}`);
  await p.close();
  // 2. The free upgrade leads into the hangar.
  const s2 = { ...base, areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', missionsDone: ['L1'], freeUpgrade: true, freeGiven: true };
  p = await open(s2);
  const lead = await p.evaluate(() => ({ next: document.getElementById('hubNext').innerText, pulse: !!document.querySelector('#hubTiles [data-go="hangar"].pulse'), dim: document.getElementById('goBtn').classList.contains('locked') }));
  check(/Open the hangar: free upgrade/.test(lead.next) && lead.pulse && lead.dim, `a free upgrade: NEXT leads to the hangar, the tile pulses, TAKE OFF is locked: ${JSON.stringify(lead)}`);
  check(await p.evaluate(() => document.getElementById('goBtn').disabled), 'TAKE OFF is locked while the free part waits (checked on the hub)');
  await p.click('#hubNext'); await p.waitForTimeout(400);
  check(await p.evaluate(() => !document.getElementById('hangar').hidden), 'tapping NEXT opens the hangar');
  // Pick the free part (the user: a must-do, no "later"), then TAKE OFF unlocks.
  const pick = await p.evaluate(() => ({ rows: document.querySelectorAll('#hFleet .freepick .freerow').length, top: (document.querySelector('#hFleet .freepick') || {}).offsetTop }));
  check(pick.rows === 1, `on the rails the hangar opens with ONE free choice (cleaner engines) at the top: ${JSON.stringify(pick)}`);
  const free = await p.$('#hFleet .freepick .btn.free');
  check(!!free, 'the hangar shows FREE! buttons');
  // 0.16.3: the payoff (the plane, then the new part arriving, then OK) covers the screen until OK is tapped.
  if (free) { await free.click(); await p.click('#payOk', { timeout: 10000 }).catch(() => fails.push('the payoff OK never appeared after the free pick')); await p.waitForTimeout(400); }
  if (await p.isVisible('#payOk')) { check(await p.evaluate(() => !!document.querySelector('#payoff img')), 'the free part shows its payoff (the plane with it)'); await p.click('#payOk'); } else await p.click('#tabFly');   // (season 2: the payoff's OK goes home)
  await p.waitForTimeout(400);
  const after2 = await p.evaluate(() => ({ next: document.getElementById('hubNext').innerText, locked: document.getElementById('goBtn').disabled, text: document.getElementById('goBtn').textContent }));
  check(!/free upgrade/.test(after2.next) && !after2.locked && /TAKE OFF/.test(after2.text), `after picking the free part: NEXT is the lesson, TAKE OFF is unlocked: ${JSON.stringify(after2)}`);
  await p.close();
  // 3-4. The MISSIONS screen, and an off-flight mission.
  p = await open({ ...s2, freeUpgrade: false, found: { rabbit: 1, fox: 1 }, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5', 'weurope:shade', 'weurope:plant-tree', 'weurope:bring', 'weurope:chain', 'weurope:dodge', 'weurope:rescue'] });
  await p.click('#hubTiles [data-go="missions"]'); await p.waitForTimeout(400);
  const ms = await p.evaluate(() => ({ shown: !document.getElementById('missions').hidden, rows: document.querySelectorAll('#mList .mrow').length, stars: document.querySelectorAll('#mList .mrow.star').length, back: !document.getElementById('tabbar').hidden && !document.getElementById('tabFly').hidden }));
  check(ms.shown && ms.rows >= 3 && ms.stars === 3 && ms.back, `the MISSIONS screen lists the open missions, 3 starred, with the bar's HOME: ${JSON.stringify(ms)}`);
  // S4: the MISSIONS screen has a "Today" label and the day's trio under the tier list (the menu sets the trio from today's date), tinted
  // apart from the area's rows; none of them starred (only the crossing trial is).
  const today = await p.evaluate(() => ({ label: [...document.querySelectorAll('#mList .label')].map(e => e.textContent), daily: document.querySelectorAll('#mList .mrow.daily').length,
    dailyStars: document.querySelectorAll('#mList .mrow.daily.star').length, tier: document.getElementById('mTier').textContent,
    order: (() => { const l = document.querySelector('#mList .label'), d = document.querySelector('#mList .mrow.daily'), a = document.querySelector('#mList .mrow:not(.daily)'); return !!(l && d && a && (a.compareDocumentPosition(l) & 4) && (l.compareDocumentPosition(d) & 4)); })() }));
  check(today.label.includes('Today') && today.daily >= 1 && today.daily <= 3 && today.dailyStars === 0 && today.order, `the MISSIONS screen lists the day's trio under a "Today" label, after the area's rows, none starred: ${JSON.stringify(today)}`);
  check(/^Tier \d of 3$/.test(today.tier), `the MISSIONS screen names the tier: ${today.tier}`);
  await p.click('#tabFly'); await p.waitForTimeout(300);
  await p.click('#hubTiles [data-go="nature"]'); await p.waitForTimeout(600);
  // Tap an animal to see it close up (the user, 2026-10-27): on a project card's "Brings back" row, and in the field picture.
  const web = await p.$('#wProjects .w-webpic[data-species]');
  if (web) { await web.click(); await p.waitForTimeout(300); }
  check(web && await p.evaluate(() => !document.getElementById('wInfo').hidden && /\S/.test(document.getElementById('wInfoBody').innerText)), 'tapping an animal on a project card opens its card');
  await p.evaluate(() => { document.getElementById('wInfo').hidden = true; });
  const critter = await p.$('#wScene [data-critter]');
  if (critter) { await critter.evaluate(e => e.click()); await p.waitForTimeout(300); }   // (it walks about: a timed mouse click can miss it)
  const card = await p.evaluate(() => ({ shown: !document.getElementById('wInfo').hidden, text: document.getElementById('wInfoBody').innerText.slice(0, 40) }));
  check(critter && card.shown && /Found!/i.test(card.text), `tapping a found animal in the NATURE picture opens its card: ${!!critter} ${JSON.stringify(card)}`);
  await p.evaluate(() => { document.getElementById('wInfo').hidden = true; });
  const pid = await p.evaluate(() => { const b = document.querySelector('#wProjects [data-project]:not([disabled])'); return b && b.dataset.project; });
  if (pid) { await p.click(`#wProjects [data-project="${pid}"]`); await p.waitForTimeout(400); }
  const fund = await saveIn(p);
  check(pid && (fund.missionsDone || []).includes('weurope:project') && (fund.unclaimed || []).some(u => u.key === 'mission:weurope:project'), `funding a project completes "Fund a nature project here" with no flight: ${pid} ${JSON.stringify(fund.missionsDone)}`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await p.close();
  // 4b. An off-flight mission ALREADY met ticks when the menu or the MISSIONS screen opens, not at the next purchase (S5; the sim
  // chat's nit): tier 2 open, a helper system owned, "Buy a helper system" not yet done.
  p = await open({ ...s2, freeUpgrade: false, fleet: { ...fleet, systems: { forecast: 1 } },
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5', 'weurope:shade', 'weurope:bring', 'weurope:project'] });
  await p.click('#hubTiles [data-go="missions"]'); await p.waitForTimeout(400);
  const met = await saveIn(p);
  check((met.missionsDone || []).includes('weurope:system'), `opening MISSIONS ticks an off-flight mission already met: ${JSON.stringify(met.missionsDone)}`);
  await p.close();
  // 4c. The user's own save (live 0.15.0): a free part waiting from the school landing, no lesson done, the hangar
  // hidden. On load the hangar must be revealed, NEXT must lead there and TAKE OFF must be locked (the fix unsticks them).
  p = await open({ ...s2, freeUpgrade: true, freeGiven: true, missionsDone: [] });
  const stuck = await p.evaluate(() => ({ tile: !!document.querySelector('#hubTiles [data-go="hangar"]'), next: document.getElementById('hubNext').innerText, locked: document.getElementById('goBtn').disabled }));
  check(stuck.tile && /free upgrade/i.test(stuck.next) && stuck.locked, `an existing save with a free part waiting and no lesson done: hangar revealed, NEXT leads there, TAKE OFF locked: ${JSON.stringify(stuck)}`);
  await p.close();
  // 4d. Lesson 5 with prizes unclaimed and parcels unaffordable (the audit, 2026-10-27): NEXT says to claim them and opens
  // MISSIONS, where the CLAIM buttons pulse during the lessons. (Since 2026-10-28 the first parcels are free: this is the case once they were given.)
  p = await open({ ...s2, freeUpgrade: false, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4'], freeParcelsGiven: true, unclaimed: [{ key: 'mission:L4', kind: 'mission', id: 'L4', label: 'Skip one airport, land at the next', seeds: 70, crystals: 1 }] });
  const cl = await p.evaluate(() => document.getElementById('hubNext').innerText);
  check(/Claim your prizes/i.test(cl), `lesson 5, prizes unclaimed, parcels unaffordable: NEXT = "${cl}"`);
  await p.click('#hubNext'); await p.waitForTimeout(400);
  const pulse = await p.evaluate(() => ({ shown: !document.getElementById('missions').hidden, pulse: document.querySelectorAll('#mPrizes .btn.claim.pulse').length }));
  check(pulse.shown && pulse.pulse >= 1, `NEXT opens MISSIONS with the CLAIM buttons pulsing: ${JSON.stringify(pulse)}`);
  await p.close();
  // 5. The hangar tour starts on the hub (tours on).
  p = await open({ ...s2, seenTips: ['x-bars'], tours: [], shownLines: [], flights: 1 });   // a real new player: shownLines set on first load (else tour.js counts an old save's hangar tour as done)
  await p.waitForTimeout(1200);
  const tour = await p.evaluate(() => { const t = document.getElementById('tour'); return t && !t.hidden ? t.querySelector('.tbubble p').textContent : ''; });
  check(/Open the hangar/i.test(tour), `with a free upgrade the rails point at the hangar from the hub: "${tour}"`);
  await p.close(); await b.close();
  console.log(fails.length ? `FAIL missionscreen:\n - ${fails.join('\n - ')}` : 'PASS missionscreen: full-screen start choice, the free upgrade leads into the hangar, MISSIONS screen, off-flight on funding, hangar tour from the hub');
  process.exit(fails.length ? 1 : 0);
})();
