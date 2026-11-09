// THE PILOT CODE AND THE OUTBOX (src/online.js ensureCode / sendFlight), against a stub Supabase in plain Node. Lola's code 'Cloud Navigator Bumblebee Hare 46' appeared long after her first flights, and her
// pilot has no save or flights online (2026-11-09). What the code says: a code is written on the device ONLY after set_pilot_code succeeded; a failing call leaves no code and the next startup tries again;
// the code is four NAME_WORDS and a number 10-99, sent as one string; the server stores sha256(lower(code)). The outbox keeps the last 100 flights.
//   1. positive control: a named pilot with no code + a working server gets a code (shape, the same string sent, the hash the server stores);  2. no pilot: no call;  3. set_pilot_code fails ('no pilot yet'):
//   no code on the device, then the next call after the server works creates it;  4. an existing code is kept (no second call);  5. 150 flights sent while the server fails: the outbox holds 100, the newest.
// Run: node tests/pilotcodeensure.cjs   (proved by a planted defect: tools/plants.tsv)
const crypto = require('crypto');
(async () => {
  const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const srv = { setCode: 'ok', calls: [], hash: null, sendFlights: 'fail' };
  const rpc = async (name, args) => {
    srv.calls.push(name);
    if (name === 'has_pilot_code') return { data: false, error: null };
    if (name === 'set_pilot_code') { if (srv.setCode !== 'ok') return { data: null, error: { message: 'no pilot yet' } }; srv.sent = args.code; srv.hash = crypto.createHash('sha256').update(args.code.toLowerCase(), 'utf8').digest('hex'); return { data: null, error: null }; }
    if (name === 'send_flights') return { data: null, error: { message: 'network down', code: '08006' } };
    return { data: null, error: null };
  };
  globalThis.window = { addEventListener() {}, supabase: { createClient: () => ({ auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }), signInAnonymously: async () => ({ data: { session: { user: { id: 'u1' } } }, error: null }) }, rpc }) } };
  const O = await import('../src/online.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const shapeOk = c => { const w = String(c).split(' '); return w.length === 5 && w.slice(0, 4).every(x => O.NAME_WORDS.includes(x)) && /^\d\d$/.test(w[4]) && +w[4] >= 10 && +w[4] <= 99; };
  const KEY = 'contrailPilot.code';
  // 2. no pilot: nothing is called
  await O.ensureCode(); check(!srv.calls.length && !mem[KEY], `no pilot: no server call and no code (calls ${JSON.stringify(srv.calls)}, code ${mem[KEY]})`);
  // 1. the control
  mem['contrailPilot.pilot'] = JSON.stringify({ first: 'Lola', word: 'Puffin', tag: 23 });
  const code = await O.ensureCode();
  check(shapeOk(code), `control: the code is four NAME_WORDS and a number 10-99: ${code}`);
  check(srv.sent === code && JSON.parse(mem[KEY]) === code, `control: the server got the same string the device keeps (sent ${srv.sent}, kept ${mem[KEY]})`);
  check(srv.hash === crypto.createHash('sha256').update(String(code).toLowerCase()).digest('hex'), 'control: the server stores sha256 of the lowercased code');
  // 4. an existing code is kept
  const n = srv.calls.length; const again = await O.ensureCode(); check(again === code && srv.calls.length === n, `an existing code is kept with no new call (${again}, ${srv.calls.length - n} calls)`);
  // 3. set_pilot_code fails
  delete mem[KEY]; srv.setCode = 'fail'; srv.sent = null;
  const failed = await O.ensureCode();
  check(!failed && mem[KEY] === undefined, `set_pilot_code fails: no code on the device (returned ${failed}, kept ${mem[KEY]})`);
  srv.setCode = 'ok'; const later = await O.ensureCode();
  check(shapeOk(later) && JSON.parse(mem[KEY]) === later && srv.sent === later, `the next try after the server works creates and keeps the code: ${later}`);
  // 5. the outbox cap
  delete mem['contrailPilot.outbox']; for (let i = 1; i <= 150; i++) O.sendFlight({ i });
  const box = JSON.parse(mem['contrailPilot.outbox'] || '[]');
  check(box.length === 100 && box[0].i === 51 && box[99].i === 150, `150 flights with the server failing: the outbox keeps the newest 100 (length ${box.length}, first ${box[0] && box[0].i}, last ${box[box.length - 1] && box[box.length - 1].i})`);
  console.log(fails.length ? `FAIL pilotcodeensure:\n - ${fails.join('\n - ')}` : 'PASS pilotcodeensure: a code exists only after set_pilot_code worked (control first); the outbox keeps the newest 100');
  process.exit(fails.length ? 1 : 0);
})();
