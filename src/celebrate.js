// The CELEBRATION KIT (research/CELEBRATION-KIT.md; the user approved steps 1-3 and 5 of the sound + celebration plan): ONE reusable burst for the out-of-flight screens, used the same way everywhere instead of a bespoke
// animation per event. Four beats: BURST (a layer of square pixel sparkles, all CSS, one-shot), PUSH (the card scales in once), STINGER (the cue: this kit is the ONLY place a celebration plays its sound, so picture and
// sound cannot drift apart), SETTLE (the layer is gone, the host is marked done and never replays). Reduced motion: no sparkles, no push; the cue still plays and a still gold outline shows for a second.
// Pure parts (sizes, specs, the event table) are tested in Node (tests/celebrate.cjs); the DOM part takes its dependencies as an argument so the same test can run it against a tiny fake DOM.
import { sfx } from './sound.js';

export const PARTICLE_CAP = 24;   // the most sparkles any burst makes (the 320x568 card has room for no more, and each is one element)
export const SIZES = { small: { particles: 8, settleMs: 500, push: false }, medium: { particles: 16, settleMs: 900, push: true }, large: { particles: 24, settleMs: 1400, push: true } };
export const REACH_PX = 120;      // the farthest a sparkle travels from the burst's centre: inside half the narrowest card (294 px at 320 wide)
export const PALETTE = ['#ffe15a', '#ffffff', '#7fd0ff', '#8dffb0'];   // the game's gold, white, cool blue, green

// WHICH EVENT GETS WHICH BURST AND CUE (declared, not inferred). NOT here on purpose: a crash. A crossing that is lost (crossing-lost), a flight that crashes, an overheat: no particles, no celebration.
export const CELEBRATIONS = {
  'crossing-landed': { size: 'large', cue: 'welcome' },
  'era-opens': { size: 'large', cue: 'era' },
  'part-arrives': { size: 'medium', cue: 'reveal' },
  'mission-done': { size: 'medium', cue: 'done' },
  'badge-earned': { size: 'medium', cue: 'medal' },
  'nature-funded': { size: 'small', cue: 'grow' },
};

// n sparkles on a deterministic spiral (no random numbers: the same burst every time, testable): angle by the golden angle, distance growing with the index, a small stagger.
export function particleSpecs(n) {
  const out = [], k = Math.min(n, PARTICLE_CAP);
  for (let i = 0; i < k; i++) {
    const a = i * 2.399963, r = REACH_PX * (0.45 + 0.55 * ((i * 37) % k) / Math.max(1, k - 1));
    out.push({ x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r * 0.8), delay: +(((i * 53) % 7) * 0.04).toFixed(2), colour: PALETTE[i % PALETTE.length] });
  }
  return out;
}

// What a burst does: how many sparkles, whether the card pushes, how long until it settles. Reduced motion: none of the motion, still the cue, a still outline.
export function celebrationPlan(size, { reduced = false } = {}) {
  const s = SIZES[size];
  if (!s) throw new Error(`celebrate: unknown size ${size}`);
  return reduced ? { particles: 0, push: false, still: true, settleMs: 1000 } : { particles: Math.min(s.particles, PARTICLE_CAP), push: s.push, still: false, settleMs: s.settleMs };
}

const defaults = () => ({
  sfx,
  reduced: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  schedule: (fn, ms) => setTimeout(fn, ms),
});

// Celebrate on `host` (an element with position: relative or absolute, e.g. .payoff-card): the burst, the push, the cue, the settle. Once per host: a re-render or a second call does nothing.
// Returns true if it played. deps = { sfx, reduced, schedule } (the test injects them).
export function celebrate(host, { size = 'medium', cue = null } = {}, deps = defaults()) {
  if (!host || host.dataset.celebrated === '1') return false;
  const plan = celebrationPlan(size, { reduced: deps.reduced });
  host.dataset.celebrated = '1';
  if (cue && deps.sfx && typeof deps.sfx[cue] === 'function') deps.sfx[cue]();   // the stinger: the kit is the only caller of a celebration's cue
  if (plan.still) { host.classList.add('cel-still'); deps.schedule(() => host.classList.remove('cel-still'), plan.settleMs); return true; }
  if (plan.push) { host.classList.add('cel-push'); deps.schedule(() => host.classList.remove('cel-push'), 400); }
  if (plan.particles) {
    const layer = host.ownerDocument.createElement('div');
    layer.className = 'cel-layer';
    for (const p of particleSpecs(plan.particles)) {
      const i = host.ownerDocument.createElement('i');
      i.style.setProperty('--x', `${p.x}px`); i.style.setProperty('--y', `${p.y}px`); i.style.setProperty('--d', `${p.delay}s`); i.style.setProperty('--c', p.colour);
      layer.appendChild(i);
    }
    host.appendChild(layer);
    deps.schedule(() => layer.remove(), plan.settleMs);
  }
  return true;
}

// Celebrate a named event from the declared table. An unknown event (a crash is not in it) does nothing.
export function celebrateEvent(host, event, deps) {
  const c = CELEBRATIONS[event];
  return c ? celebrate(host, c, deps) : false;
}
