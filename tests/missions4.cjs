// S4 area missions, the daily trio and Firsts (src/missions2.js; research/PROPOSAL-HOME-MISSIONS.md). No browser.
// For EVERY template: a flight (or save) that should complete it does, and a near miss does not. Then each template's
// check is replaced by "always true" (a planted defect, done here for all 18 at once) and its near miss must THEN
// complete: so no case below can pass without testing something. Plus: the daily trio is the same three for a date,
// refreshes with the date, pays seeds only; Firsts come once, on a crash too, worth 1 crystal.
// Run: node tests/missions4.cjs
(async () => {
  const M = await import('../src/missions2.js'), H = await import('../src/habitats.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const lessons = ['L1', 'L2', 'L3', 'L4', 'L5'];
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  const save = (extra = {}) => ({ areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', visited: ['AMSTERDAM'], found: {}, levels: {}, habitat: {}, fleet,
    missionsDone: [...lessons, 'weurope:shade', 'weurope:bring', 'weurope:project', 'weurope:dodge', 'weurope:chain', 'weurope:rescue'], unclaimed: [], ...extra });
  const base = { landed: true, landedAt: 'BERLIN', cargo: 0, sunBlocked: 0, planted: 0, airportsSkipped: 0, nightOwl: false, bumped: 0, goldens: 0, dodges: 0, cleanGaps: 0, noFlyPassed: 0, treeIds: [], foundIds: [] };
  const fill = s => M.fillFor(s, 'weurope');
  const ANIMALS = { habitat: { woodland: H.REGION_DATA.woodland.projects.map(p => p.id) } };   // every project: an animal can appear
  const f = fill(save(ANIMALS));
  // [template id, fixture save extra, flight that completes it, near miss] (save missions: [id, saveYes, saveNo])
  const CASES = {
    'land-city': [{}, { landedAt: f.city }, { landedAt: 'BERLIN' === f.city ? 'PARIS' : 'BERLIN' }],
    shade: [{}, { sunBlocked: 5 }, { sunBlocked: 4 }],
    'plant-tree': [ANIMALS, { treeIds: [f.treeTag] }, { treeIds: ['savanna:baobab'] }],   // (the same save the fill came from)
    'clean-gaps': [{}, { cleanGaps: 3 }, { cleanGaps: 2 }],
    bring: [{}, { cargo: 10 }, { cargo: 9 }],
    chain: [{ prevLanded: f.city }, { landedAt: f.cityB }, { landedAt: f.city }],
    dodge: [{}, { dodges: 3 }, { dodges: 2 }],
    rescue: [{}, { planted: 2, landedAt: f.cityB }, { planted: 1, landedAt: f.cityB }],
    spot: [ANIMALS, { foundIds: [f.animal] }, { foundIds: ['nobody'] }],
    hazard: [{}, { bumped: 1 }, { bumped: 0 }],
    night: [{}, { nightOwl: true }, { nightOwl: false }],
    shade10: [{}, { sunBlocked: 10 }, { sunBlocked: 9 }],
    kinds3: [{}, { treeIds: ['spruce', 'birch', 'oak'].slice(0, fill(save({})).kinds) }, { treeIds: [...['spruce', 'birch', 'oak'].slice(0, fill(save({})).kinds - 1), 'savanna:baobab'] }],   // f.kinds kinds of THIS land (the kinds open, 2..3; UK ids bare); the near miss is one short + another land's
    route: [{}, { landedAt: f.cityC, airportsSkipped: 1 }, { landedAt: f.cityC, airportsSkipped: 0 }],
    golden: [{}, { goldens: 1 }, { goldens: 0 }],
  };
  const SAVES = {
    project: [{ habitat: { woodland: ['deadwood'] } }, {}],
    system: [{ fleet: { ...fleet, systems: { forecast: 1 } } }, {}],
    tier: [{ habitat: { woodland: H.REGION_DATA.woodland.projects.filter(p => p.tier === 1).map(p => p.id) } }, {}],
  };
  const open = s => { s.missionsDone = s.missionsDone.filter(k => !k.endsWith(`:${'X'}`)); return s; };
  const fresh = (id, extra) => { const s = save(extra); s.missionsDone = s.missionsDone.filter(k => k !== `weurope:${id}`); return s; };
  const tryFlight = (id, extra, r) => { const s = fresh(id, extra); return M.onFlight(s, { ...base, ...r }).some(m => m.key === `weurope:${id}`); };
  const trySave = (id, extra) => { const s = fresh(id, extra); return M.onSave(s).some(m => m.key === `weurope:${id}`); };
  for (const t of M.TEMPLATES) {
    if (t.kind === 'save') {
      const c = SAVES[t.id]; if (!c) { fails.push(`${t.id}: no case`); continue; }
      check(trySave(t.id, c[0]), `${t.id}: completes on the save change`);
      check(!trySave(t.id, c[1]), `${t.id}: not without it`);
      const real = t.save; t.save = () => true; const caught = trySave(t.id, c[1]); t.save = real;
      check(caught, `${t.id}: its near miss is a real test (an always-true check completes it)`);
    } else {
      const c = CASES[t.id]; if (!c) { fails.push(`${t.id}: no case`); continue; }
      check(tryFlight(t.id, c[0], c[1]), `${t.id}: completes on ${JSON.stringify(c[1])}`);
      check(!tryFlight(t.id, c[0], c[2]), `${t.id}: not on the near miss ${JSON.stringify(c[2])}`);
      const real = t.flight; t.flight = () => true; const caught = tryFlight(t.id, c[0], c[2]); t.flight = real;
      check(caught, `${t.id}: its near miss is a real test (an always-true check completes it)`);
    }
  }
  check(!M.visible(fresh('spot', {})).some(m => m.key === 'weurope:spot'), 'spot is not offered while no animal can appear here');
  check(!!f.animal && !!f.treeTag && f.city !== f.cityB, `the fill names real things: ${JSON.stringify({ city: f.city, cityB: f.cityB, tree: f.treeTag, animal: f.animal })}`);
  // Stage per AREA (the user, 2026-10-27): a fresh area reached after 3 crossings starts at 'challenge' (x2), not mastery
  // (x3); the area becomes 'mastery' once its own gate is done; before any crossing, 'teach'.
  const far = { ...save(), areas: ['weurope', 'nordic', 'mideast', 'africa'], city: 'JOHANNESBURG', missionsDone: [...lessons] };
  check(M.stageOf(far, 'africa') === 'challenge' && M.fillFor(far, 'africa').k === 2, `a fresh area after 3 crossings starts at challenge (x2): ${M.stageOf(far, 'africa')} k=${M.fillFor(far, 'africa').k}`);
  const bring = M.visible(far).find(m => m.key === 'africa:bring');
  check(bring && /20/.test(bring.title), `its targets are challenge-sized: "${bring && bring.title}"`);
  const ripe = { ...far, missionsDone: [...lessons, 'africa:night', 'africa:kinds3'] };
  check(M.stageOf(ripe, 'africa') === 'mastery', 'that area becomes mastery once its own gate (2 stars) is done');
  check(M.stageOf(save(), 'weurope') === 'teach' && M.stageOf({ ...save(), areas: ['weurope', 'nordic'] }, 'nordic') === 'challenge', 'teach before any crossing; a new area after one: challenge');

  // Daily trio.
  const d1 = save(); M.setDaily(d1, '2026-10-27'); const d2 = save(); M.setDaily(d2, '2026-10-27'); const d3 = save(); M.setDaily(d3, '2026-10-28');
  check(d1.daily.ids.length === 3 && new Set(d1.daily.ids).size === 3 && d1.daily.ids.join() === d2.daily.ids.join(), `the same 3 different daily missions for everyone on a date: ${d1.daily.ids}`);
  check(['2026-10-28', '2026-10-29', '2026-10-30'].some(dt => { const x = save(); M.setDaily(x, dt); return x.daily.ids.join() !== d1.daily.ids.join(); }), 'the trio changes with the date');
  check(M.dailyVisible(d1).every(d => d.prize.crystals === 0 && d.prize.seeds > 0), 'daily prizes are seeds only');
  const lessonSave = { ...save(), missionsDone: [] }; M.setDaily(lessonSave, '2026-10-27');
  check(!lessonSave.daily, 'no daily trio during the lessons');
  // Firsts.
  const fs1 = save(); const c1 = M.onFlight(fs1, { ...base, landed: false, crash: 'bird' });
  check(c1.some(m => m.key === 'first:bird') && fs1.unclaimed.find(u => u.key === 'mission:first:bird').crystals === 1, 'a first bird crash: a funny card worth 1 crystal');
  check(!M.onFlight(fs1, { ...base, landed: false, crash: 'bird' }).some(m => m.key === 'first:bird'), 'only once');
  check(c1.every(m => m.key.startsWith('first:')), 'a crash completes nothing else');
  console.log(fails.length ? `FAIL missions4:\n - ${fails.join('\n - ')}` : `PASS missions4: all ${M.TEMPLATES.length} templates complete on their case, not on a near miss, and every near miss is proven by an always-true plant; daily trio and Firsts right`);
  process.exit(fails.length ? 1 : 0);
})();
