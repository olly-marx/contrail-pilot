// The deploy gate (tools/ci-gate.sh; user decision 2026-11-09, research/CI-FAST-DESIGN.md): main's deploy skips the test matrix ONLY when a
// `ci-ok-<sha7>` marker points at exactly the pushed commit. Every doubt must run the tests (fail closed). Plain Node + git + bash, no network.
// The risky direction is a wrong SKIP, so most cases here are "must RUN". Also static checks that the workflows keep their wiring.
// PLANTS: tools/plants.tsv, test `cigate` (each must FAIL this test). Run: node tests/cigate.cjs
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const root = path.resolve(__dirname, '..');
const fails = [], check = (c, m) => { if (!c) fails.push(m); };
const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', ...opts });
const git = (cwd, ...a) => { const r = sh('git', a, { cwd, env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }); if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };
const gate = (origin, sha, event) => {
  const r = sh('bash', [path.join(root, 'tools/ci-gate.sh'), 'gate', sha, event], { env: { ...process.env, ORIGIN: origin } });
  const o = {}; for (const l of r.stdout.split('\n')) { const i = l.indexOf('='); if (i > 0) o[l.slice(0, i)] = l.slice(i + 1); }
  return { code: r.status, skip: o.skip, reason: o.reason || '', raw: r.stdout };
};
const decide = (...a) => sh('bash', [path.join(root, 'tools/ci-gate.sh'), 'decide', ...a]).stdout.trim();
const dry = (...a) => sh('bash', [path.join(root, 'tools/ci-gate.sh'), 'dry-check', ...a]);

