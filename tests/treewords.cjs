// THE TREE-PLANTING TUTORIAL'S WORDS (tutorial 1a, approved by the user 2026-11-11; src/tips.js, src/resultscard.js, src/upgrades.js, src/missionplan.js, src/nextup.js). Plain Node, no browser.
// One noun: 'tree'. 'Seed' is only the game's money and 'parcel' is gone from what the player reads. Named lines, in order:
//   1. the rail texts: HOME says 'You carry N trees. Take off and plant them.'; the results rail says the first tree 'grows up in N flights' and that trees you do not plant are not saved; NATURE says 'Buy more trees ... first level is free'
//   2. the flight strip names the PLANT button and the cross that turns green
//   3. no tip, no Tree Planting level, no Soil Patches text and no planting-mission text says 'parcel' or 'SEND A SEED'
//   4. the results row, TWO lines: 'Planted 2 of 3 trees' and under it the kinds 'Spruce, Oak' (clipped to 28 characters); 'Missed 3 trees' alone when none landed; nothing when no tree was dropped or in flight school
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const T = await import('../src/tips.js'), U = await import('../src/upgrades.js'), R = await import('../src/resultscard.js'), P = await import('../src/missionplan.js'), S = await import('../src/save.js');
  // 1
  check(T.tip('rail-plant', 2) === 'You carry 2 trees. Take off and plant them.' && /You carry 6 trees/.test(T.tip('rail-plant', 6)), `rail-plant says how many trees the plane carries: '${T.tip('rail-plant', 2)}'`);
  const pl = T.tip('rail-planted', 10);
  check(/Your first tree! It grows up in 10 flights\./.test(pl) && /not saved for the next flight/.test(pl), `rail-planted says it grows up in N flights and that unplanted trees are not saved: '${pl}'`);
  check(/Buy more trees for each flight here/.test(T.tip('rail-parcels')) && /first level is free/.test(T.tip('rail-parcels')), `rail-parcels (NATURE): '${T.tip('rail-parcels')}'`);
  // 2
  const t1 = T.tip('tree-1');
  check(/<b>PLANT<\/b>/.test(t1) && /cross/.test(t1) && /green/.test(t1) && !/SEND A SEED/.test(t1), `the flight strip names PLANT and the cross that turns green: '${t1}'`);
  // 3
  const bad = [], scan = (where, s) => { if (typeof s === 'string' && (/parcel/i.test(s) || /SEND A SEED/.test(s))) bad.push(`${where}: ${s.slice(0, 60)}`); };
  for (const [id, t] of Object.entries(T.TIPS)) { for (const part of ['say', 'more']) { let v; try { v = typeof t[part] === 'function' ? t[part](2) : t[part]; } catch (e) { v = null; } scan(`tip ${id}.${part}`, v); } }
  for (const line of U.LINES.filter(l => ['trees', 'soil', 'nursery'].includes(l.id))) { scan(`line ${line.id}.name`, line.name); scan(`line ${line.id}.what`, line.what); scan(`line ${line.id}.why`, line.why); for (const lv of line.levels) { scan(`line ${line.id} level name`, lv.name); scan(`line ${line.id} level short`, lv.short); } }
  const blocked = P.needsOf('plant-tree', { k: 1 }, S.prepareSave(null));
  scan('needs text', blocked && blocked.text); scan('needs name', blocked && blocked.name);
  check(!bad.length, `no player text says 'parcel' or 'SEND A SEED': ${bad.slice(0, 4).join(' | ')}${bad.length > 4 ? ` ... ${bad.length} in all` : ''}`);
  // 4
  const base = { landed: true, landedAt: 'PARIS', distance: 1000, earned: [], rewards: [], breakdown: { co2: 0, night: 0, sun: 0, trees: 0 }, missions2: { done: [], next: null } };
  const save = S.prepareSave(null), tv = r => { const v = R.resultsView({ ...base, ...r }, save); return `${v.trees}|${v.treeNames}`; };
  check(tv({ treesDropped: 3, planted: 2, treeNames: ['Spruce', 'Oak'] }) === 'Planted 2 of 3 trees|Spruce, Oak', `2 of 3 planted: two lines, the count and then the kinds: '${tv({ treesDropped: 3, planted: 2, treeNames: ['Spruce', 'Oak'] })}'`);
  check(tv({ treesDropped: 1, planted: 1, treeNames: ['Oak'] }) === 'Planted 1 of 1 tree|Oak', `1 of 1 planted: '${tv({ treesDropped: 1, planted: 1, treeNames: ['Oak'] })}'`);
  check(tv({ treesDropped: 3, planted: 0, treeNames: [] }) === 'Missed 3 trees|', `none landed on soil: one line, no kinds: '${tv({ treesDropped: 3, planted: 0, treeNames: [] })}'`);
  check(tv({ treesDropped: 0, planted: 0 }) === '|' && tv({}) === '|', 'no tree dropped: no row');
  check(tv({ school: true, treesDropped: 2, planted: 2, treeNames: ['Oak'] }) === '|', 'flight school: no planting row');
  { const long = R.resultsView({ ...base, treesDropped: 6, planted: 6, treeNames: ['Spruce', 'Birch', 'Oak', 'Rowan', 'Orchard apple'] }, save);
    check(long.treeNames.length <= R.LINE_MAX && long.trees === 'Planted 6 of 6 trees', `a long list of kinds is clipped to the row (${R.LINE_MAX} characters): '${long.treeNames}' (${long.treeNames.length})`); }
  check('Planted 6 of 6 trees'.length <= R.LINE_MAX, 'the count line fits the row');
  console.log(fails.length ? `FAIL treewords:\n - ${fails.join('\n - ')}` : 'PASS treewords: one noun (tree), the rail texts name the count, the grow-up time and that unplanted trees are not saved, no player text says parcel or SEND A SEED, the results line counts planted of dropped trees');
  process.exit(fails.length ? 1 : 0);
})();
