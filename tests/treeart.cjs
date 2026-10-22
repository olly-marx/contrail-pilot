// Tree art (tools/art/trees.py via make_wildlife.py, 2026-10-22): every tree in src/wildlife.js has
// its 3 growth stages and a portrait, each stage bigger than the last, the grown tree drawn at the
// new size (the old grid trees were at most 17 px tall), and the portrait finer than the sprite.
// No browser needed.  Run: node tests/treeart.cjs
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const size = f => {   // PNG width/height from the IHDR chunk
  const b = fs.readFileSync(path.join(ROOT, f));
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
const src = fs.readFileSync(path.join(ROOT, 'src/wildlife.js'), 'utf8');
const trees = src.split('\n').filter(l => /"kind": "tree"/.test(l)).map(l => JSON.parse(l.trim().replace(/,$/, '')));
const fails = [];
const check = (c, m) => { if (!c) fails.push(m); };
check(trees.length >= 21, `expected all 21 trees (5 woodland + 16 regional), found ${trees.length}`);
for (const t of trees) {
  const st = [0, 1, 2].map(k => `assets/${t.sprite}-${k}.png`);
  const missing = st.concat(t.portrait ? [`${t.portrait}-0.png`] : []).filter(f => !fs.existsSync(path.join(ROOT, f)));
  check(t.portrait, `${t.id}: no portrait in wildlife.js`);
  check(!missing.length, `${t.id}: missing ${missing}`);
  if (missing.length || !t.portrait) continue;
  const [s0, s1, s2] = st.map(size), p = size(`${t.portrait}-0.png`);
  check(s0[0] * s0[1] < s1[0] * s1[1] && s1[0] * s1[1] < s2[0] * s2[1], `${t.id}: stages grow ${JSON.stringify([s0, s1, s2])}`);
  check(s2[1] >= 14 && s2[0] * s2[1] >= 300, `${t.id}: grown tree drawn at the new size ${s2}`);
  check(p[0] >= s2[0] * 2 && p[1] >= s2[1] * 2, `${t.id}: portrait ${p} finer than sprite ${s2}`);
}
if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
console.log(`PASS treeart: ${trees.length} trees, 3 stages + portrait each`);
