// Seeded random numbers for the simulation engine (src/sim/, 2026-10-25). The same generator
// tools/balance.cjs puts in place of Math.random, so a seed means the same thing in both.
// makeRng(seed)() -> a number in [0, 1), like Math.random.
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
