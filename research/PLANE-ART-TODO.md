# Plane art still needed (kept by the plane build session; the art session replaces these)

Every item below is in the game as a hand-drawn PLACEHOLDER (or not yet drawn). Slot rules agreed with
the art session (2026-10-23): in-flight sprites 62x27, same pose/footprint as assets/plane.png, key
`plane-<gen>` at `assets/plane-<gen>.png`; collisions keep the base 'plane' mask. Hangar portraits
400x176 at `assets/ui/plane-hangar-<gen>.png`. Gadget stickers are decoration only. Towers 13x30 like
assets/tower.png. Recipe: research/PLANE-ART-RECIPE.md.

| Slot | Path | Status |
|---|---|---|
| 747 (1970s) in flight | assets/plane.png | DONE (the original) |
| 747 hangar portrait | assets/ui/plane-hangar-jumbo.png | DONE (art session) |
| Comet 4 (1950s) in flight | assets/plane-comet.png | DONE: tools/art/planes/plane-comet.png; copy to assets/ and preload in the SAME change (tests/textures.cjs) |
| Comet 4 hangar portrait | assets/ui/plane-hangar-comet.png | DONE (art session) |
| 1990s twin in flight | assets/plane-twin.png | DONE (art session) |
| 1990s twin hangar portrait | assets/ui/plane-hangar-twin.png | DONE (art session) |

More rows (gadget stickers, towers by era, system icons) are added as each stage uses them.

## Gadget looks (in flight; decoration only, never collision)
Placeholders: the OLD upgrade overlays, one per era tier (tier = ceil(level / 2)), drawn by
GameScene.buildPlaneParts. Each needs a real per-era look (PLANE-ERAS-1-3.md section 5):

| Gadget | Placeholder now | Wanted: 1950s / 1970s / 1990s |
|---|---|---|
| Magnet | plane-magnet-1..3 | red horseshoe / copper coil / silver disc |
| Cargo hold | plane-hold-1..3 | mail sacks at the hold door / belly fairing / bigger fairing |
| Landing gear | plane-gear-1..2 (shown on the ground) | two-wheel legs / four-wheel bogies / six-wheel bogies |
| Sensors | plane-radar-1..3 | nose thermometer probe / radar nose cone / side humidity probe |
| Autopilot | (nothing yet) | antenna on top / two antennas / satellite dome |

## Era welcome cards (stage 3c, PixelLab, prompts to be approved by the user)
Not made yet.
