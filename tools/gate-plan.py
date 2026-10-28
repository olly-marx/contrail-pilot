#!/usr/bin/env python3
"""Release-gate planner and linter (user decision 2026-10-28; research/PROPOSAL-RELEASE-GATE.md).

  gate-plan.py --lint                      check tests/PATHMAP against the repo; exit 1 on any defect
  gate-plan.py --plan [--base REF] [FILE]  which browser tests a change needs; FILEs given = the changed files, else `git diff --name-only REF HEAD`
                                           (REF default origin/main) plus uncommitted/staged changes. Prints `test<TAB>why`; exit 2 if a changed file is unmapped.
  gate-plan.py --list [...]                the same, test names only (what tools/gate.sh --release runs)

tests/PATHMAP is DECLARED by subject (never inferred from which test mentions which file). Union over all matching groups; NONE = nothing to run, ALL = every browser test.
A test whose own tests/NAME.cjs changed runs itself. Smoke tests always run.
A NAME@PART=... token is one PIECE of NAME (run in parallel with its other pieces); when the whole NAME is selected too, its pieces are dropped (the whole covers them).
A test token NAME@KEY=VALUE means "run tests/NAME.cjs with KEY=VALUE in its environment" (e.g. onrails@VP=375x667, the short-phone run); it is a separate run of the same file.
"""
import fnmatch
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_list(path):
    out = []
    with open(os.path.join(ROOT, path)) as f:
        for line in f:
            line = line.split('#')[0].strip()
            if line:
                out.append(line.split()[0])
    return out


def parse_pathmap():
    smoke, groups, ci_only, problems = [], [], [], []
    with open(os.path.join(ROOT, 'tests/PATHMAP')) as f:
        for n, raw in enumerate(f, 1):
            if raw.lstrip().startswith('#') or not raw.strip():
                continue
            parts = [p.strip() for p in raw.rstrip('\n').split(' | ')]
            head = parts[0].split()
            if head[0] == 'smoke' and len(parts) == 2:
                smoke += parts[1].split()
            elif head[0] == 'ci-only' and len(parts) == 2:
                ci_only += parts[1].split()
            elif head[0] == 'group' and len(head) == 2 and len(parts) == 3:
                groups.append({'name': head[1], 'globs': parts[1].split(), 'tests': parts[2].split()})
            else:
                problems.append(f'tests/PATHMAP:{n}: cannot parse: {raw.strip()[:80]}')
    return smoke, groups, ci_only, problems


def tracked():
    return subprocess.check_output(['git', '-C', ROOT, 'ls-files'], text=True).split('\n')[:-1]


def matches(path, globs):
    return any(fnmatch.fnmatch(path, g) for g in globs)


def lint():
    smoke, groups, ci_only, problems = parse_pathmap()
    browser = set(read_list('tests/BROWSER'))
    for g in groups:
        if not g['globs'] or not g['tests']:
            problems.append(f"group {g['name']}: needs globs and tests (NONE or ALL if nothing)")
        for t in g['tests']:
            if t not in ('NONE', 'ALL') and t.split('@')[0] not in browser:
                problems.append(f"group {g['name']}: test '{t}' is not in tests/BROWSER")
            if '@' in t and '=' not in t.split('@', 1)[1]:
                problems.append(f"group {g['name']}: variant '{t}' must look like NAME@KEY=VALUE")
    for t in smoke + ci_only:
        if t.split('@')[0] not in browser:
            problems.append(f"smoke/ci-only test '{t}' is not in tests/BROWSER")
    named = {t.split('@')[0] for t in smoke + ci_only} | {t.split('@')[0] for g in groups for t in g['tests']}
    for t in sorted(browser - named):
        problems.append(f"browser test '{t}' is in no group, not smoke and not ci-only (declare where it runs)")
    for path in tracked():
        if not any(matches(path, g['globs']) for g in groups):
            problems.append(f"tracked file '{path}' matches no group in tests/PATHMAP (declare it)")
    return problems


def changed_files(base, extra):
    if extra:
        return extra
    files = set(subprocess.check_output(['git', '-C', ROOT, 'diff', '--name-only', base, 'HEAD'], text=True).split())
    files |= set(subprocess.check_output(['git', '-C', ROOT, 'diff', '--name-only', 'HEAD'], text=True).split())      # unstaged + staged vs HEAD
    files |= set(subprocess.check_output(['git', '-C', ROOT, 'ls-files', '--others', '--exclude-standard'], text=True).split())
    return sorted(files)


def plan(files):
    smoke, groups, _, _ = parse_pathmap()
    browser = read_list('tests/BROWSER')
    why, unmapped = {}, []
    for t in smoke:
        why.setdefault(t, []).append('smoke')
    for path in files:
        hit = False
        for g in groups:
            if matches(path, g['globs']):
                hit = True
                for t in (browser if 'ALL' in g['tests'] else [x for x in g['tests'] if x != 'NONE']):
                    why.setdefault(t, []).append(f"{path} ({g['name']})")
        if path.startswith('tests/') and path.endswith('.cjs') and os.path.basename(path)[:-4] in browser:
            why.setdefault(os.path.basename(path)[:-4], []).append(f'{path} changed')
        if not hit:
            unmapped.append(path)
    for t in [t for t in why if '@PART=' in t and t.split('@')[0] in why]:   # the whole test is selected: its pieces would only repeat it
        del why[t]
    return why, unmapped


def main(argv):
    if '--lint' in argv:
        problems = lint()
        for p in problems:
            print('LINT: ' + p)
        if not problems:
            print('gate-plan lint ok')
        return 1 if problems else 0
    if '--plan' in argv or '--list' in argv:
        base = 'origin/main'
        extra = []
        i = 0
        args = [a for a in argv if a not in ('--plan', '--list')]
        while i < len(args):
            if args[i] == '--base':
                base = args[i + 1]
                i += 2
            else:
                extra.append(args[i])
                i += 1
        files = changed_files(base, extra)
        why, unmapped = plan(files)
        for path in unmapped:
            print(f'UNMAPPED\t{path}', file=sys.stderr)
        if '--list' in argv:
            for t in why:
                print(t)
        else:
            print(f'# {len(files)} changed file(s) -> {len(why)} browser test(s)')
            for t, w in why.items():
                print(f"{t}\t{'; '.join(dict.fromkeys(w))}")
        return 2 if unmapped else 0
    print(__doc__)
    return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
