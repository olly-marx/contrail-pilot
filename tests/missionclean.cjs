// Mission "Make your plane cleaner" (go-clean) and every mission goal vs the retired plane lines (0.11.3). No browser.
// The eras reset deletes the old fuel/engine levels and the hangar stopped selling them, so a goal that reads them can
// never be met after the reset and blocks every later mission (missions run in order). The goal must read the FLEET.
// Run: node tests/missionclean.cjs   (MISSIONS_PATH=... plants another missions.js to prove this test can fail)
(async () => {
  const path = require('path'), { pathToFileURL } = require('url');
  const M = await import(process.env.MISSIONS_PATH ? pathToFileURL(path.resolve(process.env.MISSIONS_PATH)).href : '../src/missions.js');
  const F = await import('../src/fleet.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const clean = M.MISSIONS.find(m => m.id === 'go-clean');
  const landed = { landed: true }, crashed = { landed: false };

  // A save as it is AFTER the reset, with the old levels it once had.
  const post = () => { const s = { levels: { fuel: 1, engine: 2, cabin: 1, trees: 1 }, seeds: 500, crystals: 0, flights: 5, landings: 5 }; F.migrateFleet(s); return s; };
  const s0 = post();
  check(!clean.check(landed, s0), 'a post-reset save with no engines bought must not finish go-clean');
  check(!/Cleaner Fuel/.test(clean.sub + clean.fail(landed, s0)), 'the text must not send the player to the retired Cleaner Fuel');
  const s1 = post(); F.buyFleet(s1, 'plane', 'comet.engines', { free: true });
  check(clean.check(landed, s1), 'a post-reset save with Comet engines level 1 CAN finish go-clean (the bug)');
  check(!clean.check(crashed, s1), 'go-clean still needs a landing');
  const s2 = post(); s2.fleet.planes.jumbo = { engines: 1 }; s2.fleet.plane = 'comet';
  check(clean.check(landed, s2), 'engines bought on another plane you own also count');
  check(clean.progress({ save: s1 }).startsWith('Cleaner'), 'the live HUD line shows the cleaner plane');
  check(!clean.progress({ save: s0 }).startsWith('Cleaner'), 'the HUD line asks for engines when none are bought');

  // A player stuck at mission 8 is released: with missions 1-7 done and engines bought, the current mission is go-clean, it completes, 9 follows.
  const stuck = post(); stuck.missionsDone = M.MISSIONS.slice(0, 7).map(m => m.id); F.buyFleet(stuck, 'plane', 'comet.engines', { free: true });
  check(M.current(stuck).id === 'go-clean', `a stuck player's current mission is go-clean, got ${M.current(stuck) && M.current(stuck).id}`);
  if (clean.check(landed, stuck)) M.complete(stuck, clean);
  check(M.current(stuck) && M.current(stuck).id === 'reach-cairo', 'after go-clean the next mission is reachable');

  // No mission may depend on a retired line (needs.line(s) or a levels.<id> read in the source).
  const src = require('fs').readFileSync(process.env.MISSIONS_PATH || path.join(__dirname, '..', 'src', 'missions.js'), 'utf8');
  for (const id of F.RETIRED_LINES) {
    check(!new RegExp(`levels\\)?\\s*\\|\\|\\s*\\{\\}\\)\\.${id}\\b|levels\\.${id}\\b`).test(src), `missions.js still reads the retired line levels.${id}`);
    for (const m of M.MISSIONS) { const n = m.needs || {}; check(![n.line, ...(n.lines || []).map(l => l[0])].includes(id), `mission ${m.id} needs the retired line ${id}`); }
  }
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('missionclean OK: go-clean reads the fleet; a stuck player is released; no mission needs a retired line');
})();
