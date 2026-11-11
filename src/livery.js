// THE LAP LIVERY (research/LAP-REWARDS-SPEC.md; the user, 2026-11-10 and 2026-11-11): a pilot who has flown the lap (save.lapDone, set by src/crossings.js completeCrossing) gets a small globe on the tail and a thin gold stripe on every plane,
// in the hangar picture and in the flight sprite, from the next picture drawn on. COSMETIC ONLY: pure, no DOM, no clock. The pictures are made by tools/art/make_livery.py (the whole plane with a few pixels painted) and sit in
// assets/upgrades/plane-<art>-livery.png (flight) and assets/ui/upgrades/hangar-<art>-livery.png (hangar). The sim engine (src/sim/*.js) must never import this (tests/liverylook.cjs checks it).
export const liveryOn = save => !!(save && save.lapDone);
