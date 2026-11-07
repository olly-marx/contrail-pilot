# CI shard times (2026-11-07): why the test job's timeout is 40 minutes, and what to do about it later

The 4 test shards of `deploy.yml` (main) and `verify-branch.yml` (ci/** branches) each ran under `timeout-minutes: 25`. A shard that hits the limit is CANCELLED: on main that
skips the deploy (the live site stays on the old version, as run 40621005262 once did at the old 12-minute limit); on a branch there is no marker. Both are now 40.

Measured wall clock of whole runs and of the slowest shard (public Actions API):

| run | what | whole run | note |
|---|---|---|---|
| 0.31.0 main, 3da7d2b | deploy | 24 min 34 s | |
| 0.31.1 main, cdfa72a | deploy | 20 min 37 s | |
| 0.32.0 main, b4fe3fa | deploy | 24 min 04 s | the art release (48 new files) |
| ci/gap-fix ae602b5 | branch run | 24 min 51 s | the slowest shard took nearly all of it |
| ci/gap-fix 0c78230 (run 42365547715) | branch run | 25 min 20 s | shards 1/3/4: 15.4 / 15.5 / 18.8 min; shard 2 CANCELLED at exactly 25 min |
| ci/x13-crossing cdfa72a | branch run | 23 min 27 s | |

So three shards finish in 15-19 minutes and one runs 24+ : the shards are unbalanced (tools/test.sh splits by position, not by duration). The suite is 126 browser tests and still growing.

Proposed later (NOT done here): a duration-balanced split (record each test's time in a CI artifact, then split greedily), or a 5th shard. A change to the shard split edits tools/test.sh and so
runs the ALL tier locally; it deserves its own release and gate.
