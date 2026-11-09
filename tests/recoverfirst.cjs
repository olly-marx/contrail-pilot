// RECOVER FIRST (src/recoverfirst.js, src/online.js): a phone whose save says it HAD a pilot but that has none stored asks for the old pilot before it offers a new name (2026-11-09: Lola made 'Lola Comet 20'
// beside her first pilot). Plain Node, a stub Supabase and storage.
//   1. pilotLost: the save says pilotNamed and no pilot is stored -> true; a pilot is stored -> false; a fresh save, or only the 'name' tour done -> false (never had a pilot);
//   2. rememberFirst keeps a valid first name only; takeRecoverNext is true once;  3. savePilot with a session that owns no pilot row INSERTS a new player (the path that made the second Lola);
//   a saved or brought-back pilot remembers its first name for the next 'bring back my pilot'.
// Run: node tests/recoverfirst.cjs   (proved by planted defects: tools/plants.tsv)
(async () => {
  const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const log = { inserted: [], updated: [] };
  const rpc = async name => (name === 'my_player' ? { data: null, error: null } : name === 'has_pilot_code' ? { data: false, error: null } : { data: null, error: null });
  const from = () => ({ update: row => ({ eq: () => ({ select: async () => { log.updated.push(row); return { data: [], error: null }; } }) }), insert: async row => { log.inserted.push(row); return { error: null }; } });
  globalThis.window = { addEventListener() {}, supabase: { createClient: () => ({ auth: { getSession: async () => ({ data: { session: { user: { id: 'sessionB' } } } }), signInAnonymously: async () => ({ data: { session: { user: { id: 'sessionB' } } }, error: null }) }, rpc, from }) } };
  const R = await import('../src/recoverfirst.js'), O = await import('../src/online.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  // 1.
  check(R.pilotLost({ pilotNamed: true }, null) === true, 'lost: pilotNamed true and no pilot stored');
  check(R.pilotLost({ pilotNamed: true }, { first: 'Lola', word: 'Puffin', tag: 23 }) === false, 'a stored pilot is not lost');
  check(R.pilotLost({ landings: 5 }, null) === false && R.pilotLost({}, null) === false && R.pilotLost(null, null) === false, 'a fresh save never had a pilot');
  check(R.pilotLost({ tours: ['name'] }, null) === false, 'the name tour alone (it also ends offline) is not a lost pilot');
  // 2.
  O.rememberFirst('Lola'); check(O.lastFirst() === 'Lola', `a valid first name is kept: ${O.lastFirst()}`);
  O.rememberFirst('x'); O.rememberFirst('Lo la'); O.rememberFirst(undefined); O.rememberFirst('Averyverylongname'); check(O.lastFirst() === 'Lola', `an invalid name does not replace it: ${O.lastFirst()}`);
  check(O.takeRecoverNext() === false, 'nothing to take at first'); O.setRecoverNext(); check(O.takeRecoverNext() === true && O.takeRecoverNext() === false, 'the restore flag is taken once');
  // 3.
  delete mem['contrailPilot.firstName'];
  const r = await O.savePilot({ first: 'Lola', word: 'Comet', tag: 20 });
  check(r.ok && log.inserted.length === 1 && log.inserted[0].first_name === 'Lola' && log.inserted[0].word === 'Comet' && log.inserted[0].tag === 20, `a session that owns no pilot row inserts a NEW player: ${JSON.stringify(log.inserted)}`);
  check(O.lastFirst() === 'Lola', `a saved pilot remembers its first name: ${O.lastFirst()}`);
  console.log(fails.length ? `FAIL recoverfirst:\n - ${fails.join('\n - ')}` : 'PASS recoverfirst: a phone with pilotNamed and no pilot is lost (never a fresh save); the first name and the restore flag are kept; savePilot inserts a new player when no row is owned');
  process.exit(fails.length ? 1 : 0);
})();
