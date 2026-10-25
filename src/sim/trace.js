// One line per frame describing a flight's physics (sim engine, 2026-10-25), for comparing the game with the
// engine step by step (tools/sim/trace.cjs, tests/sim-equiv.cjs). f: the GameScene or a world; hits: 'S'/'B'
// for a storm or bird touched this frame (crashes are switched off while tracing).
const r6 = v => Math.round(v * 1e6) / 1e6;
export function traceLine(f, i, hits) {
  const B = f.breakdown;
  return [i, r6(f.distancePx), r6(f.plane.y), r6(f.plane.vy), r6(f.heat), r6(B.co2), r6(B.night), r6(B.sun), r6(B.trees), f.isDay ? 1 : 0, hits, f.cargo,
    f.storms.map(st => `${r6(st.rects[0].x)},${r6(st.rects[0].height)},${r6(st.rects[1].y)},${(st.pics || []).map(q => q.key.slice(6) + (q.flip ? 'f' : '')).join('.')}`).join(';'),
    f.issrs.map(q => `${r6(q.x)},${q.y},${q.width},${q.height},${r6(q.alpha)},${q.fake ? 1 : 0}`).join(';'),
    f.contrails.map(c => `${r6(c.x)},${r6(c.y)}`).join(';'),
    f.tokens.map(k => `${r6(k.x)},${r6(k.y)}`).join(';'),
    f.birds.map(fl => `${r6(fl.x)},${r6(fl.y)}`).join(';'), f.turbs.length].join('|');
}
// FNV-1a, chained: the chain value after a step depends on every line so far.
export function chainHash(h, line) {
  for (let i = 0; i < line.length; i++) { h ^= line.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
export const CHAIN_START = 0x811c9dc5;

// Fly a flight with crashes off, tracing every step. step(): advance one frame. Returns { steps, chain, samples }.
export function traceFlight(f, step, pilotTarget, pilot, STEPS, EVERY = 100) {
  let hits = '';
  const hs = f.hitsStorm.bind(f), hb = f.hitBird.bind(f);
  f.hitsStorm = st => { if (hs(st)) hits += 'S'; return false; };
  f.hitBird = box => { if (hb(box)) hits += 'B'; return false; };
  f.explain = () => false; f.nextAirport.worldX = 1e12;
  let h = CHAIN_START; const chain = [], samples = [];
  for (let i = 0; i < STEPS && f.state === 'playing'; i++) {
    if (f.plane.y > pilotTarget(f, pilot) && f.plane.vy > -40) f.applyFlap();
    hits = ''; step();
    const line = traceLine(f, i, hits);
    chain.push(h = chainHash(h, line));
    if (i % EVERY === 0) samples.push(line);
  }
  return { steps: chain.length, km: Math.round(f.distancePx), heat: Math.round(f.heat * 1e6) / 1e6, chain, samples };
}
