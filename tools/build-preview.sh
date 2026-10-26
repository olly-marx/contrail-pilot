#!/usr/bin/env bash
# Build the PREVIEW site (the redesign branch, served at /preview/) into a directory.
#   tools/build-preview.sh <redesign-checkout> <out-dir> <commit>      e.g. ... redesign _site/preview a1b2c3d
# Used by .github/workflows/deploy.yml (job preview-bundle: NON-blocking, a failure here must never touch the
# live game) and by tests/preview.cjs. Exits non-zero, saying why, if the preview would not be safe to publish.
# What it does beyond the main bundle (the stamping is the same as deploy.yml's):
#   - stamps this build's own ?v=<commit> on scripts/styles (also src/season2.js and src/newplayer.js, plain scripts),
#     and writes its OWN version.json, so src/updates.js at /preview/ only ever compares against /preview/version.json;
#   - forces season 2 ON with window.SEASON2_FORCE (src/season2.js must honour it WITHOUT writing the origin-wide
#     'contrailPilot.season2Mode' flag: the gate below refuses a source that does not mention SEASON2_FORCE);
#   - <meta robots noindex>, a visible PREVIEW tag, a PREVIEW title.
set -euo pipefail
SRC=${1:?redesign checkout}; OUT=${2:?out dir}; V=${3:?commit (7 chars)}
fail() { echo "build-preview: $*" >&2; exit 1; }
[ -f "$SRC/index.html" ] && [ -d "$SRC/src" ] || fail "$SRC is not a game checkout"
grep -q 'src="src/season2.js"' "$SRC/index.html" || fail "index.html has no src/season2.js script: this branch has no season 2 switch"
grep -q 'SEASON2_FORCE' "$SRC/src/season2.js" || fail "src/season2.js does not honour window.SEASON2_FORCE: a preview could write the origin-wide season 2 flag"
rm -rf "$OUT"; mkdir -p "$OUT"
cp -r "$SRC/index.html" "$SRC/style.css" "$SRC/src" "$SRC/assets" "$SRC/vendor" "$OUT/"
touch "$OUT/.nojekyll"
sed -i -E "s#(from '\./[A-Za-z0-9]+\.js)'#\1?v=$V'#g" "$OUT"/src/*.js
sed -i -E "s#(src|href)=\"(src/main\.js|src/newplayer\.js|src/season2\.js|style\.css|vendor/[a-z.]+\.js)\"#\1=\"\2?v=$V\"#g" "$OUT/index.html"
grep -q "src/main.js?v=$V" "$OUT/index.html" || fail "the main.js stamp did not take"
grep -q "src/season2.js?v=$V" "$OUT/index.html" || fail "the season2.js stamp did not take"
# the force flag (before season2.js) and the visible tag
FORCE="<script>window.SEASON2_FORCE = true; window.CP_PREVIEW = '$V'; document.addEventListener('DOMContentLoaded', function () { var d = document.createElement('div'); d.id = 'previewTag'; d.textContent = 'PREVIEW $V - not the real game, nothing is saved online'; d.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:99;background:#c0392b;color:#fff;font:8px Pixel,monospace;padding:3px 5px;border-radius:3px;pointer-events:none'; document.body.appendChild(d); }); </script>"
PV_FORCE="$FORCE" PV_V="$V" python3 - "$OUT/index.html" <<'PY'
import os, sys
p = sys.argv[1]; s = open(p).read()
tag = '<script src="src/season2.js?v=%s">' % os.environ['PV_V']
assert s.count(tag) == 1, 'season2.js script tag not found exactly once'
open(p, 'w').write(s.replace(tag, os.environ['PV_FORCE'] + '\n  ' + tag))
PY
grep -q 'window.SEASON2_FORCE = true' "$OUT/index.html" || fail "the force flag was not injected"
sed -i 's#<meta charset="utf-8">#&\n  <meta name="robots" content="noindex, nofollow">#' "$OUT/index.html"
grep -q 'name="robots" content="noindex' "$OUT/index.html" || fail "noindex was not injected"
sed -i -E 's#<title>([^<]*)</title>#<title>PREVIEW - \1</title>#' "$OUT/index.html"
printf '{"commit": "%s", "preview": true, "changes": []}\n' "$V" > "$OUT/version.json"
echo "build-preview: $OUT ready ($V)"
