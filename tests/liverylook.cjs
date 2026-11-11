// THE LAP LIVERY (src/livery.js, src/fleet.js lookFiles, src/hangar.js, src/GameScene.js planeLookKey; tools/art/make_livery.py). Plain Node, nothing run in a browser.
// (1) liveryOn: true only for a save with lapDone. (2) lookFiles puts the livery LAST, for flight and hangar, only when asked, for all six planes, and never adds it to a plane with no lap. (3) every picture exists with the right size
// (62x27 flight, 400x176 hangar) and UPGRADE_ART preloads the six flight ones. (4) each call site passes liveryOn: the payoff 'before' and 'after' must both carry it, or a purchase would flash the livery off. (5) the sim engine never imports it.
// PICTURES (provenance): the six flight sprites assets/upgrades/plane-<art>-livery.png are the g5 variant (5x5 globe on the tail + the gold stripe; the user's pick, 2026-11-11), written by
// `make_livery.py --variant g5` at tools/art/make_livery.py 553902a into ~/shots-art/livery-var/g5/ (not in the repo) and copied here by cp; the six hangar portraits are run 4 (425b02f). Check: 62x27 / 400x176 only; no screenshots.
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
  // (6) the six flight sprites ARE the g5 variant (the user's pick, 2026-11-11): a DECLARED sha-256 per plane, so a later `make_livery.py --install` or a copied-back run-4 sprite cannot silently swap the variant.
  // To change the look on purpose: regenerate, look at it, and update these six hashes in the same commit.
  const G5 = { comet: '51d1ce8e14f25526d3eb77d175867d2e1067fdbe6a90f1bf618955700a2844e2', '747': '18ce719d52be3077d26280d4b4a16679052fcdb51c39f1430751e215bbbf681b', twin: '31443acd604a47a54900bcb08e26da0ec57aab5725db028b4d6cf8a7c7f21014',
    '787': '29e57ab5445267fd6425fe3b42445fd1a7e5d9fa0244f5c08ad4d0f955c6ea79', truss: '2455011f7da120ed839458f651201d0505aae911e4bd0f990c646c82d14b7714', hydrogen: 'd119eec82ed62d2e707a7fa9ff807c25361d198d96915686d8a755928495dcb9' };
  for (const [art, want] of Object.entries(G5)) {
    const f = `assets/upgrades/plane-${art}-livery.png`, got = fs.existsSync(R(f)) ? require('crypto').createHash('sha256').update(fs.readFileSync(R(f))).digest('hex') : 'missing';
    check(got === want, `${f} is not the g5 sprite (sha-256 ${got.slice(0, 12)}, declared ${want.slice(0, 12)}): the variant was swapped or regenerated`);
  }
  const src = f => fs.readFileSync(R(f), 'utf8');
  check((src('src/hangar.js').match(/lookFiles\([^;]*?'hangar'(, liveryOn\(s\))?\)/g) || []).filter(x => !/liveryOn/.test(x)).length === 0, 'every hangar lookFiles call passes liveryOn(s) (the payoff before and after must agree)');
  check(/lookFiles\(f\.plane, f\.planes\[f\.plane\] \|\| \{\}, 'flight', liveryOn\(this\.save\)\)/.test(src('src/GameScene.js')), 'GameScene.planeLookKey passes liveryOn(this.save)');
  const dir = R('src/sim'), bad = fs.readdirSync(dir).filter(f => f.endsWith('.js') && /livery/.test(src('src/sim/' + f)));
  check(bad.length === 0, `the sim engine does not import the livery: ${bad}`);
  if (fails.length) { console.log('FAIL liverylook:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('PASS liverylook: 6 planes x flight + hangar, 12 pictures present and sized, call sites pass liveryOn');
})();
