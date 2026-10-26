// Clearer next-gap hint (research/PROPOSAL-GAP-MARKERS.md; ON by default since 2026-10-26 (the user asked for clearer markers); ?gapmarkers=off is the escape hatch). The user, 2026-10-26:
// NO base gates, the hint stays a reward of the three systems (fleet.js hintLevel / GAP_HINT, as today), but it must
// read in DAYTIME: a gate with a dark outline, no-fly zones in red and white stripes, and an arrow at the plane's
// height pointing to the gap (blinking for a big jump). It shows only as far ahead as the systems already spawn
// columns (GAP_HINT.lead), so the sky and its timing are unchanged.
// Pure functions (no Phaser, no random): tests/gapmarkers.cjs calls them.
import { WIDTH, PLANE } from './config.js';

// The gate's right edge: clear of the heat meter on the right (src/Hud.js: bar at WIDTH - 6 - 8, its tick marks
// reach 3 px further left), so the two never overlap (seen in the 2026-10-26 screenshots).
export const METER_LEFT = WIDTH - 6 - 8 - 3;
export const GATE_RIGHT = METER_LEFT - 2;

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
