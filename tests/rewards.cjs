// Rewards (src/rewards.js, 2026-10-22; R8, 2026-11-03: prizes are PAID the moment they are earned, there is no CLAIM step). A finished mission or
// badge is paid into the bank when the flight is banked (and saved), the results card shows it on ONE line, and an OLDER save that still holds
// waiting prizes (save.unclaimed) is paid once at load, with a toast, then never again. Checks the exact amounts banked.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/rewards.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const base = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 5, freeGiven: true, seeds: 100, crystals: 10 , fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };   // fleet: a save from after the eras reset (src/fleet.js)
  const setSave = s => p.evaluate(s => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(s)); }, s);
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));
  const reload = async () => { await p.reload(); await ready(p); await p.waitForTimeout(800); };
  const fly = async () => { await p.click('#goBtn'); for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100); };
  // Land at the next airport (k airports passed first) with no seeds on board, or crash.
  const end = (landed, k = 0, extra = {}) => p.evaluate(([landed, k, extra]) => { const s = game.scene.getScene('game');
    Object.assign(s, extra); s.cargo = 0; s.landedAt = landed ? s.airportAhead(k).name : null; s.airportIndex = k; s.airportsSkipped = k;
    s.finish({ landed }); return s.result; }, [landed, k, extra]);

  await p.goto(URL);
  const MOST = ['land', 'seeds-5', 'shade-10', 'clean-night', 'pass-1', 'plant-tree', 'crystals-5', 'go-clean', 'reach-cairo', 'turbulence', 'kinds-3', 'rewild'];
  // 1. The FLY screen: mission 1's prize on its card; no prizes panel while nothing waits.
  await setSave({ ...base, missionsDone: [], badgeTiers: {} }); await reload();
  check(/\+15/.test(await p.textContent('#tMission')), `mission 1 card should show its prize (+15): "${await p.textContent('#tMission')}"`);
  check(!(await p.$('#tChallenges')) && !(await p.$('#mPrizes')), 'the prizes panels are gone (R8: nothing is ever left to claim)');

  // 2. Land in PARIS: mission 1's prize (+15 +1) is PAID when the flight is banked (R8), saved at once, and the card shows it on one line.
  await fly(); let r = await end(true);
  let s = await save();
  check(r.rewards.map(x => x.key).join() === 'mission:land', `the flight earned mission 1's prize: ${JSON.stringify(r.rewards)}`);
  check(s.seeds === 115 && s.crystals === 11 && (s.unclaimed || []).length === 0, `paid exactly +15 +1 AT THE BANK, before any tap, and saved: ${s.seeds} / ${s.crystals}, left ${JSON.stringify(s.unclaimed)}`);
  await p.waitForTimeout(1200); await p.mouse.click(195, 400); await p.waitForTimeout(600);
  const line = await p.textContent('#rMission');
  check(!(await p.$('#rRewards')) && !(await p.$('.claim')) && /\+15/.test(line), `the card shows the prize on one line and no CLAIM button: "${line}"`);
  s = await save();
  check(s.seeds === 115 && s.crystals === 11, `showing the card pays nothing more (no double pay): ${s.seeds} / ${s.crystals}`);

  // 3. An OLDER save that still holds two waiting prizes: paid ONCE at load (the migration), with a toast; a reload pays nothing more.
  const two = [{ key: 'badge:frequent:1', kind: 'badge', id: 'frequent', tier: 1, label: 'Frequent Flyer (Bronze)', seeds: 30, crystals: 2 },
    { key: 'mission:seeds-5', kind: 'mission', id: 'seeds-5', label: 'Land with 5 seeds', seeds: 35, crystals: 3 }];
  await setSave({ ...base, missionsDone: ['land'], badgeTiers: { frequent: 1 }, unclaimed: two }); await reload();
  s = await save();
  check(s.seeds === 165 && s.crystals === 15 && (s.unclaimed || []).length === 0, `the migration pays +65 +5 once at load and empties the list: ${s.seeds} / ${s.crystals}, left ${JSON.stringify(s.unclaimed)}`);
  const toast = await p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; });
  check(/Prizes collected/.test(toast) && /65/.test(toast), `a toast says so on the first menu: "${toast}"`);
  await reload();
  s = await save();
  const toast2 = await p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : ''; });
  check(s.seeds === 165 && s.crystals === 15 && !/Prizes collected/.test(toast2), `a reload pays nothing more and shows no second toast: ${s.seeds} / ${s.crystals} "${toast2}"`);

  // 4. With every land discovered, a flight completes the World tour ('world'): its prize is PAID at the bank (R8); no automatic bonus beyond it.
  const sumOf = (list, k) => list.reduce((a, x) => a + (x[k] || 0), 0);
  const ALL = { mediterranean: 1, desert: 1, monsoon: 1, eastasia: 1, boreal: 1, plains: 1, tundra: 1, savanna: 1, rainforest: 1, islandforest: 1, bush: 1, steppe: 1, polynesia: 1 };
  await setSave({ ...base, city: 'REYKJAVIK', discovered: ALL, missionsDone: MOST, badgeTiers: {} }); await reload();
  await fly(); r = await end(true);
  s = await save();
  check(r.mission && r.mission.done && r.rewards.some(x => x.key === 'mission:world') && sumOf(r.rewards, 'seeds') > 0 && s.seeds === 100 + sumOf(r.rewards, 'seeds') && s.crystals === 10 + sumOf(r.rewards, 'crystals'), `world tour: its prize is paid at the bank: ${s.seeds} / ${s.crystals}, ${JSON.stringify(r.rewards)}`);
  await p.waitForTimeout(1200);

  // 5. A crash earns nothing from flying; its only prize is the secret Oops! badge, PAID at once.
  await setSave({ ...base, city: 'REYKJAVIK', missionsDone: MOST, badgeTiers: {} }); await reload();
  await fly(); r = await end(false);
  s = await save();
  check(r.rewards.map(x => x.key).join() === 'badge:oops:1' && s.seeds === 100 + sumOf(r.rewards, 'seeds') && s.crystals === 10 + sumOf(r.rewards, 'crystals'), `a crash earns only the Oops! badge, paid at once: ${s.seeds} / ${s.crystals}, ${JSON.stringify(r.rewards)}`);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS rewards');
})();
