// Reduced motion (research/CELEBRATION-KIT.md section 3, release A). Plain Node, reads style.css, ~0.1 s. The user's setting `prefers-reduced-motion: reduce` must stop every looping
// animation and the celebrations: 1. every rule with an `infinite` animation (outside the reduce block) has its selector in the reduce block with `animation: none`; 2. the era
// confetti is NOT infinite (it stops after two falls); 3. the celebration pieces are listed (payoff spark and transitions, the era timeline, slam/stamp, the arrive animations).
// A CSS-text check, not a computed-style one: a browser check with emulateMedia({ reducedMotion }) is the stronger version (not run yet). Plants: tools/plants.tsv (reducedmotion).
const fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const blocks = (src) => { const out = []; let i = 0; while (i < src.length) { const o = src.indexOf('{', i); if (o < 0) break; const head = src.slice(i, o).trim(); let d = 1, j = o + 1; while (j < src.length && d) { if (src[j] === '{') d++; else if (src[j] === '}') d--; j++; } out.push({ head, body: src.slice(o + 1, j - 1) }); i = j; } return out; };
const top = blocks(css), reduce = top.filter(b => /^@media[^{]*prefers-reduced-motion:\s*reduce/.test(b.head)).flatMap(b => blocks(b.body));
const plain = top.filter(b => !b.head.startsWith('@'));
const sels = h => h.split(',').map(s => s.trim().replace(/\s+/g, ' '));
const fails = [], check = (c, m) => { if (!c) fails.push(m); };
const stilled = new Set(reduce.filter(r => /(animation|transition)\s*:\s*none|display\s*:\s*none/.test(r.body)).flatMap(r => sels(r.head)));
check(reduce.length > 0, 'a `@media (prefers-reduced-motion: reduce)` block exists in style.css');
const inf = plain.filter(r => /animation\s*:[^;]*infinite/.test(r.body)).flatMap(r => sels(r.head));
const loose = inf.filter(s => !stilled.has(s));
check(inf.length >= 10, `POSITIVE CONTROL: the scan finds the looping animations (${inf.length})`);
check(loose.length === 0, `every looping animation is stilled under reduce motion; NOT stilled: ${loose.join(' | ')}`);
const conf = plain.filter(r => /ec-confetti/.test(r.head) && /animation/.test(r.body));
check(conf.length > 0 && conf.every(r => !/infinite/.test(r.body)), 'the era confetti is not an infinite loop (it stops)');
const celebrations = ['.cel-layer', '.cel-layer i', '.cel-push', '.era-card.go .ec-kicker', '.era-card.go .ec-title', '.era-card.go .ec-plane', '.era-card.go .ec-confetti i', '.era-card.go #ecOk', '.pay-plane', '.pay-part', '.payoff.arrive .pay-spark', '#results .slam.in', '.stamp', '.wf.arrive', '.w-webpic.w-flash'];
const missing = celebrations.filter(s => !stilled.has(s));
check(missing.length === 0, `every celebration is listed under reduce motion; MISSING: ${missing.join(' | ')}`);
console.log(fails.length ? 'FAIL reducedmotion:\n - ' + fails.join('\n - ') : `PASS reducedmotion (${inf.length} looping animations and ${celebrations.length} celebration pieces all stilled under reduced motion; the confetti stops)`);
process.exit(fails.length ? 1 : 0);
