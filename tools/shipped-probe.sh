#!/usr/bin/env bash
# Triage helper (test-speed, 2026-10-27): run CLASSIC browser tests ONCE against the shipped game (SHIPPED=1, tests/lib/classic.js) and record
# `test<TAB>seconds<TAB>pass|fail|timeout<TAB>first failure line` in $OUT (default shipped-probe.tsv). No retries: a failure here is information
# (the test assumed the classic game), not a flake. Needs the game served at $URL and playwright-core on NODE_PATH.
#   tools/shipped-probe.sh 1/2            the 1st of 2 groups of every classic test (alternating, so each group has a mix of slow and fast)
#   ONLY=file tools/shipped-probe.sh 1/2  only the tests named in file (one per line)
set -u
cd "$(dirname "$0")/.."
k=${1%/*}; n=${1#*/}; OUT=${OUT:-shipped-probe.tsv}
tests=$(grep -l "lib/classic" tests/*.cjs | sort)
[ -n "${ONLY:-}" ] && tests=$(for t in $tests; do grep -qx "$(basename "$t" .cjs)" "$ONLY" && echo "$t"; done)
i=0
for f in $tests; do
  i=$((i + 1)); [ $(( (i - 1) % n + 1 )) -eq "$k" ] || continue
  t=$(basename "$f" .cjs); s=$(date +%s.%N)
  out=$(SHIPPED=1 timeout "${LIMIT:-150}" node "$f" 2>&1); rc=$?
  e=$(date +%s.%N)
  res=pass; [ $rc -eq 0 ] || res=fail; [ $rc -eq 124 ] && res=timeout
  msg=$(printf '%s\n' "$out" | grep -v '^\s*$' | grep -iE 'FAIL|Error|^ *- ' | head -n 1 | cut -c1-200)
  awk -v t="$t" -v a="$s" -v b="$e" -v r="$res" -v m="$msg" 'BEGIN { printf "%s\t%.1f\t%s\t%s\n", t, b - a, r, m }' >> "$OUT"
done
