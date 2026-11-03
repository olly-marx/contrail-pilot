// CONTROL for the branch-CI flaky rule (ci/proof-3 only, never on main): fails the FIRST time it runs on a machine and passes the second,
// so tools/test.sh reports it as FLAKY (passed on retry, exit 0); the verify workflow must turn that into a RED shard.
const fs = require('fs'), M = '/tmp/_zz_flaky_probe_marker';
if (!fs.existsSync(M)) { fs.writeFileSync(M, '1'); console.log('first run: failing'); process.exit(1); }
fs.unlinkSync(M); console.log('PASS second run'); process.exit(0);
