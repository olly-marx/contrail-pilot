// tools/asc-prune-certs.mjs staleCerts: only CI's own 'Apple Development: Created via API' DEVELOPMENT certificates, and only once older than 2 hours; the iOS
// Distribution certificate and any other name or kind are never chosen. Plain Node. Plants (tools/plants.tsv): the name ignored; the age ignored. Run: node tests/ascprune.cjs
(async () => {
  const { staleCerts } = await import('../tools/asc-prune-certs.mjs');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const now = Date.parse('2026-11-23T16:00:00Z'), made = h => new Date(now - h * 36e5 + 365 * 864e5).toISOString();
  const cert = (id, type, name, h) => ({ id, attributes: { certificateType: type, name, expirationDate: made(h) } });
  const list = [cert('old', 'DEVELOPMENT', 'Apple Development: Created via API', 30), cert('fresh', 'DEVELOPMENT', 'Apple Development: Created via API', 0.5),
    cert('dist', 'IOS_DISTRIBUTION', 'iOS Distribution: Oliver Marx', 500), cert('mine', 'DEVELOPMENT', 'Apple Development: Oliver Marx', 500)];
  const got = staleCerts(list, now).map(c => c.id);
  check(JSON.stringify(got) === '["old"]', `only the old CI development certificate is chosen: ${JSON.stringify(got)}`);
  if (fails.length) { console.log(`FAIL ascprune:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log('PASS ascprune: only stale CI development certificates are revoked');
})();
