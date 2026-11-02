// UX text budgets on DATA (research/UX-MASTER-PLAN.md D3 rule 2, F2 `textbudget2`). No browser. Every limit is derived from the 320 px phone
// (the smallest gated size), where the row's text column is 208 px wide (264 px panel text - 16 row padding - 32 icon - 8 gap) and the Pixel font
// is 1 em per character:  9 px name -> 23 chars a line;  7 px fact line beside the 100 px price -> 14 chars a line.  Longest REAL values are used.
// Each rule is DECLARED with `enforce` and the release that turns it on (as src/screens.js does): a PENDING rule must have a violator today
// (its positive control) and the test fails if it has none ("flip it"). Mission short titles (<= 24, decision 7) are not here: the field does not exist until R4.
// Run: node tests/textbudget2.cjs   (plants in tools/plants.tsv)
(async () => {
  const { REGION_DATA } = await import('../src/habitats.js');
  const F = await import('../src/fleet.js');
  const fails = [], notes = [];
  const projects = Object.entries(REGION_DATA).flatMap(([land, d]) => d.projects.map(p => ({ land, p })));
  const levels = [];   // every system / gadget level, and every plane line level
  for (const g of [...F.SYSTEMS, ...F.GADGETS]) g.levels.forEach((lv, i) => levels.push({ where: `${g.id} L${i + 1}`, lv }));
  for (const pl of F.PLANES) for (const [line, arr] of Object.entries(pl.lines)) arr.forEach((lv, i) => levels.push({ where: `${pl.id}.${line} L${i + 1}`, lv }));
  const RULES = [
    { id: 'project-row', limit: 46, why: 'a NATURE row name is at most 2 lines of 23 chars at 320', enforce: true, from: 'R0',
      items: () => projects.map(({ land, p }) => ({ where: `${land}/${p.id}`, text: p.row || p.name })) },
    { id: 'hangar-next', limit: 28, why: '"Next: <short>" is at most 2 lines of 14 chars beside the price at 320', enforce: false, from: 'R7',
      items: () => levels.map(({ where, lv }) => ({ where, text: `Next: ${F.shortName(lv)}` })) },
    { id: 'effect-text', limit: 33, why: 'the preview strip fact line is 33 chars at 8 px (UX plan C0)', enforce: false, from: 'R5',
      items: () => levels.map(({ where, lv }) => ({ where, text: F.effectText(lv) })).filter(x => x.text) },
  ];
  let counted = 0;
  for (const r of RULES) {
    const items = r.items(); counted += items.length;
    const bad = items.filter(x => x.text.length > r.limit);
    if (r.enforce && bad.length) fails.push(`${r.id}: ${bad.length} over ${r.limit} chars (${r.why}), e.g. ${bad.slice(0, 3).map(x => `${x.where} "${x.text}" (${x.text.length})`).join('; ')}`);
    else if (!r.enforce && !bad.length) fails.push(`${r.id} is PENDING (until ${r.from}) but nothing is over ${r.limit} now: set enforce: true`);
    else if (!r.enforce) notes.push(`${r.id} pending until ${r.from}: ${bad.length} of ${items.length} over ${r.limit} (e.g. "${bad[0].text}")`);
  }
  if (projects.length < 100) fails.push(`only ${projects.length} projects were checked (expected >= 100): the data moved, this proves nothing`);
  if (levels.length < 100) fails.push(`only ${levels.length} levels were checked (expected >= 100)`);
  notes.forEach(n => console.log('  note: ' + n));
  console.log(fails.length ? `FAIL textbudget2:\n - ${fails.join('\n - ')}` : `PASS textbudget2: ${counted} texts checked (${projects.length} projects, ${levels.length} levels)`);
  process.exit(fails.length ? 1 : 0);
})();
