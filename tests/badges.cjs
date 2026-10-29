// Badges, missions and prizes (2026-10-22 rework): every badge awards on a flight that meets it and
// not on a near miss; tiers stack and never repeat; prizes wait in save.unclaimed until CLAIM; old
// saves convert without free prizes; mission 1 can't be stuck behind you (Lola flew past PARIS);
// the HUD mission line stays on screen; the landing multiplier is a clean 1-decimal number.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/badges.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { if (!sessionStorage.getItem('set')) { sessionStorage.setItem('set', 1); localStorage.clear();
    localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['name', 'hangar', 'nature'], freeGiven: true, priceVersion: 2, missionsDone: [], badgeTiers: {} })); } });
  await p.goto(URL); await ready(p);

  // 1. Every badge: a flight that meets tier 1 earns it; a near miss does not.
  const out = await p.evaluate(async () => {
    const { BADGES, earnBadges } = await import('./src/badges.js');
    const { LAP_KM } = await import('./src/route.js');
    const base = { landed: true, distance: 100, cargo: 1, airportsSkipped: 0, sunBlocked: 0, dodges: 0, goldens: 0, heat: 10, bumped: false };
    const fresh = () => ({ landings: 0, planted: {}, visited: ['LONDON'], crashes: {}, habitat: { woodland: [] }, found: {}, levels: {}, coolLandings: 0, badgeTiers: {} });
    // [badge, makes it, near miss]: each as (r, save) changes.
    const cases = {
      longhaul: [[{ distance: 2000 }], [{ distance: 1999 }]], frequent: [[{}, { landings: 10 }], [{}, { landings: 9 }]],
      hopper: [[{ airportsSkipped: 1 }], [{ airportsSkipped: 1, landed: false }]], bumpy: [[{ bumped: true }], [{ bumped: true, landed: false }]],
      sunshield: [[{ sunBlocked: 15 }], [{ sunBlocked: 14.9 }]], nightowl: [[{ dodges: 3 }], [{ dodges: 2 }]],
      coolplanet: [[{}, { coolLandings: 1 }], [{}, { coolLandings: 0 }]], zerocarbon: [[{}, { levels: { fuel: 4 } }], [{}, { levels: { fuel: 3 } }]],
      seedhunter: [[{ cargo: 15 }], [{ cargo: 15, landed: false }]], golden: [[{ goldens: 2 }], [{ goldens: 1 }]],
      forester: [[{}, { planted: { oak: 3, birch: 2 } }], [{}, { planted: { oak: 4 } }]],
      naturalist: [[{}, { found: { a: 1, b: 1, c: 1, d: 1, e: 1 } }], [{}, { found: { a: 1, b: 1, c: 1, d: 1 } }]],
      rewilder: [[{}, { habitat: { woodland: ['a', 'b', 'c'] } }], [{}, { habitat: { woodland: ['a', 'b'] } }]],
      globetrotter: [[{}, { visited: ['LONDON', 'PARIS', 'BERLIN', 'ROME'] }], [{}, { visited: ['LONDON', 'PARIS', 'BERLIN'] }]],
      worldflight: [[{ distance: LAP_KM }], [{ distance: LAP_KM - 1 }]],
      oops: [[{ landed: false }, { crashes: { storm: 1 } }], [{}, { crashes: {} }]],
      birdstrike: [[{ landed: false }, { crashes: { bird: 1 } }], [{ landed: false }, { crashes: { storm: 1 } }]],
      toldoff: [[{ landed: false }, { crashes: { nofly: 1 } }], [{ landed: false }, { crashes: { bird: 1 } }]],
      meltdown: [[{ landed: false }, { crashes: { overheat: 1 } }], [{ landed: false }, { crashes: { ground: 1 } }]],
      closecall: [[{ heat: 149 }], [{ heat: 148 }]], lucky7: [[{ cargo: 7 }], [{ cargo: 8 }]],
      seeddodger: [[{ cargo: 0, distance: 2000 }], [{ cargo: 0, distance: 1999 }]],
    };
    // The 3 cumulative badges (distance, collector, threader) are earned from the save's lifetime totals, not from one flight's numbers: tests/cumbadges.cjs (Node, plants) covers them.
    const CUMULATIVE = ['distance', 'collector', 'threader'];
    const res = { missing: BADGES.filter(x => !cases[x.id] && !CUMULATIVE.includes(x.id)).map(x => x.id), wrong: [] };
    // Badges that say "then land" must not award on a crash with the same numbers.
    const mustLand = ['longhaul', 'hopper', 'bumpy', 'seedhunter', 'worldflight', 'closecall', 'lucky7', 'seeddodger'];
    for (const [id, [yes, no]] of Object.entries(cases)) {
      const run = ([r, s = {}]) => earnBadges({ ...fresh(), ...s }, { ...base, ...r }).some(w => w.id === id);
      if (!run(yes)) res.wrong.push(`${id} not earned`);
      if (run(no)) res.wrong.push(`${id} earned on a near miss`);
      if (mustLand.includes(id) && run([{ ...yes[0], landed: false }, yes[1]])) res.wrong.push(`${id} earned without landing`);
    }
    // Tiers stack in one flight and never repeat.
    const s = fresh();
    const a = earnBadges(s, { ...base, distance: 8000 }).filter(w => w.id === 'longhaul').map(w => w.tier);
    const again = earnBadges(s, { ...base, distance: 8000 }).filter(w => w.id === 'longhaul');
    res.tiers = { a, again: again.length, kept: s.badgeTiers.longhaul, list: s.badges.includes('longhaul') };
    return res;
  });
  check(out.missing.length === 0, `every badge has a test case: missing ${out.missing}`);
  check(out.wrong.length === 0, `badges: ${out.wrong.join('; ')}`);
  check(JSON.stringify(out.tiers.a) === '[1,2]' && out.tiers.again === 0 && out.tiers.kept === 2 && out.tiers.list, `tiers: 8,000 km earns bronze+silver once: ${JSON.stringify(out.tiers)}`);

  // 2. Prizes wait for CLAIM, then pay exactly; CLAIM one pays only that one.
  const pz = await p.evaluate(async () => {
    const { addPrizes, claim } = await import('./src/rewards.js');
    const { MISSIONS } = await import('./src/missions.js');
    const s = { seeds: 10, crystals: 0, landings: 10, visited: ['LONDON'], planted: {}, crashes: {}, levels: {}, badgeTiers: {} };
    const added = addPrizes(s, { landed: true, landedAt: 'PARIS', distance: 2500, cargo: 3 }, MISSIONS[0], 0);
    const before = s.seeds;
    const one = claim(s, added[0].key);
    const left = s.unclaimed.length, afterOne = s.seeds;
    const rest = claim(s);
    return { kinds: added.map(a => a.key), before, one, afterOne, left, rest, after: s.seeds, empty: s.unclaimed.length, sum: added.reduce((x, a) => x + a.seeds, 0) };
  });
  check(pz.before === 10, `nothing paid before CLAIM: ${pz.before}`);
  check(pz.kinds.includes('mission:land') && pz.kinds.includes('badge:frequent:1') && pz.kinds.includes('badge:longhaul:1'), `prizes added: ${pz.kinds}`);
  check(pz.afterOne === 10 + pz.one.seeds && pz.left === pz.kinds.length - 1, `CLAIM one pays only that one: ${JSON.stringify(pz)}`);
  check(pz.after === 10 + pz.sum && pz.empty === 0, `CLAIM ALL pays the rest exactly: ${JSON.stringify(pz)}`);

  // 3. Old saves convert: missions by what they taught, old badges to tiers, no surprise prizes.
  const mig = await p.evaluate(async () => {
    const { migrateMissions } = await import('./src/missions.js');
    const { migrateBadges } = await import('./src/badges.js');
    const s = { mission: 5, badges: ['zeroCarbon', 'sunShield', 'firstLanding'], landings: 12, visited: ['LONDON', 'PARIS', 'BERLIN', 'ROME'], levels: {}, planted: {} };
    migrateMissions(s); migrateBadges(s);
    return { done: s.missionsDone, n: s.mission, tiers: s.badgeTiers, unclaimed: s.unclaimed };
  });
  check(JSON.stringify(mig.done) === '["land","seeds-5","shade-10","clean-night","pass-1"]' && mig.n === 5, `old mission 5 converts: ${JSON.stringify(mig)}`);
  check(mig.tiers.zerocarbon === 1 && mig.tiers.sunshield === 1 && mig.tiers.frequent === 1 && mig.tiers.globetrotter === 1 && !mig.unclaimed, `old badges convert unpaid: ${JSON.stringify(mig)}`);

  // 4. Lola's bug: fly past PARIS and land in BERLIN on the first flight: mission 1 still done.
  const lola = await p.evaluate(async () => { const { MISSIONS } = await import('./src/missions.js'); return MISSIONS[0].check({ landed: true, landedAt: 'BERLIN', airportsSkipped: 1 }, {}); });
  check(lola === true, 'mission 1 must be done by landing at ANY airport (flying past PARIS cannot strand you)');

  // 5. In flight: the multiplier is a clean number, and the mission line never spills off screen.
  await p.click('#goBtn'); await started(p);
  const hud = await p.evaluate(() => { const s = game.scene.getScene('game');
    s.kit.perSkip = 0.7; s.airportsSkipped = 3; const m = s.multiplier();   // 1 + 0.7 * 3 = 3.0999999999999996 unrounded
    const long = 'Contrail made. Next night! And some more words that go on for a very long way indeed';
    s.missionText.setText(long); const bx = s.missionText.getBounds();
    return { m, left: bx.left, right: bx.right, height: bx.height, W: s.scale.gameSize.width }; });
  check(hud.m === 3.1, `multiplier 1 + 0.7 x 3 should show 3.1, got ${hud.m}`);
  check(hud.left >= 0 && hud.right <= hud.W && hud.height <= 28, `mission line stays on screen, at most 2 lines drawn (8 px font): ${JSON.stringify(hud)}`);

  console.log({ fails, errs });
  await b.close();
  if (fails.length || errs.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
