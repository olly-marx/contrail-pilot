// The seeded saves and screens that reach every rails / tour step (shared by tools/spotlight-shots.cjs, which takes the screenshots, and tests/spotlight.cjs, which audits the spotlight).
const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
const DONE = ['r-school', 'r-free', 'r-takeoff1', 'r-res1', 'r-takeoff2', 'r-res2', 'r-nature', 'name', 'r-systems', 'r-bonus', 'r-parcels', 'r-map', 'r-boards', 'hangar', 'nature-lead'];
const without = (...ids) => DONE.filter(t => !ids.includes(t));
const base = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON', 'PARIS'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['x-bars'], freeGiven: true, freeProjectGiven: true, freeUpgrade: false,
  seeds: 80, crystals: 3, landings: 2, flights: 3, shownLines: ['cabin', 'fuel', 'engine', 'gear', 'trees'], tours: DONE, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], unclaimed: [], fleet };
const RES = { landed: true, landedAt: 'PARIS', from: 'LONDON', reason: '', distance: 1200, heat: 5, breakdown: { co2: 60, night: 0, sun: 30, trees: 10 }, earned: [{ label: 'Seeds', n: 23 }], mult: 1, kinds: 0, natureGains: [], rewards: [], missions2: { done: [], next: null }, crystals: 1, cargo: 23 };
// id, save overrides, screen ('title' | 'hangar' | 'nature' | 'results'), max steps
const CASES = [
  ['r-school', { freeUpgrade: true, landings: 1, flights: 1, missionsDone: [], tours: [] }, 'results', 2],
  ['r-hangar', { freeUpgrade: true, landings: 1, flights: 1, missionsDone: [], tours: ['r-school'] }, 'title', 2],
  ['r-free', { freeUpgrade: true, landings: 1, flights: 1, missionsDone: [], tours: ['r-school', 'r-hangar'] }, 'hangar', 6],   // 1: tap the Engines row, 2: FREE! (a real purchase), 3: the payoff card's OK (#payOk), 4: the hangar's TAKE OFF
  ['r-takeoff1-hangar', { landings: 1, flights: 1, missionsDone: [], tours: without('r-takeoff1') }, 'hangar', 2],
  ['r-takeoff1-hub', { landings: 1, flights: 1, missionsDone: [], tours: without('r-takeoff1') }, 'title', 2],
  ['r-res1', { missionsDone: ['L1'], landings: 2, tours: without('r-res1') }, 'results', 4],
  ['r-takeoff2', { missionsDone: ['L1'], landings: 2, tours: without('r-takeoff2') }, 'title', 2],
  ['r-res2', { missionsDone: ['L1', 'L2'], landings: 3, tours: without('r-res2') }, 'results', 2],
  ['r-nature', { missionsDone: ['L1', 'L2'], landings: 3, freeProjectGiven: false, tours: without('r-nature') }, 'nature', 6],
  ['r-bonus', { missionsDone: ['L1', 'L2', 'L3', 'L4'], landings: 5, tours: without('r-bonus') }, 'results', 2],
  ['r-systems', { missionsDone: ['L1', 'L2', 'L3'], landings: 4, tours: without('r-systems') }, 'title', 4],
  ['r-parcels', { missionsDone: ['L1', 'L2', 'L3', 'L4'], landings: 5, levels: { trees: 0 }, tours: without('r-parcels') }, 'nature', 2],
  ['r-map', { landings: 6, tours: without('r-map') }, 'title', 2],
  ['r-boards', { landings: 7, tours: without('r-boards') }, 'title', 2],
  ['name', { landings: 5, tours: without('name') }, 'title', 3],
  ['newlines', { landings: 4, shownLines: ['cabin'], tours: DONE }, 'title', 4],
];
module.exports = { base, CASES, RES };
