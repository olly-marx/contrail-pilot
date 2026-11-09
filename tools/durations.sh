#!/usr/bin/env bash
# Rewrite tests/DURATIONS.tsv (seconds each test took on a CI runner) from one branch run's log. tools/test.sh balances its shards by this file.
#   tools/durations.sh <run-id>            writes tests/DURATIONS.tsv   (needs `gh`, read access to the repo's Actions logs)
#   LOG=file tools/durations.sh            read the log text from a file instead of `gh run view --log`
# Format: test<TAB>seconds<TAB>result; `test` is the file name without tests/ and .cjs; seconds include the retry of a flaky test (result flaky).
# When to regenerate (CI-FAST-DESIGN.md): when a branch run's slowest shard is more than 1.25 x the mean of its shards (every shard prints
# `shard k/N: predicted P s, actual A s` into the step summary), and after adding a test over 60 s. A test missing from the file counts as the median.
set -eu
cd "$(dirname "$0")/.."
if [ -n "${LOG:-}" ]; then raw=$(cat "$LOG"); else
  [ $# -eq 1 ] || { echo "usage: tools/durations.sh <run-id>"; exit 2; }
  raw=$(gh run view "$1" --log)
fi
body=$(printf '%s\n' "$raw" | sed -nE 's/.*-- tests\/([^:]+)\.cjs: ([0-9.]+)s \((pass|flaky|fail)\).*/\1\t\2\t\3/p' | sort -t$'\t' -k2 -rn)
n=$(printf '%s\n' "$body" | grep -c . || true)
[ "$n" -ge 100 ] || { echo "only $n tests found in the log: refusing to overwrite tests/DURATIONS.tsv"; exit 1; }
{ echo "# Seconds per test on a CI runner (tools/durations.sh; source run ${1:-from LOG}). tools/test.sh balances shards by this. Regenerate: see tools/durations.sh."
  printf '%s\n' "$body"; } > tests/DURATIONS.tsv
echo "wrote tests/DURATIONS.tsv: $n tests, $(awk -F'\t' '!/^#/ {t += $2} END {printf "%.0f", t}' tests/DURATIONS.tsv) s in total"
