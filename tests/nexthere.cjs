// NATURE "Next here" card (src/nexthere.js). No browser.
// 1. the next tree is the first shut one, with its rule's real progress; 2. the next tier's threshold; 3. the animal
// is never a found one or a farm animal, and "out there now" only when it can really appear.
// Run: node tests/nexthere.cjs   (proved by planted defects)
(async () => {
  const X = await import('../src/nexthere.js'), N = await import('../src/nature.js'), L = await import('../src/landtrees.js'), { REGION_DATA, TIERS } = await import('../src/habitats.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  for (const land of Object.keys(REGION_DATA)) {
    const p0 = REGION_DATA[land].projects[0].id;
    const fresh = X.nextHere({}, land);
    check(fresh.tree && fresh.tree.have === 0 && fresh.tree.need === 1 && fresh.tree.name === L.landTrees({}, land)[1].name, `${land} fresh: native 1, 0/1 (${JSON.stringify(fresh.tree)})`);
    const s1 = { habitat: { [land]: [p0] } }, n1 = X.nextHere(s1, land), bio = N.biodiversity(s1, land);
    check(n1.tree && n1.tree.name === L.landTrees(s1, land)[2].name && n1.tree.have === Math.min(bio, 20) && n1.tree.need === 20, `${land} one project: native 2, biodiversity ${bio}/20 (${JSON.stringify(n1.tree)})`);
    const t = TIERS.find(x => bio < x.needs);
    check(t ? n1.tier && n1.tier.need === t.needs && n1.tier.have === bio : !n1.tier, `${land}: next tier at ${t && t.needs} (${JSON.stringify(n1.tier)})`);
    // animals
    const all = { habitat: { [land]: REGION_DATA[land].projects.map(p => p.id) }, found: {} };
    for (let i = 0; i < 300; i++) {
      const a = X.nextHere(all, land).animal; if (!a) break;
      check(!['cow', 'sheep'].includes(a.id), `${land}: a farm animal suggested`);
      check(!a.ready || N.canAppear(all, a.id, land), `${land} ${a.id}: "out there now" but it cannot appear`);
      check(!all.found[a.id], `${land} ${a.id}: suggested again after it was found`);
      all.found[a.id] = 1;
    }
  }
  const full = { planted: { spruce: 9, birch: 9, oak: 9, rowan: 9, orchard: 9 }, habitat: { woodland: REGION_DATA.woodland.projects.map(p => p.id) }, found: {} };
  N.regionSpecies('woodland').forEach(w => full.found[w.id] = 1);
  check(!X.nextHere(full, 'woodland').tree, 'every tree open: no tree row');
  console.log(fails.length ? `FAIL nexthere:\n - ${fails.slice(0, 12).join('\n - ')}` : 'PASS nexthere: next tree with real progress, next tier, animals never found/farm and "out there" only when they can appear');
  process.exit(fails.length ? 1 : 0);
})();
