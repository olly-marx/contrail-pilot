// The test pilots (moved from tools/balance.cjs, 2026-10-25), so the browser probe and the simulation
// engine fly with the same code. A pilot looks at the flight and says which height (y, px from the top)
// it wants; the caller flaps when the plane is below it: `if (plane.y > target && plane.vy > -40) flap()`.
//   straight: holds y = 200 and ignores icy air.
//   smart:    out of icy air at night, into it by day, always inside the next storm gap. Sees ALL icy air.
//   careful:  smart, but blind to icy air not yet revealed (alpha at the hidden level), like a human.
// `f` is the flight: the GameScene now, the engine's world later. It reads only f.plane {x, y},
// f.storms[].rects[0..1] {x, y, width, height}, f.issrs[] {x, y, width, height, alpha}, f.kit, f.clock.
import { DAYNIGHT, HEIGHT, GROUND_H } from '../config.js';
const SKY_H = HEIGHT - GROUND_H;

export const PILOTS = ['straight', 'smart', 'careful'];

// Shade is only worth it if the contrail is gone before sunset: contrails on screen at night trap heat
// whenever they were made. So "day" for the smart pilot ends one contrail life early.
export function goodDay(f) {
  const c = f.clock % (DAYNIGHT.daySeconds + DAYNIGHT.nightSeconds);
  return c < DAYNIGHT.daySeconds - DAYNIGHT.blendSeconds - f.kit.contrailLife / 1000;
}

export function pilotTarget(f, pilot) {
  if (pilot === 'straight') return 200;
  const st = f.storms.filter(t => t.rects[0].x + t.rects[0].width > f.plane.x - 4 && t.rects[0].x < f.plane.x + 160)[0];
  const lo = st ? st.rects[0].height + 6 : 30, hi = st ? st.rects[1].y - 20 : SKY_H - 60;
  let best = (lo + hi) / 2, bestScore = -1e9;
  // Room from the nearest icy air ahead at height y (0 = inside it). The plane bobs ~40 px per tap,
  // so at night it wants lots of room; by day it wants to be deep inside.
  const seen = i => pilot !== 'careful' || i.alpha > (f.kit.hiddenAlpha || 0) + 0.01;
  const ahead = f.issrs.filter(i => seen(i) && i.x < f.plane.x + 220 && i.x + i.width > f.plane.x - 10);
  const room = y => ahead.reduce((m, i) => Math.min(m, Math.max(0, i.y - (y + 14), y - 2 - (i.y + i.height))), 999);
  const depth = y => ahead.reduce((m, i) => Math.max(m, Math.min(y - 2 - i.y, i.y + i.height - (y + 14))), -999);
  const day = goodDay(f);
  for (let y = lo; y <= hi; y += 4) {
    const score = (day ? Math.min(depth(y), 40) : Math.min(room(y), 60)) - Math.abs(y - f.plane.y) * 0.05;
    if (score > bestScore) { bestScore = score; best = y; }
  }
  return best;
}
