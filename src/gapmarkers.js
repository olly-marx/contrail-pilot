// Clearer next-gap hint (research/PROPOSAL-GAP-MARKERS.md; behind ?gapmarkers=on until checked). The user, 2026-10-26:
// NO base gates, the hint stays a reward of the three systems (fleet.js hintLevel / GAP_HINT, as today), but it must
// read in DAYTIME: a gate with a dark outline, no-fly zones in red and white stripes, and an arrow at the plane's
// height pointing to the gap (blinking for a big jump). It shows only as far ahead as the systems already spawn
// columns (GAP_HINT.lead), so the sky and its timing are unchanged.
// Pure functions (no Phaser, no random): tests/gapmarkers.cjs calls them.
import { WIDTH, PLANE } from './config.js';

export const MARK = {
  jumpBlink: 120,   // px between the plane and the gap's middle: the arrow blinks
  outline: 0x1a1a2e,   // dark edge so the gate reads against a bright day sky
};

// The gate for one storm pair, or null. st: { rects: [top block, bottom block], noFly }; planeY: hitbox top;
// speed px/s; lead: GAP_HINT.lead s from the systems (0 = no systems = no gate).
export function gateFor(st, planeY, speed, lead = 0) {
  if (!(lead > 0)) return null;   // no systems, no hint (the user: no base gates)
  const x = st.rects[0].x;
  if (x < WIDTH) return null;   // on screen: the real column shows it
  const ahead = (x - WIDTH) / speed;
  if (ahead > lead + 0.05) return null;
  const top = st.rects[0].height, bot = st.rects[1].y, mid = (top + bot) / 2, dy = mid - (planeY + PLANE.h / 2);
  return { kind: st.noFly ? 'nofly' : 'storm', top, bot, ahead, near: Math.min(1, Math.max(0, 1 - ahead / lead)),
    arrow: Math.abs(dy) < (bot - top) / 2 - PLANE.h ? 0 : Math.sign(dy),   // -1 up, +1 down, 0 already level with it
    blink: Math.abs(dy) > MARK.jumpBlink };
}
