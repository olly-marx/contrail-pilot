# Plane art recipe (LOCKED with the user, 2026-10-23)

Every plane gets two pictures, made the same way so they match each other and the game's style.
Local steps: `tools/art/plane_art.py` (it reproduces the trial steps byte for byte). PixelLab steps go
through a headless run: `cd ~ && claude -p "<task>" --allowedTools "mcp__pixellab__create_image_pixflux,
mcp__pixellab__get_image,mcp__pixellab__upload_image,Read,Write,Bash(python3:*),Bash(base64:*),Bash(curl:*),
Bash(ls:*)" < /dev/null`. Upload init images BY REFERENCE (upload_image; base64 in the argument got corrupted).
State the exact number of credit-costing calls and "no retries" in every task. Take turns with the game
session's PixelLab batches (one job at a time on the account).

## 1. In-flight sprite (62x27 on screen, never resized)
- The ORIGINAL plane (assets/plane.png) is the benchmark: hard, clear, deliberate pixels. Never make the
  sprite by shrinking a big picture (averaging = blur, rejected).
- `plane_art.py pad assets/plane.png base-64x28.png 64 28` (PixelLab needs sides that are multiples of 4).
- pixflux, width 64, height 28, init = base-64x28 AND colour image = base-64x28 (the original's palette),
  init_image_strength 200-300, view side, direction east, outline 'single color black outline', shading
  'medium shading', detail 'highly detailed'; description = the plane, "strict side view facing right",
  "landing gear fully retracted", "clean hard pixel art, every pixel a solid colour, no blur".
- Collisions use the base 'plane' mask: the new sprite must stay inside the original's outline (check it).
- Known flaw to fix by hand: the cockpit window comes out as a couple of dots.

## 2. Hangar portrait (400x176)
1. `plane_art.py upscale4 <that plane's 64x28 sprite> base-256x112-epx.png` (Scale2x twice: smooth, no new
   colours; a blocky nearest-neighbour upscale makes PixelLab keep the blocks).
2. pixflux 256x112, init = that, strength 110, view side, direction east, black outline, 'detailed shading',
   'highly detailed', text_guidance_scale 8; description: "the SAME <plane> as the init image, redrawn as
   detailed pixel art at this larger size: keep exactly the same livery ..., the same shape, proportions and
   pose, strict side view facing right. Add real detail: ... Landing gear fully retracted. Clean hard pixels."
   (150 was too strong: garbled text on the tail; 350/250 from a blocky init: no change.)
3. `plane_art.py enlarge step2.png base-400x176.png 400 176`, then pixflux 400x176, init = that, strength
   130, shading 'highly detailed shading', same description plus "small, smooth pixel steps", "strict flat
   side view (no three-quarter angle)", "No text or numbers anywhere". (100 drifted to a 3/4 angle.)
4. PixelLab paints a flat grey background at this size: `plane_art.py keyout`.
5. Touch-up by hand: paint out any invented text (AI adds fake registrations), tidy edge pixels.
About 3 credits per plane plus retries (~0.65 US cents each, 2026-10-23).

## Upgrade looks
Each generation is ONE coherent plane. Upgrades change a few integrated things (livery colours, nose,
winglets, engine nacelles, gear doors), each made as a WHOLE-PLANE variant of that generation's sprite and
portrait (same recipe, init = that generation's base), never parts bolted on top (the old overlays looked
like "an abomination").

## Provenance
- `assets/ui/plane-hangar-jumbo.png` (2026-10-23): the 747 (today's plane). Step 2 at strength 110 from the
  Scale2x x2 upscale of assets/plane.png; step 3 at strength 130 (400x176); keyout; 32 pixels of an invented
  registration ("ET-HB") painted over with the fuselage white (249,247,244). Trial images in /tmp/planes/.
- In flight the 747 stays assets/plane.png (the user prefers the original).
