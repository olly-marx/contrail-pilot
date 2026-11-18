// The gap model (2026-11-18, research/GAP-FEASIBILITY-HUMAN-2026-11-18.md). Pure, no imports of state: numbers in, numbers out.
// How far up (climb) or down (dive) a player can move between two consecutive gaps, from the game's own physics:
//   climb: c = (tap speed) - gravity * T / 2 is the mean climb rate tapping every T s; the player learns of the next
//          column when it reaches the screen edge (`ahead` px in front of the plane's nose), reacts after RT s, and starts
//          from the middle of the last gap (+ g/2 of free room). Fitted constant 2.5 px; checked to +-7 px against the
//          exact search (tools/sim/jumpcurve.mjs) at gaps 87, 115 and 150, speeds 120-200, taps 133-200 ms.
//   dive:  falling at most maxFall px/s for the same time; constant -78.5 px fitted (speeds 180-240, gaps 87 and 115).
//   both capped by the sky: 384 - g.
export function reach({ v, g, T, RT, ahead = 178, flap = 260, gravity = 900, maxFall = 400, sky = 384 }) {
  const t = Math.max(0, ahead / Math.max(1, v) - RT), c = flap - gravity * T / 2;
  return { up: Math.min(sky - g, c * t + g / 2 + 2.5), down: Math.min(sky - g, maxFall * t + g / 2 - 78.5) };
}
// The reference player at distance d (km): z standard deviations above average, taps T s apart, reaction RT s.
export function reference(m, d) {
  const k = Math.max(0, Math.min(1, (d - m.d0) / (m.d1 - m.d0))), z = m.z0 + (m.z1 - m.z0) * k;
  return { z, T: (m.tapMs - m.tapSd * z) / 1000, RT: m.rt - m.rtSd * z };
}
