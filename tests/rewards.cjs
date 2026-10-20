// Rewards (src/rewards.js): missions pay seeds + crystals, 3 challenges at a time pay and are
// replaced, a first landing in a new city pays, and a lap of the world pays big + a badge.
// Checks the exact amounts banked, and that challenges you can't do yet are never offered.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/rewards.cjs
const { chromium } = require('playwright-core');
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
  const reload = async () => { await p.reload(); await p.waitForTimeout(800); };
  const fly = async () => { await p.click('#goBtn'); for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100); };
  // Land at the next airport (k airports passed first) with no seeds on board, or crash.
  const end = (landed, k = 0, extra = {}) => p.evaluate(([landed, k, extra]) => { const s = game.scene.getScene('game');
    Object.assign(s, extra); s.cargo = 0; s.landedAt = landed ? s.airportAhead(k).name : null; s.airportIndex = k; s.airportsSkipped = k;
    s.finish({ landed }); return s.result; }, [landed, k, extra]);

  await p.goto(URL);
  // 1. The FLY screen: mission 1's prize, and 3 challenges with prizes.
  await setSave({ ...base, mission: 0 }); await reload();
  check(/\+15/.test(await p.textContent('#tMission')), `mission 1 card should show its prize (+15): "${await p.textContent('#tMission')}"`);
  const chals = await p.$$eval('#tChallenges .chal', els => els.map(e => e.textContent));
  check(chals.length === 3 && chals.every(t => /\+\d+/.test(t)), `3 challenges with prizes: ${JSON.stringify(chals)}`);

  // 2. Land in PARIS: mission 1 (+15 seeds +1) and new city PARIS (+15 +1). Challenges set to
  // ones this flight can't do, so only those two pay.
  await setSave({ ...base, mission: 0, challenges: ['seeds-15', 'far-4000', 'night-owl'] }); await reload();
  await fly(); let r = await end(true);
  let s = await save();
  check(s.seeds === 100 + 15 + 15 && s.crystals === 10 + 1 + 1, `PARIS: seeds 130 / crystals 12, got ${s.seeds} / ${s.crystals}; rewards ${JSON.stringify(r.rewards)}`);
  check(r.rewards.map(x => x.kind).join() === 'mission,city', `PARIS rewards should be mission + city: ${JSON.stringify(r.rewards)}`);
  await p.waitForTimeout(1200); await p.mouse.click(195, 400); await p.waitForTimeout(600);
  check(/MISSION/.test(await p.textContent('#rRewards')) && /New city: PARIS/.test(await p.textContent('#rRewards')), `results should list the rewards: "${await p.textContent('#rRewards')}"`);
  // ...and landing in PARIS again pays no city bonus.
  await setSave({ ...s, city: 0, mission: 5 }); await reload(); await fly(); r = await end(true);
  check(!r.rewards.some(x => x.kind === 'city'), `PARIS a second time: no new-city bonus: ${JSON.stringify(r.rewards)}`);
  await p.waitForTimeout(1200);

  // 3. A challenge: "Fly past an airport, then land" pays +30 +1 and is replaced by another.
  await setSave({ ...base, mission: 5, visited: ['LONDON', 'PARIS', 'BERLIN'], challenges: ['pass-1', 'seeds-15', 'far-4000'] }); await reload();
  await fly(); r = await end(true, 1);
  s = await save();
  check(r.rewards.some(x => x.kind === 'challenge' && x.seeds === 30) && s.seeds === 130 && s.crystals === 11, `pass-1 should pay +30 +1: seeds ${s.seeds}, crystals ${s.crystals}, ${JSON.stringify(r.rewards)}`);
  check(s.challenges.length === 3 && !s.challenges.includes('pass-1') && s.challenges.includes('seeds-15'), `the done challenge is replaced, the others stay: ${s.challenges}`);
  await p.waitForTimeout(1200);

  // 4. A lap: from REYKJAVIK, landing in LONDON pays +300 +25 and the Round the World badge.
  // (Mission 5 is "Make 10 shade", which a lap doesn't complete.)
  await setSave({ ...base, city: 15, mission: 4, challenges: ['seeds-15', 'far-4000', 'night-owl'] }); await reload();
  await fly(); r = await end(true);
  s = await save();
  check(s.seeds === 400 && s.crystals === 35 && s.badges.includes('roundTheWorld') && r.rewards.map(x => x.kind).join() === 'lap', `lap: seeds 400 / crystals 35 + badge, got ${s.seeds} / ${s.crystals}, ${s.badges}, ${JSON.stringify(r.rewards)}`);
  await p.waitForTimeout(1200);

  // 4b. A lap also completes a "Reach CITY" mission (you went past it): mission 4 is Reach BERLIN.
  await setSave({ ...base, city: 15, mission: 3, challenges: ['seeds-15', 'far-4000', 'night-owl'] }); await reload();
  await fly(); r = await end(true);
  check(r.mission && r.mission.done && r.rewards.some(x => x.kind === 'mission'), `a lap should complete Reach BERLIN: ${JSON.stringify(r.mission)}`);
  await p.waitForTimeout(1200);

  // 5. A crash pays no new city and no lap.
  await setSave({ ...base, city: 15, mission: 5, challenges: ['seeds-15', 'far-4000', 'night-owl'] }); await reload();
  await fly(); r = await end(false);
  check(r.rewards.length === 0 && (await save()).seeds === 100, `a crash should pay nothing here: ${JSON.stringify(r.rewards)}`);

  // 5b. A challenge just done never comes straight back (it did ~1 in 14 times; failed CI 9e1a8b8).
  const back = await p.evaluate(async () => { const { payRewards } = await import('./src/rewards.js'); let n = 0;
    for (let i = 0; i < 300; i++) { const s = { seeds: 0, crystals: 0, levels: {}, challenges: ['pass-1', 'seeds-15', 'far-4000'], visited: ['LONDON', 'PARIS'] };
      payRewards(s, { landed: true, landedAt: 'PARIS', airportsSkipped: 1, cargo: 0, distance: 100 }, null, null); if (s.challenges.includes('pass-1')) n++; } return n; });
  check(back === 0, `a challenge just done came straight back ${back} times in 300`);

  // 6. Never offered before you can do it: no tree challenges without Tree Planting.
  const offered = await p.evaluate(async () => { const { fillChallenges } = await import('./src/rewards.js'); const seen = new Set();
    for (let i = 0; i < 300; i++) { const s = { levels: {}, challenges: [] }; fillChallenges(s).forEach(c => seen.add(c.id)); } return [...seen]; });
  check(!offered.includes('plant-2') && !offered.includes('kinds-2') && offered.length >= 12, `tree challenges offered without trees, or too few kinds: ${offered}`);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS rewards');
})();
