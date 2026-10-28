"""Tromso: the Arctic Cathedral drawn in code (pixflux could not draw its stacked white triangle in 2 tries) + the
mountain, bridge and cable car from the first PixelLab Tromso, on one ground line.   python3 tromso_cathedral.py <out>"""
import sys
from PIL import Image, ImageDraw
out = sys.argv[1]
OUT, WHITE, SHADE, GLASS, GLASS2, GROUND = (27, 33, 52, 255), (244, 246, 250, 255), (196, 206, 222, 255), (120, 180, 220, 255), (80, 130, 180, 255), (42, 47, 69, 255)
src = Image.open(f'{out}/rejected/sky-tromso.png').convert('RGBA')
right = src.crop((66, 0, 128, 64))
W, H, base = 46, 64, 54                      # the cathedral's box; its base sits on the ground row
cat = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(cat)
# One white triangle with a dark outline; the stacked panels as light grey lines inside (outlines on every layer read dark).
apex = base - 46
d.polygon([(1, base), (W / 2, apex), (W - 2, base)], fill=WHITE, outline=OUT)
for k in range(1, 6):
    f = k / 6; d.line([(1 + (W / 2 - 1) * f, base - 1), (W / 2, apex + 46 * f * 0.35)], fill=SHADE); d.line([(W - 2 - (W / 2 - 2) * f, base - 1), (W / 2, apex + 46 * f * 0.35)], fill=SHADE)
# The glass front: a tall narrow triangle in the middle, blue with light stripes.
d.polygon([(W / 2 - 7, base), (W / 2, base - 30), (W / 2 + 7, base)], fill=GLASS2, outline=OUT)
for x in range(int(W / 2 - 5), int(W / 2 + 6), 3): d.line([(x, base - 1), (x, base - 1 - max(0, 26 - abs(x - W / 2) * 3.6))], fill=GLASS)
d.line([(W / 2, base - 40), (W / 2, base - 46)], fill=OUT); d.line([(W / 2 - 2, base - 44), (W / 2 + 2, base - 44)], fill=OUT)   # a small cross
img = Image.new('RGBA', (W + right.width, H), (0, 0, 0, 0)); img.alpha_composite(cat, (0, 0)); img.alpha_composite(right, (W - 2, 0))
ImageDraw.Draw(img).rectangle([0, base, img.width - 1, base + 1], fill=GROUND)   # one ground line under both
img = img.crop(img.getbbox()); img.save(f'{out}/sky-tromso.png'); print('tromso', img.size)
