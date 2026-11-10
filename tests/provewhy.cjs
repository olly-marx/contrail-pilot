// A caught plant is reported with the test's OWN failing line, not the bare 'FAIL' header (tools/plant-why.sh, used by tools/prove-plants.sh; the Coordinator, 2026-11-10). Plain Node. Run: node tests/provewhy.cjs
const { execFileSync } = require('child_process'), path = require('path');
const sh = path.join(__dirname, '..', 'tools', 'plant-why.sh');
const why = s => execFileSync('bash', [sh], { input: s }).toString().replace(/\n$/, '');   // the shell adds a newline; prove-plants' $(...) drops it
const fails = [], check = (c, m) => { if (!c) fails.push(m); };
const own = why('FAIL crystals:\n - a night dodge pays 1 crystal: {"crystals":0}\n - second line\n');
check(own === 'a night dodge pays 1 crystal: {"crystals":0}', `the first '- ' line is shown, not the header: ${JSON.stringify(own)}`);
const crash = why("Error: Cannot find module 'playwright-core'\n    at x\n");
check(/Cannot find module/.test(crash), `a crash without a '- ' line shows the Error line: ${JSON.stringify(crash)}`);
check(why('all fine\n') === '', 'a passing output shows nothing');
check(why('FAIL x:\n - ' + 'z'.repeat(300) + '\n').length === 110, 'a long line is cut at 110 characters');
console.log(fails.length ? 'FAIL provewhy:\n - ' + fails.join('\n - ') : 'PASS provewhy: a caught plant is reported with its own failing line');
process.exit(fails.length ? 1 : 0);
