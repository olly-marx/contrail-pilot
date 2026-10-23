// The release gate (tools/check-release.py): the repo's own VERSION + CHANGES.json must pass, and each kind of
// bad release must FAIL (a gate that cannot fail is not a gate). No browser needed.
// Run: node tests/release.cjs
const { spawnSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.homedir(), '.cp-release-'));
const fails = [];
const run = (changes, version) => {
  const c = path.join(tmp, 'c.json'), v = path.join(tmp, 'v.js');
  fs.writeFileSync(c, JSON.stringify(changes)); fs.writeFileSync(v, `export const VERSION = '${version}';\n`);
  return spawnSync('python3', [path.join(root, 'tools/check-release.py'), c, v], { encoding: 'utf8' });
};
const real = spawnSync('python3', [path.join(root, 'tools/check-release.py')], { cwd: root, encoding: 'utf8' });
if (real.status !== 0) fails.push(`the repo's own release should pass: ${real.stderr}`);

const entry = (version, extra = {}) => ({ id: `e-${version}`, version, date: '2026-10-23', level: 'minor', notes: ['x'], ...extra });
const good = [entry('0.9.1'), entry('0.9.0'), { id: 'old', level: 'major', notes: ['no version before 0.9'] }];
const must = (label, r, ok) => {   // a rejection must be the checker's own message, not a crash
  if ((r.status === 0) !== ok || (!ok && !/^check-release:/.test(r.stderr))) fails.push(`${label}: wanted ${ok ? 'pass' : 'a check-release failure'}, got status ${r.status} ${r.stderr}`);
};
must('a good release', run(good, '0.9.1'), true);
must('top entry older than VERSION', run(good, '0.9.2'), false);
must('VERSION older than the top entry', run(good, '0.9.0'), false);
must('not semver', run([entry('0.9')], '0.9'), false);
must('v prefix', run([entry('v0.9.1')], 'v0.9.1'), false);
must('versions not falling', run([entry('0.9.0'), entry('0.9.1')], '0.9.0'), false);
must('versioned entry without a date', run([entry('0.9.1', { date: undefined })], '0.9.1'), false);
must('bad level', run([entry('0.9.1', { level: 'patch' })], '0.9.1'), false);
must('empty notes', run([entry('0.9.1', { notes: [] })], '0.9.1'), false);
must('unversioned top entry', run([{ id: 'a', level: 'minor', notes: ['x'] }], '0.9.1'), false);
fs.rmSync(tmp, { recursive: true, force: true });
if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('PASS release');
