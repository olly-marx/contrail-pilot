// RESTORING AN OLDER BACKUP FOR A NAMED PILOT whose online copy is richer (research/BACKUP-MY-GAME.md; the Coordinator's rule: the older save must NOT upload over the richer online copy,
// before the reload or after it). No browser: the same FAKE Supabase client as tests/syncdown.cjs, the game's own save.js / online.js / backup.js.
//   1. restoreFromBackup (an older backup, 40 flights) over the current game (150 flights) with an online copy of 260 flights: ok, the current game is kept first;
//   2. the page's leaving (visibilitychange -> syncUp) with the in-memory save, and the first syncUp after the reload with the RESTORED save: neither writes the server (no put_save);
//   3. the next load's syncDown takes the richer online copy and keeps the restored backup first as a safety copy: exactly what the card's warning promises ("going back will be undone the next time the game loads").
// Plants: tools/plants.tsv, test `restoresync` (the guard that stops a poorer upload removed: it uploads; the keep-first removed).
(async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
  let row = null, log = [];
  const client = { auth: { getSession: async () => ({ data: { session: {} } }), signInAnonymously: async () => ({ data: { session: {} }, error: null }) },
    rpc: async (name, args) => { log.push(name); if (name === 'get_save') return { data: row ? [row] : [], error: null }; if (name === 'put_save') { row = { save: args.save, stamp: args.stamp }; return { data: true, error: null }; } return { data: null, error: null }; } };
  globalThis.window = { supabase: { createClient: () => client }, addEventListener() {} };
  const O = await import('../src/online.js'), S = await import('../src/save.js'), B = await import('../src/backup.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const rich = (f, l) => ({ flights: f, landings: l, seeds: 50, missionsDone: ['L1', 'L2'], levels: { trees: 1 }, tutorialDone: true });
  const KEY = 'contrailPilot.v2', SYNC = 'contrailPilot.synced';
  const current = rich(150, 100), online = rich(260, 188), older = S.prepareSave(rich(40, 30));
  mem.clear(); row = { save: online, stamp: 500 }; log = [];
  mem.set('contrailPilot.pilot', JSON.stringify({ first: 'Olly', word: 'Gardener', tag: 11 }));
  mem.set(KEY, JSON.stringify(current)); mem.set(SYNC, JSON.stringify({ json: JSON.stringify(online), stamp: 500, serverProgress: S.progressOf(online) }));   // this device last synced with the richer online copy
  const rb = B.readBackup(B.backupText(B.makeBackup(older, { pilot: 'Olly' })));
  check(rb.ok, 'the older backup reads');
  // 1. the restore
  check(S.restoreFromBackup(rb.save) === 'ok', 'restoring the older backup over the current game says ok');
  check(S.listStashed().map(e => e.flights).join() === '150', `the current game (150 flights) is kept first: ${S.listStashed().map(e => e.flights)}`);
  check(JSON.parse(mem.get(KEY)).flights === 40, 'the backup (40 flights) is the local save now');
  // 2. leaving the page (visibilitychange -> syncUp with the save held in memory: the CURRENT one) and the first syncUp after the reload (the RESTORED one)
  log = []; await O.syncUp(current); const leaving = log.slice();
  check(!leaving.includes('put_save') && row.save.flights === 260, `leaving the page does not overwrite the richer online copy: ${JSON.stringify(leaving)}, online ${row.save.flights} flights`);
  log = []; await O.syncUp(rb.save);
  check(!log.includes('put_save') && row.save.flights === 260, `the restored OLDER save does not upload over the richer online copy: ${JSON.stringify(log)}, online ${row.save.flights} flights`);
  // 3. the next load: the richer online copy wins and the restored backup is kept first
  log = []; const got = await O.syncDown(rb.save);
  check(got && got.flights === 260, 'the next load takes the richer online copy (the card warned about this)');
  check(S.listStashed().map(e => e.flights).includes(40), `... and the restored backup is kept as a safety copy first: ${S.listStashed().map(e => e.flights)}`);
  console.log(fails.length ? `FAIL restoresync:\n - ${fails.join('\n - ')}` : 'PASS restoresync: an older backup restored for a named pilot never uploads over the richer online copy; the next load takes the online copy and keeps the backup first');
  process.exit(fails.length ? 1 : 0);
})();
