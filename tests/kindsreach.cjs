// The '3 kinds of tree' crossing star is always possible (2026-10-28, the sim chat: experts starting in East Asia, Australia
// or Patagonia NEVER got crossing 1 - their lands plateau below biodiversity 20, so only 2 tree kinds open and a fixed '3
// kinds' was impossible). For every starter area's land: (a) at the plateau (one project done, no trees), the star asks for
// no more kinds than are open, and at least 2; (b) with tier 1 + 2 funded, it asks for the open kinds, up to 3.
// Plant: kinds fixed at 3 (the old rule) -> FAIL for the plateau lands. Plain Node, season 2 on.
globalThis.SEASON2 = true;
(async () => {
  const { AREAS } = await import('../src/areas.js'), M = await import('../src/missions2.js'), N = await import('../src/nature.js');
  const { landTrees } = await import('../src/landtrees.js'), { REGION_DATA } = await import('../src/habitats.js');
  const fails = [], rows = [];
  for (const [a, area] of Object.entries(AREAS).filter(([, v]) => v.starter)) {
    const base = { areas: [a], homeArea: a, city: area.start, visited: [area.start], tutorialDone: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], seeds: 1e9, crystals: 1e9, habitat: {}, planted: {}, plantedIn: {}, levels: {}, landings: 20, flights: 20 };
    const land = M.fillFor(base, a, area.start).land, P = (REGION_DATA[land] || {}).projects || [];
    const plateau = JSON.parse(JSON.stringify(base)); const t1 = P.find(p => p.tier === 1); if (t1) N.fundProject(plateau, land, t1.id);
    const f1 = M.fillFor(plateau, a, area.start), open1 = landTrees(plateau, land).filter(t => t.open).length;
    if (f1.kinds > Math.max(2, open1) || f1.kinds < 2) fails.push(`${a} (${land}) at the plateau: the star asks for ${f1.kinds} kinds, ${open1} open`);
    const rich = JSON.parse(JSON.stringify(base)); for (const p of P.filter(p => p.tier <= 2)) N.fundProject(rich, land, p.id);
    const f2 = M.fillFor(rich, a, area.start), open2 = landTrees(rich, land).filter(t => t.open).length;
    if (f2.kinds !== Math.max(2, Math.min(3, open2))) fails.push(`${a} (${land}) with tiers 1-2: the star asks for ${f2.kinds}, want ${Math.max(2, Math.min(3, open2))} (${open2} open)`);
    rows.push(`${a}/${land}: plateau ${f1.kinds} of ${open1} open, rich ${f2.kinds} of ${open2}`);
  }
  if (fails.length) { console.log('FAIL kindsreach\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS kindsreach: the kinds star is possible in every starter land (${rows.join('; ')})`);
})();
