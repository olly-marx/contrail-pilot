// Rewards (src/rewards.js, 2026-10-22): mission and badge prizes are never paid automatically.
// They wait in save.unclaimed (and survive a reload) until the player taps CLAIM on the results or
// the FLY screen. Checks the exact amounts banked.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/rewards.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const base = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 5, freeGiven: true, seeds: 100, crystals: 10 };
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
  check(await p.$eval('#tChallenges', e => e.hidden), 'no prizes panel when nothing is waiting');

  // 2. Land in PARIS: mission 1's prize (+15 +1) WAITS. Nothing paid until CLAIM on the results.
  await fly(); let r = await end(true);
  let s = await save();
  check(s.seeds === 100 && s.crystals === 10, `nothing paid on landing: ${s.seeds} / ${s.crystals}`);
  check(r.rewards.map(x => x.key).join() === 'mission:land' && s.unclaimed.length === 1, `prize waiting: ${JSON.stringify(r.rewards)}`);
  await p.waitForTimeout(1200); await p.mouse.click(195, 400); await p.waitForTimeout(600);
  const btn = await p.$('#rRewards .btn.claim');
  check(!!btn && /CLAIM/.test(await p.textContent('#rRewards')), `results show a CLAIM button: "${await p.textContent('#rRewards')}"`);
  if (btn) await btn.click();
  s = await save();
  check(s.seeds === 115 && s.crystals === 11 && s.unclaimed.length === 0, `CLAIM pays exactly +15 +1: ${s.seeds} / ${s.crystals}, left ${JSON.stringify(s.unclaimed)}`);

  // 3. Prizes from earlier wait on the FLY screen; CLAIM ALL pays them all exactly; they survive a reload.
  const two = [{ key: 'badge:frequent:1', kind: 'badge', id: 'frequent', tier: 1, label: 'Frequent Flyer (Bronze)', seeds: 30, crystals: 2 },
    { key: 'mission:seeds-5', kind: 'mission', id: 'seeds-5', label: 'Land with 5 seeds', seeds: 35, crystals: 3 }];
  await setSave({ ...base, missionsDone: ['land'], badgeTiers: { frequent: 1 }, unclaimed: two }); await reload();
  check(!(await p.$eval('#tChallenges', e => e.hidden)) && (await p.$$('#tChallenges .claim-row')).length === 2, 'the FLY screen lists the 2 waiting prizes');
  await reload();
  check((await save()).unclaimed.length === 2, 'waiting prizes survive a reload');
  await p.click('#tChallenges .btn.claim.all');
  s = await save();
  check(s.seeds === 165 && s.crystals === 15 && s.unclaimed.length === 0, `CLAIM ALL pays +65 +5: ${s.seeds} / ${s.crystals}`);

  // 4. With every land discovered, a flight completes the World tour ('world'): its prize waits; no automatic bonus.
  const ALL = { mediterranean: 1, desert: 1, monsoon: 1, eastasia: 1, boreal: 1, plains: 1, tundra: 1, savanna: 1, rainforest: 1 };
  await setSave({ ...base, city: 'REYKJAVIK', discovered: ALL, missionsDone: MOST, badgeTiers: {} }); await reload();
  await fly(); r = await end(true);
  s = await save();
  check(r.mission && r.mission.done && r.rewards.some(x => x.key === 'mission:world') && s.seeds === 100, `world tour: its prize waits, nothing paid: ${s.seeds}, ${JSON.stringify(r.rewards)}`);
  await p.waitForTimeout(1200);

  // 5. A crash pays nothing; its only prize is the secret Oops! badge, waiting.
  await setSave({ ...base, city: 'REYKJAVIK', missionsDone: MOST, badgeTiers: {} }); await reload();
  await fly(); r = await end(false);
  s = await save();
  check(s.seeds === 100 && r.rewards.map(x => x.key).join() === 'badge:oops:1', `a crash pays nothing, Oops! waits: ${s.seeds}, ${JSON.stringify(r.rewards)}`);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS rewards');
})();
