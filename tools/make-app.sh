#!/usr/bin/env bash
# Builds native/www for the phone apps (Capacitor): the SAME bundle as the web deploy (tools/make-site.sh), so what is
# tested is what ships. The app carries its files inside it, so the service worker is not used there (src/swreg.js skips
# it when window.Capacitor says native), and version.json is the app's own: the web update banner never fires in the app.
#   tools/make-app.sh [build]     build defaults to the 7-char HEAD commit
set -euo pipefail
cd "$(dirname "$0")/.."
V=${1:-$(git rev-parse --short=7 HEAD)}
bash tools/make-site.sh native/www "$V"
rm -f native/www/.nojekyll
grep -q "src/main.js?v=$V" native/www/index.html
echo "native/www built for $V"
