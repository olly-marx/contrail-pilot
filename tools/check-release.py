#!/usr/bin/env python3
"""Release gate: src/version.js and CHANGES.json must agree (see RELEASING.md).
  python3 tools/check-release.py [CHANGES.json] [src/version.js]
  python3 tools/check-release.py --write _site/version.json COMMIT   (CI: also writes what the game reads)
Rules: VERSION is MAJOR.MINOR.PATCH; CHANGES.json is a non-empty list, newest first; every entry has id,
level (minor|major) and notes; an entry that has a version must also have a date, and versions must strictly
fall down the list; the TOP entry carries the current VERSION (entries before 2026-10-23 have no version)."""
import json, re, sys

args = sys.argv[1:]
write = None
if args[:1] == ['--write']:
    write, commit = args[1], args[2]
    args = args[3:]
changes_path = args[0] if len(args) > 0 else 'CHANGES.json'
version_path = args[1] if len(args) > 1 else 'src/version.js'

def fail(msg):
    print(f'check-release: {msg}', file=sys.stderr)
    sys.exit(1)

m = re.search(r"VERSION\s*=\s*'([^']*)'", open(version_path).read())
if not m:
    fail(f"{version_path}: no VERSION = '...'")
SEMVER = re.compile(r'^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$')
if not SEMVER.match(m.group(1)):
    fail(f'VERSION {m.group(1)!r} is not MAJOR.MINOR.PATCH')
version = m.group(1)
key = lambda v: tuple(int(x) for x in v.split('.'))

ch = json.load(open(changes_path))
if not (isinstance(ch, list) and ch):
    fail('CHANGES.json: a non-empty list')
last = None
for c in ch:
    if not (c.get('id') and c.get('level') in ('minor', 'major') and isinstance(c.get('notes'), list) and c['notes']):
        fail(f'CHANGES.json entry needs id, level (minor|major) and notes: {c}')
    if 'version' in c:
        if not SEMVER.match(str(c['version'])):
            fail(f"entry {c['id']}: version {c['version']!r} is not MAJOR.MINOR.PATCH")
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', str(c.get('date', ''))):
            fail(f"entry {c['id']}: a versioned entry needs a date (YYYY-MM-DD)")
        if last is not None and key(c['version']) >= key(last):
            fail(f"entry {c['id']}: version {c['version']} must be lower than the one above it ({last})")
        last = c['version']
if ch[0].get('version') != version:
    fail(f"the top CHANGES.json entry is version {ch[0].get('version')!r} but src/version.js says {version!r}")

if write:
    json.dump({'commit': commit, 'version': version, 'changes': ch[:20]}, open(write, 'w'))
print(f'release {version} ok ({len(ch)} entries)')
