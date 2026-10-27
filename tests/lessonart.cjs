// The first-hour lesson pictures (S3; the user's hybrid pick, 2026-10-27): PixelLab objects + the game's own Comet, seed
// token and Earth face, composed into the old diagram layouts at 240x128 (~/art-tut/compose.py). No browser.
// Each first-hour picture exists at 240x128 (the new art, not an old 120x64 diagram). (No-old-plane-pixels and nose-right
// are enforced where the pictures are made: ~/art-tut/compose.py asserts both.)
// Run: node tests/lessonart.cjs   (proved by a planted defect: an old 120x64 picture put back)
const fs = require('fs'), path = require('path');
const fails = [], check = (c, m) => { if (!c) fails.push(m); };
const png = f => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), b }; };
const FIRST_HOUR = ['storm', 'tap', 'seed', 'day', 'night', 'heat', 'land', 'plot', 'hangar', 'nature'];
for (const n of FIRST_HOUR) {
  const f = path.join(__dirname, '..', 'assets', 'ui', `lesson-${n}.png`);
  if (!fs.existsSync(f)) { fails.push(`lesson-${n}.png is missing`); continue; }
  const { w, h } = png(f);
  check(w === 240 && h === 128, `lesson-${n}.png is 240x128 (got ${w}x${h})`);
}
// The two new pictures are used where the lesson leads (the hub's free-part card and the results).
const ui = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.js'), 'utf8');
check(/lesson-hangar\.png/.test(ui) && /lesson-nature\.png/.test(ui), 'the hangar and nature pictures are shown where the lesson leads');
console.log(fails.length ? `FAIL lessonart:\n - ${fails.join('\n - ')}` : `PASS lessonart: ${FIRST_HOUR.length} first-hour pictures at 240x128, hangar + nature wired in`);
process.exit(fails.length ? 1 : 0);
