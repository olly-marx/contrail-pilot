# Proposal 8: motion effects on the plane (plane build, 2026-10-25). PROPOSAL ONLY, nothing built

## Decisions for the user (top)
1. Which effects? Proposed: A (engine glow by engine level), B (magnet pulse ring), C (autopilot blink). D (buy
   sparkle) already exists; keep it as it is (the art session asked the user; no answer recorded).
2. Code-drawn (Phaser graphics, no new art, free) or PixelLab frames (~4 frames each, ~10 generations each at
   inpaint prices)? Proposed: code-drawn first; art only if they look thin.
3. Show them in Flight School and the first onboarding flights? Proposed: no (one new thing at a time).

## What exists today (code, origin/main)
- Nav lights: `plane-lights` double blink every 1.2 s (GameScene.syncPlaneParts).
- Exhaust shimmer: `plane-shimmer-0..2`, cycled every 90 ms while the engines run.
- Sparkle on the first take-off after a purchase: `plane-sparkle-0..3` (save.sparkle).

## The proposal
| Effect | When | What it looks like | How |
|---|---|---|---|
| A. Engine glow | Engines level >= 2 on any plane | the shimmer gets a warm core and is 1 px longer per level; next-gen engines (747 L3, twin L4) flicker faster | tint + scale of the existing shimmer sprite: no new art |
| B. Magnet pulse | Magnet gadget owned | a thin ring grows from the magnet sticker to the pick-up radius every 2 s, fading out; brighter when a seed is pulled | one Graphics circle per pulse, radius = kit.pickup |
| C. Autopilot blink | Autopilot gadget owned | the antenna sticker blinks green; while the autopilot pick-up is flying the plane, it blinks fast and a small "AP" shows | alpha tween on the sticker; text exists (autoText) |

Rules: decoration only, never collision, nothing new to learn in flight, and nothing that covers the plane's
outline (players read its position from it). Cost: one Graphics object and a few tweens; well inside the frame
budget measured for the capability study.

## Tests (when built)
Each effect appears only with its upgrade (fails on a planted "always on"), never in Flight School, and the
plane's collision mask is unchanged (tests/collisions.cjs).
