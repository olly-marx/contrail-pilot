// Animals are drawn at their REAL size class (Oliver, 2026-11-13: "a bunny rabbit as big as an elephant"). Every animal
// has a declared size in metres (tools/art/pixellab/sizes.tsv); tools/art/sizes.py makes it a class; install_pixellab.py
// draws large/huge on bigger canvases and halves/quarters small/tiny ones. This checks the INSTALLED pictures
// (assets/pixellab/<sprite>-0.png, what the Wild Area and the flight draw): each class within its pixel bounds, and
// the classes' median sizes strictly growing, so a rabbit can never be drawn as big as an elephant again.
// No browser: node tests/animalscale.cjs
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const pngSize = f => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const LIMITS = [['tiny', 0.12], ['small', 0.5], ['medium', 1.8], ['large', 3.5]];   // same as tools/art/sizes.py
const cls = m => (LIMITS.find(([, l]) => m < l) || ['huge'])[0];
// Longest side, in installed pixels: [min, max] per class.
const BOUNDS = { tiny: [3, 14], small: [5, 16], medium: [10, 32], large: [24, 48], huge: [30, 64] };
const ORDER = ['tiny', 'small', 'medium', 'large', 'huge'];
const real = {};
for (const line of fs.readFileSync(path.join(ROOT, 'tools/art/pixellab/sizes.tsv'), 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [k, m] = line.split('\t'); real[k] = +m;
}
(async () => {
  const { WILDLIFE } = await import(path.join(ROOT, 'src/wildlife.js'));
  const { PIXELLAB } = await import(path.join(ROOT, 'src/pixellab.js'));
  const bad = [], by = {};
  for (const w of WILDLIFE) {
    if (!w.sprite || w.kind === 'tree' || by[w.id]) continue;
    if (!(w.id in real)) { bad.push(`${w.id}: no real size in sizes.tsv`); continue; }
    if (!PIXELLAB.has(w.sprite)) { bad.push(`${w.id}: no PixelLab picture`); continue; }
    const [wd, ht] = pngSize(path.join(ROOT, `assets/pixellab/${w.sprite}-0.png`)), long = Math.max(wd, ht), c = cls(real[w.id]);
    const [lo, hi] = BOUNDS[c];
    if (long < lo || long > hi) bad.push(`${w.id} (${real[w.id]} m, ${c}): drawn ${wd}x${ht}, longest side outside ${lo}-${hi}`);
    (by[c] = by[c] || []).push(long); by[w.id] = 1;
  }
  const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const meds = ORDER.map(c => (by[c] && by[c].length ? med(by[c]) : NaN));
  for (let i = 1; i < ORDER.length; i++) if (!(meds[i] > meds[i - 1])) bad.push(`median ${ORDER[i]} ${meds[i]} px is not above median ${ORDER[i - 1]} ${meds[i - 1]} px`);
  const summary = ORDER.map((c, i) => `${c} ${(by[c] || []).length} (median ${meds[i]} px)`).join(', ');
  if (bad.length) { console.log(`FAIL animalscale: ${bad.length} problems\n  ` + bad.join('\n  ')); process.exit(1); }
  console.log(`PASS animalscale (${summary})`);
})();
