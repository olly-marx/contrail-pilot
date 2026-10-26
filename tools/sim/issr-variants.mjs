// Icy-air spawn variants (sim engine, 2026-10-26): what each switch does to the sky. For today's rule and each
// variant, flies FLIGHTS flights of KM km (straight pilot, crashes off, heat off: it never changes what spawns) and
// measures the icy air spawned: patches and area per 10,000 km, the share spawned at night, mean height and width,
// and the clear lane left through storm gaps (the tallest icy-free lane in each gap, measured as storms appear).
//   node tools/sim/issr-variants.mjs        FLIGHTS=6 KM=20000
// Variants (all OFF unless set; today's sky is bit-identical without them):
//   { ISSR: { thinK: 0.4 } }       thin layers: 0.4 x as tall, 1/0.4 x as wide (the same area)
//   { ISSR: { laneExtra: 40 } }    the clear lane through every storm gap is 40 px taller than today's
//   { ISSR: { revealBoost: 3 } }   icy air shows from 3 x further away (no change to what spawns)
import { createWorld } from '../../src/sim/world.js';
import { CLIMATE, ISSR, PLANE, STORMS } from '../../src/config.js';

const DT = 16.67 / 1000;
export const VARIANTS = { today: {}, thin: { thinK: 0.4 }, lane: { laneExtra: 40 }, reveal: { revealBoost: 3 }, 'thin+lane': { thinK: 0.4, laneExtra: 40 } };

// The tallest icy-free lane inside a storm's gap (the same sweep as P.laneClear, returning the size).
function freeLane(issrs, r, gBot) {
  const gTop = r.height, blocked = issrs.filter(i => !i.fake && i.x < r.x + r.width && i.x + i.width > r.x && i.y < gBot && i.y + i.height > gTop)
    .map(i => [Math.max(gTop, i.y), Math.min(gBot, i.y + i.height)]).sort((a, b) => a[0] - b[0]);
  let free = gTop, best = 0;
  for (const [t, b] of blocked) { best = Math.max(best, t - free); free = Math.max(free, b); }
  return Math.max(best, gBot - free);
}

export function measure(issrVariant, { flights = 6, km = 20000, plane = 'comet' } = {}) {
  const keep = { ...ISSR }, danger = CLIMATE.dangerLine;
  Object.assign(ISSR, issrVariant); CLIMATE.dangerLine = Infinity;
  try {
    const sum = { patches: 0, area: 0, nightArea: 0, h: 0, w: 0, km: 0, lanes: [] };
    for (let seed = 1; seed <= flights; seed++) {
      const w = createWorld({ tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, fuel: 'kerosene', priceVersion: 2,
        fleet: { plane, planes: { [plane]: {} }, systems: {}, gadgets: {} } }, seed);
      for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(DT);
      w.explain = () => false; w.nextAirport.worldX = 1e12; w.hitsStorm = () => false; w.hitBird = () => false; w.spriteBottom = () => -1;
      const at = w.addIssrAt.bind(w), seen = new Set();
      w.addIssrAt = (x, y, ww, hh) => { const r = at(x, y, ww, hh); sum.patches++; sum.area += ww * hh; if (!w.isDay) sum.nightArea += ww * hh; sum.h += hh; sum.w += ww; return r; };
      while (w.distancePx < km && w.state === 'playing') {
        if (w.plane.y > 200 && w.plane.vy > -40) w.applyFlap();
        w.step(DT);
        for (const st of w.storms) if (!st.noFly && !seen.has(st) && st.rects[0].x < PLANE.x + 120) { seen.add(st); sum.lanes.push(freeLane(w.issrs, st.rects[0], st.rects[1].y)); }
      }
      sum.km += w.distancePx;
    }
    const per10k = 10000 / sum.km, lanes = sum.lanes.sort((a, b) => a - b);
    return { patchesPer10k: +(sum.patches * per10k).toFixed(1), areaPer10k: Math.round(sum.area * per10k), nightShare: +(sum.nightArea / sum.area).toFixed(2),
      meanH: Math.round(sum.h / sum.patches), meanW: Math.round(sum.w / sum.patches), laneP10: lanes[Math.floor(lanes.length * 0.1)], laneMedian: lanes[lanes.length >> 1],
      minLaneRule: PLANE.h + STORMS.clearLane + (issrVariant.laneExtra || 0) };
  } finally { for (const k of Object.keys(ISSR)) if (!(k in keep)) delete ISSR[k]; Object.assign(ISSR, keep); CLIMATE.dangerLine = danger; }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const flights = Number(process.env.FLIGHTS || 6), km = Number(process.env.KM || 20000);
  for (const [name, v] of Object.entries(VARIANTS)) console.log(name.padEnd(10), JSON.stringify(v).padEnd(32), JSON.stringify(measure(v, { flights, km })));
}
