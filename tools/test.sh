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

# Seconds each test took in a full local run (2026-10-28, tree 9d0c7022, 122 tests; the old table was CI seconds from 2026-10-22 and covered 40 tests),
# to balance shards: with this table the 4 CI shards come out at ~543 s each (the old table gave 461-601). Unknown tests count as 20.
# Refresh from a run with `TIMES=file tools/test.sh` (it writes test<TAB>seconds<TAB>result).
declare -A secs=([walkthrough]=181 [onrails]=130 [flight]=73 [lanes]=71 [school]=71 [firsthour-real]=71 [updates]=69 [offline]=54 [sim-tapper]=48 [missions]=48 [crystals]=46 [cache]=42 [forest]=42 [season2-smoke]=40 [controls]=38 [sim-player]=38 [tours]=37 [season2]=37 [records-screen]=37 [progression]=35 [hazards]=34 [saveloss]=32 [ponds]=30 [onlinesave]=30 [swipe]=29 [online]=29 [rewards]=28 [missionscreen]=26 [features]=26 [nature]=25 [hudlayout]=24 [journey]=24 [sim-hazards]=23 [issr-reveal]=23 [looks]=23 [gaphint]=22 [wildlife]=21 [globe]=20 [hangar]=20 [pickupgates]=18 [wildfield]=18 [fares]=17 [terrain]=17 [restore]=16 [wild]=16 [welcome]=15 [sim-bank]=15 [regions]=14 [biodiversity]=14 [newplayer]=13 [crash]=12 [gate]=12 [banners]=12 [flightregion]=12 [textfit]=10 [sim-result-fields]=10 [eras]=10 [treepic]=10 [forestmeter]=10 [hangarnew]=10 [savesafe]=10 [pixelpreview]=9 [fields]=9 [forecast]=9 [upgrades]=9 [sim-care]=8 [everyleg]=8 [powerups]=8 [projectart]=8 [atc]=8 [reset]=8 [hubscreen]=7 [sim-rng-split]=7 [collisions]=7 [treelayout]=6 [sim-equiv]=6 [runway-back]=6 [margin]=5 [stormart]=5 [fleetfacts]=4 [textures]=4 [tourgiveup]=4 [sim-physics]=4 [links]=3 [landmarks]=3 [badgeart]=3 [nature-unknown]=3 [faces]=2 [sim-masks]=2 [twilight]=2 [badges]=2 [sim-issr-variants]=2 [sim-paired]=2 [sim-trees]=2 [gapmarkers]=1 [sim-l2patch]=1 [sim-lanes]=1 [geo]=1 [sim-forest]=1 [release]=1 [sim-flight]=1 [sim-crossing]=1 [areas]=1 [sim-pilots]=1 [season2-node]=1 [offer-gate]=1 [missions2]=1 [hub]=1 [wildlifelist]=1 [weboflife]=1 [textbudget]=1 [sim-crystals]=1 [records]=1 [nexthere]=1 [missions4]=1 [missionclean]=1 [landtrees]=1 [l2fallback]=1 [lessonart]=1 [fleet]=1 [habitatdata]=1 [treeart]=1)

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
