// Online pilot names and leaderboards (Supabase). All of it is optional: with no network, or
// Supabase down, the game plays on, and finished flights wait in a small outbox on the device.
// The key below is the PUBLISHABLE key: safe in a web page. Row-level security in
// supabase/migrations/ decides what it can do (write your own player and flights, read boards).
const SUPABASE_URL = 'https://mkucbsjzbipjaiqzrlkj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Oa3FSfnjmRu2xL_RmiKOqA_j3tEfgMd';
const PILOT_KEY = 'contrailPilot.pilot';     // { first, word, tag } once saved online
const OUTBOX_KEY = 'contrailPilot.outbox';   // flights not sent yet
const OUTBOX_MAX = 100;                      // flights kept for sending: also the most one send_flights call takes (it was 5 until 0.10.0: a long offline stretch lost flights)
const CODE_KEY = 'contrailPilot.code';       // this pilot's code (shown on PILOT; brings the pilot back on any device)
const SYNC_KEY = 'contrailPilot.synced';     // { json, stamp } of the save last uploaded / downloaded

// Must match public.name_words in the migration.
export const NAME_WORDS = ['Puffin', 'Swift', 'Falcon', 'Otter', 'Badger', 'Hedgehog', 'Kestrel', 'Beaver',
  'Owl', 'Fox', 'Robin', 'Heron', 'Bumblebee', 'Dragonfly', 'Squirrel', 'Hare',
  'Comet', 'Rocket', 'Cloud', 'Rainbow', 'Pilot', 'Navigator', 'Explorer', 'Gardener'];

export const pilotName = p => `${p.first} the ${p.word} ${p.tag}`;
export const firstNameShapeOk = s => /^[A-Za-z]{2,12}$/.test(s);
export const randomTag = () => 10 + Math.floor(Math.random() * 90);

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
export const getPilot = () => read(PILOT_KEY, null);
// Online is OFF by design (src/newplayer.js, the plane build's test mode, sets window.__CP_NO_ONLINE = true before any module runs):
// nothing is queued, sent, retried or announced, and no network is touched.
const noOnline = () => typeof window !== 'undefined' && window.__CP_NO_ONLINE === true;
export const onlineOff = noOnline;
// The name form is usable when online is on, or in ?preview=1 (savePilot keeps the name LOCAL there: the user's playtest,
// 2026-10-29, was stuck on a PILOT screen with no form while the tour said 'choose your pilot name').
export const namesOpen = () => !noOnline() || (typeof window !== 'undefined' && !!window.CP_PREVIEW);   // the PILOT and BOARDS screens say so instead of 'No internet right now' (season 2 is offline by design)

let client = null;
function db() {
  if (!client && window.supabase) client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storageKey: 'contrailPilot.auth' } });
  return client;
}
// One anonymous account per device: no email, no password.
async function session() {
  const c = db();
  if (!c) throw new Error('no supabase');
  const { data } = await c.auth.getSession();
  if (data.session) return data.session;
  const r = await c.auth.signInAnonymously();
  if (r.error) throw r.error;
  return r.data.session;
}

// Save (or change) this device's pilot name. Needs the internet: the word filter lives in the
// database. Returns { ok: true } or { ok: false, why: 'rude' | 'offline' }.
export async function savePilot(p) {
  if (typeof window !== 'undefined' && window.CP_PREVIEW) { write(PILOT_KEY, { first: p.first, word: p.word, tag: p.tag }); return { ok: true }; }   // ?preview=1: local only, nothing sent
  if (noOnline()) return { ok: false, why: 'offline' };
  try {
    const s = await session(), c = db();
    const row = { first_name: p.first, word: p.word, tag: p.tag };
    // A device that joined another pilot ("I already have a pilot") renames THAT pilot.
    const mine = (await c.rpc('my_player')).data || s.user.id;
    let { data, error } = await c.from('players').update(row).eq('id', mine).select('id');
    if (!error && !(data && data.length)) ({ error } = await c.from('players').insert(row));
    if (error) return { ok: false, why: /first_name|check constraint/.test(error.message) ? 'rude' : 'offline' };
    write(PILOT_KEY, { first: p.first, word: p.word, tag: p.tag });
    flush();
    ensureCode();
    return { ok: true };
  } catch (e) {
    return { ok: false, why: 'offline' };
  }
}

// A finished flight. It always goes in the outbox (even before this device has a pilot name: it is sent
// once there is one) and is sent now, or when the connection is back. Offline play keeps up to OUTBOX_MAX.
export function sendFlight(f) {
  if (noOnline()) return;
  const box = read(OUTBOX_KEY, []);
  box.push(f);
  write(OUTBOX_KEY, box.slice(-OUTBOX_MAX));
  flush();
  if (saveRef && getPilot()) setTimeout(() => syncUp(saveRef), 4000);   // the online save, soon after each flight
}
let saveRef = null;
export const watchSave = save => { saveRef = save; };   // main.js: the save to keep online

