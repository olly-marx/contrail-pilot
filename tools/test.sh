#!/usr/bin/env bash
# Run the browser tests the way CI does (2026-10-22: CI took 12-15 min and stopped at the first
# failure). Every test runs even if one fails; a failing test is retried ONCE: passing on the retry
# is reported as FLAKY (a warning, not a failure), failing twice is a real FAIL. One summary at the
# end; exit 1 if anything really failed.
#   tools/test.sh                  all tests, one after another
#   tools/test.sh --shard 2/4      the 2nd of 4 groups, balanced by how long each test takes (CI)
#   tools/test.sh tests/wild.cjs   just these
# Needs the game served on :8000 and playwright-core (NODE_PATH or node_modules).
set -u
cd "$(dirname "$0")/.."

shard=""
if [ "${1:-}" = "--shard" ]; then shard="$2"; shift 2; fi
if [ $# -gt 0 ]; then tests=("$@"); else tests=(tests/*.cjs); fi

# Seconds each test took on a CI runner, from tests/DURATIONS.tsv (tools/durations.sh regenerates it from a branch run's log), to balance the shards.
# A test missing from the file counts as the median of the file (a new test must not look free).
declare -A secs; med=15
if [ -f tests/DURATIONS.tsv ]; then
  while IFS=$'\t' read -r name s _; do case "$name" in '#'*|'') continue ;; esac; secs[$name]=$s; done < tests/DURATIONS.tsv
  med=$(grep -v '^#' tests/DURATIONS.tsv | cut -f2 | sort -n | awk '{ a[NR] = $1 } END { print (NR ? a[int((NR + 1) / 2)] : 15) }')
fi

pred=""
if [ -n "$shard" ]; then
  k=${shard%/*}; n=${shard#*/}
  # Greedy: longest test first onto the least-loaded group; keep this group's tests. `P` carries this group's predicted seconds.
  plan=$(for t in "${tests[@]}"; do b=$(basename "$t" .cjs); echo "${secs[$b]:-$med} $t"; done | sort -rn | awk -v n="$n" -v k="$k" '
    { best = 1; for (i = 2; i <= n; i++) if (load[i] < load[best]) best = i; load[best] += $1; if (best == k) print "T " $2 }
    END { printf "P %.0f\n", load[k] }')
  tests=($(printf '%s\n' "$plan" | sed -n 's/^T //p')); pred=$(printf '%s\n' "$plan" | sed -n 's/^P //p')
fi

[ -n "${DRY:-}" ] && { printf '%s\n' "${tests[@]}"; exit 0; }   # DRY=1: just list what would run

pass=() flaky=() fail=()
# Per-test seconds (2026-10-27, test-speed work): printed after every test, and appended as `test<TAB>seconds<TAB>result` to the file named by
# TIMES (e.g. TIMES=times.tsv tools/test.sh ...). Seconds include a retry. Needs only bash + date.
now() { date +%s.%N; }
tick() { awk -v a="$1" -v b="$(now)" 'BEGIN { printf "%.1f", b - a }'; }
tot=0
note() { local sec; sec=$(tick "$2"); tot=$(awk -v a="$tot" -v b="$sec" 'BEGIN { printf "%.1f", a + b }'); echo "-- $1: ${sec}s ($3)"; [ -n "${TIMES:-}" ] && printf '%s\t%s\t%s\n' "$1" "$sec" "$3" >> "$TIMES"; }
for t in "${tests[@]}"; do
  echo "== $t"
  t0=$(now)
  if node "$t" > /tmp/test-out.$$ 2>&1; then pass+=("$t"); tail -1 /tmp/test-out.$$; note "$t" "$t0" pass
  else
    echo "-- failed, output:"; grep -v '^\s*-\s*\(waiting\|retrying\|attempting\)\|\[2m' /tmp/test-out.$$ | tail -25
    echo "-- retrying $t once"
    if node "$t" > /tmp/test-out.$$ 2>&1; then flaky+=("$t"); echo "-- passed on retry: FLAKY"; note "$t" "$t0" flaky
      [ -n "${GITHUB_ACTIONS:-}" ] && echo "::warning title=Flaky test::$t failed, then passed on retry"
    else fail+=("$t"); note "$t" "$t0" fail; grep -v '^\s*-\s*\(waiting\|retrying\|attempting\)\|\[2m' /tmp/test-out.$$ | tail -25
      [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error title=Test failed twice::$t"
    fi
  fi
done
rm -f /tmp/test-out.$$

summary="PASSED ${#pass[@]}  FLAKY ${#flaky[@]}  FAILED ${#fail[@]}${shard:+  (shard $shard)}"
[ -n "$shard" ] && drift="shard $shard: predicted ${pred} s, actual ${tot} s"   # drift = tools/durations.sh needs a refresh (see its header)
echo; echo "$summary"; [ -n "${drift:-}" ] && echo "$drift"
[ ${#flaky[@]} -gt 0 ] && echo "flaky (passed on retry): ${flaky[*]}"
[ ${#fail[@]} -gt 0 ] && echo "failed twice: ${fail[*]}"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  { echo "### Tests ${shard:+(shard $shard)}"; echo "$summary"; [ -n "${drift:-}" ] && echo "$drift"; echo
    [ ${#flaky[@]} -gt 0 ] && echo "- ⚠️ flaky (passed on retry): ${flaky[*]}"
    [ ${#fail[@]} -gt 0 ] && echo "- ❌ failed twice: ${fail[*]}"; } >> "$GITHUB_STEP_SUMMARY"
fi
[ ${#fail[@]} -eq 0 ]
