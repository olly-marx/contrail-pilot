// ONE PLACE (Oliver, 2026-11-25: 'a big storm ... affected London, Oslo, and Papeete ... Papeete is not even close'; src/storyboard.js NEAR_KM).
// Plain Node. Named lines:
//  1. a theme about one event or place (near: true) keeps its delivery stops ({1}..{n}) within NEAR_KM real km of each other, in
//     offers made for small and large maps (measured before this rule: 18,491 km);
//  2. the board still fills: no slot is left empty on any of those maps.
// Plants (tools/plants.tsv): the near rule off. Run: node tests/storynear.cjs
(async () => {
  const B = await import('../src/storyboard.js'), { prepareSave } = await import('../src/save.js'), { city, realKm } = await import('../src/route.js'), { AREAS } = await import('../src/areas.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const all = Object.keys(AREAS); let near = 0, empty = 0, worst = { km: 0 };
  for (const [areas, best] of [[['weurope'], 6000], [['weurope', 'nordic'], 12000], [['weurope', 'africa', 'mideast'], 20000], [all, 25000], [all, 40000], [['namerica', 'samerica'], 18000], [['oceania', 'aotearoa', 'easia'], 20000]])
    for (let k = 0; k < 30; k++) {
      const s = prepareSave({ areas, homeArea: areas[0], homeCity: AREAS[areas[0]].start, city: AREAS[areas[0]].start, tutorialDone: true, bestDistance: best, storySeq: k * 7, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
      for (const slot of [0, 1, 2]) { s.storyBoard = [null, null, null]; const o = B.makeOffer(s, slot); if (!o) { empty++; continue; }
        if (!B.THEMES.find(t => t.id === o.theme).near) continue; near++;
        const d = o.stops.slice(1); for (const a of d) for (const b of d) { const km = realKm(city(a), city(b)); if (km > worst.km) worst = { km: Math.round(km), a, b, theme: o.theme }; } }
    }
  check(near >= 50, `1. FIXTURE: enough one-place offers to judge (${near})`);
  check(worst.km <= B.NEAR_KM, `1. one-place delivery stops within ${B.NEAR_KM} km: worst ${JSON.stringify(worst)}`);
  check(empty === 0, `2. every slot filled (${empty} empty)`);
  // 3. an offer made before the rule (Oliver's board, 2026-11-26: DENVER, MUMBAI, MANAUS as one flight) leaves the board, the active
  //    special delivery with it (no fee, nothing counted), and its slot is made again within the rule; a valid offer is untouched; a
  //    stop-by-stop story already past its first delivery stays.
  {
    const s = prepareSave({ areas: all, homeArea: 'weurope', homeCity: 'LONDON', city: 'NAIROBI', tutorialDone: true, bestDistance: 60000, storySeq: 40, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
    s.storyBoard = [null, null, null]; B.fillBoard(s); const keep = JSON.stringify(s.storyBoard[0]);
    const old = { id: 'story-9', theme: 'vaccine', title: 'Vaccines for three cities', crate: true, hearts: 3, heartsLeft: 1, reached: 1, stops: ['NAIROBI', 'DENVER', 'MUMBAI', 'MANAUS'], stages: [1, 1, 1], km: 3, pay: { seeds: 1, crystals: 1 }, lines: [], needs: [] };
    s.storyBoard[1] = old; s.storyActive = 'story-9'; s.aimCity = 'MANAUS'; const seeds0 = s.seeds;
    const changed = B.fillBoard(s), now = s.storyBoard[1];
    check(changed && !s.storyBoard.some(o => o && o.id === 'story-9'), '3. the far-apart vaccine offer leaves the board');
    check(!s.storyActive && !s.aimCity && s.seeds === seeds0 && !s.storiesFailed && !s.storiesDropped, `3. the active one goes with no fee and nothing counted (${s.storyActive}, ${s.aimCity}, ${s.seeds})`);
    check(now && !B.brokenNear(now), '3. its slot is made again within the rule');
    check(JSON.stringify(s.storyBoard[0]) === keep, '3. a valid offer is untouched');
    check(Array.isArray(s.storyRetired) && s.storyRetired[0] === 'Vaccines for three cities', '3. the title is kept for the HOME notice');
    const mid = { ...old, id: 'story-10', crate: false, reached: 2 }; s.storyBoard[1] = mid; s.storyActive = 'story-10';
    B.fillBoard(s); check(s.storyActive === 'story-10' && s.storyBoard[1] === mid, '3. a stop-by-stop story past its first delivery stop stays');
  }
  if (fails.length) { console.log(`FAIL storynear:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log(`PASS storynear: ${near} one-place offers keep their delivery stops within ${B.NEAR_KM} km (worst ${worst.km} km, ${worst.theme}); no slot empty`);
})();
