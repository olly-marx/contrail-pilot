# Provenance: tools/art/planes/upgrades/
Every PNG here is drawn by `python3 tools/art/make_upgrades.py` (deterministic, no PixelLab).
Inputs: tools/art/planes/plane-747.png (era-painted 1970s 747) and assets/tower.png (sheet only).
review-747.png is a labelled review sheet; sheet-*.png are review sheets. Status: DRAFT, awaiting user approval.
Hangar parts (747): `tools/art/hangar_parts.py` on assets/ui/plane-hangar-jumbo.png. nextgen (seed 7) and glass
(seed 11, second try; the first, seed 7, was a blocky vertical cut) = PixelLab inpaint-v3 over a pasted sketch,
mask pasted back only; details in provenance.jsonl. business = local recolour (no PixelLab). full = combine()
of nextgen, business, glass in that order.
More 747 hangar parts (2026-10-24): jt9d, upperdeck, winglet (seed 7) and hushkit (seed 11; seed 7 used a
rectangle mask and pasted pale boxes) = inpaint-v3 over sketches in hangar_parts.py. full = combine() of
upperdeck, winglet, nextgen, business, glass.
upperdeck fix (2026-10-24): blank box at x250-270,y64-86 restored from the clean portrait (original window).
Comet hangar parts (2026-10-24): c-intakes, c-reversers, c-pinion, c-oval, c-tourist, c-galley = inpaint-v3 seed 7 over sketches in hangar_parts.py. full = combine() of intakes, reversers, pinion, oval, galley. Comet in-flight variants plane-comet-*.png = make_upgrades.py (no PixelLab).
c-pinion redone 2026-10-24 (seed 11, tank moved up against the wing). Measured: one inpaint-v3 call = 10 generations (1111.1 -> 1101.1, account otherwise idle).
c-reversers redone 2026-10-24 (seed 11, slim flush doors; first try was a big black bucket).
Twin hangar parts (2026-10-24): t-giantfan, t-blades, t-winglet = inpaint-v3 seed 7 over sketches (30 generations).
t-tail, t-riblets, t-premium, t-glow = local recolours in hangar_parts.py (no PixelLab). Twin marks use silver/black,
not gold (gold is too close to the 1990s amber). full = combine() of tail, winglet, riblets, premium, glow, giantfan.
Twin in-flight variants plane-twin-*.png (2026-10-24) = make_upgrades.py, no PixelLab.
Gadget stickers sticker-{magnet,hold,gear,sensor,auto}-{1950s,1970s,1990s}.png (2026-10-24) = make_upgrades.py STICKERS, no PixelLab; positions in STICKER_AT. Old 5x5 magnet stickers replaced.
Hangar gadgets 747 (2026-10-24): gadget-747-{magnet,gear,auto}.png = inpaint-v3 seed 7 overlays (30 generations); gear: pale box keyed out and see-through hubs filled silver by hand. gadget-747-{hold,sensor}.png = local recolour overlays (free). Overlays = only changed pixels on a transparent 400x176 canvas.
gadget-747-magnet redone 2026-10-24 (seed 11, coil sketched inside the fin; the first stuck out of the tail).
  then its cream box background keyed out (cream pixels over non-cream tail -> transparent).
Hangar gadgets Comet + twin (2026-10-24): gadget-comet-{magnet,hold,gear} and gadget-twin-{magnet,gear,sensor,auto} =
inpaint-v3 seed 7 overlays (70 generations), then light boxes keyed out; twin magnet disc refilled with a silver ramp
by hand (the key-out had hollowed it); twin dome's white box cleared outside the dome shape. Local (free):
gadget-comet-sensor (thermometer probe), gadget-comet-auto (antenna), gadget-twin-hold and gadget-747-hold
(rounded black belly fairing, replacing the 747's first rod-like recolour).
