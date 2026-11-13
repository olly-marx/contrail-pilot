#!/usr/bin/env bash
# Check that each planted defect is caught by ITS OWN check (ledger row 47, 2026-11-13). tools/prove-plants.sh only asks that a plant makes its test
# fail; a plant caught by some other check proves nothing about the rule it names. For every row of the table (default tools/plant-lines.tsv:
# test <TAB> label <TAB> expected start of the first failing line) this runs the plants of those tests and requires the reported line to start
# with the expected text. Exit 1 on: a wrong line, a plant not caught, a label that is not in tools/plants.tsv, an empty table.
#   tools/plant-lines.sh                    the declared table
#   tools/plant-lines.sh my-table.tsv       another table (the positive control: a table with one wrong expectation must exit 1)
# Node tests only (the browser ones need URL + NODE_PATH, as prove-plants). The plants' files must be unchanged in git (prove-plants restores them).
set -u
cd "$(dirname "$0")/.."
table=${1:-tools/plant-lines.tsv}
[ -f "$table" ] || { echo "plant-lines: no table $table"; exit 2; }
rows=$(grep -v '^#' "$table" | grep -v '^$')
[ -n "$rows" ] || { echo "plant-lines: the table $table is EMPTY (nothing checked is not a pass)"; exit 1; }
bad=0
# Every label must exist in plants.tsv for its test (a renamed plant would otherwise be skipped silently).
while IFS=$'\t' read -r test label exp; do
  awk -F'\t' -v t="$test" -v l="$label" '$1 == t && $4 == l { f = 1 } END { exit !f }' tools/plants.tsv \
    || { echo "STALE        $test / $label: not in tools/plants.tsv"; bad=1; }
done <<< "$rows"
tests=$(printf '%s\n' "$rows" | cut -f1 | sort -u | tr '\n' ' ')
out=$(tools/prove-plants.sh $tests 2>&1)
n=0
while IFS=$'\t' read -r test label exp; do
  n=$((n + 1))
  line=$(printf '%s\n' "$out" | awk -v k="$test / $label (" 'index($0, k) { print; exit }')
  if [ -z "$line" ]; then echo "NOT RUN      $test / $label"; bad=1; continue; fi
  case "$line" in caught*) ;; *) echo "NOT CAUGHT   $test / $label"; bad=1; continue ;; esac
  got=${line#*s): }
  case "$got" in "$exp"*) echo "own line     $test / $label" ;;
    *) echo "WRONG LINE   $test / $label"; echo "    expected: $exp"; echo "    got:      $got"; bad=1 ;; esac
done <<< "$rows"
[ $bad -eq 0 ] && echo "plant-lines: $n plants, each caught by its own line" || echo "plant-lines: $n plants, SOME WRONG (see above)"
exit $bad
