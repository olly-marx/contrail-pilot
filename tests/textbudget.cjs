// The tutorial text budget (S1 of research/PROPOSAL-HOME-MISSIONS.md; the user, 2026-10-27: "far too much text in the
// tutorial"). No browser.
// 1. every teaching bubble in src/tips.js is at most 8 words (HTML out; a function's words counted with the LONGEST
//    real values, e.g. the longest land name);
// 2. no teaching call anywhere in src/ carries its own text: tipOnce / explain / explainWhenClear / ui.coach /
//    school lesson() and say: / tour text: must use tip('id') (so nothing escapes the budget);
// 3. every tip('id') used in src/ exists.
// Run: node tests/textbudget.cjs   (proved by planted defects: a 9-word tip; an inline literal in a coach call)
(async () => {
  const fs = require('fs'), path = require('path');
  const T = await import('../src/tips.js'), { REGION_NAMES } = await import('../src/habitats.js'), { REGION_TREES } = await import('../src/habitat/trees.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const longest = a => a.slice().sort((x, y) => T.wordCount(y) - T.wordCount(x))[0];
  const SAMPLE = {   // the longest real value each function tip can get
    bareLand: [longest(Object.values(REGION_NAMES))],
    'x-species': [longest(Object.values(REGION_TREES).flat().map(t => t.name))],
    'tour-new': ['NATURE'],
    'tour-newline': ['Soil Patches and Tree Nursery'],
  };
  for (const [id, t] of Object.entries(T.TIPS)) {
    if (typeof t.say === 'function') check(SAMPLE[id], `${id}: a function tip needs a SAMPLE (its longest real values)`);
    const text = typeof t.say === 'function' ? t.say(...(SAMPLE[id] || [])) : t.say;
    check(T.wordCount(text) <= T.BUDGET, `${id}: ${T.wordCount(text)} words (budget ${T.BUDGET}): "${text}"`);
  }
  // 2-3. Scan every source file.
  const files = [], walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); });
  walk(path.join(__dirname, '..', 'src'));
  const LIT = String.raw`\s*['"\x60]`;
  const banned = [
    [new RegExp(String.raw`tipOnce\(\s*['"\x60][^'"\x60]*['"\x60]\s*,` + LIT), 'tipOnce with inline text'],
    [new RegExp(String.raw`explain(?:WhenClear)?\(\s*['"\x60][^'"\x60]*['"\x60]\s*,` + LIT), 'explain with inline text'],
    [new RegExp(String.raw`ui\.coach\(` + LIT), 'ui.coach with inline text'],
    [new RegExp(String.raw`\blesson\(\s*'[^']*'\s*,` + LIT), 'school lesson with inline text'],
    [new RegExp(String.raw`\bsay:` + LIT), 'school say: with inline text'],
  ];
  let used = 0;
  for (const f of files) {
    if (f.endsWith(path.join('src', 'tips.js'))) continue;   // the table itself
    const src = fs.readFileSync(f, 'utf8'), rel = path.relative(path.join(__dirname, '..'), f);
    for (const [re, what] of banned) { const m = src.match(re); check(!m, `${rel}: ${what}: ${m && m[0].slice(0, 70)}`); }
    if (rel === path.join('src', 'tour.js')) { const m = src.match(/\btext:\s*['"`]/); check(!m, `${rel}: tour text: with inline text`); }
    for (const m of src.matchAll(/\btip\(\s*['`]([^'`$]+)['`]/g)) { used++; check(T.TIPS[m[1]], `${rel}: tip('${m[1]}') has no entry in src/tips.js`); }
  }
  check(files.length > 40 && used > 50, `the scan saw the whole game (${files.length} files, ${used} tip uses)`);
  console.log(fails.length ? `FAIL textbudget:\n - ${fails.slice(0, 15).join('\n - ')}` : `PASS textbudget: ${Object.keys(T.TIPS).length} tips all <= ${T.BUDGET} words; ${files.length} files, ${used} tip uses, no inline teaching text`);
  process.exit(fails.length ? 1 : 0);
})();
