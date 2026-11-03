#!/usr/bin/env bash
# Builds the deployed site: the game files, every script/style URL stamped with the build (so a phone can never run a new index.html with old scripts),
# version.json, the service worker (sw.js with BUILD written in), the web manifest and assets-manifest.json.
# ONE script for the deploy (.github/workflows/deploy.yml) and for the tests that need the real bundle (tests/sw*.cjs): what is tested is what is deployed.
#   tools/make-site.sh <out-dir> <build>        <build> = the 7-char commit (CI: ${GITHUB_SHA::7})
# A file SW-OFF at the repo root writes "sw": false into version.json: the kill switch (src/swreg.js unregisters every worker and clears the caches).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:?out dir}; V=${2:?build}
rm -rf "$OUT"; mkdir -p "$OUT"
cp -r index.html style.css .nojekyll src assets vendor sw.js manifest.webmanifest "$OUT/"
# Stamp every script/style URL with this build. Pages lets browsers keep files for 10 min,
# so without this a phone could run a new index.html with OLD scripts (new buttons, dead).
sed -i -E "s#(from '\./[A-Za-z]+\.js)'#\1?v=$V'#g" "$OUT"/src/*.js
sed -i -E "s#(src|href)=\"(src/main\.js|src/newplayer\.js|style\.css|vendor/[a-z.]+\.js)\"#\1=\"\2?v=$V\"#g" "$OUT/index.html"
grep -q "src/main.js?v=$V" "$OUT/index.html"   # fail the build if the stamp didn't take
# version.json: what's live, read by src/updates.js to offer the update. tools/check-release.py stops
# the build unless src/version.js (semver) and the top entry of CHANGES.json agree (RELEASING.md).
python3 tools/check-release.py --write "$OUT/version.json" "$V"
grep -q "\"commit\": \"$V\"" "$OUT/version.json"
python3 - "$OUT/version.json" "$([ -f SW-OFF ] && echo off || echo on)" <<'PY'
import json, sys
p, sw = sys.argv[1], sys.argv[2]
d = json.load(open(p)); d['sw'] = sw == 'on'; json.dump(d, open(p, 'w'))
PY
# The service worker: BUILD written into sw.js, then the manifest of what it may precache and how to tell a changed picture.
sed -i "s#__BUILD__#$V#" "$OUT/sw.js"
grep -q "const BUILD = '$V'" "$OUT/sw.js"
python3 tools/make-sw-manifest.py "$OUT" "$V"