// A throwaway bare "origin" and a work repo with two commits.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cigate-'));
const bare = path.join(tmp, 'origin.git'), work = path.join(tmp, 'work');
try {
  git(tmp, 'init', '-q', '--bare', bare); git(tmp, 'init', '-q', work);
  fs.writeFileSync(path.join(work, 'a'), '1'); git(work, 'add', 'a'); git(work, 'commit', '-q', '-m', 'one'); const one = git(work, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(work, 'a'), '2'); git(work, 'commit', '-q', '-a', '-m', 'two'); const two = git(work, 'rev-parse', 'HEAD');
  git(work, 'remote', 'add', 'origin', bare);
  const push = (...refs) => git(work, 'push', '-q', '-f', 'origin', ...refs);
  const s7 = c => c.slice(0, 7);
  const tagAt = (name, commit, annotated) => { annotated ? git(work, 'tag', '-f', '-a', '-m', 'm', name, commit) : git(work, 'tag', '-f', name, commit); push(`refs/tags/${name}`); };
  const untag = name => { git(work, 'push', '-q', 'origin', `:refs/tags/${name}`); };

  // 1. No marker at all -> the tests run.
  let g = gate(bare, two, 'push');
  check(g.code === 0 && g.skip === 'false', `no marker runs the tests (got skip=${g.skip}: ${g.reason})`);
  // 2. A marker for exactly this commit -> skipped.
  tagAt(`ci-ok-${s7(two)}`, two);
  g = gate(bare, two, 'push');
  check(g.skip === 'true', `a marker for this exact commit skips the tests (got skip=${g.skip}: ${g.reason})`);
  // 3. The same marker, a manual dispatch -> the tests run.
  g = gate(bare, two, 'workflow_dispatch');
  check(g.skip === 'false', `a manual dispatch runs the tests even with a marker (got skip=${g.skip})`);
  // 4. A marker for ANOTHER commit does not count for this one.
  g = gate(bare, one, 'push');
  check(g.skip === 'false', `a marker for another commit does not skip this commit (got skip=${g.skip})`);
  // 5. The marker name carries this commit's 7 characters but the tag points at a different commit -> run. The sha under test shares only the 7-char prefix.
  const forged = s7(two) + 'f'.repeat(33);
  g = gate(bare, forged, 'push');
  check(g.skip === 'false', `a marker pointing at another commit than the full sha runs the tests (7-character prefix is not enough; got skip=${g.skip}: ${g.reason})`);
  // 6. ci-ok and ci-fail both present -> the tests run.
  tagAt(`ci-fail-${s7(two)}`, two);
  g = gate(bare, two, 'push');
  check(g.skip === 'false', `ok and fail markers both present runs the tests (got skip=${g.skip})`);
  untag(`ci-fail-${s7(two)}`);
  g = gate(bare, two, 'push');
  check(g.skip === 'true', `with the fail marker gone the ok marker skips again (got skip=${g.skip})`);
  // 7. An annotated tag is read through to its commit.
  tagAt(`ci-ok-${s7(two)}`, two, true);
  g = gate(bare, two, 'push');
  check(g.skip === 'true', `an annotated marker on the exact commit skips the tests (got skip=${g.skip}: ${g.reason})`);
  tagAt(`ci-ok-${s7(two)}`, one, true);
  g = gate(bare, two, 'push');
  check(g.skip === 'false', `an annotated marker pointing at another commit runs the tests (got skip=${g.skip}: ${g.reason})`);
  // 8. An unreachable origin, a short sha, an empty sha -> the tests run, and the script never fails the job.
  g = gate(path.join(tmp, 'nowhere.git'), two, 'push');
  check(g.skip === 'false' && g.code === 0, `an unreachable origin runs the tests and exits 0 (skip=${g.skip}, exit ${g.code})`);
  tagAt(`ci-ok-${s7(two)}`, two);
  for (const bad of [s7(two), '', 'zzzz', two.toUpperCase(), two + '0']) {
    g = gate(bare, bad, 'push');
    check(g.skip === 'false' && g.code === 0, `a malformed sha '${bad.slice(0, 12)}' runs the tests and exits 0 (skip=${g.skip}, exit ${g.code})`);
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

// 9. decide: may the deploy run? A skipped dependency skips its dependents by default, and a failed or cancelled test must never deploy.
const D = [
  [['success', 'true', 'skipped'], 'deploy=true', 'the gate skipped the tests and the test job was skipped: deploy'],
  [['success', 'false', 'success'], 'deploy=true', 'the tests ran and passed: deploy'],
  [['success', 'false', 'failure'], 'deploy=false', 'a failed test never deploys'],
  [['success', 'false', 'cancelled'], 'deploy=false', 'a cancelled test never deploys'],
  [['success', 'false', 'skipped'], 'deploy=false', 'tests that should have run but were skipped never deploy'],
  [['success', 'true', 'failure'], 'deploy=false', 'skip=true with a failed test (contradiction) never deploys'],
  [['success', 'true', 'success'], 'deploy=false', 'skip=true but the tests ran anyway (contradiction) never deploys'],
  [['failure', 'true', 'skipped'], 'deploy=false', 'a failed gate job never deploys'],
  [['success', '', 'skipped'], 'deploy=false', 'an empty skip output never deploys'],
  [['cancelled', 'false', 'success'], 'deploy=false', 'a cancelled gate never deploys'],
];
for (const [args, want, msg] of D) check(decide(...args) === want, `decide ${args.join(' ')}: ${msg} (got '${decide(...args)}')`);

// 10. dry-check: a ci-dry branch asserts its own expectation; a wrong gate turns the dry run red.
check(dry('ci-dry/skip-a', 'true', 'skipped', 'true').status === 0, 'dry-check: ci-dry/skip-* with the tests skipped and a deploy passes');
check(dry('ci-dry/skip-a', 'false', 'success', 'true').status !== 0, 'dry-check: ci-dry/skip-* where the tests ran FAILS (a gate that does not skip is wrong)');
check(dry('ci-dry/run-a', 'false', 'success', 'true').status === 0, 'dry-check: ci-dry/run-* where the tests ran passes');
check(dry('ci-dry/run-a', 'true', 'skipped', 'true').status !== 0, 'dry-check: ci-dry/run-* where the tests were skipped FAILS (no marker must run the tests)');
check(dry('ci-dry/other', 'false', 'success', 'true').status !== 0, 'dry-check: a ci-dry branch with no declared expectation FAILS');

// 11. The workflow wiring (static: the real proof is the dry runs on ci-dry/* branches, see RELEASING.md).
const deploy = fs.readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
const verify = fs.readFileSync(path.join(root, '.github/workflows/verify-branch.yml'), 'utf8');
const tests = fs.readFileSync(path.join(root, '.github/workflows/tests.yml'), 'utf8');
check(/needs:\s*decide\s*\n\s*if:.*needs\.decide\.outputs\.deploy == 'true'/.test(deploy), 'the deploy job needs decide and runs only when decide said deploy=true');
check(/github\.ref == 'refs\/heads\/main'/.test(deploy.split('\n  deploy:\n')[1] || ''), 'the deploy job runs only on refs/heads/main (a dry run never deploys)');
check(/test:\s*\n\s*needs:\s*gate\s*\n\s*if:.*needs\.gate\.outputs\.skip != 'true'/.test(deploy), 'the test job runs unless the gate said skip=true');
check(/uses:\s*\.\/\.github\/workflows\/tests\.yml/.test(deploy) && /uses:\s*\.\/\.github\/workflows\/tests\.yml/.test(verify), 'deploy.yml and verify-branch.yml call the same tests.yml');
check(/strict_flaky:\s*true/.test(verify), 'the branch run is strict about flaky tests');
check(!/strict_flaky:\s*true/.test(deploy), 'main keeps its retry-once rule (strict_flaky is not set for main)');
check(/flaky \(passed on retry\)/.test(tests) && /exit 1/.test(tests), 'tests.yml fails a shard on a pass-on-retry when strict_flaky is set');
check(/group:.*format\('dry-\{0\}'/.test(deploy), 'a dry run has its own concurrency group (it must never cancel a real main run)');
check(/tools\/ci-gate\.sh decide/.test(deploy) && /tools\/ci-gate\.sh gate/.test(deploy), 'deploy.yml uses tools/ci-gate.sh for the gate and the decision');
const report = verify.split('report:')[1] || '';
check(/success\) T="ci-ok-\$S"/.test(report) && /\*\) echo .*no marker/.test(report), 'the report job still writes ci-ok only on success and no marker on cancel');

if (fails.length) { console.log('FAIL cigate:\n' + fails.map(f => ' - ' + f).join('\n')); process.exit(1); }
console.log('PASS cigate (the gate skips only for a marker on the exact commit; every doubt runs the tests; decide never deploys on a failed, cancelled or contradictory state; the workflows keep their wiring)');
