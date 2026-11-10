// RESET starts a brand-new player (src/save.js wipeSave; the user, 2026-11-10: "RESET restarts flights, seeds etc. but NOT nature"). No browser.
// Keys that are not in DEFAULTS (discovered, missionsDone, badgeTiers, records, groves, ...) used to stay on the live save object after
// Object.assign(save, resetSave()) and the next writeSave wrote them back. Checks, in order (the positive control first):
//  0. control: a plain default save wiped is a new player (prepareSave(null)).
//  1. a rich save (nature, missions, badges, ...) wiped is a new player, key for key, and has none of the stale keys.
//  2. the blank save is what is stored (main and backup), and a later writeSave of the live object writes no stale key back.
//  3. the device keys of the old game (outbox, notes, landing log), the pilot identity (pilot, code, firstName, auth) and the sync stamp are all cleared (a FULL reset, the user 2026-11-10).
//  4. the save that was wiped is still in the safety copies.
// Run: node tests/resetwipe.cjs   (proved by planted defects: tools/plants.tsv, test resetwipe)
const assert = require('assert');
(async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
  const S = await import('../src/save.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const same = (a, b) => { try { assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b))); return true; } catch (e) { return false; } };
  const K = 'contrailPilot.v2';
  const rich = () => ({ ...S.prepareSave(null), flights: 260, landings: 188, seeds: 500, missionsDone: ['L1', 'L2'], badgeTiers: { lap: 1 }, discovered: { desert: true, arctic: true },
    records: { beaten: { x: 1 } }, planted: { oak: 4 }, visited: ['LONDON', 'PARIS'], tutorialDone: true, levels: { trees: 3 }, natureNote: 'x' });
  const fresh = () => S.prepareSave(null);

  // 0. control
  mem.clear(); S.releaseHold();
  const c = S.prepareSave(null); S.wipeSave(c);
  check(same(c, fresh()), 'control: a new player wiped is still a new player');

  // 1. a rich save
  mem.clear(); S.releaseHold();
  const live = rich(); S.writeSave(live);
  const ref = live;   // the live object must be changed in place (the game holds this one object)
  S.wipeSave(live);
  check(ref === live, 'the live save object is changed in place');
  check(same(live, fresh()), 'a rich save wiped equals a brand-new player, key for key');
  for (const k of ['discovered', 'missionsDone', 'badgeTiers', 'records', 'natureNote']) check(!(k in live), `the stale key "${k}" is gone from the live save`);

  // 2. what is stored
  const pj = k => { try { return JSON.parse(mem.get(k)); } catch (e) { return null; } };
  check(same(pj(K), fresh()) && same(pj(K + '.backup'), fresh()), 'main and backup hold the blank save');
  S.writeSave(live);
  check(pj(K) && !('discovered' in pj(K)) && !('missionsDone' in pj(K)), 'the next ordinary writeSave writes no stale key back');

  // 3. device keys
  mem.clear(); S.releaseHold();
  const l3 = rich(); S.writeSave(l3);
  for (const k of ['outbox', 'onlineNote', 'recoverNext', 'landlog', 'pilot', 'code', 'firstName', 'auth', 'synced']) mem.set('contrailPilot.' + k, '"old"');
  S.wipeSave(l3);
  for (const k of ['outbox', 'onlineNote', 'recoverNext', 'landlog']) check(!mem.has('contrailPilot.' + k), `the device key ${k} of the old game is cleared`);
  for (const k of ['pilot', 'code', 'firstName', 'auth']) check(!mem.has('contrailPilot.' + k), `the pilot identity key ${k} is cleared`);
  check(!mem.has('contrailPilot.synced'), 'the sync stamp (synced) is cleared');

  // 4. recoverable
  const kept = S.listStashed();
  check(kept.length === 1 && kept[0].reason === 'before a reset', 'the wiped save is kept in the safety copies');

  console.log(fails.length ? `FAIL resetwipe:\n - ${fails.join('\n - ')}` : 'PASS resetwipe: reset leaves a brand-new player in every key (nature, missions, badges included), clears the old game\'s device keys, the pilot identity and the sync stamp, and keeps a safety copy');
  process.exit(fails.length ? 1 : 0);
})();
