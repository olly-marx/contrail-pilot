// The asterisk: which planting missions NEED a Tree Planting level the player lacks (src/missionplan.js needsOf; src/missionsview.js row; research MISSION-REVAMP-PLAN.md section 3). Plain Node, no browser.
// Tree Planting levels 1 to 4 carry 2 / 3 / 4 / 6 parcels per flight (src/upgrades.js 'trees'). Named lines, in order:
//   FIXTURE  the trees line has the 4 levels the table below is written for
//   1. levelForParcels: 1 parcel -> level 1, 2 -> 1, 3 -> 2, 4 -> 3, 5 and 6 -> 4
//   2. needsOf for each planting kind at k = 1, 2, 3 asks the right level, and is null once the player owns it
//   3. the row: a blocked mission shows the asterisk, 'Needs N parcels' (at most 20 characters) and the item's name in its tip; an owned one shows none
//   4. a mission that needs nothing (land-city) never has a marker
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const P = await import('../src/missionplan.js'), M2 = await import('../src/missions2.js'), V = await import('../src/missionsview.js'), U = await import('../src/upgrades.js'), S = await import('../src/save.js');
  const trees = U.LINES.find(l => l.id === 'trees');
  check(!!trees && trees.levels.map(x => x.parcels).join() === '2,3,4,6', `FIXTURE: Tree Planting has levels of 2, 3, 4 and 6 parcels: ${trees && trees.levels.map(x => x.parcels)}`);
  check([1, 2, 3, 4, 5, 6].map(P.levelForParcels).join() === '1,1,2,3,4,4', `levelForParcels for 1..6 parcels is 1,1,2,3,4,4: ${[1, 2, 3, 4, 5, 6].map(P.levelForParcels)}`);
  const want = { 'plant-tree': [1, 1, 1], rescue: [1, 3, 4], 'd-plant': [1, 2, 3], kinds3: [1, 2, 2] };   // level asked at k = 1, 2, 3 (kinds3: kinds = 2, 3, 3)
  for (const [id, lvls] of Object.entries(want)) for (const k of [1, 2, 3]) {
    const f = { k, kinds: id === 'kinds3' ? (k === 1 ? 2 : 3) : 2 }, n = P.needsOf(id, f, { levels: {} }), own = P.needsOf(id, f, { levels: { trees: lvls[k - 1] } });
    check(!!n && n.level === lvls[k - 1] && n.tab === 'nature' && n.line === 'trees' && own === null, `needsOf(${id}, k = ${k}) asks Tree Planting level ${lvls[k - 1]} and is null once owned: ${JSON.stringify(n)} / owned ${JSON.stringify(own)}`);
  }
  check(P.needsOf('land-city', { k: 1 }, { levels: {} }) === null && P.needsOf('chain', { k: 1 }, { levels: {} }) === null, 'a land-city or chain mission never needs a purchase');
  const mk = levels => { const s = S.prepareSave(null); Object.assign(s, { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels, flights: 20, landings: 12 }); return s; };
  const rowOf = (s, id) => { const v = V.missionsView(s), all = [v.next, ...v.open, ...v.today.rows].filter(Boolean); return all.find(r => r.key === `weurope:${id}`); };
  const blocked = rowOf(mk({}), 'plant-tree'), owned = rowOf(mk({ trees: 1 }), 'plant-tree'), land = rowOf(mk({}), 'land-city');
  check(!!blocked && /\*$/.test(blocked.short) && /^Needs \d trees$/.test(blocked.how) && blocked.how.length <= 20 && blocked.needs && blocked.needs.line === 'trees' && /Plant trees/.test(blocked.tip), `a blocked plant-tree row shows the asterisk, 'Needs 2 parcels' and the item in its tip: ${JSON.stringify(blocked && [blocked.short, blocked.how, blocked.needs, blocked.tip])}`);
  check(!!owned && !/\*$/.test(owned.short) && !owned.needs && !/^Needs/.test(owned.how), `an owned one shows no marker: ${JSON.stringify(owned && [owned.short, owned.how, owned.needs])}`);
  check(!!land && !land.needs && !/\*$/.test(land.short), `the land-city row never has a marker: ${JSON.stringify(land && [land.short, land.needs])}`);
  console.log(fails.length ? `FAIL needsmark:\n - ${fails.join('\n - ')}` : 'PASS needsmark: the planting missions name the Tree Planting level they need, the row shows an asterisk and Needs N parcels, owned or unrelated missions show nothing');
  process.exit(fails.length ? 1 : 0);
})();
