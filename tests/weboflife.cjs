// Web of life in NATURE (MASTER-PLAN Part G): a project card lists exactly the animals it helps bring back, found ones
// marked, with the other projects each still needs. No browser.
// The cross-check: funding every project an animal is listed under, with the meter high enough, must make it able to
// appear (canAppear), so the card never promises an animal the game would not bring.
// Run: node tests/weboflife.cjs   (proved by planted defects)
(async () => {
  const W = await import('../src/weboflife.js'), N = await import('../src/nature.js'), { REGION_DATA } = await import('../src/habitats.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  let links = 0;
  for (const [land, d] of Object.entries(REGION_DATA)) {
    const listed = {};
    for (const p of d.projects) for (const a of W.broughtBack({}, land, p.id)) (listed[a.id] = listed[a.id] || []).push(p.id), links++;
    for (const w of N.regionSpecies(land)) {
      const needs = w.c.needs || [];
      check(JSON.stringify((listed[w.id] || []).sort()) === JSON.stringify([...needs].sort()), `${land} ${w.id}: listed under ${listed[w.id]} but needs ${needs}`);
      if (!needs.length) continue;
      // with every project of the land funded (the meter as high as projects take it), it can appear
      const all = { habitat: { [land]: d.projects.map(p => p.id) }, planted: {}, plantedIn: {} };
      if (N.biodiversity(all, land) >= (w.c.bio || 0)) check(N.canAppear(all, w.id, land), `${land} ${w.id}: every project funded, still cannot appear`);
    }
  }
  // found / more
  const land = 'woodland', p = 'beavers', a0 = W.broughtBack({}, land, p);
  check(a0.length > 0 && a0.every(a => !a.found), 'nothing found yet: all silhouettes');
  const f = W.broughtBack({ found: { [a0[0].id]: 1 } }, land, p);
  check(f[0].found && f.slice(1).every(a => !a.found), 'a found animal is marked found');
  const other = a0.find(a => a.more.length);
  if (other) {
    const s = { habitat: { woodland: other.more }, found: {} };
    check(W.broughtBack(s, land, p).find(a => a.id === other.id).more.length === 0, 'projects already done drop out of "also needs"');
  }
  console.log(fails.length ? `FAIL weboflife:\n - ${fails.slice(0, 12).join('\n - ')}` : `PASS weboflife: ${links} project-animal links match each animal's needs; found and "also needs" right`);
  process.exit(fails.length ? 1 : 0);
})();
