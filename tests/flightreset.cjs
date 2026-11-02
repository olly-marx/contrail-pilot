// Per-flight state is reset per flight (the user's report, 2026-11-02: after a crash the next flight showed the dead flight's
// "Passed Paris. Next: Berlin". A crash restarts the scene, which KEEPS its fields; initFlight() set gameTime = 0 but not
// missedSign, so the old sign's `until` lay in the new flight's future). Two halves, no browser:
//  1. STATIC: every `this.<field> =` in src/sim/rules.js is either reset in a per-flight block (initFlight, which runs on
//     every scene (re)start, or takeOff, which runs on every take-off), or DECLARED in PERSIST below with a verdict.
//     A new field set mid-flight and never reset fails here until someone decides what it is.
//  2. BEHAVIOUR: a sign from one flight (passed an airport near the end) does not survive initFlight() into the next.
// Run: node tests/flightreset.cjs   (proved by planted defects)
const fs = require('fs');
globalThis.SEASON2 = true;
// Fields set outside the per-flight blocks, each with a verdict (read 2026-11-02; SUSPECT = may leak across flights,
// unproven: listed so the gate stays green while it is checked, NOT a claim that it is fine).
const PERSIST = {
  autoFrom: 'only read while onAutopilot(), and autoUntil is reset in takeOff',
  bank: 'the result of the last flight, written at its end and read after it',
  endReason: 'written at the end of a flight, read by its results',
  flaps: 'a tap counter with no reader',
  flaring: 'recomputed every frame (set false, then true when flaring)',
  graceUntil: 'SUSPECT: a breather started near the end of one flight may open the next one in grace until the first tap',
  hazardSeen: 'SUSPECT (intent?): "first no-fly zone" style popups show once per session, not once per flight',
  isDay: 'recomputed from the clock every frame',
  landed: 'written at the end of a flight, read by its results',
  landedAt: 'SUSPECT: kept from the last landing; its readers check `landed` first (missions2 onFlight returns early on a crash)',
  landingSpeed: 'set as the landing starts, read only while landing',
  rays: 'recomputed every frame',
  result: 'the result of the last flight, written at its end and read after it',
  saidNoSoil: 'SUSPECT (intent?): "no land to plant" says itself once per session, not once per flight',
  warmStorms: 'set every frame while the flight is in its warm-up (distance starts at 0)',
  warmTime: 'set every frame while the flight is in its warm-up (distance starts at 0)',
};
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const src = fs.readFileSync(`${__dirname}/../src/sim/rules.js`, 'utf8');
  const body = name => { const m = src.match(new RegExp(`\\n\\s*${name}\\s*\\([^)]*\\)\\s*\\{`)); if (!m) return '';
    let d = 0, k = src.indexOf('{', m.index); for (let j = k; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) return src.slice(m.index, j); } return ''; };
  const set = s => new Set([...s.matchAll(/this\.(\w+)\s*=(?!=)/g)].map(m => m[1]));
  const reset = new Set([...set(body('initFlight')), ...set(body('takeOff'))]);
  check(reset.size > 80, `found the per-flight blocks (${reset.size} fields reset): else this check proves nothing`);
  const loose = [...set(src)].filter(f => !reset.has(f) && !(f in PERSIST)).sort();
  check(!loose.length, `fields set during a flight but never reset per flight, and not declared in PERSIST: ${loose.join(', ')}`);
  const stale = Object.keys(PERSIST).filter(f => reset.has(f) || !set(src).has(f));
  check(!stale.length, `PERSIST lists fields that are now reset per flight or gone (remove them): ${stale.join(', ')}`);
  check(reset.has('missedSign'), 'missedSign is reset per flight');
  // 2. Behaviour, on the engine the game uses.
  const { createWorld } = await import('../src/sim/world.js');
  const w = createWorld({ areas: ['weurope'], homeArea: 'weurope', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, priceVersion: 2,
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } }, 1);
  w.gameTime = 95000; w.missedSign = { text: 'Passed PARIS. Next: BERLIN', to: 'BERLIN', until: 99000 };   /* the last flight passed Paris, then crashed */
  w.initFlight();   /* what the scene restart runs before the next flight */
  check(w.gameTime === 0 && !w.missedSign, `the dead flight's sign does not survive into the next one (gameTime ${w.gameTime}, sign ${JSON.stringify(w.missedSign)})`);
  // The HUD shows a sign only about the CURRENT leg (GameScene.js): a belt to the reset's braces.
  const scene = fs.readFileSync(`${__dirname}/../src/GameScene.js`, 'utf8');
  check(/this\.missedSign\.to === this\.nextAirport\.name/.test(scene), 'the HUD shows a passed-airport sign only while its next airport is this flight\'s');
  console.log(fails.length ? `FAIL flightreset:\n - ${fails.join('\n - ')}` : `PASS flightreset: ${reset.size} fields reset per flight, ${Object.keys(PERSIST).length} declared (${Object.values(PERSIST).filter(v => v.startsWith('SUSPECT')).length} suspects); no sign survives a restart`);
  process.exit(fails.length ? 1 : 0);
})();
