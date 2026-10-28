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

# Seconds each test took in a full local run on a quiet machine (2026-10-28, 0.16.2, tree 7ebe4edb, 129 tests), to balance shards: unknown tests count as 20.
# Refresh from a run with `TIMES=file tools/test.sh` (it writes test<TAB>seconds<TAB>result).
declare -A secs=([postrails]=283 [walkthrough]=181 [onrails]=134 [updates]=72 [lanes]=71 [school]=70 [firsthour-real]=70 [flight]=67 [crystals]=53 [offline]=50 [missions]=49 [season2-smoke]=48 [sim-tapper]=48 [cache]=45 [rails2]=44 [records-screen]=39 [progression]=38 [forest]=37 [controls]=37 [sim-player]=36 [tours]=35 [onlinesave]=34 [season2]=33 [hazards]=33 [swipe]=31 [ponds]=30 [nature]=29 [journey]=28 [online]=27 [rewards]=27 [hudlayout]=26 [missionscreen]=25 [saveloss]=24 [wildlife]=24 [sim-hazards]=24 [gaphint]=24 [looks]=23 [features]=23 [issr-reveal]=22 [hangar]=22 [globe]=22 [newplayer]=21 [pickupgates]=19 [terrain]=16 [fares]=16 [gate]=16 [wildfield]=15 [wild]=15 [welcome]=14 [sim-care]=14 [hangarnew]=13 [sim-result-fields]=11 [banners]=11 [flightregion]=11 [regions]=11 [everyleg]=10 [eras]=10 [l4hint]=10 [crash]=10 [treepic]=10 [collisions]=10 [biodiversity]=10 [tipqueue]=9 [upgrades]=9 [forestmeter]=9 [atc]=9 [textfit]=8 [savesafe]=8 [sim-bank]=8 [powerups]=8 [pixelpreview]=8 [forecast]=7 [sim-physics]=7 [nature-unknown]=7 [projectart]=6 [fields]=6 [reset]=6 [runway-back]=6 [sim-equiv]=6 [margin]=6 [sim-rng-split]=6 [hubscreen]=6 [treelayout]=5 [badges]=4 [stormart]=4 [fleetfacts]=4 [links]=4 [tourgiveup]=4 [badgeart]=4 [textures]=2 [landmarks]=2 [faces]=2 [twilight]=2 [sim-masks]=2 [sim-issr-variants]=2 [sim-paired]=1 [sim-trees]=1 [gapmarkers]=1 [sim-l2patch]=1 [geo]=1 [sim-lanes]=1 [sim-forest]=1 [sim-flight]=1 [release]=1 [areas]=1 [lessonfallback]=1 [weboflife]=1 [textbudget]=1 [sim-crystals]=1 [records]=1 [nexthere]=1 [missions2]=1 [l2fallback]=1 [habitatdata]=1 [sim-pilots]=1 [sim-crossing]=1 [offer-gate]=1 [missions4]=1 [missionclean]=1 [landtrees]=1 [hub]=1 [fleet]=1 [season2-node]=1 [lessonart]=1 [railwords]=1 [freeparcels]=1 [wildlifelist]=1 [treeart]=1)

if [ -n "$shard" ]; then
  k=${shard%/*}; n=${shard#*/}
  # Greedy: longest test first onto the least-loaded group; keep this group's tests.
  mine=$(for t in "${tests[@]}"; do b=$(basename "$t" .cjs); echo "${secs[$b]:-20} $t"; done | sort -rn | awk -v n="$n" -v k="$k" '
    { best = 1; for (i = 2; i <= n; i++) if (load[i] < load[best]) best = i; load[best] += $1; if (best == k) print $2 }')
  tests=($mine)
fi

[ -n "${DRY:-}" ] && { printf '%s\n' "${tests[@]}"; exit 0; }   # DRY=1: just list what would run

pass=() flaky=() fail=()
# Per-test seconds (2026-10-27, test-speed work): printed after every test, and appended as `test<TAB>seconds<TAB>result` to the file named by
# TIMES (e.g. TIMES=times.tsv tools/test.sh ...). Seconds include a retry. Needs only bash + date.
now() { date +%s.%N; }
tick() { awk -v a="$1" -v b="$(now)" 'BEGIN { printf "%.1f", b - a }'; }
note() { local sec; sec=$(tick "$2"); echo "-- $1: ${sec}s ($3)"; [ -n "${TIMES:-}" ] && printf '%s\t%s\t%s\n' "$1" "$sec" "$3" >> "$TIMES"; }
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
echo; echo "$summary"
[ ${#flaky[@]} -gt 0 ] && echo "flaky (passed on retry): ${flaky[*]}"
[ ${#fail[@]} -gt 0 ] && echo "failed twice: ${fail[*]}"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  { echo "### Tests ${shard:+(shard $shard)}"; echo "$summary"; echo
    [ ${#flaky[@]} -gt 0 ] && echo "- ⚠️ flaky (passed on retry): ${flaky[*]}"
    [ ${#fail[@]} -gt 0 ] && echo "- ❌ failed twice: ${fail[*]}"; } >> "$GITHUB_STEP_SUMMARY"
fi
[ ${#fail[@]} -eq 0 ]
