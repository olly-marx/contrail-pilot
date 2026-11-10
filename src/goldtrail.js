// THE GOLDEN CONTRAIL (research/LAP-REWARDS-SPEC.md L3; the user, 2026-11-10): a pilot who has flown the lap (save.lapDone) draws their contrails in gold, from their next flight on. COSMETIC ONLY: pure, no DOM, no clock;
// src/GameScene.js reads the colour where it draws a contrail rectangle and nowhere else. The sim engine (src/sim/*.js) must never import this (tests/goldtrail.cjs checks it): cooling, heat and CO2 come out identical with the flag on and off.
export const GOLD = 0xf0b400, PLAIN = 0xffffff;
export const trailColour = save => (save && save.lapDone ? GOLD : PLAIN);
