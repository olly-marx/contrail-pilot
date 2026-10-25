// Golden per-step traces of the real game (sim engine, 2026-10-25). Flies the game frame-stepped without
// drawing, with a fixed simSeed and a test pilot (src/sim/pilots.js), and records the physics every step:
// distance, plane, heat and its parts, every storm / icy-air patch / contrail / seed / flock, and whether
// the plane touched a storm or bird that step (crashes are switched off so the flight goes on; the hit is
// still recorded). Each step is hashed into a chain, so two traces agree only if every step agrees.
//   record:  node tools/sim/trace.cjs > golden.json
//   compare: COMPARE=golden.json node tools/sim/trace.cjs   (exit 1 + first differing step if not identical)
// Env: URL (default http://localhost:8000/), SEEDS=1,2,3  PILOTS=straight,careful,smart  STEPS=6000  PLANE=jumboFull
// Needs the game served and playwright-core. A browser run: only on a test turn.
const { chromium } = require('playwright-core');
const fs = require('fs');
const URL = process.env.URL || 'http://localhost:8000/';
const SEEDS = (process.env.SEEDS || '1,2,3').split(',').map(Number);
const PILOTS = (process.env.PILOTS || 'straight,careful,smart').split(',');
const STEPS = Number(process.env.STEPS || 6000);
const SAVES = {
  none: {},
  jumboFull: { fuel: 'kerosene', priceVersion: 2, fleet: { plane: 'jumbo', planes: { jumbo: { engines: 3, body: 3, cabin: 3 } }, systems: { forecast: 4, atc: 4, ops: 4 }, gadgets: { magnet: 4, hold: 4, gear: 4, sensors: 4, autopilot: 4 } } },
};
const PLANE = process.env.PLANE || 'jumboFull';

async function fly(b, pilot, seed) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(([cfg, seed]) => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'],
    landings: 30, mission: 99, planted: { oak: 5, birch: 5, rowan: 5, spruce: 5, orchard: 5 }, ...cfg, simSeed: seed })); }, [SAVES[PLANE], seed]);
  await p.goto(URL);
  await p.waitForFunction(() => window.game && game.scene.getScene('game') && game.registry.get('ui'), null, { timeout: 60000 });
  const out = await p.evaluate(async ([pilot, STEPS]) => {
    const { pilotTarget } = await import('/src/sim/pilots.js');
    game.loop.sleep(); game.scene.render = () => {};
    let t = game.loop.now || performance.now();
    game.scene.getScene('game').scene.restart({ go: true });
    const s = game.scene.getScene('game');
    for (let i = 0; i < 3 || !(s.nextAirport && s.sys.isActive()); i++) { if (i > 3) await new Promise(r => setTimeout(r, 20)); t += 16.67; game.step(t, 16.67); if (i > 3000) throw new Error('scene never started'); }
    game.registry.get('ui').showOnly(null);
    for (let i = 0; i < 2000 && s.state !== 'playing'; i++) { t += 16.67; game.step(t, 16.67); }
    let hits = '';
    const hs = s.hitsStorm.bind(s), hb = s.hitBird.bind(s);
    s.hitsStorm = st => { if (hs(st)) hits += 'S'; return false; };
    s.hitBird = box => { if (hb(box)) hits += 'B'; return false; };
    s.explain = () => false; s.nextAirport.worldX = 1e12;
    const r6 = v => Math.round(v * 1e6) / 1e6;
    // FNV-1a over each step's line, chained.
    let h = 0x811c9dc5; const hash = str => { for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
    const chain = [], samples = [];
    for (let i = 0; i < STEPS && s.state === 'playing'; i++) {
      if (s.plane.y > pilotTarget(s, pilot) && s.plane.vy > -40) s.applyFlap();
      hits = ''; t += 16.67; game.step(t, 16.67);
      const B = s.breakdown;
      const line = [i, r6(s.distancePx), r6(s.plane.y), r6(s.plane.vy), r6(s.heat), r6(B.co2), r6(B.night), r6(B.sun), r6(B.trees), s.isDay ? 1 : 0, hits, s.cargo,
        s.storms.map(st => `${r6(st.rects[0].x)},${r6(st.rects[0].height)},${r6(st.rects[1].y)},${(st.pics || []).map(q => q.key.slice(6) + (q.flip ? 'f' : '')).join('.')}`).join(';'),
        s.issrs.map(q => `${r6(q.x)},${q.y},${q.width},${q.height},${r6(q.alpha)},${q.fake ? 1 : 0}`).join(';'),
        s.contrails.map(c => `${r6(c.x)},${r6(c.y)}`).join(';'),
        s.tokens.map(k => `${r6(k.img ? k.img.x : k.x)},${r6(k.img ? k.img.y : k.y)}`).join(';'),
        s.birds.map(f => `${r6(f.x)},${r6(f.y)}`).join(';'), s.turbs.length].join('|');
      chain.push(hash(line));
      if (i % 100 === 0) samples.push(line);
    }
    return { steps: chain.length, km: Math.round(s.distancePx), heat: r6(s.heat), chain, samples };
  }, [pilot, STEPS]);
  await p.close();
  return out;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const traces = {};
  for (const pilot of PILOTS) for (const seed of SEEDS) traces[`${PLANE}/${pilot}/${seed}`] = await fly(b, pilot, seed);
  await b.close();
  if (!process.env.COMPARE) { console.log(JSON.stringify(traces)); return; }
  const gold = JSON.parse(fs.readFileSync(process.env.COMPARE, 'utf8')), bad = [];
  for (const [k, g] of Object.entries(gold)) {
    const n = traces[k]; if (!n) { bad.push(`${k}: not flown`); continue; }
    const i = g.chain.findIndex((x, j) => x !== n.chain[j]);
    if (i >= 0 || g.steps !== n.steps) {
      const at = i >= 0 ? i : Math.min(g.steps, n.steps), si = Math.floor(at / 100);
      bad.push(`${k}: first differs at step ${at} (golden ${g.steps} steps, now ${n.steps})\n    nearest golden sample: ${(g.samples[si] || '').slice(0, 300)}\n    nearest now sample:    ${(n.samples[si] || '').slice(0, 300)}`);
    }
  }
  if (bad.length) { console.log('DIFFERENT\n- ' + bad.join('\n- ')); process.exit(1); }
  console.log(`IDENTICAL: ${Object.keys(gold).length} flights, every step (${Object.values(gold).map(g => g.steps).join(', ')} steps)`);
})();
