// Balance probe: how far can a plane fly before the Earth overheats? Runs the game in steps, much
// faster than real time (~3,600 km per second), with crashes switched off so only heat ends it.
// Two pilots:
//   straight: holds the middle of the sky and ignores icy air.
//   smart:    near-perfect contrail choices: out of icy air at night, into it by day, always
//             inside the next storm gap. It sees ALL icy air (even unrevealed), so it is a bit
//             better than a real player.
// Usage: python3 -m http.server 8000 & node tools/balance.cjs            (prints a table)
//        PLANES=hydrogen PILOTS=smart MAX=100000 node tools/balance.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
const MAX = Number(process.env.MAX || 100000);   // km

const ALL_NATURE = { trees: 4, species: 4, rewild: 9 };
const PLANES = {
  none: { levels: {}, fuel: 'kerosene' },
  saf: { levels: { fuel: 3, engine: 3, cabin: 4, ...ALL_NATURE }, fuel: 'saf100' },
  hydrogen: { levels: { fuel: 4, engine: 3, cabin: 4, ...ALL_NATURE }, fuel: 'hydrogen' },
  hydrogenMax: { levels: { fuel: 4, engine: 5, cabin: 4, airframe: 3, ...ALL_NATURE }, fuel: 'hydrogen' },
};

async function run(b, plane, pilot, seed = 1) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  // Repeatable skies: the same seed gives the same storms, icy air and birds (Math.random + Phaser's RND).
  await p.addInitScript(seed => { let a = seed >>> 0; window.__reseed = () => { a = seed >>> 0; }; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
  await p.addInitScript(cfg => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 30, mission: 99,
    planted: { oak: 5, birch: 5, rowan: 5, spruce: 5, orchard: 5 }, ...cfg })); }, PLANES[plane]);
  // Seed Phaser's RND the moment the library loads (it would otherwise seed from the clock).
  await p.addInitScript(() => { let P; Object.defineProperty(window, 'Phaser', { configurable: true, get: () => P, set: v => { P = v; v.Math.RND.sow(['balance']); } }); });
  await p.goto(URL); await p.waitForTimeout(900);
  const r = await p.evaluate(async ([pilot, MAX]) => {
    const { DAYNIGHT } = await import('./src/config.js');
    // Pause the real-time loop, re-seed both random sources, and rebuild the scene from scratch, so
    // nothing the title screen did in real time (it animates wildlife) changes the flight.
    game.loop.sleep(); window.__reseed(); Phaser.Math.RND.sow(['balance']);
    let t0 = game.loop.now || performance.now();
    game.scene.getScene('game').scene.restart({ go: true });
    for (let i = 0; i < 3; i++) { t0 += 16.67; game.step(t0, 16.67); }
    const s = game.scene.getScene('game'), SKY_H = 512 - 48;
    // Shade is only worth it if the contrail is gone before sunset: contrails on screen at night
    // trap heat whenever they were made. So "day" for the smart pilot ends one contrail life early.
    const goodDay = () => { const c = s.clock % (DAYNIGHT.daySeconds + DAYNIGHT.nightSeconds);
      return c < DAYNIGHT.daySeconds - DAYNIGHT.blendSeconds - s.kit.contrailLife / 1000; };
    game.registry.get('ui').showOnly(null);
    for (let i = 0; i < 2000 && s.state !== 'playing'; i++) { t0 += 16.67; game.step(t0, 16.67); }   // take-off, stepped
    s.hitsStorm = () => false; s.hitBird = () => false; s.explain = () => false; s.nextAirport.worldX = 1e12;
    const box = (i, y) => i.x < s.plane.x + 180 && i.x + i.width > s.plane.x - 10 && i.y < y + 14 && i.y + i.height > y - 2;
    const target = () => {
      if (pilot === 'straight') return 200;
      const st = s.storms.filter(t => t.rects[0].x + t.rects[0].width > s.plane.x - 4 && t.rects[0].x < s.plane.x + 160)[0];
      const lo = st ? st.rects[0].height + 6 : 30, hi = st ? st.rects[1].y - 20 : SKY_H - 60;
      let best = (lo + hi) / 2, bestScore = -1e9;
      // Room from the nearest icy air ahead at height y (0 = inside it). The plane bobs ~40 px
      // per tap, so at night it wants lots of room; by day it wants to be deep inside.
      const ahead = s.issrs.filter(i => i.x < s.plane.x + 220 && i.x + i.width > s.plane.x - 10);
      const room = y => ahead.reduce((m, i) => Math.min(m, Math.max(0, i.y - (y + 14), y - 2 - (i.y + i.height))), 999);
      const depth = y => ahead.reduce((m, i) => Math.max(m, Math.min(y - 2 - i.y, i.y + i.height - (y + 14))), -999);
      for (let y = lo; y <= hi; y += 4) {
        const score = (goodDay() ? Math.min(depth(y), 40) : Math.min(room(y), 60)) - Math.abs(y - s.plane.y) * 0.05;
        if (score > bestScore) { bestScore = score; best = y; }
      }
      return best;
    };
    let t = t0, steps = 0, peak = -1e9, low = 1e9, nightFrames = 0, nightIn = 0, nightGap = 0;
    const marks = [];
    while (s.state === 'playing' && s.distancePx < MAX && steps < 3e6) {
      t += 16.67; steps++;
      if (s.plane.y > target() && s.plane.vy > -40) s.applyFlap();
      game.step(t, 16.67);
      peak = Math.max(peak, s.heat); low = Math.min(low, s.heat);
      if (!s.isDay) { nightFrames++; if (s.issrs.some(i => s.inIssrShape(i, s.hitbox()))) nightIn++; if (s.storms.some(t => t.rects[0].x < s.plane.x + 60 && t.rects[0].x + t.rects[0].width > s.plane.x)) nightGap++; }
      if (steps % 2000 === 0) marks.push([Math.round(s.distancePx), Math.round(s.heat)]);
    }
    const B = s.breakdown;
    return { km: Math.round(s.distancePx), overheated: s.state === 'over', heat: Math.round(s.heat), low: Math.round(low),
      co2: Math.round(B.co2), night: Math.round(B.night), sun: Math.round(B.sun), trees: Math.round(B.trees), nightIn: +(nightIn / Math.max(1, nightFrames)).toFixed(3), marks: marks.filter((_, i) => i % 5 === 0) };
  }, [pilot, MAX]);
  await p.close();
  return r;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const planes = (process.env.PLANES || 'none,saf,hydrogen').split(','), pilots = (process.env.PILOTS || 'straight,smart').split(',');
  const rows = [];
  const seeds = (process.env.SEEDS || '1,2,3').split(',').map(Number);
  for (const plane of planes) for (const pilot of pilots) {
    const rs = []; for (const seed of seeds) rs.push(await run(b, plane, pilot, seed));
    const kms = rs.map(r => r.overheated ? r.km : Infinity).sort((x, y) => x - y), median = kms[Math.floor(kms.length / 2)];
    rows.push({ plane, pilot, median, runs: rs.map(r => ({ km: r.km, overheated: r.overheated, nightIn: r.nightIn })) });
    console.log(`${plane.padEnd(12)} ${pilot.padEnd(9)} median ${median === Infinity ? `> ${MAX}` : median} km   runs: ${rs.map(r => `${r.overheated ? '' : '>'}${r.km} (${Math.round(r.nightIn * 100)}% icy at night)`).join(', ')}`);
  }
  await b.close();
  if (process.env.JSON) console.log(JSON.stringify(rows));
})();
