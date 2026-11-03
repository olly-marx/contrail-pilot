# Proposal: a verify-only CI run on a pushed branch, and a concurrency rule for this machine (DESK WORK, 2026-11-03)

**Status: PROPOSAL for the user to decide. No workflow, no script and no setting has been changed.** Asked by the Coordinator on the user's behalf: "how do we work concurrently with the slow browser turns?" Facts below are MEASURED unless marked (estimate) or (unverified).

## 0. The short answer
1. **The limit is MEMORY, not cores.** Measured now: 16 cores, 15.3 GB RAM, 10.1 GB used, 4.5 GB of swap in use, 4.0 GB available. The `claude` processes alone hold **8.65 GB (53 processes, ~163 MB each on average)** = ~86 % of everything in use; Chrome (a browser turn running at that moment) 1.06 GB; Xorg is stuck at 100 % of one core and `pop-upgrade` at 76 % (neither is ours). So a second browser turn does not fail for lack of CPU, it fails because it pushes the machine into swap (the gate itself refuses to start at swap-in > 200 KB/s; that has happened twice today).
2. **Move the heavy proof off this machine.** A second workflow that runs the SAME 4 shards on a pushed `ci/<name>` branch (verify only: no deploy, no tag) gives the exact-commit proof remotely, in parallel, for free (public repo, standard runners). The local gate shrinks to "Node tier + smoke" (about 2 minutes).
3. **Read the result without the REST API** (the shared quota was exhausted twice today): the workflow's last job pushes a marker tag `ci-ok-<sha7>` or `ci-fail-<sha7>`; the reader runs `git ls-remote --tags origin 'ci-*-<sha7>'` (a git call, no REST quota).
4. **A rule for what may overlap locally** needs ONE measurement (section 6, experiment E1), not a guess.

## 1. What exists today (read from the repo, origin/main 9d0cf4e)
- `.github/workflows/deploy.yml`: on `push: main` and manual dispatch. Job `test`: `ubuntu-latest`, `timeout-minutes: 25`, matrix `shard: [1,2,3,4]`, `fail-fast: false`; steps: checkout, Node 22, `npm i --no-save playwright-core@1`, serve on :8000, `tools/test.sh --shard N/4` with `CHROME=/usr/bin/google-chrome`. Job `deploy` `needs: test` (Pages). Job `tag` `needs: deploy`, `permissions: contents: write`, pushes `vX.Y.Z` with the workflow token. `concurrency: group: pages, cancel-in-progress: true`.
- `tools/test.sh` runs **every** `tests/*.cjs` (Node tests too, in their FULL form, not the local gate's `GATE=1` small form), balanced over shards by a `secs` table; **a failing test is retried once and a pass on retry is a FLAKY warning, not a failure.**
- Run time: 18-20 min per push today (measured on every push today: 01:37 -> 01:55, 03:05 -> 03:25, 03:25 -> 03:45, 04:34 -> 04:53, 06:01 -> 06:19, 09:31 -> 09:52).
- What the CI run caught that the local gate did not: the 0.26.4 `sim-bank` red (the planner had not mapped the file). CI runs ALL tests, so it is stricter than the local plan by construction.

## 2. Design
**2a. `.github/workflows/verify-branch.yml` (sketch, NOT added):**
```yaml
name: Verify branch (no deploy)
on:
  push:
    branches: ['ci/**']          # a chat opts in by pushing ci/<name>; ordinary WIP branches cost nothing
concurrency:
  group: verify-${{ github.ref }}   # NOT 'pages': it must never cancel or be cancelled by the main run
  cancel-in-progress: true
permissions:
  contents: read
jobs:
  test:                          # identical steps to deploy.yml's test job, plus NO_RETRY (see 2c)
    runs-on: ubuntu-latest
    timeout-minutes: 25
    strategy: { fail-fast: false, matrix: { shard: [1, 2, 3, 4] } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm i --no-save playwright-core@1
      - run: python3 -m http.server 8000 >/dev/null 2>&1 &
      - env: { CHROME: /usr/bin/google-chrome, NO_RETRY: '1' }
        run: tools/test.sh --shard ${{ matrix.shard }}/4
  report:                        # the machine-readable answer, readable with `git ls-remote` (zero REST calls)
    needs: test
    if: always()
    runs-on: ubuntu-latest
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@v4
      - run: |
          S=${GITHUB_SHA::7}; R=${{ needs.test.result }}
          T="ci-$([ "$R" = success ] && echo ok || echo fail)-$S"
          git tag -f "$T" && git push -f origin "$T"
```
**2b. Reading the result:** `git ls-remote --tags origin "ci-*-$S"` prints `ci-ok-<S>` or `ci-fail-<S>` (or nothing while running). Poll it every 2-3 minutes: it costs no REST quota. The web UI's check run is the human view. (unverified: that a tag pushed with the workflow token does not re-trigger workflows; GitHub documents that events created by `GITHUB_TOKEN` do not start new runs, but this must be seen once.) Tags are cleaned by a periodic `git push origin --delete` of `ci-*` older than N days (or use the `refs/ci/...` namespace instead of tags; also unverified).
**2c. Needed change in `tools/test.sh` (a harness edit):** `NO_RETRY=1` makes a failure final. Without it the branch run would report a flaky test as a pass, and the user's rule is 0 failed AND 0 flaky. (Main's run could keep the retry: a policy choice for the user.)
**2d. Phase 2, optional:** move the `test` job into a reusable workflow (`on: workflow_call`) used by BOTH `deploy.yml` and `verify-branch.yml`. Then "the branch run and the main run test the same way" is true by construction, and `deploy.yml` could skip its tests when `ci-ok-<sha7>` already exists for the pushed commit (identical commit = identical tree = identical tests), cutting the deploy latency from ~20 min to ~3 min. Trust change: the user must accept that the branch run IS the proof.

