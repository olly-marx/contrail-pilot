// Revoke the throwaway signing certificates CI leaves behind (2026-11-23). apps.yml signs with App Store Connect API AUTOMATIC signing, and every run made a new
// 'Apple Development: Created via API' DEVELOPMENT certificate; at the account's limit (~10) the TestFlight archive failed ("Choose a certificate to revoke").
// This runs BEFORE the archive and revokes those certificates once they are older than MIN_AGE_H hours (a running build of another app on the same team keeps its
// fresh one). It never touches any other kind or name (the iOS Distribution certificate stays). Oliver's OK: 2026-11-23 16:12Z.
//   node tools/asc-prune-certs.mjs            (env ASC_KEY_PATH, ASC_KEY_ID, ASC_ISSUER_ID; DRY=1 lists only)
// The choice is the pure function staleCerts (tests/ascprune.cjs).
import crypto from 'node:crypto';
import fs from 'node:fs';

export const PRUNE = { name: 'Apple Development: Created via API', type: 'DEVELOPMENT', minAgeH: 2 };
// certificates: [{ id, attributes: { certificateType, name, expirationDate } }]. A certificate lives one year, so it was made a year before it expires.
export function staleCerts(certs, now = Date.now(), minAgeH = PRUNE.minAgeH) {
  return certs.filter(c => { const a = c.attributes || {}; if (a.certificateType !== PRUNE.type || a.name !== PRUNE.name) return false;
    const made = new Date(a.expirationDate).getTime() - 365 * 864e5; return Number.isFinite(made) && now - made >= minAgeH * 36e5; });
}

const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function token({ keyPath, keyId, issuer }) {
  const head = b64u(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })), now = Math.floor(Date.now() / 1000);
  const body = b64u(JSON.stringify({ iss: issuer, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }));
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: fs.readFileSync(keyPath), dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64u(sig)}`;
}

async function main() {
  const auth = { keyPath: process.env.ASC_KEY_PATH, keyId: process.env.ASC_KEY_ID, issuer: process.env.ASC_ISSUER_ID };
  if (!auth.keyPath || !auth.keyId || !auth.issuer) { console.log('asc-prune-certs: no API key in the environment, nothing done'); return; }
  const api = (path, method = 'GET') => fetch(`https://api.appstoreconnect.apple.com${path}`, { method, headers: { Authorization: `Bearer ${token(auth)}` } });
  const r = await api('/v1/certificates?limit=200&fields[certificates]=certificateType,name,expirationDate');
  if (!r.ok) { console.log(`asc-prune-certs: list failed ${r.status} (the archive will say if signing fails)`); return; }
  const stale = staleCerts((await r.json()).data || []);
  for (const c of stale) {
    if (process.env.DRY) { console.log(`would revoke ${c.id}`); continue; }
    const d = await api(`/v1/certificates/${c.id}`, 'DELETE'); console.log(`revoked ${c.id}: ${d.status}`);
  }
  console.log(`asc-prune-certs: ${stale.length} stale CI certificate(s)${process.env.DRY ? ' (dry run)' : ''}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.log(`asc-prune-certs: ${e.message} (not fatal)`); });
