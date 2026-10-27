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
  [ $# -eq 0 ] || case "$want" in *" $test "*) ;; *) continue ;; esac
  n=$((n + 1))
  git diff --quiet -- "$file" || { echo "SKIP $test / $label: $file has uncommitted edits"; missed=1; continue; }
  sed -i "$expr" "$file"
  if git diff --quiet -- "$file"; then echo "NOT APPLIED  $test / $label"; missed=1; continue; fi
  s=$(date +%s.%N); out=$(timeout "${LIMIT:-200}" node "tests/$test.cjs" 2>&1); rc=$?; e=$(date +%s.%N)
  git checkout -q -- "$file"
  t=$(awk -v a="$s" -v b="$e" 'BEGIN { printf "%.0f", b - a }')
  if [ $rc -eq 0 ]; then echo "NOT CAUGHT   $test / $label (${t}s): the test still PASSES"; missed=1
  else echo "caught       $test / $label (${t}s): $(printf '%s\n' "$out" | grep -iE 'FAIL|^ *- |Error' | head -n 1 | cut -c1-110)"; fi
done < tools/plants.tsv
echo "plants: $n run, $([ $missed -eq 0 ] && echo 'all caught' || echo 'SOME NOT CAUGHT / SKIPPED')"
[ $missed -eq 0 ]
