// Clearer next-gap hint (research/PROPOSAL-GAP-MARKERS.md; ON by default since 2026-10-26 (the user asked for clearer markers); ?gapmarkers=off is the escape hatch). The user, 2026-10-26:
// NO base gates, the hint stays a reward of the three systems (one flavour per line since 2026-11: src/hintlines.js), but it must
// read in DAYTIME: a gate with a dark outline, no-fly zones in red and white stripes, and an arrow at the plane's
// height pointing to the gap (blinking for a big jump from Ops 3). It shows only as far ahead as the systems already spawn
// columns (the kit's hintLead = the ATC line's warning time), so the sky and its timing are unchanged.
// Pure functions (no Phaser, no random): tests/gapmarkers.cjs calls them.
import { WIDTH, HEIGHT, GROUND_H, PLANE } from './config.js';

// The gate's right edge: clear of the heat meter on the right (src/Hud.js: bar at WIDTH - 6 - 8, its tick marks
// reach 3 px further left), so the two never overlap (seen in the 2026-10-26 screenshots).
export const METER_LEFT = WIDTH - 6 - 8 - 3;
export const GATE_RIGHT = METER_LEFT - 2;

export const MARK = {
  jumpBlink: 120,   // px between the plane and the gap's middle: the arrow blinks
  outline: 0x1a1a2e,   // dark edge so the gate reads against a bright day sky
};

// The gate for one storm pair, or null. st: { rects: [top block, bottom block], noFly }; planeY: hitbox top;
// speed px/s; lead: the kit's hintLead s (the ATC line's warning time; 0 = no system bought = no hint). linger: seconds the gate stays after its column has reached the screen
// edge (Forecasting 7+: 1 s); 0 = gone as soon as the real column shows. dy (px from the plane to the gap's middle) and wide (the gap's height) feed the Ops cues (arrow length, icon size).
export function gateFor(st, planeY, speed, lead = 0, linger = 0) {
  if (!(lead > 0)) return null;   // no systems, no hint (the user: no base gates)
  const x = st.rects[0].x;
  if (x < WIDTH - linger * speed) return null;   // on screen: the real column shows it (a lingering gate stays a little longer)
  const ahead = (x - WIDTH) / speed;
  if (ahead > lead + 0.05) return null;
  const top = st.rects[0].height, bot = st.rects[1].y, mid = (top + bot) / 2, dy = mid - (planeY + PLANE.h / 2);
  return { kind: st.noFly ? 'nofly' : 'storm', top, bot, ahead, near: Math.min(1, Math.max(0, 1 - ahead / lead)), dy, wide: bot - top,
    arrow: Math.abs(dy) < (bot - top) / 2 - PLANE.h ? 0 : Math.sign(dy),   // -1 up, +1 down, 0 already level with it
    blink: Math.abs(dy) > MARK.jumpBlink };
}

// The Fuel & operations ICON (the steady 'forecast on' sign from Ops level 5; it REPLACES the presence bracket below, which is no longer drawn): a small fixed sign on the gate's rail, upper quarter of the sky, that carries
// no gap position. lit (Ops 6+) = a gap is in range (a gate is up); size (Ops 10+) = the next gap's size: 'wide' (a gap of 170 px or more) or 'narrow'. null = draw nothing (no Ops 5, or no hint at all).
export const ICON = { size: 10, alphaOn: 0.95, alphaOff: 0.4, wideFrom: 170 };
export function iconFor(flags, first) {
  if (!flags || !flags.icon) return null;
  const mid = Math.round((HEIGHT - GROUND_H) / 4);
  return { x: GATE_RIGHT - ICON.size - 2, y: mid - ICON.size / 2, size: ICON.size, lit: !!(flags.lit && first), alpha: flags.lit && first ? ICON.alphaOn : ICON.alphaOff,
    gapSize: flags.size && first ? (first.wide >= ICON.wideFrom ? 'wide' : 'narrow') : null };
}

// The hint's PRESENCE (2026-11-07, the user: "sometimes it just isn't available ... you see it for part of a flight and then it's off"): with the systems on
// and no gate up, a quiet fixed bracket on the gate's rail says "the hint is running". It carries NO gap information: fixed height (upper quarter of the sky, away from the heat meter marker), fixed alpha,
// no pulse, never moves with a column. null = draw nothing (no systems, or a real gate is showing).
export const PRESENCE = { alpha: 0.3, half: 24, tick: 8 };
export function presenceFor(lead, anyGate) {
  if (!(lead > 0) || anyGate) return null;
  const mid = Math.round((HEIGHT - GROUND_H) / 4);
  return { x: GATE_RIGHT - PRESENCE.tick, right: GATE_RIGHT, top: mid - PRESENCE.half, bot: mid + PRESENCE.half, tick: PRESENCE.tick, alpha: PRESENCE.alpha };
}
