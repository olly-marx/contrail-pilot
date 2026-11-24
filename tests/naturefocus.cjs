// NATURE'S FOCUS (Plan D, src/naturefocus.js; Oliver 2026-11-23: 'too many regions and too many projects ... overwhelmed ... which to choose'). Plain Node:
//  1. NATURE opens on the land the crossing on offer leaves from while that crossing waits on its nature; once its nature is met, on the land you are in;
//  2. a land the player does not have is never the focus;
//  3. a tier offers its next 3 projects not yet done, and counts the rest.
// Plants (tools/plants.tsv, test `naturefocus`). Run: node tests/naturefocus.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const F = await import('../src/naturefocus.js'), C = await import('../src/crossings.js'), H = await import('../src/habitats.js');
  const base = { tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', city: 'LONDON', crossed: [], areaBest: { weurope: 60000 } };
  const off = C.available(base)[0], dep = off && C.departureLand(off);
  const f1 = F.focusLand(base);
  check(off && f1.land === dep && f1.why === 'crossing' && f1.to === off.to && f1.need === C.natureNeed(off), `waiting on nature: NATURE opens on the crossing's departure land ${dep}: ${JSON.stringify(f1)}`);
  const met = { ...base, habitat: { [dep]: H.REGION_DATA[dep].projects.map(p => p.id) } };
  const f2 = F.focusLand(met);
  check(f2.why === 'here' && f2.land === 'woodland', `nature met: NATURE opens on the land you are in (LONDON: woodland): ${JSON.stringify(f2)}`);
  const f3 = F.focusLand(base, l => l !== dep);
  check(f3.land !== dep, `a land the player does not have is never the focus: ${JSON.stringify(f3)}`);
  const ps = [1, 2, 3, 4, 5].map(i => ({ id: `p${i}` }));
  const o = F.onOffer(ps, ['p2']);
  check(o.shown.map(p => p.id).join() === 'p1,p3,p4' && o.more === 1 && F.OFFER === 3, `a tier offers the next 3 not done, 1 more behind 'show all': ${JSON.stringify([o.shown.map(p => p.id), o.more])}`);
  if (fails.length) { console.log(`FAIL naturefocus:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log('PASS naturefocus: NATURE opens on the land the next crossing waits on, else where you are; a tier offers 3 projects');
})();
