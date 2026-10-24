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

## Upgrade looks (WIRED in 0.10.4, plane build session)
Approved art from the art session (tools/art/planes/upgrades/), copied to assets/upgrades/ (in flight, stickers,
towers, stations) and assets/ui/upgrades/ (hangar). Mapping: src/fleet.js LOOKS / STICKERS; layering:
src/planelook.js. Still wanted: looks for FADEC, low-emission combustor, fly-by-wire, seat-back screens, XL bins,
upper-deck lounge, wide-body economy (no look in the spec); bolder in-flight hush-kit and winglets; the
in-flight 747 variants are to be REDONE with PixelLab (art session note).
