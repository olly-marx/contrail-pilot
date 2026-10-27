#!/usr/bin/env bash
# The release GATE (test-speed, 2026-10-27): every test in tests/GATE (plain Node, no browser) in a worker pool.
#   tools/gate.sh           run the gate; prints each test's seconds and one summary line; exit 1 if any failed
#   tools/gate.sh --lint    only check the declared lists (tests/GATE, tests/BROWSER) against tests/*.cjs
#   JOBS=n                  workers (default 4: memory is the limit on this machine, not cores)
#   TIMES=file              append `test<TAB>seconds<TAB>pass|fail`
# No retries: a test that fails once fails the gate (a flaky Node test is a bug).
set -u
cd "$(dirname "$0")/.."
list() { grep -v '^#' "$1" | grep -v '^$'; }

lint() {
  local bad=0 t
  for f in tests/*.cjs; do
    t=$(basename "$f" .cjs)
    g=$(list tests/GATE | grep -cx "$t"); b=$(list tests/BROWSER | grep -cx "$t")
    [ "$((g + b))" -eq 1 ] || { echo "LINT: $f must be in exactly one of tests/GATE, tests/BROWSER (GATE $g, BROWSER $b)"; bad=1; }
  done
  for t in $(list tests/GATE) $(list tests/BROWSER); do [ -f "tests/$t.cjs" ] || { echo "LINT: tests/$t.cjs is listed but missing"; bad=1; }; done
  for t in $(list tests/GATE); do grep -q "playwright\|chromium" "tests/$t.cjs" 2>/dev/null && { echo "LINT: GATE test $t imports a browser"; bad=1; }; done
  return $bad
}

if [ "${1:-}" = "--lint" ]; then lint && echo "lint ok: $(list tests/GATE | wc -l) gate, $(list tests/BROWSER | wc -l) browser"; exit $?; fi
lint || exit 1

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
list tests/GATE | xargs -P "${JOBS:-4}" -I{} bash -c 'one {}'
fails=0; n=0
for r in "$OUT"/*.res; do n=$((n + 1)); [ "$(cut -f3 "$r")" = pass ] || fails=$((fails + 1)); [ -n "${TIMES:-}" ] && cat "$r" >> "$TIMES"; done
sort -t$'\t' -k2 -nr "$OUT"/*.res | head -n 5 | awk -F'\t' '{ printf "   slowest: %-22s %5.1f s\n", $1, $2 }'
rm -rf "$OUT"
awk -v a="$t0" -v b="$(date +%s.%N)" -v n="$n" -v f="$fails" 'BEGIN { printf "GATE: %d tests, %d failed, %.1f s wall clock\n", n, f, b - a }'
[ "$fails" -eq 0 ]
