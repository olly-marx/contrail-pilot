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

# Seconds each test took in CI (2026-10-22), to balance shards; unknown tests count as 20.
declare -A secs=([forest]=60 [school]=67 [lanes]=65 [flight]=49 [missions]=39 [crystals]=38 [progression]=33
  [hazards]=32 [ponds]=29 [rewards]=28 [controls]=27 [online]=25 [tours]=22 [issr-reveal]=21 [features]=20
  [journey]=17 [nature]=15 [hangar]=14 [banners]=14 [gate]=11 [wild]=9 [upgrades]=9 [restore]=9 [reprice]=9
  [collisions]=7 [savesafe]=6 [runway-back]=6 [textures]=2 [links]=2 [wildlife]=20 [treeart]=2 [powerups]=20 [habitatdata]=2 [forestmeter]=15)

if [ -n "$shard" ]; then
  k=${shard%/*}; n=${shard#*/}
  # Greedy: longest test first onto the least-loaded group; keep this group's tests.
  mine=$(for t in "${tests[@]}"; do b=$(basename "$t" .cjs); echo "${secs[$b]:-20} $t"; done | sort -rn | awk -v n="$n" -v k="$k" '
    { best = 1; for (i = 2; i <= n; i++) if (load[i] < load[best]) best = i; load[best] += $1; if (best == k) print $2 }')
  tests=($mine)
fi

[ -n "${DRY:-}" ] && { printf '%s\n' "${tests[@]}"; exit 0; }   # DRY=1: just list what would run

pass=() flaky=() fail=()
for t in "${tests[@]}"; do
  echo "== $t"
  if node "$t" > /tmp/test-out.$$ 2>&1; then pass+=("$t"); tail -1 /tmp/test-out.$$
  else
    echo "-- failed, output:"; grep -v '^\s*-\s*\(waiting\|retrying\|attempting\)\|\[2m' /tmp/test-out.$$ | tail -25
    echo "-- retrying $t once"
    if node "$t" > /tmp/test-out.$$ 2>&1; then flaky+=("$t"); echo "-- passed on retry: FLAKY"
      [ -n "${GITHUB_ACTIONS:-}" ] && echo "::warning title=Flaky test::$t failed, then passed on retry"
    else fail+=("$t"); grep -v '^\s*-\s*\(waiting\|retrying\|attempting\)\|\[2m' /tmp/test-out.$$ | tail -25
      [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error title=Test failed twice::$t"
    fi
  fi
done
rm -f /tmp/test-out.$$

summary="PASSED ${#pass[@]}  FLAKY ${#flaky[@]}  FAILED ${#fail[@]}${shard:+  (shard $shard)}"
echo; echo "$summary"
[ ${#flaky[@]} -gt 0 ] && echo "flaky (passed on retry): ${flaky[*]}"
[ ${#fail[@]} -gt 0 ] && echo "failed twice: ${fail[*]}"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  { echo "### Tests ${shard:+(shard $shard)}"; echo "$summary"; echo
    [ ${#flaky[@]} -gt 0 ] && echo "- ⚠️ flaky (passed on retry): ${flaky[*]}"
    [ ${#fail[@]} -gt 0 ] && echo "- ❌ failed twice: ${fail[*]}"; } >> "$GITHUB_STEP_SUMMARY"
fi
[ ${#fail[@]} -eq 0 ]
