// How a flight ends for the gap-flying player at a given skill (sim engine, 2026-10-26): counts crash kinds.
// Env: TREE (default this repo) PLANE=comet|twinFull S=1 SEEDS=20 MAXKM=16000 B=1 (option B storms) PLANT=old HEAT=0 (no overheating)
const TREE = process.env.TREE || new URL('../..', import.meta.url).pathname;
const { simulate } = await import(TREE + '/src/sim/simulate.js');
const P = await import(TREE + '/src/sim/player.js');
if (process.env.PLANT === 'old' && P.__plantOldHazards) P.__plantOldHazards();
const s = +(process.env.S ?? 1), N = +(process.env.SEEDS || 20), maxKm = +(process.env.MAXKM || 16000);
const fleets = { comet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} },
  twinFull: { plane: 'twin', planes: { twin: { engines: 4, body: 4, cabin: 4 } }, systems: { forecast: 6, atc: 6, ops: 6 }, gadgets: { magnet: 6, hold: 6, gear: 6, sensors: 6, autopilot: 6 } } };
const ovr = { ...(process.env.B === '1' ? { STORMS: { startGap: 200, gapShrinkPerPair: 2 } } : {}), ...(process.env.HEAT === '0' ? { CLIMATE: { dangerLine: Infinity } } : {}) };
const ends = {}, km = [], met = { noFly: 0, flocks: 0 };
for (let seed = 1; seed <= N; seed++) {
  const seen = new Set();
  const r = simulate({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 30, mission: 99, simSeed: seed, fuel: 'kerosene', priceVersion: 2, fleet: fleets[process.env.PLANE || 'comet'] },
    { pilot: 'player', skill: s, careful: true, budget: 0.5, seed, crashes: true, maxKm, overrides: ovr,
      onStep: w => { for (const st of w.storms) if (st.noFly && !seen.has(st) && st.rects[0].x < w.plane.x) { seen.add(st); met.noFly++; }
        for (const f of w.birds) if (!seen.has(f) && f.x < w.plane.x) { seen.add(f); met.flocks++; } } });
  const k = r.end === 'crash' ? (r.reason || '?').split('\n')[0] : r.end; ends[k] = (ends[k] || 0) + 1; km.push(r.km);
}
km.sort((a, b) => a - b);
console.log(JSON.stringify({ plane: process.env.PLANE || 'comet', s, plant: process.env.PLANT || '', median: km[N >> 1], ends, met, perNoFly: +((ends['Restricted airspace!'] || 0) / Math.max(1, met.noFly)).toFixed(3), perFlock: +((ends['Bird strike!'] || 0) / Math.max(1, met.flocks)).toFixed(3) }));
