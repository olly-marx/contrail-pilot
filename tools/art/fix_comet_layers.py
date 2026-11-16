# One-off redraw of two Comet hangar layers (Oliver, 2026-11-16: "when adding the pinion here it looks like it's weirdly on the engine").
#   pinion:    the fuel pod sat over the engine intakes at the wing root; it is cut out of the layer, shrunk to 70 % and hung
#              under the outer wing (x 172, y 147), so the intakes show again and the pod reads as a wing tank.
#   reversers: a solid black box at the nozzle (rows 136-145, columns 163-174) becomes a grey cascade (dark outline, light slats).
# Reads the ORIGINAL layers from git (c396845), so running it again gives the same files. Run from the repo root:
#   python3 tools/art/fix_comet_layers.py
import io, subprocess
from PIL import Image, ImageChops
REV = 'c396845'
git = lambda path: Image.open(io.BytesIO(subprocess.check_output(['git', 'show', f'{REV}:{path}']))).convert('RGBA')
base = git('assets/ui/plane-hangar-comet.png')

# pinion
p = git('assets/ui/upgrades/hangar-comet-pinion.png')
d = ImageChops.difference(base, p).convert('L').point(lambda v: 255 if v > 0 else 0)
bb = d.getbbox(); pod = Image.new('RGBA', base.size, (0, 0, 0, 0)); pod.paste(p, (0, 0), d); pod = pod.crop(bb)
cols = [sum(1 for y in range(pod.height) if pod.getpixel((x, y))[3] > 0) for x in range(pod.width)]
pod = pod.crop((next(i for i, c in enumerate(cols) if c >= 6), 0, pod.width, pod.height))   # the pod body only (not the faint wing pixels at its left)
pod = pod.resize((round(pod.width * 0.7), round(pod.height * 0.7)), Image.NEAREST)
out = base.copy(); out.alpha_composite(pod, (172, 147)); out.save('assets/ui/upgrades/hangar-comet-pinion.png')

# reversers
r = git('assets/ui/upgrades/hangar-comet-reversers.png'); px = r.load()
x0, y0, x1, y1 = 163, 136, 174, 145
OUT, MID, LIT = (58, 52, 50, 255), (150, 140, 133, 255), (196, 188, 178, 255)
for x in range(x0, x1 + 1):
    for y in range(y0, y1 + 1):
        px[x, y] = OUT if x in (x0, x1) or y in (y0, y1) or (x - x0) % 3 == 0 else LIT if (x - x0) % 3 == 1 else MID
r.save('assets/ui/upgrades/hangar-comet-reversers.png')
print('wrote hangar-comet-pinion.png, hangar-comet-reversers.png')
