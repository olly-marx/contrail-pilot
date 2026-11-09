// Every rails / tour step DECLARES its subject (src/railsubjects.js; research/SPOTLIGHT-SUBJECT.md). No browser. Declare, don't infer: the table says how many steps each tour has and, for each, what it is ABOUT
// (null = the target itself). This test fails when a step has no declared subject, when the table has an entry for a step that is not there, and when src/tour.js has a tour id the table does not know.
// Plants: tools/plants.tsv, test `railsubjects`.
(async () => {
  const fs = require('fs'), path = require('path');
  const { COUNTS, SUBJECTS } = await import('../src/railsubjects.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'tour.js'), 'utf8');
  for (const [id, n] of Object.entries(COUNTS)) for (let i = 1; i <= n; i++) check(`${id}#${i}` in SUBJECTS, `step ${id}#${i} has no declared subject (null = the target is the subject)`);
  for (const k of Object.keys(SUBJECTS)) { const [id, i] = k.split('#'); check(id in COUNTS && +i >= 1 && +i <= COUNTS[id], `the table declares ${k}, but tour ${id} has ${COUNTS[id]} steps`); }
  // the tour ids and step counts in src/tour.js
  const rails = [...src.matchAll(/return \['([a-z0-9-]+)', \[/g)].map(m => m[1]);
  for (const id of [...new Set(rails)]) {
    check(id in COUNTS, `tour.js has the rails tour ${id}, which the subjects table does not know (add it to COUNTS and declare its steps)`);
    const at = src.indexOf(`return ['${id}', [`), body = src.slice(at, src.indexOf(']]', at)), n = (body.match(/target:/g) || []).length;
    check(COUNTS[id] === n, `rails tour ${id}: tour.js has ${n} steps, the table says ${COUNTS[id]}`);
  }
  const ns = src.indexOf('  nameSteps() {'), nameBody = src.slice(ns, src.indexOf('\n  }\n', ns)), nn = (nameBody.match(/target:/g) || []).length;
  check(COUNTS.name === nn, `the name tour has ${nn} steps in tour.js, the table says ${COUNTS.name}`);
  const newBody = src.slice(src.indexOf('  newSteps(lines) {'), src.indexOf('  // ---------- running a tour')), nw = (newBody.match(/target:/g) || []).length;
  check(COUNTS.new === nw, `the new-line tour has ${nw} steps in tour.js, the table says ${COUNTS.new}`);
  check(/run\('r-payoff'/.test(src) && COUNTS['r-payoff'] === 1, 'the payoff OK step (r-payoff) is declared');
  console.log(fails.length ? `FAIL railsubjects:\n - ${fails.join('\n - ')}` : `PASS railsubjects: every step of ${Object.keys(COUNTS).length} tours declares its subject (${Object.keys(SUBJECTS).length} steps)`);
  process.exit(fails.length ? 1 : 0);
})();
