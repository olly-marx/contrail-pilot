// Every animal and bird drawn for the game (src/wildlife.js, generated from tools/art/species.py) is in some land's
// species list (src/nature.js regionSpecies: what can spawn and has a NATURE card). A drawn animal in no list is
// never seen but is still downloaded on flights (2026-10-24: the wall lizard, griffon vulture and mink were left
// over after the user's 2026-10-22 "leave out the mink" decision). No browser needed.  Run: node tests/wildlifelist.cjs
(async () => {
  const { WILDLIFE } = await import('../src/wildlife.js');
  const { REGION_DATA } = await import('../src/habitats.js');
  const { regionSpecies } = await import('../src/nature.js');
  const used = new Set(['woodland', ...Object.keys(REGION_DATA)].flatMap(r => regionSpecies(r).map(w => w.sprite)).filter(Boolean));
  const stray = WILDLIFE.filter(w => w.kind !== 'tree' && w.sprite && !used.has(w.sprite)).map(w => w.sprite);
  const animals = WILDLIFE.filter(w => w.kind !== 'tree').length;
  if (stray.length || animals < 150) { console.log(`FAIL\n- drawn but in no land's species list: ${stray.join(' ')} (of ${animals})`); process.exit(1); }
  console.log(`PASS wildlifelist (${animals} animals and birds, every one in a land)`);
})();
