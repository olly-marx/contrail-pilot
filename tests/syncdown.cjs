// Save safety, the online half (src/online.js syncDown / syncUp; the user lost a 260-flight save, 2026-11-05). No browser: a FAKE Supabase client.
// Rules: the save with MORE progress wins, always. The online copy never replaces a richer local save (even with a later stamp); a richer online copy
// replaces a poorer local one, but the local one is kept first (stashSave); equal progress: the online copy wins only if newer and nothing is unsent;
// syncUp never writes a poorer save over a richer online one (allowRoughUpload is the reset's exception).
// Run: node tests/syncdown.cjs   (proved by planted defects: tools/plants.tsv, test syncdown)
(async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
  let row = null, log = [];
  const client = {
    auth: { getSession: async () => ({ data: { session: {} } }), signInAnonymously: async () => ({ data: { session: {} }, error: null }) },
    rpc: async (name, args) => {
      log.push(name);
      if (name === 'get_save') return { data: row ? [row] : [], error: null };
      if (name === 'put_save') { row = { save: args.save, stamp: args.stamp }; return { data: true, error: null }; }
      return { data: null, error: null };
    },
  };
  globalThis.window = { supabase: { createClient: () => client }, addEventListener() {} };
  const O = await import('../src/online.js'), S = await import('../src/save.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const rich = (f, l) => ({ flights: f, landings: l, seeds: 1, missionsDone: ['L1', 'L2'], levels: { trees: 1 }, tutorialDone: true });
  const KEY = 'contrailPilot.v2', SYNC = 'contrailPilot.synced';
  // local: the save on this device (also its main copy); sync: what the last sync recorded ({ save, stamp }); server: the online row
  const setup = ({ local, sync = null, server = null }) => {
    mem.clear(); log = []; row = server;
    mem.set('contrailPilot.pilot', JSON.stringify({ first: 'Olly', word: 'Gardener', tag: 11 }));
    mem.set(KEY, JSON.stringify(local));
    if (sync) mem.set(SYNC, JSON.stringify({ json: JSON.stringify(sync.save), stamp: sync.stamp, serverProgress: S.progressOf(sync.save) }));
  };
  const stashed = () => S.listStashed().map(e => e.flights);

  // 1. first contact, the online copy is richer: taken, this device's own save kept
  setup({ local: rich(50, 30), server: { save: rich(260, 188), stamp: 100 } });
  let got = await O.syncDown(rich(50, 30));
  check(got && got.flights === 260, 'first contact, online richer: the online save is used');
  check(stashed().join() === '50', `... and this device's own save is kept first (${stashed()})`);
  // 2. first contact, this device is richer: it goes up, nothing is replaced
  setup({ local: rich(260, 188), server: { save: rich(50, 30), stamp: 100 } });
  got = await O.syncDown(rich(260, 188));
  check(got === null && row.save.flights === 260, 'first contact, this device richer: it is uploaded, not replaced');
  // 3. THE BUG: after the first sync a LATER-stamped POORER online copy must not win
  const mine = rich(260, 188);
  setup({ local: mine, sync: { save: mine, stamp: 100 }, server: { save: rich(40, 30), stamp: 200 } });
  got = await O.syncDown(mine);
  check(got === null, 'a later-stamped POORER online copy does not replace the richer local save');
  check(row.save.flights === 260 && log.includes('put_save'), 'the richer local save is put right online');
  // 4. the online copy is richer and this device has unsent changes: the richer one wins, the other is kept
  const older = rich(50, 30);
  setup({ local: rich(60, 35), sync: { save: older, stamp: 100 }, server: { save: rich(260, 188), stamp: 300 } });
  got = await O.syncDown(rich(60, 35));
  check(got && got.flights === 260 && stashed().join() === '60', `richer online + unsent local: online wins, the local save is kept (${stashed()})`);
  // 5. equal progress
  const same = rich(100, 70);
  setup({ local: same, sync: { save: same, stamp: 100 }, server: { save: { ...same, seeds: 999 }, stamp: 200 } });
  got = await O.syncDown(same);
  check(got && got.seeds === 999, 'equal progress, online newer, nothing unsent: the online copy is used');
  setup({ local: { ...same, seeds: 5 }, sync: { save: same, stamp: 100 }, server: { save: { ...same, seeds: 999 }, stamp: 200 } });
  got = await O.syncDown({ ...same, seeds: 5 });
  check(got === null, 'equal progress but unsent changes here: this device is kept');
  setup({ local: same, sync: { save: same, stamp: 200 }, server: { save: { ...same, seeds: 999 }, stamp: 200 } });
  got = await O.syncDown(same);
  check(got === null && !log.includes('put_save'), 'equal progress, not newer: nothing happens');
  // 5d. flags that only say what this device has shown (codeSeen, pilotNamed) are not unsent changes (tests/onlinesave.cjs found it: opening PILOT made the phone 'unsent')
  setup({ local: { ...same, codeSeen: true, pilotNamed: true }, sync: { save: same, stamp: 100 }, server: { save: { ...same, seeds: 999 }, stamp: 200 } });
  got = await O.syncDown({ ...same, codeSeen: true, pilotNamed: true });
  check(got && got.seeds === 999, 'view-only flags (codeSeen, pilotNamed) are not unsent changes: the newer online copy is still taken');
  // 6. syncUp never writes a poorer save over a richer online one
  const big = rich(260, 188);
  setup({ local: rich(10, 5), sync: { save: big, stamp: 100 }, server: { save: big, stamp: 100 } });
  let up = await O.syncUp(rich(10, 5));
  check(up === false && !log.includes('put_save'), 'syncUp refuses to upload a save far poorer than the online one');
  O.allowRoughUpload();
  up = await O.syncUp(rich(10, 5));
  check(up === true && row.save.flights === 10, 'after allowRoughUpload (a deliberate reset) the poorer save may go up');
  setup({ local: rich(259, 187), sync: { save: big, stamp: 100 }, server: { save: big, stamp: 100 } });
  up = await O.syncUp(rich(259, 187));
  check(up === true, 'a save only slightly below (5%) still uploads');

  console.log(fails.length ? `FAIL syncdown:\n - ${fails.join('\n - ')}` : 'PASS syncdown: the richer save always wins, the loser is kept, a poorer save never overwrites a richer online one');
  process.exit(fails.length ? 1 : 0);
})();
