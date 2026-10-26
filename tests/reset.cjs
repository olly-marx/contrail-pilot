// The eras reset (src/fleet.js migrateFleet, 2026-10-23, option a): ONLY plane-side state changes.
// A save with real progress keeps seeds (+300 once), crystals, nature in every region, the journey,
// missions, badges and records; loses the old plane levels; flies the Comet. Runs once. A new
// player gets the fleet but no bonus. In flight the Comet is drawn, collisions keep the 'plane' mask.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/reset.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

const OLD = {
  tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['name', 'hangar', 'nature', 'wild'], freeGiven: true, priceVersion: 2,
  seeds: 812, crystals: 140, flights: 63, landings: 14, bestDistance: 7400000, flownKm: 61000, laps: 1, city: 'NAIROBI', heading: null,
  visited: ['LONDON', 'PARIS', 'CAIRO', 'NAIROBI'], mission: 6, missionsDone: ['m1', 'm2'], badgeTiers: { distance: 2 }, coolLandings: 3,
  levels: { engine: 3, magnet: 2, radar: 2, fuel: 2, gear: 1, hold: 1, lens: 1, forecast: 1, airframe: 1, wings: 1, cabin: 2, trees: 2, soil: 1, species: 2, nursery: 1 },
  fuel: 'saf50', planted: { spruce: 20, birch: 6 }, plantedIn: { woodland: 26, savanna: 4 }, discovered: ['fox', 'giraffe'], found: ['fox'],
  habitat: { woodland: ['pond', 'hedge'], savanna: ['waterhole'] },
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const open = async save => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([k, s]) => { if (sessionStorage.i) return; sessionStorage.i = 1; localStorage.clear(); if (s) localStorage.setItem(k, JSON.stringify(s)); }, [KEY, save]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(300);
    return p;
  };
  const stored = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const live = p => p.evaluate(() => JSON.parse(JSON.stringify(game.registry.get('save'))));

  let p = await open(OLD);
  let s = await live(p);
  check(JSON.stringify(s.levels) === JSON.stringify({ trees: 2, soil: 1, species: 2, nursery: 1 }), `only the tree lines are kept: ${JSON.stringify(s.levels)}`);
  check(s.seeds === OLD.seeds + 300 && s.crystals === OLD.crystals, `seeds +300 once, crystals kept: ${s.seeds}, ${s.crystals}`);
  check(s.fuel === 'kerosene', `normal fuel again: ${s.fuel}`);
  check(s.fleet && s.fleet.plane === 'comet' && JSON.stringify(Object.keys(s.fleet.planes)) === '["comet"]', `flies the Comet: ${JSON.stringify(s.fleet)}`);
  check(s.eraWelcome && s.eraWelcome.era === '1950s' && s.eraWelcome.bonus === 300 && !s.eraWelcome.shown, `welcome card queued: ${JSON.stringify(s.eraWelcome)}`);
  for (const k of ['city', 'heading', 'flownKm', 'laps', 'visited', 'discovered', 'found', 'habitat', 'planted', 'plantedIn', 'missionsDone', 'mission', 'badgeTiers', 'bestDistance', 'flights', 'landings', 'coolLandings'])
    check(JSON.stringify(s[k]) === JSON.stringify(OLD[k]), `${k} kept: ${JSON.stringify(s[k])} vs ${JSON.stringify(OLD[k])}`);

  // In flight: the Comet is drawn; collisions still use the base plane's mask.
  await p.click('#goBtn');
  await p.waitForFunction(() => ['takeoff', 'playing'].includes(game.scene.getScene('game').state), null, { timeout: 20000 });
  const tex = await p.evaluate(() => { const g = game.scene.getScene('game'); return [g.planeSprite.texture.key, g.kit.co2Cruise]; });
  check(tex[0] === 'plane-comet', `the Comet is drawn in flight: ${tex[0]}`);
  check(Math.abs(tex[1] - 1.1 * (await p.evaluate(async () => (await import('/src/config.js')).CLIMATE.co2Cruise))) < 1e-9, `Comet CO2 x1.1: ${tex[1]}`);
  // Runs once: reloading the written save adds no second bonus.
  await p.evaluate(() => { const g = game.scene.getScene('game'); window.__w = g.save; });
  const written = await stored(p);
  await p.close();
  p = await open(written);
  s = await live(p);
  check(s.seeds === written.seeds, `the reset runs once: seeds ${written.seeds} -> ${s.seeds}`);
  await p.close();

  // A brand-new player: the fleet, no bonus, no card.
  p = await open(null);
  s = await live(p);
  check(s.fleet && s.fleet.plane === 'comet' && s.seeds === 0 && !s.eraWelcome, `new player: Comet, 0 seeds, no card: ${JSON.stringify([s.fleet, s.seeds, s.eraWelcome])}`);
  await p.close();

  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