// Anyone can listen to the catching-up after a lost connection (src/uploadbanner.js does):
// { type: 'start', flights, save } | { type: 'done', flights } | { type: 'stalled' }.
const listeners = [];
export const onUpload = fn => { listeners.push(fn); };
const say = ev => listeners.forEach(fn => { try { fn(ev); } catch (e) { /* a listener must never stop the upload */ } });

// What a failed send means. A bad flight (data / constraint error, Postgres classes 22 and 23) will never
// be accepted: drop it. Everything else (no network, server down, a rate or daily limit) is worth trying again.
const permanent = e => /^(22|23)/.test(String((e && e.code) || ''));
const noBatch = e => e && (e.code === 'PGRST202' || e.code === '42883' || /send_flights/.test(String(e.message || '')) && /find|exist/.test(String(e.message || '')));
const rateLimited = e => e && /too many flights/.test(String(e.message || ''));

let flushing = false, retryTimer = null, recovering = false;
// Send the outbox: whole batches through send_flights (one call, however many flights); if the database
// has no such function yet, one by one (5 a minute). Returns { sent, stalled }.
export async function flush() {
  if (noOnline()) return { sent: 0, stalled: false };
  if (flushing || !getPilot() || !outboxSize()) return { sent: 0, stalled: false };
  flushing = true;
  let sent = 0, stalled = false, wait = 15000;
  const drop = n => write(OUTBOX_KEY, read(OUTBOX_KEY, []).slice(n));   // new flights are added at the END while we wait
  try {
    await session();
    for (let box = read(OUTBOX_KEY, []), single = false; box.length; box = read(OUTBOX_KEY, [])) {
      if (!single) {
        const batch = box.slice(0, OUTBOX_MAX);
        const { error } = await db().rpc('send_flights', { batch });
        if (!error) { drop(batch.length); sent += batch.length; continue; }
        if (!(noBatch(error) || permanent(error))) { stalled = true; if (rateLimited(error)) wait = 10 * 60 * 1000; break; }
        single = true;   // an old database, or one bad flight in the batch: find out flight by flight
      }
      const { error } = await db().from('flights').insert(box[0]);
      if (!error) { drop(1); sent++; continue; }
      if (permanent(error)) { drop(1); continue; }   // never acceptable: stop it blocking the rest
      stalled = true; if (rateLimited(error)) wait = 65000;   // 5 a minute: the next minute
      break;
    }
  } catch (e) { stalled = true; }   // offline: the outbox waits
  flushing = false;
  if (stalled) {
    recovering = true;
    if (!retryTimer && typeof navigator !== 'undefined' && navigator.onLine !== false) retryTimer = setTimeout(() => { retryTimer = null; catchUp(); }, wait);
  } else recovering = false;
  return { sent, stalled };
}
export const outboxSize = () => read(OUTBOX_KEY, []).length;

// The connection came back (or a retry fired): send everything that waited, the flights and then the save, and tell
// listeners, but only when this really is catching up (something failed or went offline before), not after every flight.
export async function catchUp(atStartup = false) {
  const flights = getPilot() ? outboxSize() : 0;
  const save = !!(saveRef && getPilot() && read(SYNC_KEY, {}).json !== JSON.stringify(saveRef));
  const show = recovering ? (flights > 0 || save) : atStartup && flights > 0;   // opening the game with flights left from offline play counts too
  if (show) say({ type: 'start', flights, save });
  const r = await flush();
  let kept = true;
  if (!r.stalled && save && saveRef) kept = (await syncUp(saveRef)) || read(SYNC_KEY, {}).json === JSON.stringify(saveRef);
  if (show) say(r.stalled || !kept ? { type: 'stalled' } : { type: 'done', flights: r.sent });
  return r;
}

// Top 50 for one board: board = ultimate | longest | total | nature | cooler | cleaner | missions,
// period = today | week | month | all. Returns null when it can't be reached.
export async function leaderboard(board, period) {
  if (noOnline()) return null;
  try {
    const c = db();   // no sign-in needed to look; a signed-in pilot also gets is_me on their own row
    if (!c) return null;
    const { data, error } = await c.rpc('leaderboard', { board, period });
    return error ? null : data;
  } catch (e) { return null; }
}