## 3. What it changes in the release rule
Today: local `gate.sh --release` on the exact commit (planned subset + Node tier), then push, then CI re-tests everything (~20 min) and deploys.
Proposed: (1) local: Node tier + smoke set only (about 2 min, ~1.5 GB of Chrome); (2) push the exact commit to `ci/<name>`; (3) read `ci-ok-<sha7>` with `git ls-remote`; (4) fast-forward main to that SAME sha (`git push origin <sha>:main`); main's CI then deploys (phase 1: re-tests, as today; phase 2: skips). Red branch run = no push to main (the 0.26.4 episode becomes a red BRANCH, never a red main). The "tiers separately" rule stays: the report distinguishes Node and browser results in the job summary.
**What improves:** the full ALL tier is the proof every time (the planner gap class cannot recur); the machine is free for other chats while it runs; the flaky-under-load question moves to a quiet VM.
**What it cannot replace (honest list):**
- **Load-sensitive behaviour.** A GitHub runner is a quiet VM; a test that fails only under this machine's load (rails2 L5, tours reload today) will PASS there. Those bugs were found by busy-loop experiments, which must stay local, or run as an explicit stress job on CI (a step that starts N busy loops before the shard; unverified how closely it matches).
- **Timing on the user's phone, iOS Safari, WebKit:** the shards run Chrome only, same as the local gate. Neither covers WebKit.
- **The live-site checks** (service worker against the deployed host, `version.json`): after deploy only.
- **Speed of an urgent fix:** a branch run adds ~20 min before main; for an emergency the local-gate-then-main path stays available (an explicit exception, like today's SW-OFF kill switch).
## 4. Cost
- **GitHub Actions minutes:** the repo is public (`private=false`), standard runners are free. A branch run is 4 shards x ~15-20 min = 60-80 runner-minutes; at 10 runs a day, 600-800 minutes a day, free. (unverified: any concurrency cap on free public repos; GitHub documents 20 concurrent jobs; a branch run uses 4.)
- **REST API quota:** zero if results are read with `git ls-remote`. Today's two quota exhaustions came from polling `gh run view` every minute from several chats.
## 5. Risks and unknowns (not verified)
Whether the marker tag can be pushed by the workflow token on every branch (branch/tag protection rules not inspected); tag clutter; a forgotten `ci/` branch consuming minutes (mitigation: `concurrency` cancel + delete the branch after the fast-forward); the `secs` balancing table is a 2026-10-28 snapshot, shards may skew; CI runs the FULL form of Node sweeps (heavier than the local `GATE=1` form).

## 6. The concurrency rule on THIS machine
Facts: cores are not the limit (16 cores; a gate peaks at load ~28 by choice of BJOBS=3). Memory is: 4.0 GB available, swap in use. The gate already refuses to start when load >= 10 or swap-in > 200 KB/s; today it refused twice.
- **E1 (the one experiment that sets the rule), ~30 min, one machine turn:** run the normal `BJOBS=3 gate.sh --release` while a sampler writes every 2 s: `date`, `MemAvailable`, swap used, `vmstat` si/so, and the summed RSS of the processes whose cwd is the release worktree (Chrome, node, python). Record the PEAK of the summed RSS of the gate's own processes: **P_browser**. Repeat once for a Node-only gate (`tools/gate.sh` without `--release`): **P_node**. (Estimate to be confirmed: P_browser ~ 3 Chrome x 0.4-0.6 GB + node ~ 2 GB; P_node ~ 0.3 GB.)
- **The rule, with E1's numbers:** a second turn may start only if `MemAvailable >= P(kind) + 1.5 GB` and swap-in < 200 KB/s. Node-only turns (seconds to a minute) may overlap anything that leaves that margin. Two browser turns at once only if `MemAvailable >= 2 x P_browser + 1.5 GB`. `taskset` pinning to disjoint cores is cosmetic until memory is solved (cores are not the limit); test it only after E1, as **E2**: two gates at once, pinned to cores 0-7 and 8-15, vs solo, comparing wall time and flake counts.
- **The cheapest lever is not CI:** 53 `claude` processes hold 8.65 GB. Closing or not resuming idle sessions (the user's call) frees memory directly: with ~163 MB per process, 20 fewer processes is ~3 GB (estimate from the average).
- Not ours but worth the user's attention: Xorg at 100 % of a core for 22 days of uptime and `pop-upgrade` at 76 %.

## 7. Plan, owners, first test
1. **Owner: release manager (me), after the user approves.** Add `verify-branch.yml` (section 2a) and `NO_RETRY` in `tools/test.sh`; both on ONE commit that goes through the normal gate. The user decides first whether `NO_RETRY` also applies to main's run.
2. **First test (the proof that the branch run equals the local gate):** push the already-green main commit (e.g. 9d0cf4e) to `ci/proof-1` and require: (a) the run is green; (b) the set of tests it ran contains every test of the local `gate.sh --plan` for that commit; (c) the marker `ci-ok-<sha7>` appears and `git ls-remote` shows it with ZERO REST calls (count them); (d) **a control that must fail:** push a branch with a declared plant (for example the `sim-bank` view-only plant: remove `'seen'` from `VIEW_ONLY`) and require the run to go RED and write `ci-fail-<sha7>`: a gate that cannot fail is not a gate. (e) Compare wall times with the local gate's 1,416 s for 113 tests.
3. **E1 (me, one ~30 min machine turn, any time) and E2 (after E1).** The Coordinator schedules them.
4. **Owners of use:** each chat pushes its finished branch to `ci/<name>` and reads the marker; the release manager fast-forwards main from the green sha.
5. **Decisions for the user:** (i) adopt the branch run as the exact-commit proof; (ii) `NO_RETRY` on branch runs and/or on main; (iii) phase 2 (skip main's tests when a green marker exists); (iv) fewer idle sessions.
