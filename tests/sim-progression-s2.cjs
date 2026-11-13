// The progression simulator offers season-2 crossings by the GAME's own rule (sim engine, 2026-10-27): with season 2 on
// in Node (globalThis.SEASON2, read when src/cities.js loads), each flight's crossing must be exactly the one the hub's
// NEXT button would pick (ui.js: crossings.available(save).find(readiness(s, c).ready)), computed here
// independently from the save before the flight; and a landed crossing must open its far side (completeCrossing). AMENDED 2026-11-13: the game offers by readiness(save, c).ready
// (era, plane reach from any area, best nature; no stars), so this test's oracle is readiness; power = some flight where a crossing was available but not ready.
// Western Europe start whose biodiversity already passes (the woodland projects funded) but with no long landed flight yet (AMENDED 2026-11-13: no areaBest,
// so the plane tick holds crossing 1 back at first)
// s = 0.8, 2 seeds x 40 flights. Power: a flight where a crossing was available but not ready, and at least one landed crossing.
// Plain Node. PLANT=noready | nocomplete (PROG_PLANTS in progression.js): must FAIL.  Run: node tests/sim-progression-s2.cjs
globalThis.SEASON2 = true;
(async () => {
  const { SEASON2_ON } = await import('../src/cities.js');
  const P = await import('../src/sim/progression.js');
  const X = await import('../src/crossings.js');
  const { UK_PROJECTS } = await import('../src/habitats.js');
  if (!SEASON2_ON) { console.log('FAIL\n- season 2 is not on in Node (src/cities.js must read globalThis.SEASON2)'); process.exit(1); }
  if (process.env.PLANT) P.PROG_PLANTS[process.env.PLANT] = true;
  const fails = [], power = { notReady: 0, landed: 0, offered: 0 };
  for (const seed of [1, 2]) {
    const want = [];
    const r = P.progression({ careful: true, skill: () => 0.8, flights: 40, seed, maxSkip: 4, start: { areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', habitat: { woodland: UK_PROJECTS.map(p => p.id) } },
      beforeFlight: (save, n) => {
        const c = X.available(save).find(c => X.readiness(save, c).ready) || null;   // the game's rule since 2026-11-09 (ui.js: readiness(s, c).ready)
        if (!c && X.available(save).length) power.notReady++;
        want[n] = c ? c.id : '';
      } });
    for (const x of r.rows) {
      if (x.crossingId !== want[x.flight]) fails.push(`seed ${seed} flight ${x.flight}: flew crossing '${x.crossingId}', the game would offer '${want[x.flight]}'`);
      if (x.crossingId) { power.offered++;
        const c = X.crossingById(x.crossingId), [a, b] = X.sides(c);
        if (x.landed) { power.landed++; if (!(x.areas.includes(a) && x.areas.includes(b))) fails.push(`seed ${seed} flight ${x.flight}: landed ${x.crossingId} but areas are ${x.areas}`); } }
    }
  }
  if (!(power.notReady > 0 && power.landed > 0)) fails.push(`no power: ${JSON.stringify(power)}`);
  if (fails.length) { console.log('FAIL\n- ' + fails.slice(0, 8).join('\n- ')); process.exit(1); }
  console.log(`PASS: every crossing is the game's own pick and a landed one opens its area (${JSON.stringify(power)})`);
})();
