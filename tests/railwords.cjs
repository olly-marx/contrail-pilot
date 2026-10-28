// A rail's sentence and the thing it points at use the same word (the audit, 2026-10-28: the r-bonus rail said
// "Bonus!" at a results row labelled "Long flight"). Plain Node, static. Plant: the old label -> must FAIL.
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const row = (html.match(/id="rMultRow"[^>]*><span>([^<]*)<\/span>/) || [])[1] || '';
const fails = [];
// The systems rail must not push a purchase (Coordinator, 2026-10-28: "Buy it when you can!" sent children to spend the
// crystals the tree lesson needed).
const sys = (fs.readFileSync(__dirname + '/../src/tips.js', 'utf8').match(/'rail-systems-line':\s*\{ say: '([^']*)'/) || [])[1] || '';
if (!sys || /\bbuy\b/i.test(sys)) fails.push(`the systems rail pushes a purchase: "${sys}"`);
if (!/bonus/i.test(row)) fails.push(`the r-bonus rail ("Bonus! ...") points at #rMultRow, labelled "${row}"`);
console.log(fails.length ? `FAIL railwords\n- ${fails.join('\n- ')}` : `PASS railwords: the r-bonus rail points at "${row}"; the systems rail says "${sys}"`);
process.exit(fails.length ? 1 : 0);
