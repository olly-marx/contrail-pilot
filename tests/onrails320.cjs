// onrails at 320 x 568 (UX plan decision 9: 320x568 is a gated size for the rails, the one place a child cannot scroll out of trouble).
// The same file as tests/onrails.cjs, run at the smallest gated phone. CI ONLY (tests/PATHMAP `ci-only`): the local release gate already
// runs onrails at 390x844 and 375x667 (about 150 s each); CI runs every tests/*.cjs, so this file is how 320x568 gets into CI.
process.env.VP = '320x568';
require('./onrails.cjs');
