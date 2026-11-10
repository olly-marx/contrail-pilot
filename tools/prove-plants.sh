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
  if [ "$file" = "-" ]; then   # an ENV plant: nothing to edit; the test token carries the switch (test@GATE=1+PLANT=old)
    base=${test%%@*}; ev=${test#*@}; ev=${ev//+/ }
    if [ -n "${DRY:-}" ]; then echo "applies      $test / $label (env plant)"; continue; fi
    s=$(date +%s.%N); out=$(env $ev timeout "${LIMIT:-200}" node "tests/$base.cjs" 2>&1); rc=$?; e=$(date +%s.%N); t=$(awk -v a="$s" -v b="$e" 'BEGIN { printf "%.0f", b - a }')
    if [ $rc -eq 0 ]; then echo "NOT CAUGHT   $test / $label (${t}s): the test still PASSES"; missed=1
    else echo "caught       $test / $label (${t}s): $(printf '%s\n' "$out" | tools/plant-why.sh)"; fi
    continue
  fi
  # `file` may be a comma list (a JOINT plant: a fix that lives in two files, each half is covered by the other, so only both together bring the bug back): the same sed script is run on
  # every file (each file only matches its own command) and every file must change.
  IFS=',' read -r -a files <<< "$file"; keeps=(); skip=""
  for f in "${files[@]}"; do
    git ls-files --error-unmatch -- "$f" >/dev/null 2>&1 || { echo "SKIP $test / $label: $f is not tracked in git (commit it first: a plant must be undoable)"; skip=1; break; }
    git diff --quiet -- "$f" || { echo "SKIP $test / $label: $f has uncommitted edits"; skip=1; break; }
  done
  [ -z "$skip" ] || { missed=1; continue; }
  for f in "${files[@]}"; do k=$(mktemp); cp "$f" "$k"; keeps+=("$k"); done   # each file is put back from ITS copy, whatever happens
  restore() { for i in "${!files[@]}"; do cp "${keeps[$i]}" "${files[$i]}"; rm -f "${keeps[$i]}"; done; }
  notapplied=""; for i in "${!files[@]}"; do sed -i "$expr" "${files[$i]}"; cmp -s "${files[$i]}" "${keeps[$i]}" && notapplied="${files[$i]}"; done
  if [ -n "$notapplied" ]; then restore; echo "NOT APPLIED  $test / $label ($notapplied unchanged)"; missed=1; continue; fi
  if [ -n "${DRY:-}" ]; then ch=0; for i in "${!files[@]}"; do ch=$((ch + $(diff "${keeps[$i]}" "${files[$i]}" | grep -c '^>'))); done; restore; echo "applies      $test / $label ($ch line(s) changed)"; continue; fi
  base=${test%%@*}; ev=""; [[ $test == *@* ]] && ev=${test#*@}   # test@KEY=VALUE runs tests/test.cjs with KEY=VALUE (a piece of a split test)
  s=$(date +%s.%N); out=$(env $ev timeout "${LIMIT:-200}" node "tests/$base.cjs" 2>&1); rc=$?; e=$(date +%s.%N)
  restore
  t=$(awk -v a="$s" -v b="$e" 'BEGIN { printf "%.0f", b - a }')
  if [ $rc -eq 0 ]; then echo "NOT CAUGHT   $test / $label (${t}s): the test still PASSES"; missed=1
  else echo "caught       $test / $label (${t}s): $(printf '%s\n' "$out" | tools/plant-why.sh)"; fi
done < tools/plants.tsv
[ "$n" -gt 0 ] || { echo "plants: NONE declared for: ${*:-(any)} in tools/plants.tsv (a missing declaration is a failure, not a pass)"; exit 1; }
if [ -n "${DRY:-}" ]; then verb="checked (DRY, no test run)"; ok="all apply"; else verb="run"; ok="all caught"; fi
echo "plants: $n $verb, $([ $missed -eq 0 ] && echo "$ok" || echo "SOME NOT CAUGHT / SKIPPED")"
[ $missed -eq 0 ]
