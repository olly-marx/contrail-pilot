// Revoke the throwaway signing certificates CI leaves behind (2026-11-23). apps.yml signs with App Store Connect API AUTOMATIC signing, and every run made a new
// 'Apple Development: Created via API' DEVELOPMENT certificate; at the account's limit (~10) the TestFlight archive failed ("Choose a certificate to revoke").
// The account is SHARED with Word Journey (com.olivermarx.wordjourney), whose CI makes the same kind of certificate, so this revokes ONLY the ones THIS run made:
//   node tools/asc-prune-certs.mjs before FILE   (before the archive) writes the ids of every such certificate that exists now
//   node tools/asc-prune-certs.mjs after FILE    (after the upload, always) revokes those that exist now and were NOT in FILE
// It never touches any other kind or name (the iOS Distribution certificate stays). Left: a Word Journey build that makes its certificate inside this run's few
// minutes would lose it (its archive then fails and a rerun makes a new one). Oliver's OK: 2026-11-23 16:12Z. Env ASC_KEY_PATH, ASC_KEY_ID, ASC_ISSUER_ID; DRY=1 lists only.
// The choice is the pure function newCerts (tests/ascprune.cjs).
import crypto from 'node:crypto';
import fs from 'node:fs';

export const PRUNE = { name: 'Apple Development: Created via API', type: 'DEVELOPMENT' };
const ours = c => { const a = c.attributes || {}; return a.certificateType === PRUNE.type && a.name === PRUNE.name; };
// certificates: [{ id, attributes: { certificateType, name } }]; before: the ids written before the archive. The CI certificates that appeared during this run.
export const newCerts = (certs, before) => certs.filter(c => ours(c) && !before.includes(c.id));
export const ciCertIds = certs => certs.filter(ours).map(c => c.id);

const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function token({ keyPath, keyId, issuer }) {
  const head = b64u(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })), now = Math.floor(Date.now() / 1000);
  const body = b64u(JSON.stringify({ iss: issuer, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }));
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: fs.readFileSync(keyPath), dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64u(sig)}`;
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  const auth = { keyPath: process.env.ASC_KEY_PATH, keyId: process.env.ASC_KEY_ID, issuer: process.env.ASC_ISSUER_ID };
  if (!['before', 'after'].includes(mode) || !file) { console.log('usage: asc-prune-certs.mjs before|after FILE'); return; }
  if (!auth.keyPath || !auth.keyId || !auth.issuer) { console.log('asc-prune-certs: no API key in the environment, nothing done'); return; }
  const api = (path, method = 'GET') => fetch(`https://api.appstoreconnect.apple.com${path}`, { method, headers: { Authorization: `Bearer ${token(auth)}` } });
  const r = await api('/v1/certificates?limit=200&fields[certificates]=certificateType,name');
  if (!r.ok) { console.log(`asc-prune-certs: list failed ${r.status}`); return; }
  const certs = (await r.json()).data || [];
  if (mode === 'before') { fs.writeFileSync(file, JSON.stringify(ciCertIds(certs))); console.log(`asc-prune-certs: ${ciCertIds(certs).length} CI certificate(s) before this run`); return; }
  if (!fs.existsSync(file)) { console.log('asc-prune-certs: no list from before the archive: nothing revoked'); return; }
  const mine = newCerts(certs, JSON.parse(fs.readFileSync(file, 'utf8')));
  for (const c of mine) {
    if (process.env.DRY) { console.log(`would revoke ${c.id}`); continue; }
    const d = await api(`/v1/certificates/${c.id}`, 'DELETE'); console.log(`revoked ${c.id}: ${d.status}`);
  }
  console.log(`asc-prune-certs: ${mine.length} certificate(s) made by this run${process.env.DRY ? ' (dry run)' : ''}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.log(`asc-prune-certs: ${e.message} (not fatal)`); });
