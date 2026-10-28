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
// season2-smoke runs as 4 parallel pieces (PART=...), see tests/season2-smoke.cjs; the pieces together are all its sections, each exactly once.
const S2_SECTIONS = ['A', 'Bweurope', 'Bnamerica', 'Bsasia', 'Bafrica', 'Bsamerica', 'Beasia', 'C', 'D', 'E', 'F', 'G'];
const SMOKE = ['season2-smoke@PART=A,C,E,F,G', 'season2-smoke@PART=D', 'season2-smoke@PART=Bweurope,Bnamerica,Bsasia', 'season2-smoke@PART=Bafrica,Bsamerica,Beasia',
  'hubscreen', 'saveloss', 'records-screen', 'missionscreen', 'hudlayout', 'tourgiveup', 'textfit', 'crash'];

// 0. The declarations lint clean on the real repo.
const lint = py(['--lint']);
check(lint.status === 0, `tests/PATHMAP lints clean: ${lint.stdout.trim().slice(0, 300)}`);
// 1. A docs-only change needs just the smoke set (ten tests), nothing else.
let r = list(['research/BACKLOG.md', 'CHANGES.json', 'src/version.js']);
check(r.code === 0 && r.tests.size === SMOKE.length && SMOKE.every(t => r.tests.has(t)), `docs-only: exactly the smoke set: ${[...r.tests].join(' ')}`);
// 2. The nature screen pulls its declared tests, and not the heavy onboarding ones (src/animalart.js is art for the nature cards).
r = list(['src/animalart.js']);
check(['treepic'].every(t => r.tests.has(t)) && !r.tests.has('postrails') && SMOKE.every(t => r.tests.has(t)), `src/animalart.js -> treepic + smoke, no postrails: ${[...r.tests].join(' ')}`);
// 2b. src/wild.js holds the free first project and the L5 parcels tab: it DOES pull the onboarding tests and postrails (the game chat's correction).
r = list(['src/wild.js']); check(['nature', 'wildfield', 'regions', 'onrails', 'postrails'].every(t => r.tests.has(t)), `src/wild.js -> nature tests + onrails + postrails: ${[...r.tests].join(' ')}`);
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

// 9. The sim chat's split of src/sim/*: files only Node loads need the Node gate and the smoke set, nothing more; the shared engine files pull the flight tests;
//    rules.js (banking, missions hook, school, land, forest, the L2 patch) pulls the contract tests and the onboarding ones.
r = list(['src/sim/player.js', 'src/sim/progression.js']); check(r.code === 0 && r.tests.size === SMOKE.length, `Node-only sim files -> just the smoke set: ${[...r.tests].join(' ')}`);
r = list(['src/sim/physics.js']); check(['collisions', 'sim-masks', 'hazards', 'flight'].every(t => r.tests.has(t)) && !r.tests.has('postrails'), `src/sim/physics.js -> collisions, sim-masks, hazards, flight; not postrails`);
r = list(['src/sim/rules.js']); check(['sim-bank', 'fares', 'crystals', 'onrails', 'postrails', 'school', 'terrain', 'forestmeter', 'walkthrough'].every(t => r.tests.has(t)), `src/sim/rules.js -> the contract, banking, onboarding, school, land and forest tests: ${r.tests.size} tests`);
r = list(['src/GameScene.js']); check(['onrails', 'tipqueue', 'l4hint', 'postrails', 'flight', 'hazards'].every(t => r.tests.has(t)), 'src/GameScene.js -> the tip-queue/onboarding tests and the flight tests');
r = list(['src/eras.js']); check(r.tests.has('sim-bank') && r.tests.has('fares') && r.tests.has('eras'), 'src/eras.js (imported by rules.js) -> sim-bank, fares, eras');
// 10. A variant token runs the same test with an environment setting (the short-phone onrails run).
r = list(['src/tour.js']); check(r.tests.has('onrails') && r.tests.has('onrails@VP=375x667'), `src/tour.js -> onrails and onrails@VP=375x667`);

// 11. The season2-smoke pieces cover every section exactly once (a section in no piece would silently stop being checked before a push; one in two would waste time).
{
  const pm = fs.readFileSync(path.join(root, 'tests/PATHMAP'), 'utf8').split('\n').find(l => l.startsWith('smoke |'));
  const parts = pm.split(' | ')[1].split(' ').filter(t => t.startsWith('season2-smoke@PART=')).flatMap(t => t.slice('season2-smoke@PART='.length).split(','));
  const count = id => parts.filter(x => x === id).length;
  check(S2_SECTIONS.every(id => count(id) === 1) && parts.length === S2_SECTIONS.length, `season2-smoke pieces cover each section exactly once: ${parts.join(',')}`);
  const src = fs.readFileSync(path.join(root, 'tests/season2-smoke.cjs'), 'utf8');
  check(S2_SECTIONS.filter(id => id.length === 1).every(id => src.includes(`on('${id}')`)) && /on\('B' \+ k\)/.test(src), 'every section letter is guarded by on(...) in tests/season2-smoke.cjs');
}

// 12. firsthour-real (80 s, the only test that plays school like a child) is NOT in the always-run smoke (user, 2026-10-28): it runs for onboarding-group changes (and engine-core, harness), CI always.
r = list(['research/BACKLOG.md']); check(!r.tests.has('firsthour-real'), 'a docs-only change does not run firsthour-real');
r = list(['src/tour.js']); check(r.tests.has('firsthour-real'), 'an onboarding file (src/tour.js) runs firsthour-real');
r = list(['src/records.js']); check(!r.tests.has('firsthour-real'), 'a records change does not run firsthour-real');
r = list(['src/sim/rules.js']); check(r.tests.has('firsthour-real'), 'rules.js (school landing, free part) runs firsthour-real');

if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('PASS releasegate (docs-only = smoke, group unions, postrails only for lessons/parcels, harness = all, own test, unmapped refused)');
