// THE NEXT-GAP HINT, ONE FLAVOUR PER UPGRADE LINE (the user, 2026-11-10: 'nerf everyone, no refund'; research/DESIGN-UPGRADE-BAR.md part A, research/GAP-HINT-LEVELS-PLAN.md sections 7 and 9, the sim chat's final numbers).
// The old single hint level (fleet.js gapHintLevel, one number from the three systems) is gone. Each of the three lines owns ONE thing and its own ladder:
//   Forecasting (forecast)   = THE GATE: no gate at levels 1-2; a faint gate bracket from level 3; the opening filled from 4; a centre tick from 5; brighter at 6; the gate lingers 1 s from 7; brighter again to 12.
//   Air traffic control (atc) = THE WARNING TIME: the lead 0.5 s (level 1) to 2.2 s (level 9) in steps of 0.2 s, 2.4 s at level 10, 2.5 s at 11 and 12; the SECOND gate (the gap after next, smaller) at level 10; the CLIMB BOOST count 1 / 2 / 3 at levels 10 / 11 / 12.
//   Fuel & operations (ops)   = THE CUES on the arrow: red when urgent (2), blinks for a big move (3), larger (4), the steady 'forecast on' ICON (5), lit while a gap is in range (6), a tick sound when a gap enters the window (7),
//                                the arrow's length shows the distance (8), the icon shows the gap's size (10).
// The FIRST line bought (any of the three, level 1) gives a usable ARROW: up or down, lead 0.5 s, no gate. The spawn lead (rules.js, where columns are created) and the pilot model's lead use the ATC lead only (0.5 s if ATC is not bought).
// Pure: no DOM, no clock, no random numbers, no imports. tests/hintlines.cjs holds it; src/fleet.js fleetKit() carries the result as kit.hint* fields.
export const ATC_LEAD = [0, 0.5, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.5, 2.5];
export const GATE_FROM = 3, FILL_FROM = 4, CENTRE_FROM = 5, LINGER_FROM = 7, LINGER_S = 1, SECOND_GATE_FROM = 10;
export const GATE_ALPHA = [0, 0, 0, 0.4, 0.5, 0.55, 0.6, 0.65, 0.75, 0.8, 0.85, 0.9, 0.94];   // by Forecasting level (0.75 at level 8 up to 0.94 at 12: the plan's alphas; the early ones are the faint outline)
export const BOOST_BY_ATC = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3];   // climb boosts per flight (the count only: the mechanic itself is NOT built, it needs the sim chat's sign-off and a trigger design)
export const CUE_FROM = { red: 2, blink: 3, big: 4, icon: 5, lit: 6, tick: 7, length: 8, size: 10 };   // Fuel & operations level at which each cue starts
export const URGENT_NEAR = 0.6;   // a gap is 'urgent' once it is this close to the screen edge (near = 1 - ahead / lead)
const lvl = n => Math.max(0, Math.min(12, Math.floor(n) || 0));

// The kit fields from the three systems' levels (Forecasting, ATC, Ops). All zero / false when no system is bought.
export function hintFor(F, A, O) {
  F = lvl(F); A = lvl(A); O = lvl(O);
  const any = F + A + O > 0;
  return { hintLead: any ? ATC_LEAD[A] || ATC_LEAD[1] : 0, hintArrow: any, hintGate: F, hintSecond: A >= SECOND_GATE_FROM, hintBoost: BOOST_BY_ATC[A], hintCues: O };
}
// What the drawing does for a kit: flags (pure; GameScene reads these and nothing else).
export function hintFlags(k) {
  const F = lvl(k.hintGate), O = lvl(k.hintCues), lead = k.hintLead || 0;
  return { lead, arrow: lead > 0, gate: lead > 0 && F >= GATE_FROM, gateAlpha: GATE_ALPHA[F], fill: F >= FILL_FROM, centre: F >= CENTRE_FROM, linger: F >= LINGER_FROM ? LINGER_S : 0, second: !!k.hintSecond && lead > 0,
    red: lead > 0 && O >= CUE_FROM.red, blink: lead > 0 && O >= CUE_FROM.blink, big: lead > 0 && O >= CUE_FROM.big, icon: lead > 0 && O >= CUE_FROM.icon, lit: O >= CUE_FROM.lit, tick: lead > 0 && O >= CUE_FROM.tick,
    length: O >= CUE_FROM.length, size: O >= CUE_FROM.size };
}
