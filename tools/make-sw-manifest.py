#!/usr/bin/env python3
"""Writes <site>/assets-manifest.json for sw.js: { build, shell: [files whose code the worker precaches], files: { 'assets/...': sha1 } }.
  python3 tools/make-sw-manifest.py <site-dir> <build>
The worker diffs `files` against the previous build's at install: an unchanged picture is copied from the old cache, a changed one is fetched again."""
import hashlib, json, os, sys
site, build = sys.argv[1], sys.argv[2]
def walk(top):
    for d, _, names in os.walk(os.path.join(site, top)):
        for n in sorted(names):
            yield os.path.relpath(os.path.join(d, n), site).replace(os.sep, '/')
sha = lambda p: hashlib.sha1(open(os.path.join(site, p), 'rb').read()).hexdigest()
import re
# The pictures the page itself names (index.html <img>/<link>, style.css url(...)): they are part of the shell (a parse of the two files, nothing guessed).
static = set()
named = re.compile(r'(?:src|href)="(assets/[^"?]+)"|url\([\'"]?(assets/[^)\'"?]+)')
for f in ('index.html', 'style.css'):
    static |= {a or b for a, b in named.findall(open(os.path.join(site, f)).read())}
shell = ['index.html', 'style.css', 'manifest.webmanifest'] + sorted(walk('src')) + sorted(walk('vendor')) + sorted(p for p in static if os.path.exists(os.path.join(site, p)))
files = {p: sha(p) for p in sorted(walk('assets'))}
json.dump({'build': build, 'shell': shell, 'files': files}, open(os.path.join(site, 'assets-manifest.json'), 'w'))
print(f'assets-manifest.json: {len(shell)} shell files, {len(files)} pictures')
