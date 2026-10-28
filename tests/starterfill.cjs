// Non-UK starts (the audit, 2026-10-28): for every starter area, (a) missions never name the HOME city as the "land at X,
// then Y" target (cityB/cityC: it said '...then MANAUS' to a Manaus start), and (b) the start choice leaves only the start
// city visited (it kept the default save's LONDON). Plain Node with season 2 on. Plants: either fix reverted -> FAIL.
globalThis.SEASON2 = true;
(async () => {
  const { AREAS } = await import('../src/areas.js'), M = await import('../src/missions2.js'), { applyStart } = await import('../src/startchoice.js');
  const fails = [], rows = [];
  for (const [a, area] of Object.entries(AREAS).filter(([, v]) => v.starter)) {
    const s = { areas: [a], homeArea: a, city: area.start, visited: ['LONDON'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], landings: 6, flights: 7, levels: {} };
    applyStart(s, { area: a, city: area.start });
    if (JSON.stringify(s.visited) !== JSON.stringify([area.start])) fails.push(`${a}: after the start choice visited = ${JSON.stringify(s.visited)}, want only ${area.start}`);
    const f = M.fillFor(s, a, area.start);
    if (area.cities.length > 2 && (f.cityB === area.start || f.cityC === area.start)) fails.push(`${a}: a mission's target is the home city ${area.start} (cityB ${f.cityB}, cityC ${f.cityC})`);
    rows.push(`${a}: ${f.city}/${f.cityB}/${f.cityC}`);
  }
  if (fails.length) { console.log('FAIL starterfill\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS starterfill: no starter's missions target its home city; visited starts at the start city (${rows.join('; ')})`);
})();
