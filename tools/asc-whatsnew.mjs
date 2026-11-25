// TESTFLIGHT 'WHAT TO TEST' (0.79.0; Oliver, 2026-11-24: 'fit in all those random details ... so that when we start beta testing, it looks pretty legit'): after the upload,
// write the build's What to Test (en-GB) from the top entry of CHANGES.json, so each TestFlight build tells testers what is new. It waits for App Store Connect to list the
// build (up to WAIT_S), then creates or updates the betaBuildLocalization. Never fails the job (a missing note is not worth a failed build): it logs and exits 0.
//   node tools/asc-whatsnew.mjs <buildNumber>      env ASC_KEY_PATH, ASC_KEY_ID, ASC_ISSUER_ID; APP_ID (default the Contrail Pilot app); DRY=1 prints the text only
// The text is the pure function whatsNew (tests/ascwhatsnew.cjs).
import crypto from 'node:crypto';
import fs from 'node:fs';

export const APP = '6837214051', LOCALE = 'en-GB', WAIT_S = 900, MAX_CHARS = 4000;
// The top CHANGES.json entry as What to Test: a line naming the version, each note as a bullet, and the feedback ask.
export function whatsNew(changes) {
  const top = (changes || [])[0]; if (!top) return '';
  const text = [`Version ${top.version}: what is new`, ...(top.notes || []).map(n => `- ${n}`), '', 'Something wrong or confusing? Take a screenshot and send it with TestFlight feedback.'].join('\n');
  return text.length <= MAX_CHARS ? text : `${text.slice(0, MAX_CHARS - 1)}…`;
}

const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function token({ keyPath, keyId, issuer }) {
  const head = b64u(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })), now = Math.floor(Date.now() / 1000);
  const body = b64u(JSON.stringify({ iss: issuer, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }));
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: fs.readFileSync(keyPath), dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64u(sig)}`;
}

async function main() {
  const build = process.argv[2], text = whatsNew(JSON.parse(fs.readFileSync('CHANGES.json', 'utf8')));
  if (process.env.DRY) { console.log(text); return; }
  const auth = { keyPath: process.env.ASC_KEY_PATH, keyId: process.env.ASC_KEY_ID, issuer: process.env.ASC_ISSUER_ID }, app = process.env.APP_ID || APP;
  if (!build || !auth.keyPath || !auth.keyId || !auth.issuer || !text) { console.log('asc-whatsnew: no build number, API key or text: nothing done'); return; }
  const api = (path, method = 'GET', body = null) => fetch(`https://api.appstoreconnect.apple.com${path}`, { method, headers: { Authorization: `Bearer ${token(auth)}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  let id = null;
  for (let t = 0; t < WAIT_S && !id; t += 30) {
    const r = await api(`/v1/builds?filter[app]=${app}&filter[version]=${encodeURIComponent(build)}&limit=1`);
    if (r.ok) id = ((await r.json()).data || [])[0]?.id || null;
    if (!id) await new Promise(res => setTimeout(res, 30000));
  }
  if (!id) { console.log(`asc-whatsnew: build ${build} not listed after ${WAIT_S} s: no What to Test written`); return; }
  const have = await api(`/v1/builds/${id}/betaBuildLocalizations`), loc = have.ok ? ((await have.json()).data || []).find(l => l.attributes.locale === LOCALE) : null;
  const r = loc ? await api(`/v1/betaBuildLocalizations/${loc.id}`, 'PATCH', { data: { type: 'betaBuildLocalizations', id: loc.id, attributes: { whatsNew: text } } })
    : await api('/v1/betaBuildLocalizations', 'POST', { data: { type: 'betaBuildLocalizations', attributes: { locale: LOCALE, whatsNew: text }, relationships: { build: { data: { type: 'builds', id } } } } });
  console.log(`asc-whatsnew: build ${build} (${id}) What to Test ${loc ? 'updated' : 'written'}: ${r.status}`);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => console.log(`asc-whatsnew: ${e.message} (not failing the job)`));
