// One copy of the money rules (sim engine, 2026-10-26): a finished flight is banked by RULES.bankFlight in the game
// and in the engine alike. Here the same flight (same save, seed and straight pilot, crashes off, STEPS steps) is
// flown in the real game (browser) and in the engine (Node), then landed at the next airport or crashed; the
// flight's result and the banked save must be the same. Then a planted defect (the engine's save given 1 more seed
// before banking) must be caught.
// Run: python3 -m http.server 8000 & node tests/sim-bank.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
const DT_MS = 16.67;
// Save fields only the game's VIEW changes during a flight (animals seen, banners and tips shown): not banking.
const VIEW_ONLY = ['found', 'foundAt', 'dayNightSeen', 'seenTips', 'tours', 'discovered', 'shownLines'];   // shownLines: the hangar's 'new line' marks
// Result fields that come from the view: the animals seen this flight.
const RESULT_VIEW_ONLY = ['foundIds'];

const SAVE = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 3, mission: 2, seeds: 120, crystals: 4, flownKm: 9000,
  fuel: 'kerosene', priceVersion: 2, fleet: { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} } };
const CASES = [{ seed: 1, steps: 2400, landed: true }, { seed: 2, steps: 1800, landed: false, reason: 'Storm!\nYou flew into a storm.' }, { seed: 3, steps: 3600, landed: true }];

// (An empty habitat {} that the menu adds is the same as none; a non-empty one is compared.)
const strip = (o, keys) => Object.fromEntries(Object.entries(o).filter(([k, v]) => !keys.includes(k) && !(k === 'habitat' && v && !Object.keys(v).length)));
const diff = (a, b, path = '') => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object') return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => diff(a[k], b[k], `${path}.${k}`));
  return [`${path}: game ${JSON.stringify(a)} engine ${JSON.stringify(b)}`];
};

async function game(b, c) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(save => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(save)); }, { ...SAVE, simSeed: c.seed });
  await p.goto(URL);
  await p.waitForFunction(() => window.game && game.scene.getScene('game') && game.registry.get('ui'), null, { timeout: 60000 });
  const out = await p.evaluate(async ([c, DT_MS]) => {
    const { pilotTarget } = await import('/src/sim/pilots.js');
    game.loop.sleep(); game.scene.render = () => {};
    let t = game.loop.now || performance.now();
    game.scene.getScene('game').scene.restart({ go: true });
    const s = game.scene.getScene('game');
    for (let i = 0; i < 3 || !(s.nextAirport && s.sys.isActive()); i++) { if (i > 3) await new Promise(r => setTimeout(r, 20)); t += DT_MS; game.step(t, DT_MS); if (i > 3000) throw new Error('scene never started'); }
    game.registry.get('ui').showOnly(null);
    for (let i = 0; i < 2000 && s.state !== 'playing'; i++) { t += DT_MS; game.step(t, DT_MS); }
    s.hitsStorm = () => false; s.hitBird = () => false; s.explain = () => false; s.spriteBottom = () => -1;
    for (let i = 0; i < c.steps && s.state === 'playing'; i++) { if (s.plane.y > pilotTarget(s, 'straight') && s.plane.vy > -40) s.applyFlap(); t += DT_MS; game.step(t, DT_MS); }
    if (c.landed) s.landedAt = s.nextAirport.name;
    s.finish(c.landed ? { landed: true } : { reason: c.reason });
    return { result: s.result, save: JSON.parse(JSON.stringify(s.save)) };
  }, [c, DT_MS]);
  await p.close();
  return out;
}

async function engine(c, plant) {
  const { createWorld } = await import('../src/sim/world.js');
  const { pilotTarget } = await import('../src/sim/pilots.js');
  const w = createWorld({ ...SAVE, simSeed: c.seed }, c.seed);
  for (let i = 0; i < 2000 && w.state !== 'playing'; i++) w.step(DT_MS / 1000);
  w.hitsStorm = () => false; w.hitBird = () => false; w.explain = () => false; w.spriteBottom = () => -1;
  for (let i = 0; i < c.steps && w.state === 'playing'; i++) { if (w.plane.y > pilotTarget(w, 'straight') && w.plane.vy > -40) w.applyFlap(); w.step(Math.min(DT_MS, 50) / 1000); }
  if (c.landed) w.landedAt = w.nextAirport.name;
  if (plant) w.save.seeds += 1;
  w.finish(c.landed ? { landed: true } : { reason: c.reason });
  return { result: w.result, save: JSON.parse(JSON.stringify(w.save)) };
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], seen = [];
  for (const c of CASES) {
    const g = await game(b, c), e = await engine(c);
    const gs = strip(g.save, VIEW_ONLY), es = strip(e.save, VIEW_ONLY);
    const d = [...diff(strip(g.result, RESULT_VIEW_ONLY), strip(e.result, RESULT_VIEW_ONLY), 'result'), ...diff(gs, es, 'save')];
    if (d.length) fails.push(`seed ${c.seed} ${c.landed ? 'landed' : 'crashed'}:\n    ${d.slice(0, 12).join('\n    ')}`);
    seen.push(`${c.landed ? 'landed' : 'crashed'} ${g.result.distance} km, +${g.result.gained} seeds`);
    if (c === CASES[0]) { const ep = await engine(c, true); if (!diff(strip(g.save, VIEW_ONLY), strip(ep.save, VIEW_ONLY), 'save').length) fails.push('a planted extra seed in the engine was NOT caught'); }
  }
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: the engine banks exactly as the game (${seen.join('; ')}); a planted extra seed is caught`);
})();
