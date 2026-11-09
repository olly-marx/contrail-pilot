#!/usr/bin/env bash
# The deploy gate (user decision 2026-11-09, research/CI-FAST-DESIGN.md): main's deploy skips the test matrix ONLY when the branch run already
# passed this exact commit. FAIL CLOSED: every doubt, error or odd input prints skip=false (the tests run); nothing here can fail the job.
#   tools/ci-gate.sh gate <full-sha> <event>                   prints skip=true|false and reason=...  (lines for $GITHUB_OUTPUT)
#   tools/ci-gate.sh decide <gate-result> <skip> <test-result> prints deploy=true|false: may the deploy job run?
#   tools/ci-gate.sh dry-check <branch> <skip> <test-result> <deploy>   a dry run (a ci-dry/* branch) asserts its own expectation; exit 1 if wrong
# ORIGIN=<remote or path> overrides `origin` (tests/cigate.cjs uses a throwaway bare repo).
# SKIP needs ALL of: event is push; the sha is a full 40-hex sha; exactly one ref refs/tags/ci-ok-<sha7> whose commit (peeled if annotated) EQUALS
# the full sha; no refs/tags/ci-fail-<sha7>; the ls-remote call succeeded. The marker is written only by verify-branch.yml's `report` job after
# every shard passed with no flaky test (a cancelled run writes none).
set -u
ORIGIN=${ORIGIN:-origin}

run() { echo "skip=false"; echo "reason=$1"; exit 0; }   # the one way out for every doubt

gate() {
  local sha=${1:-} event=${2:-} s7 out ok_refs ok_commit fails
  [ "$event" = push ] || run "event is '$event', not push: the tests run"
  [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || run "not a full 40-hex sha: the tests run"
  s7=${sha:0:7}
  out=$(git ls-remote --tags "$ORIGIN" "refs/tags/ci-ok-$s7*" "refs/tags/ci-fail-$s7*" 2>/dev/null) || run "ls-remote failed: the tests run"
  fails=$(printf '%s\n' "$out" | awk -v r="refs/tags/ci-fail-$s7" '$2 == r || $2 == r "^{}"' | wc -l)
  [ "$fails" -eq 0 ] || run "ci-fail-$s7 exists: the tests run"
  ok_refs=$(printf '%s\n' "$out" | awk -v r="refs/tags/ci-ok-$s7" '$2 == r' | wc -l)
  [ "$ok_refs" -eq 1 ] || run "no single ci-ok-$s7 marker ($ok_refs found): the tests run"
  # an annotated tag lists the tag object, then the commit on the ^{} line; a lightweight tag lists the commit itself
  ok_commit=$(printf '%s\n' "$out" | awk -v r="refs/tags/ci-ok-$s7" '$2 == r "^{}" { p = $1 } $2 == r { d = $1 } END { print (p != "" ? p : d) }')
  [ "$ok_commit" = "$sha" ] || run "ci-ok-$s7 points at '$ok_commit', not at $sha: the tests run"
  echo "skip=true"; echo "reason=ci-ok-$s7 points at exactly $sha: the branch run passed this commit"
}

# The deploy may run only if the gate job itself succeeded AND (the gate said skip and the test job really was skipped, OR the tests succeeded).
# A skipped dependency skips its dependents by default in GitHub Actions, and a failed or cancelled test must never deploy: this is the one place that decides.
decide() {
  local gate_result=${1:-} skip=${2:-} test_result=${3:-}
  if   [ "$gate_result" != success ]; then echo "deploy=false"
  elif [ "$skip" = true ];            then [ "$test_result" = skipped ] && echo "deploy=true" || echo "deploy=false"
  elif [ "$skip" = false ];           then [ "$test_result" = success ] && echo "deploy=true" || echo "deploy=false"
  else echo "deploy=false"; fi
}

# ci-dry/skip-*: a marker exists, so the tests must be skipped and the deploy would run. ci-dry/run-*: no marker, so the tests must run (in the dry run they just echo).
dry_check() {
  local branch=${1:-} skip=${2:-} test_result=${3:-} deploy=${4:-} want
  case "$branch" in
    ci-dry/skip-*) want="skip=true test=skipped deploy=true" ;;
    ci-dry/run-*)  want="skip=false test=success deploy=true" ;;
    *) echo "DRY-CHECK: branch '$branch' declares no expectation (use ci-dry/skip-* or ci-dry/run-*)"; return 1 ;;
  esac
  got="skip=$skip test=$test_result deploy=$deploy"
  if [ "$got" = "$want" ]; then echo "DRY-CHECK ok: $got"; else echo "DRY-CHECK FAIL: wanted [$want] got [$got]"; return 1; fi
}

case "${1:-}" in
  gate) shift; gate "$@" ;;
  decide) shift; decide "$@" ;;
  dry-check) shift; dry_check "$@" ;;
  *) echo "usage: tools/ci-gate.sh gate|decide|dry-check ..." >&2; exit 2 ;;
esac