// TEMPORARY personal restore links (2026-10-22, migration 20261022120000_restore_links.sql):
// ?restore=<code> previews whose pilot it is, then claims it for this device (its flights and name
// move here). Return { ok, pilot | flights, why: 'used' | 'offline' }.
export async function restorePreview(code) {
  if (noOnline()) return { ok: false, why: 'offline' };
  try {
    await session();
    const { data, error } = await db().rpc('restore_preview', { code });
    if (error) return { ok: false, why: 'offline' };
    return data && data.length ? { ok: true, pilot: data[0] } : { ok: false, why: 'used' };
  } catch (e) { return { ok: false, why: 'offline' }; }
}
export async function restoreClaim(code, name) {
  if (noOnline()) return { ok: false, why: 'offline' };
  try {
    await session();
    const { data, error } = await db().rpc('restore_claim', { code });
    if (error) return { ok: false, why: /used/.test(error.message) ? 'used' : 'offline' };
    write(PILOT_KEY, name);   // this device is now that pilot
    return { ok: true, flights: data };
  } catch (e) { return { ok: false, why: 'offline' }; }
}

// ---------- online save and pilot codes (2026-10-22; migration 20261022150000_online_save.sql) ----------
// A named pilot's save is kept online: uploaded whenever it changed (every 30 s, and soon after a
// flight); on opening the game the newer copy wins (this device's unsent changes count as newer).
// The pilot code (4 words + a number) brings the pilot and its save to any other device.
export const getCode = () => read(CODE_KEY, null);
export const makeCode = () => [0, 1, 2, 3].map(() => NAME_WORDS[Math.floor(Math.random() * NAME_WORDS.length)]).join(' ') + ' ' + randomTag();
export async function ensureCode(fresh = false) {
  if (noOnline()) return getCode();
  if (!getPilot() || (getCode() && !fresh)) return getCode();
  try {
    await session();
    if (!fresh && (await db().rpc('has_pilot_code')).data === true && getCode()) return getCode();
    const code = makeCode(), { error } = await db().rpc('set_pilot_code', { code });
    if (error) return getCode();
    write(CODE_KEY, code);
    return code;
  } catch (e) { return getCode(); }
}

// Upload the save if it changed since the last upload. Returns true if the server kept it.
export async function syncUp(save) {
  if (noOnline()) return false;
  if (!getPilot()) return false;
  const json = JSON.stringify(save), last = read(SYNC_KEY, {});
  if (last.json === json) return false;
  try {
    await session();
    const stamp = Math.max(Date.now(), (last.stamp || 0) + 1);
    const { data, error } = await db().rpc('put_save', { save, stamp });
    if (error) return false;
    write(SYNC_KEY, { json, stamp });
    return data === true;
  } catch (e) { return false; }
}

const progress = s => (s.landings || 0) + (s.mission || 0) * 3 + (s.flights || 0) / 10 + Object.values(s.levels || {}).reduce((a, n) => a + n, 0) * 2;

// On opening the game: the online save, if it is newer than this device's and this device has no
// unsent changes; else this device's changes go up. Returns the save to use instead, or null.
export async function syncDown(save) {
  if (noOnline()) return null;
  if (!getPilot()) return null;
  const last = read(SYNC_KEY, {}), unsent = last.json !== JSON.stringify(save);
  try {
    await session();
    const { data, error } = await db().rpc('get_save');
    if (error) return null;
    const row = data && data[0];
    // A device that never synced keeps whichever save has more progress (first contact never loses any).
    const firstContact = !last.json && row;
    if (firstContact ? progress(row.save) > progress(save) : row && row.stamp > (last.stamp || 0) && !unsent) {
      write(SYNC_KEY, { json: JSON.stringify(row.save), stamp: row.stamp });
      return row.save;
    }
    if (unsent) syncUp(save);
    return null;
  } catch (e) { return null; }
}

// "I already have a pilot": join this device to it. { ok, save | why: 'no such pilot' | 'too many tries' | 'wrong code' | 'offline' }
export async function pilotLogin(p, code) {
  if (noOnline()) return { ok: false, why: 'offline' };
  try {
    await session();
    const { data, error } = await db().rpc('pilot_login', { first: p.first, word: p.word, tag: p.tag, code: code.trim() });
    if (error || !data || !data[0]) return { ok: false, why: 'offline' };
    const r = data[0];
    if (!r.ok) return { ok: false, why: r.why };
    write(PILOT_KEY, { first: p.first, word: p.word, tag: p.tag });
    write(CODE_KEY, code.trim());
    write(SYNC_KEY, r.save ? { json: JSON.stringify(r.save), stamp: r.stamp } : {});
    return { ok: true, save: r.save || null };
  } catch (e) { return { ok: false, why: 'offline' }; }
}

if (typeof window !== 'undefined' && !noOnline()) {
  window.addEventListener('offline', () => { recovering = true; });
  window.addEventListener('online', () => { recovering = true; catchUp(); });
}
