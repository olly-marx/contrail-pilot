// Sim engine landing 1 (2026-10-25): physics draws its random numbers from its own seeded stream (this.rng,
// seeded by save.simSeed), decoration keeps Math.random. Check: the same simSeed flown with Math.random
// scrambled (a different sequence each run) gives the SAME flight: storms, icy air, hazards, distance,
// heat, storm pictures and their flips (the pixel outline a crash is checked on), step for step. Then plant a leak (a decoration function drawing from the physics stream) and
// check the flights now differ, so the check can fail.
// Run: python3 -m http.server 8000 & node tests/sim-rng-split.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const STEPS = 2500;

async function fly(b, mathSeed, leak) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  // Decoration's Math.random: a different seeded sequence per run.
  await p.addInitScript(seed => { let a = seed >>> 0; Math.random = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }, mathSeed);
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'],
    landings: 30, mission: 99, simSeed: 4242 })); });
  await p.goto(URL); await ready(p);
  const trace = await p.evaluate(async ([STEPS, leak]) => {
    game.loop.sleep();
    game.scene.render = () => {};
    let t = game.loop.now || performance.now();
    game.scene.getScene('game').scene.restart({ go: true });
    const s = game.scene.getScene('game');
    for (let i = 0; i < 3 || !(s.nextAirport && s.sys.isActive()); i++) { if (i > 3) await new Promise(r => setTimeout(r, 20)); t += 16.67; game.step(t, 16.67); if (i > 3000) throw new Error('scene never started'); }
    game.registry.get('ui').showOnly(null);
    s.hitsStorm = () => false; s.hitBird = () => false; s.explain = () => false; s.nextAirport.worldX = 1e12;
    if (leak) { const f = s.updateLightning; s.updateLightning = function (time) { this.rand(); return f.call(this, time); }; }   // planted
    const out = [];
    for (let i = 0; i < STEPS && s.state !== 'over'; i++) {
      if (s.state === 'playing' && s.plane.y > 200 && s.plane.vy > -40) s.applyFlap();   // the straight pilot
      t += 16.67; game.step(t, 16.67);
      if (i % 50 === 0) out.push([Math.round(s.distancePx), +s.plane.y.toFixed(3), +s.heat.toFixed(4),
        s.storms.map(st => Math.round(st.rects[0].height)).join('/'), s.storms.map(st => (st.pics || []).map(q => q.key.slice(6) + (q.flip ? 'f' : '')).join(',')).join('/'), s.issrs.map(q => `${Math.round(q.y)}:${q.width}`).join('/'),
        s.turbs.length, s.birds.length, s.tokens.length, s.contrails.length].join(' '));
    }
    return out;
  }, [STEPS, leak]);
  await p.close();
  return trace;
}
const firstDiff = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) return `sample ${i}: ${a[i]} | ${b[i]}`; return null; };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const a = await fly(b, 1, false), c = await fly(b, 777, false), leaked = await fly(b, 777, true);
  await b.close();
  const busy = a.length > 10 && /\d/.test(a[a.length - 1].split(' ')[3] || '') && a.some(l => l.split(' ')[4]);
  if (!busy) fails.push(`the flight never had storms and icy air to compare: ${a[a.length - 1]}`);
  const d = firstDiff(a, c); if (d) fails.push(`same simSeed, different decoration: flights differ at ${d}`);
  if (!firstDiff(a, leaked)) fails.push('planted leak (decoration drawing from the physics stream) was NOT caught');
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: same simSeed gives the same flight whatever decoration draws (${a.length} samples, ${a[a.length - 1].split(' ')[0]} px); a planted leak is caught`);
})();
