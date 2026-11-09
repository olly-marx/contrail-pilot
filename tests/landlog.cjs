// THE LANDING LOG (src/landlog.js; the sim chat's design, research/ICE-CRYSTALS-LANDING-SIM.md): numbers of real touchdowns kept on this device only, outside the save, the last 100, copied as plain text.
// 1. a touchdown is recorded as one row; junk is ignored; 2. 120 touchdowns keep the NEWEST 100; 3. the key is its own (not the save's), so a save, a backup and the sync never carry it; 4. the text: a header and one
// row per landing, '-' for a missing position; 5. the result's field is read where the results are shown (src/ui.js) and nowhere sends it (no network call in landlog.js). Plain Node.
// Plants: tools/plants.tsv, test `landlog`. Run: node tests/landlog.cjs
(async () => {
  const mem = {}; globalThis.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const L = await import('../src/landlog.js'), S = await import('../src/save.js');
  const fs = require('fs'), fails = [], check = (c, m) => { if (!c) fails.push(m); };
  check(L.landingCount() === 0 && L.landingText().split('\n').length === 1, 'empty log: only the header line');
  check(L.recordTouchdown({ pos: 0.62, sink: 85, angle: 6.1, gear: 2, flare: 1.2, landed: true }) === true && L.landingCount() === 1, 'a touchdown is recorded');
  check(!L.recordTouchdown(null) && !L.recordTouchdown({}) && !L.recordTouchdown({ sink: 'x' }) && !L.recordTouchdown(5) && L.landingCount() === 1, 'junk is ignored');
  check(L.recordTouchdown({ pos: null, sink: 40, angle: 3, gear: 0, flare: 1, landed: false }) && L.landingText().split('\n')[2] === '- 40 3 0 1 0', `a miss has '-' for the position: ${JSON.stringify(L.landingText().split('\n'))}`);
  for (let i = 0; i < 120; i++) L.recordTouchdown({ pos: 0.5, sink: i, angle: 1, gear: 0, flare: 1, landed: true });
  const rows = L.landingText().split('\n').slice(1);
  check(L.landingCount() === 100 && rows.length === 100 && rows[99].split(' ')[1] === '119' && rows[0].split(' ')[1] === '20', `120 touchdowns keep the newest 100 (count ${L.landingCount()}, first sink ${rows[0].split(' ')[1]}, last ${rows[99].split(' ')[1]})`);
  check(L.LANDLOG_KEY !== 'contrailPilot.v2' && !/^contrailPilot\.v2/.test(L.LANDLOG_KEY) && L.LANDLOG_KEY in mem, `the log has its own key: ${L.LANDLOG_KEY}`);
  const save = S.prepareSave({ landings: 3, flights: 3, areas: ['weurope'] }); check(!JSON.stringify(save).includes('landlog') && !('landlog' in save), 'the save does not hold the log');
  const src = fs.readFileSync(__dirname + '/../src/landlog.js', 'utf8'); check(!/fetch\(|XMLHttp|sendBeacon|supabase|rpc\(/.test(src), 'src/landlog.js makes no network call');
  const ui = fs.readFileSync(__dirname + '/../src/ui.js', 'utf8'); check(/if \(r\.touchdown && !r\.school\) recordTouchdown\(r\.touchdown\)/.test(ui), 'src/ui.js records the touchdown when the results are shown (not school)');
  console.log(fails.length ? `FAIL landlog:\n - ${fails.join('\n - ')}` : 'PASS landlog: touchdowns are kept on this device, the newest 100, outside the save, as plain text; nothing sends them');
  process.exit(fails.length ? 1 : 0);
})();
