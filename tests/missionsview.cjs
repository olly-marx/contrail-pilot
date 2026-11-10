// The MISSIONS screen as data (src/missionsview.js; research/UX-MASTER-PLAN.md C3, F4 R4). No browser. Checks, on DECLARED saves:
//   1. every mission has a pictogram that exists, a "how" line <= 20 characters (the prize shares it at 320 px) and a sheet TIP <= 12 words, a generic DONE name <= 24, and the (i) sheet is <= 60 words;
//   2. the tier line and the COMING UP line are right at each stage (lessons, tier 1, 2 and 3, the gate done) and never show anything further ahead;
//   3. NEXT is nextUp's top row (one source), OPEN does not repeat it, the dailies and steady rows follow the save;
//   4. GO THERE: a mission row's button sets save.aimCity (the row whose city is the destination is marked aimed; an open mission no longer steers a flight by itself);
//   5. the fresh keys for the MISSIONS dot stay while they exist (derived from the save, never "once").
// Run: node tests/missionsview.cjs   (plants in tools/plants.tsv)
const fs = require('fs'), path = require('path');
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const V = await import('../src/missionsview.js'), M = await import('../src/missions2.js'), N = await import('../src/nextup.js'), A = await import('../src/aim.js'), T = await import('../src/tips.js');
  // 1. Static data.
  const defs = [...M.LESSONS, ...M.TEMPLATES, ...M.DAILY_POOL, ...M.DAILY_EASY, ...M.STEADY];
  for (const d of defs) {
    const ic = V.ICONS[d.id];
    check(!!ic && fs.existsSync(path.join(__dirname, '..', 'assets', 'ui', `${ic}.png`)), `${d.id} has a pictogram that exists (${ic})`);
  }
  for (const t of M.TEMPLATES.filter(x => x.id !== 'hazard' && x.id !== 'land-city')) check(!!V.HOW[t.id] && !!V.TIP[t.id] && T.wordCount(V.TIP[t.id]) <= 12, `${t.id} has a how and a tip of <= 12 words: ${V.TIP[t.id]}`);
  for (const [id, t] of Object.entries(V.HOW)) check(t.length <= V.HOW_MAX, `how "${t}" (${id}) is ${t.length} characters (max ${V.HOW_MAX})`);
  for (const [id, t] of Object.entries(V.DONE_NAME)) check(t.length <= V.NAME_MAX, `done name "${t}" (${id}) is ${t.length} characters (max ${V.NAME_MAX})`);
  check(T.wordCount(V.INFO.body) <= 60, `the (i) sheet is <= 60 words (${T.wordCount(V.INFO.body)})`);
  // The declared saves.
  const base = (done = ['L1', 'L2', 'L3', 'L4', 'L5']) => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'],
    missionsDone: done, levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const withDay = s => { M.setDaily(s, '2026-11-03'); return s; };
  // 5. Lessons stage.
  const l = withDay(base(['L1'])), lv = V.missionsView(l);
  check(lv.teach && lv.tierLine === 'Lessons · 1/5' && lv.comingUp === null && lv.today.rows.length === 0 && lv.steady.length === 0, `lessons: ${JSON.stringify([lv.tierLine, lv.comingUp, lv.today.rows.length, lv.steady.length])}`);
  check(lv.next && lv.next.key === 'L2' && lv.next.how === 'Lesson 2 of 5', `lessons: NEXT is the next lesson: ${JSON.stringify(lv.next && [lv.next.key, lv.next.how])}`);
  // 2-3. Tier 1.
  const t1 = withDay(base()), v1 = V.missionsView(t1), up = N.nextUp(t1, { limit: 9 });
  check(v1.tierLine === 'Tier 1 · 0/6 done' && v1.comingUp === 'Tier 2 · after 3 of tier 1 (0/3)', `tier 1: ${JSON.stringify([v1.tierLine, v1.comingUp])}`);
  check(v1.next && v1.next.key === up[0].key && v1.next.short === up[0].short, `one source: NEXT is nextUp's top row (${v1.next && v1.next.key} vs ${up[0].key})`);
  check(!v1.open.some(r => r.key === v1.next.key) && v1.open.length >= 4, `OPEN does not repeat NEXT (${v1.open.length} rows)`);
  check(v1.today.rows.length >= 1 && v1.today.rows.length <= 3 && v1.steady.length === 2, `dailies and steady rows follow the save: ${v1.today.rows.length} / ${v1.steady.length}`);
  for (const r of [v1.next, ...v1.open, ...v1.today.rows]) check(r.short.length <= V.NAME_MAX && r.how.length <= V.HOW_MAX && !!r.icon && !!r.tip, `row "${r.short}" fits: short ${r.short.length}, how ${r.how.length}`);
  check(JSON.stringify(V.missionsView(t1)) === JSON.stringify(v1), 'the view is pure: the same save gives the same view');
  // Tier 2 (3 of tier 1 done; the city mission is left open).
  const d2 = base([...M.LESSONS.map(x => x.id), 'weurope:shade', 'weurope:plant-tree', 'weurope:bring']), t2 = withDay(d2), v2 = V.missionsView(t2);
  check(v2.tierLine === 'Tier 2 · 0/6 done' && v2.comingUp === 'Tier 3 · after 3 of tier 2 (0/3)', `tier 2: ${JSON.stringify([v2.tierLine, v2.comingUp])}`);
  check(v2.done.count === 8 && v2.done.names.every(n => n.length <= V.NAME_MAX), `DONE is a count (5 lessons + 3): ${v2.done.count}`);
  // Tier 3 and the gate.
  const d3 = [...d2.missionsDone, 'weurope:chain', 'weurope:dodge', 'weurope:rescue'], v3 = V.missionsView(withDay(base(d3)));
  check(/^Tier 3 · \d\/6 done · stars 0\/2$/.test(v3.tierLine) && v3.comingUp === null && v3.crossing && v3.crossing.rows.map(r => r.label).join('|') === 'Era|Plane|Nature 30', `tier 3: the CROSSING block has the three ticks Era, Plane, Nature (CROSSINGS V2; the trial stars are no longer a gate), not a COMING UP line: ${JSON.stringify([v3.tierLine, v3.comingUp, v3.crossing])}`);
  const v4 = V.missionsView(withDay(base([...d3, 'weurope:night', 'weurope:shade10'])));
  check(v4.comingUp === null && /stars 2\/2/.test(v4.tierLine), `the gate done: nothing further ahead: ${JSON.stringify([v4.tierLine, v4.comingUp])}`);
  // Every area mission done: no pinned NEXT (a daily is never pinned), nothing open, the dailies still under TODAY.
  const alld = withDay(base()); for (let i = 0; i < 10 && M.visible(alld).length; i++) alld.missionsDone = [...alld.missionsDone, ...M.visible(alld).map(m => m.key)];
  const va = V.missionsView(alld);
  check(va.next === null && va.open.length === 0 && va.today.rows.length >= 1, `all area missions done: no pinned NEXT, nothing open, the dailies under TODAY: ${JSON.stringify([va.next && va.next.key, va.open.length, va.today.rows.length])}`);
  // 4. GO THERE (ROUTING V2 step 3: the mission row's button sets the destination; the silent mission aim is retired).
  const aimSave = withDay(base([...M.LESSONS.map(x => x.id), 'weurope:shade', 'weurope:plant-tree', 'weurope:bring']));
  const first = A.aimOpen(aimSave), rescue = M.visible(aimSave).find(m => m.def.id === 'rescue'), want = rescue && A.CITY_TEMPLATES.rescue(rescue.fill, aimSave);
  check(!!rescue && !!want && !!first && want !== first, `the test has two different city missions to choose between (first ${first}, rescue ${want})`);
  check(A.aimTarget(aimSave) === null, `an open city mission no longer steers the flight: ${A.aimTarget(aimSave)}`);
  aimSave.aimCity = want;   // the player tapped GO THERE on the rescue mission
  const av = V.missionsView(aimSave), rows = [av.next, ...av.open].filter(Boolean), ar = rows.find(r => r.key === rescue.key);
  check(ar && ar.city && ar.cityName === want && ar.aimed, `the row whose city is the destination says so: ${JSON.stringify(ar && [ar.key, ar.city, ar.cityName, ar.aimed])}`);
  check(rows.filter(r => r.aimed).length === 1, `only that row is marked: ${rows.filter(r => r.aimed).map(r => r.key)}`);
  aimSave.aimCity = 'NOWHERE';
  check(![av.next, ...V.missionsView(aimSave).open].filter(Boolean).some(r => r.aimed), 'a destination that is no mission\'s city marks no row');
  const sys = [v2.next, ...v2.open].find(r => r.key === 'weurope:system');
  check(sys && sys.where === 'hangar' && sys.city === false, `a purchase mission leads to the HANGAR and cannot be aimed: ${JSON.stringify(sys && [sys.where, sys.city])}`);
  // 5. Fresh keys.
  const k2 = V.missionsFreshKeys(t2), k3 = V.missionsFreshKeys(withDay(base(d3)));
  check(k2.includes('tier:2') && !k2.includes('tier:3') && k3.includes('tier:3'), `the tier keys: ${JSON.stringify(k2)} then ${JSON.stringify(k3)}`);
  const kd = V.missionsFreshKeys(base([...d2.missionsDone, 'weurope:system']));
  check(kd.includes('done:weurope:system') && JSON.stringify(V.missionsFreshKeys(base([...d2.missionsDone, 'weurope:system']))) === JSON.stringify(kd), `an off-flight mission keeps its key while it exists: ${JSON.stringify(kd)}`);
  check(!V.missionsFreshKeys({ ...base(), areas: undefined }).length, 'a season-1 save has no MISSIONS keys');
  console.log(fails.length ? `FAIL missionsview:\n - ${fails.join('\n - ')}` : `PASS missionsview: ${defs.length} missions with pictograms, hows and done names within budget; tier / coming-up lines, one-source NEXT, AIM HERE and fresh keys hold`);
  process.exit(fails.length ? 1 : 0);
})();
