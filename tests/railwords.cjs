// A rail's sentence and the thing it points at use the same word (the audit, 2026-10-28: the r-bonus rail said
// "Bonus!" at a results row labelled "Long flight"). Plain Node, static. Plant: the old label -> must FAIL.
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const row = (html.match(/id="rMultRow"[^>]*><span>([^<]*)<\/span>/) || [])[1] || '';
const fails = [];
if (!/bonus/i.test(row)) fails.push(`the r-bonus rail ("Bonus! ...") points at #rMultRow, labelled "${row}"`);
console.log(fails.length ? `FAIL railwords\n- ${fails.join('\n- ')}` : `PASS railwords: the r-bonus rail points at "${row}"`);
process.exit(fails.length ? 1 : 0);
