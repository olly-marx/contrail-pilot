// THE LAP LIVERY (src/livery.js, src/fleet.js lookFiles, src/hangar.js, src/GameScene.js planeLookKey; tools/art/make_livery.py). Plain Node, nothing run in a browser.
// (1) liveryOn: true only for a save with lapDone. (2) lookFiles puts the livery LAST, for flight and hangar, only when asked, for all six planes, and never adds it to a plane with no lap. (3) every picture exists with the right size
// (62x27 flight, 400x176 hangar) and UPGRADE_ART preloads the six flight ones. (4) each call site passes liveryOn: the payoff 'before' and 'after' must both carry it, or a purchase would flash the livery off. (5) the sim engine never imports it.
// Run: node tests/liverylook.cjs     Plants: tools/plants.tsv, test `liverylook`.
const fs = require('fs'), path = require('path');
const R = f => path.join(__dirname, '..', f);
const png = f => { const b = fs.readFileSync(R(f)); return b.slice(1, 4).toString() === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const L = await import('../src/livery.js'), F = await import('../src/fleet.js');
  check(L.liveryOn({ lapDone: true }) === true, 'a save with lapDone gets the livery');
  check(L.liveryOn({}) === false && L.liveryOn({ lapDone: false }) === false && L.liveryOn(null) === false, 'a save without lapDone (or no save) gets no livery');
  for (const p of F.PLANES) {
    const art = F.LOOKS[p.id].art, full = { engines: 1, body: 1, cabin: 1 };
    for (const [where, expect, size] of [['flight', `plane-${art}-livery`, [62, 27]], ['hangar', `assets/ui/upgrades/hangar-${art}-livery.png`, [400, 176]]]) {
      const on = F.lookFiles(p.id, full, where, true), off = F.lookFiles(p.id, full, where);
      check(on.parts[on.parts.length - 1] === expect, `${p.id} ${where}: the livery is the last part (${expect}), got ${on.parts[on.parts.length - 1]}`);
      check(!off.parts.some(x => /livery/.test(x)), `${p.id} ${where}: no livery unless asked`);
      check(on.parts.length === off.parts.length + 1, `${p.id} ${where}: the livery adds exactly one part`);
      const file = where === 'flight' ? `assets/upgrades/${expect}.png` : expect, sz = fs.existsSync(R(file)) ? png(file) : null;
      check(sz && sz[0] === size[0] && sz[1] === size[1], `${p.id} ${where}: ${file} is missing or not ${size.join('x')} (${sz})`);
    }
    check(F.UPGRADE_ART.includes(`plane-${art}-livery`), `${p.id}: the flight livery is preloaded (UPGRADE_ART)`);
  }
  const src = f => fs.readFileSync(R(f), 'utf8');
  check((src('src/hangar.js').match(/lookFiles\([^;]*?'hangar'(, liveryOn\(s\))?\)/g) || []).filter(x => !/liveryOn/.test(x)).length === 0, 'every hangar lookFiles call passes liveryOn(s) (the payoff before and after must agree)');
  check(/lookFiles\(f\.plane, f\.planes\[f\.plane\] \|\| \{\}, 'flight', liveryOn\(this\.save\)\)/.test(src('src/GameScene.js')), 'GameScene.planeLookKey passes liveryOn(this.save)');
  const dir = R('src/sim'), bad = fs.readdirSync(dir).filter(f => f.endsWith('.js') && /livery/.test(src('src/sim/' + f)));
  check(bad.length === 0, `the sim engine does not import the livery: ${bad}`);
  if (fails.length) { console.log('FAIL liverylook:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('PASS liverylook: 6 planes x flight + hangar, 12 pictures present and sized, call sites pass liveryOn');
})();
