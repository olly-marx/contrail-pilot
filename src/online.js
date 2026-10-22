// Online pilot names and leaderboards (Supabase). All of it is optional: with no network, or
// Supabase down, the game plays on, and finished flights wait in a small outbox on the device.
// The key below is the PUBLISHABLE key: safe in a web page. Row-level security in
// supabase/migrations/ decides what it can do (write your own player and flights, read boards).
const SUPABASE_URL = 'https://mkucbsjzbipjaiqzrlkj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Oa3FSfnjmRu2xL_RmiKOqA_j3tEfgMd';
const PILOT_KEY = 'contrailPilot.pilot';     // { first, word, tag } once saved online
const OUTBOX_KEY = 'contrailPilot.outbox';   // flights not sent yet
const OUTBOX_MAX = 5;                        // the database takes at most 5 flights a minute

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
  try {
    const s = await session(), c = db();
    const row = { first_name: p.first, word: p.word, tag: p.tag };
    let { data, error } = await c.from('players').update(row).eq('id', s.user.id).select('id');
    if (!error && !(data && data.length)) ({ error } = await c.from('players').insert(row));
    if (error) return { ok: false, why: /first_name|check constraint/.test(error.message) ? 'rude' : 'offline' };
    write(PILOT_KEY, { first: p.first, word: p.word, tag: p.tag });
    flush();
    return { ok: true };
  } catch (e) {
    return { ok: false, why: 'offline' };
  }
}

// A finished flight. Only sent once the device has a pilot name; flights before that stay local.
export function sendFlight(f) {
  if (!getPilot()) return;
  const box = read(OUTBOX_KEY, []);
  box.push(f);
  write(OUTBOX_KEY, box.slice(-OUTBOX_MAX));
  flush();
}

let flushing = false;
export async function flush() {
  if (flushing || !getPilot()) return;
  flushing = true;
  try {
    await session();
    for (let box = read(OUTBOX_KEY, []); box.length; box = read(OUTBOX_KEY, [])) {
      const { error } = await db().from('flights').insert(box[0]);
      if (error) break;   // offline or too fast: try again later
      write(OUTBOX_KEY, read(OUTBOX_KEY, []).slice(1));
    }
  } catch (e) { /* offline: the outbox waits */ }
  flushing = false;
}
export const outboxSize = () => read(OUTBOX_KEY, []).length;

// Top 50 for one board: board = ultimate | longest | total | nature | cooler | cleaner | missions,
// period = today | week | month | all. Returns null when it can't be reached.
export async function leaderboard(board, period) {
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
  try {
    await session();
    const { data, error } = await db().rpc('restore_preview', { code });
    if (error) return { ok: false, why: 'offline' };
    return data && data.length ? { ok: true, pilot: data[0] } : { ok: false, why: 'used' };
  } catch (e) { return { ok: false, why: 'offline' }; }
}
export async function restoreClaim(code, name) {
  try {
    await session();
    const { data, error } = await db().rpc('restore_claim', { code });
    if (error) return { ok: false, why: /used/.test(error.message) ? 'used' : 'offline' };
    write(PILOT_KEY, name);   // this device is now that pilot
    return { ok: true, flights: data };
  } catch (e) { return { ok: false, why: 'offline' }; }
}

if (typeof window !== 'undefined') window.addEventListener('online', () => flush());
