// A rail's sentence and the thing it points at use the same word (the audit, 2026-10-28: the r-bonus rail said
// "Bonus!" at a results row labelled "Long flight"). Plain Node, static. Plant: the old label -> must FAIL.
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
// R1: the r-bonus rail points at the results' MATHS line (#rMaths), whose text is built in src/resultscard.js: "23 grabbed × 3.4 bonus · 3 kinds".
const tour = fs.readFileSync(__dirname + '/../src/tour.js', 'utf8'), card = fs.readFileSync(__dirname + '/../src/resultscard.js', 'utf8');
const target = (tour.match(/target: '(#[\w-]+)', text: tip\('rail-bonus'\)/) || [])[1] || '';
const row = (card.match(/const mult = [^\n]*/) || [''])[0];
const fails = [];
// The systems rail must not push a purchase (Coordinator, 2026-10-28: "Buy it when you can!" sent children to spend the
// crystals the tree lesson needed).
const sys = (fs.readFileSync(__dirname + '/../src/tips.js', 'utf8').match(/'rail-systems-line':\s*\{ say: '([^']*)'/) || [])[1] || '';
if (!sys || /\bbuy\b/i.test(sys)) fails.push(`the systems rail pushes a purchase: "${sys}"`);
if (target !== '#rMaths' || !html.includes(`id="rMaths"`)) fails.push(`the r-bonus rail points at "${target}", which is not the results' maths line #rMaths`);
if (!/ bonus/i.test(row)) fails.push(`the r-bonus rail ("Bonus! ...") points at the maths line, whose multiplier text is: ${row.slice(0, 120)}`);
console.log(fails.length ? `FAIL railwords\n- ${fails.join('\n- ')}` : `PASS railwords: the r-bonus rail points at ${target} whose text says "bonus"; the systems rail says "${sys}"`);
process.exit(fails.length ? 1 : 0);
