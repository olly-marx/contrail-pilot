// onrails at 375 x 667 (a short phone: the user's live report, 2026-10-28). The same file as tests/onrails.cjs run with VP=375x667. The local release gate already
// runs it as the piece `onrails@VP=375x667`; CI (tools/test.sh runs every tests/*.cjs with the default environment) and the branch run
// (.github/workflows/verify-branch.yml) only see a variant that is a FILE, so this wrapper is how 375x667 gets into them. CI ONLY (tests/PATHMAP `ci-only`).
process.env.VP = '375x667';
require('./onrails.cjs');
