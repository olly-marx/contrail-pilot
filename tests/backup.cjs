// BACK UP MY GAME, the pure half (src/backup.js + save.js restoreFromBackup; research/BACKUP-MY-GAME.md). Plain Node, the game's own modules, a stub localStorage. ~1 s.
//   1. a backup round-trips (the save, the summary); the text holds NO pilot code;
//   2. every refusal: not JSON, wrong format, a newer format, a half-pasted text, an edited number (checksum), a blank game, over 1 MB, a negative number, an array;
//   3. an OLD backup (no priceVersion) is migrated in memory; nothing is written by reading;
//   4. a restore KEEPS THE CURRENT GAME FIRST (.replaced-1) and then writes both keys; if the game now could not be kept, NOTHING is replaced;
//   5. the words: every card line is <= 26 characters; the size warning; the file name; the online warning rule.
// Plants: tools/plants.tsv, test `backup` (each must FAIL this test).
(async () => {
  const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { if (globalThis.__noStash && /replaced-/.test(k)) throw new Error('quota'); mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const B = await import('../src/backup.js'), S = await import('../src/save.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const rich = () => S.prepareSave({ seeds: 4120, crystals: 31, flights: 260, landings: 61, bestDistance: 5200, areas: ['weurope', 'nordic'], visited: ['LONDON', 'PARIS'], badges: [], seenTips: ['x-bars'], levels: { trees: 3 }, missionsDone: ['L1', 'L2'], priceVersion: 2 });
  // 1. round trip, no pilot code
  mem['contrailPilot.code'] = JSON.stringify('zzz secret code words 42');
  const save = rich(), text = B.backupText(B.makeBackup(save, { game: '0.36.0', now: Date.UTC(2026, 10, 9), pilot: 'OLLIE' })), r = B.readBackup(text);
  check(r.ok && r.summary.flights === 260 && r.summary.landings === 61 && r.summary.seeds === Math.round(save.seeds), `a backup round-trips: ${JSON.stringify(r.ok ? r.summary : r)}`);
  check(r.ok && JSON.stringify(r.save) === JSON.stringify(S.prepareSave(JSON.parse(JSON.stringify(save)))), 'the restored save is the save (after the usual preparing)');
  check(!/zzz secret code/.test(text) && !/contrailPilot\.code/.test(text), 'the backup text holds NO pilot code');
  check(JSON.parse(text).pilot === 'OLLIE' && JSON.parse(text).format === 'contrail-pilot-backup' && JSON.parse(text).v === 1, 'the header: format, version, the first name only');
  // 2. refusals
  const refused = (t, why, what) => { const x = B.readBackup(t); check(!x.ok && x.reason === why, `REFUSED (${what}): want ${why}, got ${JSON.stringify(x.ok ? 'ok' : x.reason)}`); };
  refused('hello there', 'json', 'not JSON'); refused('', 'json', 'empty'); refused(JSON.stringify({ format: 'something-else', v: 1 }), 'format', 'wrong format');
  refused(JSON.stringify({ ...JSON.parse(text), v: 2 }), 'newer', 'a newer backup format');
  refused(text.slice(0, text.length - 40), 'json', 'a half-pasted text');
  { const i = text.lastIndexOf('"flights":260'); refused(text.slice(0, i) + '"flights":261' + text.slice(i + '"flights":260'.length), 'check', 'an edited number inside the save (checksum)'); }   // (the LAST one: the header's summary comes first and is not sealed)
  refused(B.backupText(B.makeBackup(S.prepareSave({}), {})), 'blank', 'a blank game');
  refused('x'.repeat(B.MAX_BYTES + 1), 'size', 'over 1 MB');
  const forged = save2 => { const o = JSON.parse(text); o.save = save2; o.check = B.check(JSON.stringify(save2)); return JSON.stringify(o); };
  refused(forged({ ...save, seeds: -5 }), 'shape', 'a negative number'); refused(forged([1, 2]), 'shape', 'an array'); refused(forged({ ...save, badges: 'many' }), 'shape', 'badges that are not a list');
  // 3. an old backup is migrated in memory
  const old = { seeds: 100, flights: 5, landings: 3, trees: 7 };   // before priceVersion, and money was called trees
  const ro = B.readBackup(B.backupText({ format: B.FORMAT, v: 1, game: 'old', made: '2026-01-01T00:00:00Z', pilot: '', summary: {}, save: old, check: B.check(JSON.stringify(old)) }));
  check(ro.ok && ro.save.seeds >= 107 && !('trees' in ro.save) && ro.save.fleet, `an OLD backup is migrated in memory (money called trees folded into seeds, a fleet made): ${JSON.stringify(ro.ok ? [ro.save.seeds, !!ro.save.fleet, 'trees' in ro.save] : ro)}`);
  check(Object.keys(mem).every(k => k === 'contrailPilot.code'), `reading a backup writes nothing: ${Object.keys(mem)}`);
  // 4. restore: the current game is kept first, then both keys are written
  const cur = JSON.stringify({ ...rich(), flights: 40, landings: 31, seeds: 900 }); mem['contrailPilot.v2'] = cur; mem['contrailPilot.v2.backup'] = cur;
  check(S.restoreFromBackup(r.save) === 'ok', 'a restore over a real game says ok');
  const top = JSON.parse(mem['contrailPilot.v2.replaced-1'] || 'null');
  check(top && top.raw === cur, 'the game it replaced is KEPT FIRST as the newest safety copy (.replaced-1)');
  check(mem['contrailPilot.v2'] === JSON.stringify(r.save) && mem['contrailPilot.v2.backup'] === JSON.stringify(r.save), 'then BOTH keys hold the backup');
  // ... and if the game now could not be kept, nothing is replaced
  const cur2 = JSON.stringify({ ...rich(), flights: 55 }); mem['contrailPilot.v2'] = cur2; mem['contrailPilot.v2.backup'] = cur2; delete mem['contrailPilot.v2.replaced-1']; delete mem['contrailPilot.v2.replaced-2']; delete mem['contrailPilot.v2.replaced-3'];
  globalThis.__noStash = true; const res = S.restoreFromBackup(r.save); globalThis.__noStash = false;
  check(res === 'not-kept' && mem['contrailPilot.v2'] === cur2, `when the current game could not be kept, NOTHING is replaced: ${res}`);
  // a blank current game needs no copy: the restore goes ahead
  mem['contrailPilot.v2'] = JSON.stringify(S.prepareSave({})); delete mem['contrailPilot.v2.backup'];
  check(S.restoreFromBackup(r.save) === 'ok', 'over a blank game the restore goes ahead (nothing to keep)');
  // 5. the words, the size warning, the file name, the online rule
  const lines = [...['size', 'json', 'format', 'newer', 'check', 'shape', 'blank', 'unreadable', 'other'].flatMap(B.refusalLines), ...B.compareLines({ flights: 1234567, seeds: 12345678, progress: 1 }, { flights: 9876543, seeds: 87654321, progress: 2 }, '28 Nov')];
  const long = lines.filter(l => l.length > 26); check(!long.length, `every card line fits 26 characters: ${JSON.stringify(long)}`);
  check(B.tooBigToShare('x'.repeat(200001)) && !B.tooBigToShare('x'.repeat(200000)), 'the export warns over 200 KB');
  check(B.fileName('Ollie', Date.UTC(2026, 10, 9)) === 'contrail-pilot-backup-ollie-2026-11-09.json' && B.fileName('', Date.UTC(2026, 10, 9)) === 'contrail-pilot-backup-player-2026-11-09.json' && !/[/\\.]{2}/.test(B.fileName('O/../x')), `the file name: ${B.fileName('Ollie', Date.UTC(2026, 10, 9))} / ${B.fileName('O/../x')}`);
  check(B.onlineWarns({ pilot: { first: 'A' }, onlineProgress: 500, backupProgress: 300 }) && !B.onlineWarns({ pilot: null, onlineProgress: 500, backupProgress: 300 }) && !B.onlineWarns({ pilot: { first: 'A' }, onlineProgress: 300, backupProgress: 300 }) && !B.onlineWarns({ pilot: { first: 'A' }, onlineProgress: 0, backupProgress: 1 }), 'the online warning shows only for a named pilot whose online copy is richer');
  check(B.ONLINE_WARNING === 'Your online copy is newer: going back will be undone the next time the game loads. Keep this backup as a separate file.', 'the online warning words are the agreed ones');
  console.log(fails.length ? `FAIL backup:\n - ${fails.join('\n - ')}` : 'PASS backup: round trip, no pilot code, 9 refusals, an old backup migrated, the restore keeps the current game first and replaces nothing if it cannot, every line <= 26');
  process.exit(fails.length ? 1 : 0);
})();
