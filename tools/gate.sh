#!/usr/bin/env bash
# The release GATE (test-speed, 2026-10-27): every test in tests/GATE (plain Node, no browser) in a worker pool.
#   tools/gate.sh           run the gate; prints each test's seconds and one summary line; exit 1 if any failed
#   tools/gate.sh --deep   the full sweeps (tests/DEEP) without GATE=1: nightly / before a balance change
#   tools/gate.sh --lint    only check the declared lists (tests/GATE, tests/BROWSER, tests/DEEP) against tests/*.cjs, and tests/PATHMAP against the repo
#   tools/gate.sh --plan [--base REF] [FILE...]   which browser tests a change needs (tools/gate-plan.py): the smoke set + the declared groups the changed files match
#   tools/gate.sh --release [--base REF]   THE RELEASE GATE (user decision 2026-10-28): the Node gate AND the planned browser tests, run together; refuses on a loaded machine
#                                          (FORCE_LOAD=1 overrides). Then push: CI runs the whole suite and deploys only if it is green. See RELEASING.md.
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
  python3 tools/gate-plan.py --lint | grep -v '^gate-plan lint ok$' | grep . && bad=1
  return $bad
}

case "${1:-}" in
  --plan) shift; exec python3 tools/gate-plan.py --plan "$@" ;;
  --release) shift; RELEASE=1 ;;
esac
if [ "${1:-}" = "--lint" ]; then lint && echo "lint ok: $(list tests/GATE | wc -l) gate, $(list tests/DEEP | wc -l) deep, $(list tests/BROWSER | wc -l) browser"; exit $?; fi
lint || exit 1
if [ -n "${RELEASE:-}" ]; then
  # Guards first: a loaded or swapping machine gave three invalid strict runs on 2026-10-28.
  load=$(awk '{print int($1)}' /proc/loadavg); si=$(vmstat 1 3 | tail -n 2 | awk '{s+=$7} END{print int(s)}')
  if [ -z "${FORCE_LOAD:-}" ] && { [ "$load" -gt "${LOADMAX:-10}" ] || [ "$si" -gt 200 ]; }; then
    echo "REFUSING to run the release gate: load average $load (max ${LOADMAX:-10}), swap-in $si KB/s (max 200). Wait for the machine to settle (FORCE_LOAD=1 overrides)."; exit 3
  fi
  base=origin/main; [ "${1:-}" = "--base" ] && base=$2
  sel=$(python3 tools/gate-plan.py --list --base "$base") || { echo "RELEASE GATE: unmapped changed file(s) above: declare them in tests/PATHMAP"; exit 2; }
  nb=$(echo "$sel" | grep -c .)
  echo "release gate: Node gate + $nb browser test(s): $(echo $sel | tr '\n' ' ')"
  rt0=$(date +%s.%N)
  # one http server on a free port for the browser tests (killed by PID at the end)
  port=$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')
  python3 -m http.server "$port" >/dev/null 2>&1 & srv=$!
  trap 'kill $srv 2>/dev/null' EXIT
  export URL="http://localhost:$port/"
  [ -n "${NODE_PATH:-}" ] || { [ -d node_modules ] && export NODE_PATH="$PWD/node_modules" || export NODE_PATH="$HOME/contrail-pilot/node_modules"; }
  BOUT=$(mktemp -d); export BOUT
  bone() { local t=$1 s e out rc; s=$(date +%s.%N); out=$(node "tests/$t.cjs" 2>&1); rc=$?; e=$(date +%s.%N)
    awk -v t="$t" -v a="$s" -v b="$e" -v rc="$rc" 'BEGIN { printf "%s\t%.1f\t%s\n", t, b - a, rc == 0 ? "pass" : "fail" }' > "$BOUT/$t.res"
    [ "$rc" -eq 0 ] || { echo "== FAIL (browser) $t"; echo "$out" | sed 's/\x1b\[[0-9;]*m//g' | grep -vE '^\s*$|Call log|^\s+at ' | tail -n 20; }; }
  export -f bone
  # the Node gate and the browser tests run at the same time (the Node tests are light)
  ( JOBS=3 "$0" > "$BOUT/node.out" 2>&1; echo $? > "$BOUT/node.rc" ) &
  nodepid=$!
  # longest first: declared weights are the test seconds in tools/test.sh (unknown = 20)
  echo "$sel" | while read -r t; do w=$(grep -o "\[$t\]=[0-9]*" tools/test.sh | head -n 1 | cut -d= -f2); echo "${w:-20} $t"; done | sort -rn | awk '{print $2}' | xargs -P "${BJOBS:-4}" -I{} bash -c 'bone {}'
  wait $nodepid
  nrc=$(cat "$BOUT/node.rc"); tail -n 6 "$BOUT/node.out"
  bf=0; for r in "$BOUT"/*.res; do [ "$(cut -f3 "$r")" = pass ] || bf=$((bf + 1)); done
  sort -t$'\t' -k2 -nr "$BOUT"/*.res | head -n 4 | awk -F'\t' '{ printf "   slowest browser: %-22s %5.1f s\n", $1, $2 }'
  rm -rf "$BOUT"
  awk -v a="$rt0" -v b="$(date +%s.%N)" -v n="$nb" -v f="$bf" -v nr="$nrc" 'BEGIN { printf "RELEASE GATE: Node gate %s, %d browser test(s), %d failed, %.1f s wall clock\n", nr == 0 ? "PASS" : "FAIL", n, f, b - a }'
  [ "$nrc" -eq 0 ] && [ "$bf" -eq 0 ]; exit $?
fi
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
