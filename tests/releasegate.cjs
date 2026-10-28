// The release gate's planner and linter (tools/gate-plan.py, tests/PATHMAP; user decision 2026-10-28). Given the files a change touches it must pick the
// declared browser tests, never silently pick too few, and refuse a file nobody declared. Plain Node + python3, ~1 s.
// PLANTS: tools/plants.tsv, test `releasegate` (each must FAIL this test). Run: node tests/releasegate.cjs
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const fails = [], check = (c, m) => { if (!c) fails.push(m); };
const py = args => spawnSync('python3', [path.join(root, 'tools/gate-plan.py'), ...args], { cwd: root, encoding: 'utf8' });
const list = files => { const r = py(['--list', ...files]); return { code: r.status, tests: new Set(r.stdout.split('\n').filter(Boolean)), err: r.stderr }; };
const browser = fs.readFileSync(path.join(root, 'tests/BROWSER'), 'utf8').split('\n').map(l => l.split('#')[0].trim()).filter(Boolean);
const SMOKE = ['season2-smoke', 'hubscreen', 'firsthour-real', 'saveloss', 'records-screen', 'missionscreen', 'hudlayout', 'tourgiveup', 'textfit', 'crash'];

// 0. The declarations lint clean on the real repo.
const lint = py(['--lint']);
check(lint.status === 0, `tests/PATHMAP lints clean: ${lint.stdout.trim().slice(0, 300)}`);
// 1. A docs-only change needs just the smoke set (ten tests), nothing else.
let r = list(['research/BACKLOG.md', 'CHANGES.json', 'src/version.js']);
check(r.code === 0 && r.tests.size === 10 && SMOKE.every(t => r.tests.has(t)), `docs-only: exactly the 10 smoke tests: ${[...r.tests].join(' ')}`);
// 2. The nature screen pulls its declared tests, and not the heavy onboarding ones.
r = list(['src/wild.js']);
check(['nature', 'wild', 'wildfield', 'regions'].every(t => r.tests.has(t)) && !r.tests.has('postrails') && SMOKE.every(t => r.tests.has(t)), `src/wild.js -> the nature tests + smoke, no postrails: ${[...r.tests].join(' ')}`);
// 3. The heavy onboarding test only for the files that really change lessons or parcels.
r = list(['src/missions2.js']); check(r.tests.has('postrails') && r.tests.has('onrails') && r.tests.has('walkthrough'), `src/missions2.js -> postrails + onrails + walkthrough: ${[...r.tests].join(' ')}`);
r = list(['src/upgrades.js']); check(r.tests.has('postrails'), 'src/upgrades.js -> postrails');
r = list(['src/tour.js']); check(r.tests.has('onrails') && r.tests.has('rails2') && !r.tests.has('postrails'), `src/tour.js -> onrails, rails2, NOT postrails: ${[...r.tests].join(' ')}`);
// 4. The harness (shims, the lists, the gate itself) means the WHOLE browser tier.
r = list(['tests/lib/shipped.js']); check(r.tests.size === browser.length, `tests/lib/shipped.js -> all ${browser.length} browser tests (got ${r.tests.size})`);
r = list(['tests/PATHMAP']); check(r.tests.size === browser.length, `tests/PATHMAP -> all browser tests (got ${r.tests.size})`);
// 5. A changed browser test runs itself.
r = list(['tests/flight.cjs']); check(r.tests.has('flight'), 'a changed tests/flight.cjs runs flight');
// 6. Several files: the union.
r = list(['src/records.js', 'src/hangar.js']); check(r.tests.has('hangar') && r.tests.has('upgrades') && r.tests.has('records-screen'), `two files: the union of both groups: ${[...r.tests].join(' ')}`);
// 7. A file nobody declared is refused (exit 2, named on stderr) rather than silently ignored.
r = list(['src/brandnew-file.js']); check(r.code === 2 && /UNMAPPED\tsrc\/brandnew-file\.js/.test(r.err), `an unmapped file exits 2 and is named: code ${r.code} ${r.err.trim().slice(0, 120)}`);
// 8. The plan text names the reason for each test.
const pl = py(['--plan', 'src/wild.js']).stdout; check(/nature\tsrc\/wild\.js \(nature-screen\)/.test(pl), `--plan says why: ${pl.split('\n').slice(0, 3).join(' | ')}`);

if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('PASS releasegate (docs-only = smoke, group unions, postrails only for lessons/parcels, harness = all, own test, unmapped refused)');
