#!/usr/bin/env bash
# Prove planted defects (test-speed, 2026-10-27): for each line of tools/plants.tsv (optionally only the tests named as arguments), apply the plant,
# run the test, require it to FAIL, restore the file. Prints one line per plant and a summary; exit 1 if any plant was NOT caught.
#   tools/prove-plants.sh                 every declared plant
#   tools/prove-plants.sh flight lanes    only those tests
# The plant's file must be unchanged in git first (a plant is undone with `git checkout <file>`: never over real edits).
# Browser tests need URL=http://localhost:<port>/ and NODE_PATH; Node tests need nothing.
set -u
cd "$(dirname "$0")/.."
want=" $* "; missed=0; n=0
while IFS=$'\t' read -r test file expr label; do
  case "$test" in '#'*|'') continue ;; esac
  [ $# -eq 0 ] || case "$want" in *" $test "*|*" ${test%%@*} "*) ;; *) continue ;; esac   # a piece (test@KEY=VALUE) is selected by its base name too
  n=$((n + 1))
  git ls-files --error-unmatch -- "$file" >/dev/null 2>&1 || { echo "SKIP $test / $label: $file is not tracked in git (commit it first: a plant must be undoable)"; missed=1; continue; }
  git diff --quiet -- "$file" || { echo "SKIP $test / $label: $file has uncommitted edits"; missed=1; continue; }
  keep=$(mktemp); cp "$file" "$keep"          # the file is put back from THIS copy, whatever happens
  sed -i "$expr" "$file"
  if cmp -s "$file" "$keep"; then rm -f "$keep"; echo "NOT APPLIED  $test / $label"; missed=1; continue; fi
  if [ -n "${DRY:-}" ]; then ch=$(diff "$keep" "$file" | grep -c '^>'); cp "$keep" "$file"; rm -f "$keep"; echo "applies      $test / $label ($ch line(s) changed)"; continue; fi
  base=${test%%@*}; ev=""; [[ $test == *@* ]] && ev=${test#*@}   # test@KEY=VALUE runs tests/test.cjs with KEY=VALUE (a piece of a split test)
  s=$(date +%s.%N); out=$(env $ev timeout "${LIMIT:-200}" node "tests/$base.cjs" 2>&1); rc=$?; e=$(date +%s.%N)
  cp "$keep" "$file"; rm -f "$keep"
  t=$(awk -v a="$s" -v b="$e" 'BEGIN { printf "%.0f", b - a }')
  if [ $rc -eq 0 ]; then echo "NOT CAUGHT   $test / $label (${t}s): the test still PASSES"; missed=1
  else echo "caught       $test / $label (${t}s): $(printf '%s\n' "$out" | grep -iE 'FAIL|^ *- |Error' | head -n 1 | cut -c1-110)"; fi
done < tools/plants.tsv
[ "$n" -gt 0 ] || { echo "plants: NONE declared for: ${*:-(any)} in tools/plants.tsv (a missing declaration is a failure, not a pass)"; exit 1; }
if [ -n "${DRY:-}" ]; then verb="checked (DRY, no test run)"; ok="all apply"; else verb="run"; ok="all caught"; fi
echo "plants: $n $verb, $([ $missed -eq 0 ] && echo "$ok" || echo "SOME NOT CAUGHT / SKIPPED")"
[ $missed -eq 0 ]
