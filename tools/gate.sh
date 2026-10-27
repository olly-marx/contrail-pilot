#!/usr/bin/env bash
# The release GATE (test-speed, 2026-10-27): every test in tests/GATE (plain Node, no browser) in a worker pool.
#   tools/gate.sh           run the gate; prints each test's seconds and one summary line; exit 1 if any failed
#   tools/gate.sh --deep   the full sweeps (tests/DEEP) without GATE=1: nightly / before a balance change
#   tools/gate.sh --lint    only check the declared lists (tests/GATE, tests/BROWSER, tests/DEEP) against tests/*.cjs
#   JOBS=n                  workers (default 6: measured 2026-10-27, 4 -> 12.1 s, 8 -> 10.2 s, 16 -> 10.3 s on a loaded machine; the pool is small Node processes of ~100-150 MB)
#   TIMES=file              append `test<TAB>seconds<TAB>pass|fail`
# No retries: a test that fails once fails the gate (a flaky Node test is a bug).
set -u
cd "$(dirname "$0")/.."
list() { grep -v '^#' "$1" | sed 's/[[:space:]]*#.*//' | grep -v '^$'; }

lint() {
  local bad=0 t g b d
  for f in tests/*.cjs; do
    t=$(basename "$f" .cjs)
    g=$(list tests/GATE | grep -cx "$t"); b=$(list tests/BROWSER | grep -cx "$t"); d=$(list tests/DEEP | grep -cx "$t")
    [ "$((g + b))" -le 1 ] && [ "$((g + b + d))" -ge 1 ] && [ "$((b + d))" -le 1 ] || { echo "LINT: $f is in the wrong lists (GATE $g, BROWSER $b, DEEP $d): GATE xor BROWSER xor DEEP-only, and DEEP only for Node tests"; bad=1; }
  done
  for t in $(list tests/GATE) $(list tests/BROWSER) $(list tests/DEEP); do [ -f "tests/$t.cjs" ] || { echo "LINT: tests/$t.cjs is listed but missing"; bad=1; }; done
  for t in $(list tests/GATE) $(list tests/DEEP); do grep -q "playwright\|chromium" "tests/$t.cjs" 2>/dev/null && { echo "LINT: GATE/DEEP test $t imports a browser"; bad=1; }; done
  return $bad
}

if [ "${1:-}" = "--lint" ]; then lint && echo "lint ok: $(list tests/GATE | wc -l) gate, $(list tests/DEEP | wc -l) deep, $(list tests/BROWSER | wc -l) browser"; exit $?; fi
lint || exit 1
LIST=tests/GATE; if [ "${1:-}" = "--deep" ]; then LIST=tests/DEEP; else export GATE=1; fi   # (the gate runs the small forms; --deep the full ones)

t0=$(date +%s.%N)
one() {
  local t=$1 s e out rc
  s=$(date +%s.%N)
  out=$(node "tests/$t.cjs" 2>&1); rc=$?
  e=$(date +%s.%N)
  awk -v t="$t" -v a="$s" -v b="$e" -v rc="$rc" 'BEGIN { printf "%s\t%.1f\t%s\n", t, b - a, rc == 0 ? "pass" : "fail" }' > "$OUT/$t.res"
  [ "$rc" -eq 0 ] || { echo "== FAIL $t"; echo "$out" | tail -n 25; }
}
export -f one
OUT=$(mktemp -d); export OUT
# Slowest first (declared weights come from the last TIMES file if given, else list order) so the long tests start at once.
list $LIST | xargs -P "${JOBS:-6}" -I{} bash -c 'one {}'
fails=0; n=0
for r in "$OUT"/*.res; do n=$((n + 1)); [ "$(cut -f3 "$r")" = pass ] || fails=$((fails + 1)); [ -n "${TIMES:-}" ] && cat "$r" >> "$TIMES"; done
sort -t$'\t' -k2 -nr "$OUT"/*.res | head -n 5 | awk -F'\t' '{ printf "   slowest: %-22s %5.1f s\n", $1, $2 }'
rm -rf "$OUT"
awk -v a="$t0" -v b="$(date +%s.%N)" -v n="$n" -v f="$fails" -v name="$(basename $LIST)" 'BEGIN { printf "%s: %d tests, %d failed, %.1f s wall clock\n", name, n, f, b - a }'
[ "$fails" -eq 0 ]
