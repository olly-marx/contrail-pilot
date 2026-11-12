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
  const lead = await p.evaluate(() => ({ next: document.getElementById('hubNext').innerText, glow: document.getElementById('tabHangar').classList.contains('glow'), leadRow: !!document.querySelector('#hubNext .rc-row.must'), dim: document.getElementById('goBtn').classList.contains('locked') }));
  check(/free part/i.test(lead.next) && lead.leadRow && lead.glow && lead.dim, `a free upgrade: UP NEXT leads to the hangar (R3: a gold lead row), the bar's HANGAR glows, TAKE OFF is locked: ${JSON.stringify(lead)}`);
  check(await p.evaluate(() => document.getElementById('goBtn').disabled), 'TAKE OFF is locked while the free part waits (checked on the hub)');
  await p.click('#hubNext .rc-row.must'); await p.waitForTimeout(400);
  check(await p.evaluate(() => !document.getElementById('hangar').hidden), 'tapping the lead row of UP NEXT opens the hangar');
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
  check(!/free part/i.test(after2.next) && !after2.locked && /TAKE OFF/.test(after2.text), `after picking the free part: NEXT is the lesson, TAKE OFF is unlocked: ${JSON.stringify(after2)}`);
  await p.close();
  // 3-4. The MISSIONS screen, and an off-flight mission.
  p = await open({ ...s2, freeUpgrade: false, found: { rabbit: 1, fox: 1 }, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5', 'weurope:shade', 'weurope:plant-tree', 'weurope:bring', 'weurope:chain', 'weurope:dodge', 'weurope:rescue'] });
  await p.click('#tabMissions'); await p.waitForTimeout(400);
  const ms = await p.evaluate(() => ({ shown: !document.getElementById('missions').hidden, rows: document.querySelectorAll('#mNext .rowc.goal, #mList .rowc.goal:not(.daily):not(.steady)').length, stars: document.querySelectorAll('#mNext .rowc.goal.star, #mList .rowc.goal.star').length, back: !document.getElementById('tabbar').hidden && !document.getElementById('tabFly').hidden }));
  check(ms.shown && ms.rows >= 3 && ms.stars === 3 && ms.back, `the MISSIONS screen lists NEXT and the open missions (R4: .rowc.goal rows), 3 starred, with the bar's HOME: ${JSON.stringify(ms)}`);
  // S4: the MISSIONS screen has a "Today" label and the day's trio under the tier list (the menu sets the trio from today's date), tinted
  // apart from the area's rows; none of them starred (only the crossing trial is).
  const today = await p.evaluate(() => ({ label: [...document.querySelectorAll('#mList .label')].map(e => e.textContent.replace(/\s*\(.*$/, '')), daily: document.querySelectorAll('#mList .rowc.goal.daily').length,
    dailyStars: document.querySelectorAll('#mList .rowc.goal.daily.star').length, tier: document.getElementById('mTier').textContent,
    order: (() => { const l = [...document.querySelectorAll('#mList .label')].find(e => /^TODAY/.test(e.textContent)), d = document.querySelector('#mList .rowc.goal.daily'), a = document.querySelector('#mList .rowc.goal:not(.daily):not(.steady)'); return !!(l && d && a && (a.compareDocumentPosition(l) & 4) && (l.compareDocumentPosition(d) & 4)); })() }));
  check(today.label.includes('TODAY') && today.daily >= 1 && today.daily <= 3 && today.dailyStars === 0 && today.order, `the MISSIONS screen lists the day's trio under a "TODAY" label, after the area's rows, none starred: ${JSON.stringify(today)}`);
  check(/^Tier \d · \d+\/\d+ done/.test(today.tier), `the MISSIONS screen names the tier and its count (R4): ${today.tier}`);
  await p.click('#tabFly'); await p.waitForTimeout(300);
  await p.click('#tabNature'); await p.waitForTimeout(600);
  // Tap an animal to see it close up (the user, 2026-10-27): on a project card's "Brings back" row, and in the field picture.
  // (the animals moved into the preview strip, DESIGN-HANGAR-NATURE: preview projects until one brings back an animal)
  const web = await p.evaluate(async () => { for (const b of document.querySelectorAll('#wProjects .project:not(.maxed) .rowc-tap')) { b.click(); await new Promise(r => setTimeout(r, 150)); if (document.querySelector('#wStrip .w-webpic[data-species]')) return true; b.click(); } return false; }) ? await p.$('#wStrip .w-webpic[data-species]') : null;
  if (web) { await web.click(); await p.waitForTimeout(300); }
  check(web && await p.evaluate(() => !document.getElementById('wInfo').hidden && /\S/.test(document.getElementById('wInfoBody').innerText)), 'tapping an animal in a project\'s preview strip opens its card');
  await p.evaluate(() => { document.getElementById('wInfo').hidden = true; });
  const critter = await p.$('#wScene [data-critter]');
  if (critter) { await critter.evaluate(e => e.click()); await p.waitForTimeout(300); }   // (it walks about: a timed mouse click can miss it)
  const card = await p.evaluate(() => ({ shown: !document.getElementById('wInfo').hidden, text: document.getElementById('wInfoBody').innerText.slice(0, 40) }));
  check(critter && card.shown && /Found!/i.test(card.text), `tapping a found animal in the NATURE picture opens its card: ${!!critter} ${JSON.stringify(card)}`);
  await p.evaluate(() => { document.getElementById('wInfo').hidden = true; });
  const pid = await p.evaluate(() => { const b = document.querySelector('#wProjects [data-project]:not([disabled])'); return b && b.dataset.project; });
  // R8: the mission's prize must be PAID at the buy. Record what the project costs and what the mission pays BEFORE the tap (a free first project costs nothing).
  const pre = await p.evaluate(async pid => { const M = await import('./src/missions2.js'), s = game.registry.get('save'), ui = game.registry.get('ui');
    const m = M.visible(s).find(x => x.key === 'weurope:project'), P = ((ui.wild || ui.nature || {}).projects || []).find(x => x.id === pid);
    return { seeds: s.seeds, prize: m && m.prize.seeds, cost: P ? P.cost : null }; }, pid);
  if (pid) { await p.click(`#wProjects [data-project="${pid}"]`); await p.waitForTimeout(400); }
  const fund = await saveIn(p);
  const delta = fund.seeds - pre.seeds;
  check(pre.prize > 0 && pre.cost != null && (delta === pre.prize - pre.cost || delta === pre.prize), `the project mission's prize was PAID at the buy: seeds ${pre.seeds} -> ${fund.seeds} (prize +${pre.prize}, project cost ${pre.cost}, or free)`);
  check(pid && (fund.missionsDone || []).includes('weurope:project') && !(fund.unclaimed || []).length, `funding a project completes "Fund a nature project here" with no flight, and nothing is left waiting to claim (R8: it is paid at the buy; the exact amount is proven in tests/missions2.cjs): ${pid} ${JSON.stringify(fund.missionsDone)}`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await p.close();
  // 4b. An off-flight mission ALREADY met ticks when the menu or the MISSIONS screen opens, not at the next purchase (S5; the sim
  // chat's nit): tier 2 open, a helper system owned, "Buy a helper system" not yet done.
  p = await open({ ...s2, freeUpgrade: false, fleet: { ...fleet, systems: { forecast: 1 } },
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5', 'weurope:shade', 'weurope:bring', 'weurope:project'] });
  await p.click('#tabMissions'); await p.waitForTimeout(400);
  const met = await saveIn(p);
  check((met.missionsDone || []).includes('weurope:system'), `opening MISSIONS ticks an off-flight mission already met: ${JSON.stringify(met.missionsDone)}`);
  await p.close();
  // 4c. The user's own save (live 0.15.0): a free part waiting from the school landing, no lesson done, the hangar
  // hidden. On load the hangar must be revealed, NEXT must lead there and TAKE OFF must be locked (the fix unsticks them).
  p = await open({ ...s2, freeUpgrade: true, freeGiven: true, missionsDone: [] });
  const stuck = await p.evaluate(() => ({ tab: !!document.querySelector('#tabHangar:not([hidden])'), next: document.getElementById('hubNext').innerText, locked: document.getElementById('goBtn').disabled }));
  check(stuck.tab && /free part/i.test(stuck.next) && stuck.locked, `an existing save with a free part waiting and no lesson done: hangar revealed, NEXT leads there, TAKE OFF locked: ${JSON.stringify(stuck)}`);
  await p.close();
  // 4d. Lesson 5 with parcels unaffordable and an OLDER save that still held a prize (R8): the migration pays it at load, NEXT is the tree parcels in NATURE
  // and never "claim your prizes" (there is no claim step any more).
  p = await open({ ...s2, freeUpgrade: false, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4'], freeParcelsGiven: true, unclaimed: [{ key: 'mission:L4', kind: 'mission', id: 'L4', label: 'Skip one airport, land at the next', seeds: 70, crystals: 1 }] });
  const cl = await p.evaluate(() => document.getElementById('hubNext').innerText);
  check(/(free|buy) trees/i.test(cl) && !/Claim/i.test(cl), `lesson 5: NEXT = the tree parcels in NATURE, never "claim": "${cl}"`);
  const paidAtLoad = await saveIn(p);
  check(paidAtLoad.seeds === 70 && paidAtLoad.crystals === 1 && !(paidAtLoad.unclaimed || []).length, `the older save's prize was paid at load: ${paidAtLoad.seeds} / ${paidAtLoad.crystals}, left ${JSON.stringify(paidAtLoad.unclaimed)}`);
  await p.click('#hubNext .rc-row'); await p.waitForTimeout(400);
  check(await p.evaluate(() => !document.getElementById('nature').hidden), 'NEXT opens NATURE');
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
