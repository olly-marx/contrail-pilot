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

## Era factory paint (APPROVED by the user, 2026-10-23)
`tools/art/era_paint.py <era> in.png out.png`, applied to every plane's in-flight sprite AND hangar portrait
(deterministic; outlines, windows, cockpit glass and the ALPHA are untouched, so collisions never change).
Warm and worn -> cool and shiny: 1950s rust red on faded cream (worn pixels) | 1970s burnt orange on off-white |
1990s golden amber on white | 2010s fresh green on bright white | 2030s teal-cyan on pearl | far future
iridescent (cyan -> violet -> magenta along the plane) on chrome with glints.
Workflow: keep the UNPAINTED art as tools/art/planes/<name>-base.png; the painted file takes the game key.
The live game's assets/plane.png stays unpainted until the plane side ships (the 1970s paint is
tools/art/planes/plane-747.png). Known: amber goes a little olive in the shaded parts of big portraits.

## Hangar upgrade parts (tested 2026-10-23 on the jumbo: next-gen engines, glass cockpit, winglets)
- Tool: PixelLab inpaint_image (needs the SUBSCRIPTION; 10 generations per call up to 256 px a side). Above
  256 px it costs 25 and needs Tier 2, so cut a <=256-wide WINDOW of the 400x176 portrait round the part,
  inpaint that, and paste back ONLY the masked rectangle (the tool alters a few pixels outside the mask).
- Mask: white = redraw. Put it where the part really is (a zoomed grid of the portrait first).
- Changing an existing part (engines, windscreen): describe the new part; it works first time.
- ADDING a part over something else (a winglet in front of the fuselage): the tool keeps what is there.
  Paste a rough SKETCH of the part (right colour and shape) into the window first, mask it plus a margin, and
  ask it to redraw the guide as a clean detailed part. (Without the sketch: 2 failures. With it: first time.)
- pixflux img2img on the window and pasting the mask back does NOT work for small parts (it ignores them).
- Tip from the game session: call the PixelLab REST API (https://api.pixellab.ai/v2, bearer token) directly
  for batches instead of headless claude -p, which costs Claude usage.

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
- `tools/art/planes/plane-comet.png` (62x27, in-flight, NOT yet in assets/: textures.cjs fails on an unloaded
  assets/*.png, so the build session moves it when it wires the Comet in) (2026-10-23): pixflux 64x28, init =
  the ORIGINAL 747 edited into a Comet guide in the SAME pose (hump flattened, pods removed, wing low), colour
  image = the original, strength 200; then by hand: silver lower body, two intake slots, a stray roof antenna
  removed. 1 px outside the original outline. LESSON: a different plane must start from a guide in the
  747's pose (a free-form Comet drew the far wing above the body: ~190 px off the collision outline).
- `assets/ui/plane-hangar-comet.png` (400x176): recipe steps 1-4 from plane-comet; then 3 inpaints (tail
  fake text -> plain swoosh; engine pods -> engines buried in the wing root; nose gear and roof bump removed).
- `tools/art/planes/plane-twin.png` (62x27, in-flight; not in assets/ yet) (2026-10-23): guide = the original
  with the hump flattened and the two pods replaced by ONE big pod (a twin shows one engine from the side);
  pixflux 64x28, colour image = the original, strength 200 (150 drew two pods); nose gear and strut removed by
  hand. 20 px outside the original outline (the bigger engine).
- `assets/ui/plane-hangar-twin.png` (400x176): recipe steps 1-4; inpaint removed an extra small pod; the roof
  inpaint ignored its mask, so two small roof bumps were rebuilt locally from the neighbouring flat roof columns.

## Era welcome card backgrounds (plane build session, 2026-10-23)
`assets/ui/era-1950s.png`, `era-1970s.png`, `era-1990s.png`: PixelLab pixflux 320x180, no init image,
view side, medium shading, highly detailed, one generation each, no retries. Prompts (abridged): 1950s
"jet-age airport, retro travel poster, silver early jet on a sunny apron, brick tower with radio mast,
faded cream sky and rust red accents"; 1970s "airport at golden sunset, jumbo jet rolling out of a huge
hangar, crowd, bunting, concrete tower with radar dish, burnt orange and brown on off-white"; 1990s
"glass terminal in warm evening light, twin-engine widebody at the gate, glass-topped tower with a
satellite dish, golden amber sky". All end "no text, no letters, no numbers". Known flaws: the 1950s jet
has a roundel; the 1990s tail has scribble 'text' (shown behind the card panel, so left as is).
