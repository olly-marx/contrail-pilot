#!/usr/bin/env bash
# Fails if a signing key or store credential is tracked by git. The repo is PUBLIC: the App Store Connect key (.p8), Android upload
# keystores, iOS certificates and Play service-account JSON live only in GitHub secrets and ~/Documents/contrail/secrets.
#   tools/no-keys.sh            (exit 1 and the file list on a hit)
set -uo pipefail
cd "$(dirname "$0")/.."
hits=$(git ls-files | grep -Ei '\.(p8|p12|jks|keystore|mobileprovision|cer)$|(^|/)AuthKey_[A-Z0-9]+|service-account.*\.json$' || true)
hits+=$(git grep -lI -e '-----BEGIN PRIVATE KEY-----' -e '-----BEGIN EC PRIVATE KEY-----' -e '"private_key":' -- . ':!tools/no-keys.sh' 2>/dev/null || true)
if [ -n "$hits" ]; then echo "no-keys: key material tracked by git:"; echo "$hits"; exit 1; fi
echo "no-keys: ok"
