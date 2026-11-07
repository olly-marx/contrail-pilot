// Save safety, the local half (src/save.js; the user lost a 260-flight save, 2026-11-05). No browser. Rules:
//  1. progressOf: only things that never go down; a blank save is under 1 point.
//  2. writeSave: a blank save never replaces one that has progress (main OR backup); allowBlank is the explicit exception.
//  3. stashSave: the 3 newest of the current save are kept (replaced-1 newest), never a blank one, never a copy identical to the newest;
//     restoreStashed puts one back and keeps the current one first.
//  4. loadSave: a copy that parses but cannot be made whole (prepareSave throws) is kept under .unreadable, the other copy is tried, and if none works
//     the game starts blank IN MEMORY and HELD: nothing is written until releaseHold (the player's choice).
//  5. resetSave keeps the save it deletes.
// Run: node tests/savestash.cjs   (proved by planted defects: tools/plants.tsv, test savestash)
(async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
  const S = await import('../src/save.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const K = 'contrailPilot.v2', rich = (f = 260, l = 188) => ({ flights: f, landings: l, seeds: 5, missionsDone: ['L1', 'L2', 'L3'], levels: { trees: 2 }, planted: { oak: 4 }, tutorialDone: true });
  const blank = () => S.prepareSave(null);
  const reset = () => { mem.clear(); S.releaseHold(); };

  // 1. progress
  reset();
  check(S.isBlank(blank()), 'a brand-new save is blank');
  check(S.progressOf(rich()) > S.progressOf(rich(100, 80)) && S.progressOf(rich(100, 80)) > S.progressOf(rich(10, 5)), 'more flights and landings = more progress');
  check(S.progressOf({ ...rich(), seeds: 0 }) === S.progressOf({ ...rich(), seeds: 9999 }), 'seeds (spent) are not progress');
  check(S.progressOf(null) === 0 && S.isBlank({}) && S.isBlank({ flights: 5 }) && !S.isBlank({ landings: 1 }), 'blank: nothing, 5 flights; not blank: a landing');

  // 2. the write guard
  reset();
  S.writeSave(rich());
  S.writeSave(blank());
  check(JSON.parse(mem.get(K)).flights === 260 && JSON.parse(mem.get(K + '.backup')).flights === 260, 'a blank save does not replace a save with progress (main and backup)');
  S.writeSave(blank(), { allowBlank: true });
  check(JSON.parse(mem.get(K)).flights === 0, 'allowBlank: the caller means it');
  reset(); mem.set(K + '.backup', JSON.stringify(rich())); S.writeSave(blank());
  check(mem.get(K) === undefined && JSON.parse(mem.get(K + '.backup')).flights === 260, 'a blank save does not replace a richer BACKUP either (and writes nothing)');
  reset(); S.writeSave(blank());
  check(!!mem.get(K), 'a blank save IS written when there is nothing to lose');

  // 3. safety copies
  reset(); S.writeSave(rich(100, 80));
  check(S.stashSave('first') === true && S.listStashed().length === 1 && S.listStashed()[0].flights === 100 && S.listStashed()[0].reason === 'first', 'a save is kept (reason, flights, landings)');
  check(S.stashSave('same') === false && S.listStashed().length === 1, 'an identical copy is not kept twice');
  S.writeSave(rich(120, 90)); S.stashSave('second'); S.writeSave(rich(140, 100)); S.stashSave('third'); S.writeSave(rich(160, 110)); S.stashSave('fourth');
  const L = S.listStashed();
  check(L.length === 3 && L.map(e => e.flights).join() === '160,140,120' && L[0].n === 1, `only the 3 newest are kept, newest first: ${JSON.stringify(L.map(e => [e.n, e.flights]))}`);
  reset(); S.writeSave(blank(), { allowBlank: true });
  check(S.stashSave('blank') === false && S.listStashed().length === 0, 'a blank save is never kept');
  reset(); S.writeSave(rich(100, 80)); S.stashSave('old'); S.writeSave(rich(200, 150));
  check(S.restoreStashed(1) === true && JSON.parse(mem.get(K)).flights === 100 && JSON.parse(mem.get(K + '.backup')).flights === 100, 'restoring puts the kept save back as main and backup');
  check(S.listStashed().some(e => e.flights === 200), 'restoring kept the save it replaced');
  check(S.restoreStashed(3) === false, 'a missing safety copy does not restore');

  // 4. a load that fails
  reset(); mem.set(K, JSON.stringify({ ...rich(), fleet: { planes: null } }));   // parses, cannot be made whole
  const got = S.loadSave();
  check(S.heldReason() && S.isBlank(got), `prepareSave throws, nothing else readable: a blank save, HELD (${S.heldReason()})`);
  check(mem.get(K + '.unreadable') === JSON.stringify({ ...rich(), fleet: { planes: null } }), 'the text that could not be made whole is kept under .unreadable');
  S.writeSave(got); S.writeSave(rich(300, 200));   // (a blank AND a save with progress: the blank-save guard alone would stop only the first)
  check(JSON.parse(mem.get(K)).flights === 260, 'HELD: writeSave writes nothing at all (the main copy is untouched)');
  S.releaseHold(); S.writeSave(got, { allowBlank: true });
  check(JSON.parse(mem.get(K)).flights === 0, 'after releaseHold the explicit blank save is written');
  reset(); mem.set(K, JSON.stringify({ ...rich(), fleet: { planes: null } })); mem.set(K + '.backup', JSON.stringify(rich(50, 40)));
  const viaBackup = S.loadSave();
  check(!S.heldReason() && viaBackup.flights === 50, 'prepareSave throws on main: the BACKUP is tried and used, no hold');
  reset(); mem.set(K, '{"flights": 9, broken');
  const broken = S.loadSave();
  check(S.heldReason() && S.isBlank(broken) && mem.get(K + '.unreadable') === '{"flights": 9, broken', 'unreadable JSON and no backup: held, the text kept');
  reset(); mem.set(K, '{"flights": 9, broken'); mem.set(K + '.backup', JSON.stringify(rich(70, 50)));
  check(!S.heldReason() && S.loadSave().flights === 70, 'unreadable main, good backup: the backup loads, no hold');
  reset();
  check(!S.heldReason() && S.isBlank(S.loadSave()), 'no save at all: a new player, NOT held');

  // 5. reset keeps what it deletes
  reset(); S.writeSave(rich(100, 80));
  const after = S.resetSave();
  check(S.isBlank(after) && mem.get(K) === undefined && S.listStashed().length === 1 && S.listStashed()[0].reason === 'before a reset', 'reset: the save is gone from main but kept in the safety copies');

  console.log(fails.length ? `FAIL savestash:\n - ${fails.join('\n - ')}` : 'PASS savestash: progress, the blank-save guard, 3 safety copies, restore, a failed load is HELD and kept, reset is recoverable');
  process.exit(fails.length ? 1 : 0);
})();
