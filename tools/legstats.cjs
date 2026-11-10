// LEG STATISTICS of the default destination vs the old tour (ROUTING V2 step 2; the Coordinator, 2026-11-10: is the third leg harder with the default?). Deterministic, Node only, no flights flown:
// for every single area and every start city (only the start visited), the first 6 legs of the path under the DEFAULT (src/destination.js) and under the OLD TOUR (DEFAULT_DEST.on = false): mean game km by leg number, and for the
// legs the share that are long (>= 2400 game km). Run: node tools/legstats.cjs   (prints a table; not in the gate)
globalThis.SEASON2 = true;
(async () => {
  const R = await import('../src/route.js'), D = await import('../src/destination.js'), A = await import('../src/areas.js');
  const LEGS = 6, LONG = 2400, acc = { default: [], old: [] };
  for (const k of ['default', 'old']) for (let i = 0; i < LEGS; i++) acc[k][i] = { sum: 0, n: 0, long: 0 };
  let starts = 0;
  for (const area of Object.keys(A.AREAS)) {
    const base = { areas: [area], tutorialDone: true, homeArea: area }, L = R.linksFor(base);
    for (const c of Object.keys(L)) {
      starts++;
      for (const k of ['default', 'old']) {
        D.DEFAULT_DEST.on = k === 'default';
        const path = R.flightPath({ ...base, city: c, visited: [c] }, LEGS);
        for (let i = 0; i < LEGS && i + 1 < path.length; i++) { const km = R.legBetween(path[i], path[i + 1]), a = acc[k][i]; a.sum += km; a.n++; if (km >= LONG) a.long++; }
      }
    }
  }
  D.DEFAULT_DEST.on = true;
  console.log(`start cities: ${starts}; legs 1..${LEGS}; game km (mean) and share of legs >= ${LONG}`);
  console.log('leg | default mean | old mean | default long% | old long%');
  for (let i = 0; i < LEGS; i++) { const d = acc.default[i], o = acc.old[i]; console.log(`${i + 1}   | ${Math.round(d.sum / d.n)}        | ${Math.round(o.sum / o.n)}     | ${(100 * d.long / d.n).toFixed(1)}%        | ${(100 * o.long / o.n).toFixed(1)}%`); }
})();
