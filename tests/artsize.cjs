// Every hangar picture layer has its plane's size (the user's screenshot, 2026-11-02: a ghost layer drawn at a different size
// from the plane showed as two planes). No browser. Run: node tests/artsize.cjs
// For each plane: its hangar portrait (PLANES[].portrait), every part layer lookFiles() can return at any level of any line,
// and every gadget overlay hangarGadgets() can return: each PNG's real width x height (read from its IHDR header) must equal
// the portrait's. (Today all are 400 x 176; this guards new art and path changes.)
// Plant (tools/plants.tsv): lookFiles' hangar layers pointed at the 62x27 in-flight sprites -> FAIL.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), src = f => path.join(root, 'src', f);
const size = f => { const b = fs.readFileSync(path.join(root, f));
  if (b.toString('ascii', 1, 4) !== 'PNG' || b.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`${f}: not a PNG`);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; };
(async () => {
  const F = await import(src('fleet.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  let n = 0;
  for (const p of F.PLANES) {
    const want = size(p.portrait), layers = new Set();
    // every level of every line, one line at a time and all full (Wings & body levels stack)
    const lines = Object.keys(F.PLANE_LINES);
    for (const line of lines) for (let k = 1; k <= p.lines[line].length; k++) F.lookFiles(p.id, { [line]: k }, 'hangar').parts.forEach(x => layers.add(x));
    F.lookFiles(p.id, Object.fromEntries(lines.map(l => [l, p.lines[l].length])), 'hangar').parts.forEach(x => layers.add(x));
    // every gadget overlay: a save with every gadget bought, flying this plane
    const save = { fleet: { plane: p.id, planes: { [p.id]: {} }, systems: {}, gadgets: Object.fromEntries(F.GADGETS.map(g => [g.id, 1])) } };
    F.hangarGadgets(save, p.id).forEach(x => layers.add(x));
    for (const f of layers) {
      n++;
      if (!fs.existsSync(path.join(root, f))) { fails.push(`${p.id}: ${f} is missing`); continue; }
      const got = size(f);
      check(got === want, `${p.id}: ${f} is ${got}, its plane's portrait is ${want} (a ghost / payoff layer would not line up)`);
    }
  }
  check(n > 30, `only ${n} layers found: the check would prove little`);
  if (fails.length) { console.log(`FAIL artsize\n  ${fails.slice(0, 12).join('\n  ')}`); process.exit(1); }
  console.log(`PASS artsize: ${n} hangar layers, each the size of its plane's portrait`);
})();
