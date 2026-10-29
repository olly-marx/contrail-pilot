// Rails rule (the user's playtest, 2026-10-29: in preview the tour said "Tap PILOT to choose your pilot name" and PILOT had no
// name form, a dead end). 1. Every tour step that taps a bottom-bar tab declares `ready` (what its screen offers is declared, not
// guessed). 2. The PILOT step is ready exactly when names are open: online on, or ?preview=1 (local only). 3. run() stops before
// a step whose ready() is false and does not mark the tour done. No browser.
// Run: node tests/tourready.cjs   (proved by planted defects)
const fs = require('fs');
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const src = fs.readFileSync(`${__dirname}/../src/tour.js`, 'utf8');
  const tabs = src.split('\n').filter(l => /target: '#tab/.test(l));
  check(tabs.length >= 8 && tabs.every(l => /ready: /.test(l)), `every tab step declares ready: ${tabs.filter(l => !/ready: /.test(l)).map(l => l.trim().slice(0, 60))}`);
  check(/target: '#tabPilot'[^\n]*ready: namesOpen/.test(src), 'the PILOT step is ready only when names are open');
  check(/if \(st\.ready && !st\.ready\(\)\) \{ id = null; break; \}/.test(src), 'run() stops before a step that is not ready, without marking it done');
  check(/!getPilot\(\) && namesOpen\(\)\) return this\.run\('name'/.test(src), 'the name tour does not start while names are resting');
  globalThis.window = { __CP_NO_ONLINE: true };
  const O = await import('../src/online.js');
  check(O.namesOpen() === false, 'season 2 offline, no preview: names are closed');
  window.CP_PREVIEW = true; check(O.namesOpen() === true, 'preview: names are open (local only)');
  window.__CP_NO_ONLINE = false; window.CP_PREVIEW = false; check(O.namesOpen() === true, 'online on: names are open');
  console.log(fails.length ? `FAIL tourready:\n - ${fails.join('\n - ')}` : `PASS tourready: ${tabs.length} tab steps declare ready; PILOT only when names are open (online or preview); run() stops before an unready step`);
  process.exit(fails.length ? 1 : 0);
})();
