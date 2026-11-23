// tools/asc-prune-certs.mjs newCerts: only the CI 'Apple Development: Created via API' DEVELOPMENT certificates that appeared DURING this run (not in the list taken
// before the archive): Word Journey's (same Apple account, made before) and the iOS Distribution certificate are never chosen. Plain Node.
// Plants (tools/plants.tsv): the before-list ignored; the name ignored. Run: node tests/ascprune.cjs
(async () => {
  const { newCerts, ciCertIds } = await import('../tools/asc-prune-certs.mjs');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const cert = (id, type, name) => ({ id, attributes: { certificateType: type, name } });
  const before = [cert('wj', 'DEVELOPMENT', 'Apple Development: Created via API'), cert('dist', 'IOS_DISTRIBUTION', 'iOS Distribution: Oliver Marx'), cert('mine', 'DEVELOPMENT', 'Apple Development: Oliver Marx')];
  const after = [...before, cert('ours', 'DEVELOPMENT', 'Apple Development: Created via API'), cert('newdist', 'IOS_DISTRIBUTION', 'iOS Distribution: Oliver Marx')];
  const ids = ciCertIds(before);
  check(JSON.stringify(ids) === '["wj"]', `the list before the archive holds the CI certificates there already: ${JSON.stringify(ids)}`);
  const got = newCerts(after, ids).map(c => c.id);
  check(JSON.stringify(got) === '["ours"]', `only the CI certificate this run made is chosen (not Word Journey's, not a distribution one): ${JSON.stringify(got)}`);
  if (fails.length) { console.log(`FAIL ascprune:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log('PASS ascprune: only the CI development certificate made during this run is revoked');
})();
