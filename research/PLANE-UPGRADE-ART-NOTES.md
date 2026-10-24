# Plane upgrade art: what the user approved, and how (art session, 2026-10-23)

Handoff notes for the next art session. Spec of every upgrade: research/PLANE-ERAS-1-3.md (draft 2, approved;
"Look" columns). Recipe for planes and hangar parts: research/PLANE-ART-RECIPE.md. Mock-up images:
tools/art/planes/mockups/. The build session ("Contrail Pilot plane build") writes the code and lists the art it
wants in research/PLANE-ART-TODO.md; the game session ("Contrails game prototype") owns most other game code.

## Done (art)
- Planes, in flight (62x27) and hangar (400x176), era-painted: Comet (1950s), 747 (1970s), twin (1990s).
  Files: tools/art/planes/plane-{comet,747,twin}.png (+ *-base.png unpainted), assets/ui/plane-hangar-*.png.
  The build session has copied them into assets/ and will commit them with release 0.10.0.

## Approved looks (from mock-ups; NOT yet produced as final assets)
- In-flight rule, AMENDED 2026-10-23 (user): every bought upgrade must be OBVIOUS at real size, or players feel
  they paid for "the same freaking plane". So (1) upgrades repaint BIG areas in metal (silver nacelles, gloss-black
  nose, broad gold band); (2) engines and the upper-deck hump may grow the outline up to 5 px (SHAPE_SLACK in
  tools/art/make_upgrades.py; collisions still use the base 'plane' mask); (3) motion effects (engine shimmer,
  magnet pulse ring, autopilot blink) are code for the build session, the art session draws any frames. The user
  rejected (4), a "fitted" highlight on the first take-off. Judge variants at real size (real-size-2x.png), not zoomed.
  Superseded: "changes stay inside the original outline +-2 px" - wrong now for engines/hump, still the default
  for everything else; the 2026-10-23 first draft under that rule was rejected as invisible.
- Plane-line upgrades on the 747 (mockups/approved-inflight-plane-upgrades.png): JT9D fan faces, next-gen
  engines (blue lips + chevrons), glass cockpit, business-class GOLD stripe, stretched upper deck: all approved.
  Hush-kit nacelles and winglets were too subtle in flight: make them bolder, or hangar-only.
- Gadgets (mockups/approved-gadgets-towers-stations.png): BOLD stickers ~5x4 px with a dark outline: red
  horseshoe (1950s), copper coil + iron core + blue spark (1970s), silver disc + blue field-line sparkles (1990s).
  v1 (mockups/gadget-ladders-v1-too-subtle.png) was rejected as too subtle. Also: nose thermometer, radar nose
  cone, antennas -> satellite dome, mail sacks -> belly fairing, landing gear (shown when gear is down).
  Stickers are decoration, never collision.
- ATC towers, 13x30 like assets/tower.png, NO outline (today's style), one visible addition per level:
  L1 brick + mast + flag, L2 + windsock + aerial, L3 concrete + radar dish, L4 bigger dish + red beacon,
  L5 glass-topped + satellite dish, L6 + antenna array.
- Weather stations, 16x16: 1950s Stevenson screen + cup anemometer + balloon; 1970s office + radar dome;
  1990s hut with a glowing screen + satellite dish. (Hangar forecast screen = later UI.)
- Hangar zoom-in "FITTING: <part>" effect with a gold glow frame (mockups/hangar-zoom-fitting-effect.png):
  approved as the UI idea; the build session implements it.
- Hangar parts: real PixelLab INPAINT in <=256 px windows of the portrait, paste back ONLY the mask.
  Jumbo: next-gen engines and glass cockpit worked first time; the winglet needed a pasted SKETCH first
  (mockups/hangar-parts-*.png, mockups/hangar-jumbo-3-parts-applied.png). Hand-drawn hangar parts were rejected
  as flat.

## Constraints
- Era paint uses the whole hue range (rust/orange/amber/green/teal/iridescent): upgrade colour marks must use
  neutral/metallic colours (gold, silver, black), never another era's accent (user, 2026-10-23).
- assets/*.png must be loaded by the game or tests/textures.cjs fails: put unwired art in tools/art/planes/
  and let the build session copy it into assets/ when it wires it in.
- PixelLab: subscription (inpaint ok, ~1,880 generations left on 2026-10-23); take turns with the other
  sessions; the REST API (env PIXELLAB_TOKEN, set at run time from ~/.claude.json, never printed or committed)
  is cheaper on Claude usage than headless `claude -p`.

## Progress (2026-10-23, art session)
- In-flight 747 bold variants APPROVED by the user ("alright, good for now"): tools/art/planes/upgrades/
  plane-747-*.png from tools/art/make_upgrades.py. To be REDONE with PixelLab later (added to the art list).
- Hangar 747 parts, first set (awaiting approval): nextgen (silver nacelles) and glass (gloss-black nose cap) by
  PixelLab inpaint-v3 over a pasted sketch (tools/art/hangar_parts.py, REST); business gold band by local recolour;
  hangar-747-full.png = all three. 3 inpaint calls used ~30 generations.
