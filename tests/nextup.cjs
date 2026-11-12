// ONE "next up" source (src/nextup.js; research/UX-MASTER-PLAN.md B3/F2 `nextup`, Node half). No browser. Checks, on DECLARED saves:
//   1. every lesson / template / daily / steady goal / first has a `short`, and it fits the 24-character row at 320 px with the LONGEST real fill
//      (a name that varies in length (a tree, an animal) may be clipped by nextup.clip, the declared safety net, never past 24);
//   2. the priority: the must-do lead first, then the first open mission, then the first undone daily, then more missions, at most `limit`;
//   3. rows 1-2 are the same list as rows 1-2 of the 3-row list (one source: HOME shows 3, the results 2);
//   4. each row says where a tap leads, and a city mission says how many stops away it is.
// Run: node tests/nextup.cjs   (plants in tools/plants.tsv)
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const N = await import('../src/nextup.js'), M = await import('../src/missions2.js'), A = await import('../src/areas.js'), W = await import('../src/wildlife.js');
  const cities = Object.values(A.AREAS).flatMap(a => a.cities || []);
  const longest = cities.slice().sort((a, b) => b.length - a.length)[0];
  check(cities.length > 40 && longest.length >= 10, `the city list is real (${cities.length} cities, longest "${longest}"): else the width test proves nothing`);
  // 1. Shorts, with the worst fill.
  const NAME_CLIPPED = ['plant-tree', 'spot'];   // their text carries a tree / animal name of any length: nextup.clip is the declared fallback
  const worst = { city: longest, cityB: longest, cityC: longest, k: 3, kinds: 5, treeName: 'Sulphur-crested gum tree', landName: 'Australian bush', animalName: W.WILDLIFE.map(w => w.name).sort((a, b) => b.length - a.length)[0], area: 'weurope' };
  const defs = [...M.LESSONS.map(d => ['lesson', d]), ...M.TEMPLATES.map(d => ['template', d]), ...[...M.DAILY_POOL, ...M.DAILY_EASY].map(d => ['daily', d]), ...M.STEADY.map(d => ['steady', d]), ...M.FIRSTS.map(d => ['first', d])];
  check(defs.length >= 42, `all the mission definitions are checked (${defs.length})`);
  for (const [kind, d] of defs) {
    if (d.short == null) { fails.push(`${kind} ${d.id} has no short title`); continue; }
    for (const stage of ['teach', 'challenge', 'mastery']) {
      const f = { ...worst, stage, k: { teach: 1, challenge: 2, mastery: 3 }[stage] };
      const raw = typeof d.short === 'function' ? (kind === 'steady' ? d.short(9999999, f) : d.short(f)) : d.short;
      const out = N.clip(raw);
      check(out.length <= N.SHORT_MAX, `${kind} ${d.id} (${stage}): "${out}" is ${out.length} characters (max ${N.SHORT_MAX})`);
      for (const where of ['fly', 'hangar']) { const row = N.fitRow({ short: raw, where, stops: where === 'fly' ? 3 : undefined }); check(row.short.length + N.rightOf(row).length <= N.ROW_MAX, `${kind} ${d.id} (${stage}, ${where}): "${row.short}" + "${N.rightOf(row)}" fits one row at 320 (${N.ROW_MAX})`); }
      if (!NAME_CLIPPED.includes(d.id)) check(raw.length <= N.SHORT_MAX, `${kind} ${d.id} (${stage}) short "${raw}" is ${raw.length} characters with the longest fill (max ${N.SHORT_MAX}; only ${NAME_CLIPPED} may rely on clip)`);
    }
  }
  // 2-4. The list, on declared saves.
  const base = () => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'],
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const WHERE = ['fly', 'hangar', 'nature', 'missions'];
  const sane = (items, tag) => { check(items.length <= 3, `${tag}: at most 3 rows (${items.length})`);
    for (const x of items) { check(x.short.length + N.rightOf(x).length <= N.ROW_MAX, `${tag}: row "${x.short}" + "${N.rightOf(x)}" fits one line (${N.ROW_MAX})`);
      check(x.short && x.short.length <= 24 && x.full && WHERE.includes(x.where), `${tag}: row "${x.short}" has a short <= 24, a full text and a valid where: ${JSON.stringify(x)}`);
      if (x.stops !== undefined) check(Number.isInteger(x.stops) && x.stops >= 1 && x.stops <= 3, `${tag}: "${x.short}" stops ${x.stops} within MAX_LEGS`); }
    check(new Set(items.map(x => x.key)).size === items.length, `${tag}: no row twice`); };
  const full = base(); M.setDaily(full, '2026-11-03');
  const rows = N.nextUp(full), vis = M.visible(full), daily = M.dailyVisible(full);
  sane(rows, 'full save');
  check(rows.length === 3 && rows[0].key === vis[0].key, `full save: row 1 is the first open mission (${rows[0] && rows[0].key} vs ${vis[0] && vis[0].key})`);
  check(daily.length > 0 && rows[1] && rows[1].daily && rows[1].key === daily[0].key, `full save: row 2 is the first undone daily (${rows[1] && rows[1].key})`);
  check(rows[2] && rows[2].key === vis[1].key, `full save: row 3 is the next open mission (${rows[2] && rows[2].key})`);
  const two = N.nextUp(full, { limit: 2 });
  check(JSON.stringify(two) === JSON.stringify(rows.slice(0, 2)), `one source: rows 1-2 of the 2-row list equal rows 1-2 of the 3-row list`);
  const city = M.visible(full).find(m => m.def.id === 'land-city');
  const cityRow = N.nextUp(full, { limit: 9 }).find(x => city && x.key === city.key);
  check(!city || (cityRow && cityRow.stops >= 1), `a city mission says how many stops away it is: ${JSON.stringify(cityRow)}`);
  // lessons: the lesson, no daily before L3
  const l = base(); l.missionsDone = ['L1']; const lr = N.nextUp(l);
  sane(lr, 'lesson save');
  check(lr[0] && lr[0].key === 'L2' && lr.every(x => !x.daily), `lessons: the next lesson leads and no daily shows yet: ${JSON.stringify(lr.map(x => x.key))}`);
  // the must-do lead: the free part, the first tree parcels, a crossing ready, each first and once
  const free = base(); free.missionsDone = ['L1']; free.freeUpgrade = true; const fr = N.nextUp(free);
  check(fr[0] && fr[0].lead && fr[0].where === 'hangar' && fr[1] && fr[1].key === 'L2', `free part waiting: the hangar leads, then the lesson: ${JSON.stringify(fr.map(x => x.key))}`);
  const l5 = base(); l5.missionsDone = ['L1', 'L2', 'L3', 'L4']; l5.levels = {}; const pr = N.nextUp(l5);
  check(pr[0] && pr[0].lead && pr[0].where === 'nature', `lesson 5 without tree parcels: NATURE leads: ${JSON.stringify(pr.map(x => x.key))}`);
  const cl = base(); cl.missionsDone = ['L1', 'L2', 'L3', 'L4']; cl.levels = {}; cl.freeParcelsGiven = true; cl.seeds = 0; cl.crystals = 0; cl.unclaimed = [{ key: 'mission:L4', kind: 'mission', id: 'L4', label: 'x', seeds: 70, crystals: 1 }];
  const clr = N.nextUp(cl);
  check(clr[0] && clr[0].lead && clr[0].where === 'nature' && clr[0].short === 'Buy trees' && !clr.some(x => /claim/i.test(x.key + x.short + x.full)), `lesson 5 with parcels unaffordable (even if an older save still holds prizes): NATURE leads to buy them, there is no claims lead any more (R8): ${JSON.stringify(clr.map(x => x.key))}`);
  const cx = N.nextUp(full, { crossingReady: 'LONDON to NEW YORK' });
  check(cx[0] && cx[0].lead && cx[0].where === 'fly' && /^Cross to NEW YORK$/.test(cx[0].short) && cx.length === 3 && cx.filter(x => x.lead).length === 1, `a crossing ready leads, and only one lead: ${JSON.stringify(cx.map(x => x.key))}`);
  check(N.nextUp({ ...base(), areas: undefined }).length === 0, 'a season-1 save has no next-up rows');
  console.log(fails.length ? `FAIL nextup:\n - ${fails.join('\n - ')}` : `PASS nextup: ${defs.length} short titles fit 24 characters with the longest fill ("${longest}"); the lead, mission, daily order and one source hold on ${6} declared saves`);
  process.exit(fails.length ? 1 : 0);
})();
