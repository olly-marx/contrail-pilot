// ROW ICONS (Oliver, 2026-11-17: "pixellab symbols"): every hangar system and gadget row and every NATURE tool row has a PixelLab picture
// (src/rowicons.js ROW_ICONS -> assets/ui/rows/ri-<id>.png), each file is a 32 x 32 PNG, and the rows' HTML shows it in the 32 px slot. No browser.
// Run: node tests/rowicons.cjs   (plants in tools/plants.tsv)
(async () => {
  const fs = require('fs'), path = require('path'), fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const R = await import('../src/rowicons.js'), F = await import('../src/fleet.js'), U = await import('../src/upgrades.js');
  const tools = U.LINES.filter(l => l.tree === 'Nature').map(l => l.id);
  const want = [...F.SYSTEMS.map(x => x.id), ...F.GADGETS.map(x => x.id), ...tools];
  for (const id of want) check(R.ROW_ICONS.has(id), `${id}: no row icon declared`);
  for (const id of R.ROW_ICONS) {
    const f = path.join(__dirname, '..', 'assets', 'ui', 'rows', `ri-${id}.png`);
    if (!fs.existsSync(f)) { fails.push(`${id}: ${f} missing`); continue; }
    const b = fs.readFileSync(f);
    check(b.slice(1, 4).toString() === 'PNG' && b.readUInt32BE(16) === 32 && b.readUInt32BE(20) === 32, `${id}: not a 32 x 32 PNG`);
    check(new RegExp(`<img class="rowc-icon" src="assets/ui/rows/ri-${id}\\.png"`).test(R.rowIcon(id)), `${id}: rowIcon does not show the picture`);
  }
  check(/rowc-slot/.test(R.rowIcon('no-such-row')), 'a row without art keeps the empty slot');
  const src = f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
  check(/\$\{rowIcon\(id\)\}/.test(src('hangar.js')), 'the hangar rows call rowIcon');
  check(/\$\{rowIcon\(line\.id\)\}/.test(src('wild.js')), 'the NATURE tool rows call rowIcon');
  if (fails.length) { console.log('FAIL rowicons\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1); }
  console.log(`ok rowicons: ${want.length} rows, ${R.ROW_ICONS.size} pictures`);
})();
