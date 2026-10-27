# Compose tutorial diagrams from PixelLab objects (hybrid, the user's pick 2026-10-27): the layout stays a clear diagram.
from PIL import Image, ImageDraw
O = '/home/ojm/art-tut/obj/'; OUT = '/home/ojm/art-tut/final/'
import os; os.makedirs(OUT, exist_ok=True)
SKY, GROUND, SOIL = (110, 198, 232, 255), (93, 168, 74, 255), (138, 96, 58, 255)
obj = lambda n: Image.open(O + n + '.png').convert('RGBA')
def crop(im): return im.crop(im.getbbox())
def base(ground=True):
    im = Image.new('RGBA', (240, 128), SKY)
    if ground: d = ImageDraw.Draw(im); d.rectangle([0, 112, 239, 119], fill=GROUND); d.rectangle([0, 120, 239, 127], fill=SOIL)
    return im
def dashes(d, y, x0, x1):
    for x in range(x0, x1, 8): d.rectangle([x, y, x + 4, y + 1], fill=(255, 255, 255, 255))
# 1. The storm gap: a cloud above, a cloud below (flipped), the plane through the wide gap, a dashed path.
im = base(False); c = crop(obj('cloud')); p = crop(obj('plane'))
im.paste(c.transpose(Image.FLIP_TOP_BOTTOM), (240 // 2 - c.width // 2, 0), c.transpose(Image.FLIP_TOP_BOTTOM))
im.paste(c, (240 // 2 - c.width // 2, 128 - c.height), c)
d = ImageDraw.Draw(im); y = 64; dashes(d, y, 4, 92); dashes(d, y, 150, 236)
im.paste(p, (120 - p.width // 2, y - p.height // 2), p)
im.save(OUT + 'lesson-storm.png')
# 2. The free part: the hangar on the ground.
im = base(); h = crop(obj('hangar')); h = h.resize((h.width * 2, h.height * 2), Image.NEAREST); im.paste(h, (120 - h.width // 2, 113 - h.height), h); im.save(OUT + 'lesson-hangar.png')
# 3. Nature: a project (hedgerow) with an animal coming back.
im = base(); n = crop(obj('nature')); n = n.resize((n.width * 2, n.height * 2), Image.NEAREST); im.paste(n, (120 - n.width // 2, 114 - n.height), n); im.save(OUT + 'lesson-nature.png')
print('ok')

# ---- The player's OWN plane everywhere (Coordinator + the user, 2026-10-27): the in-game Comet sprite, NOSE RIGHT. ----
COMET = Image.open('/home/ojm/cp-wt-s3/assets/plane-comet.png').convert('RGBA')
def nose_right(sprite):
    # The tail fin is the tallest part: the topmost opaque pixels must sit in the LEFT half, so the nose points right.
    a = sprite.getchannel('A'); top = next(y for y in range(sprite.height) if any(a.getpixel((x, y)) for x in range(sprite.width)))
    xs = [x for x in range(sprite.width) if a.getpixel((x, top))]
    return sum(xs) / len(xs) < sprite.width / 2
assert nose_right(COMET), 'the Comet sprite must face right'

BLUE, INK, WHITE = (47, 111, 208), (27, 27, 47), (255, 255, 255)
def planes_in(im):
    # The old hand-drawn plane: 19 blue-stripe pixels. Group them by touching (within 4 px) - a diagram may show several.
    pts = [(x, y) for y in range(im.height) for x in range(im.width) if im.getpixel((x, y))[:3] == BLUE]
    groups = []
    for p in pts:
        near = [g for g in groups if any(abs(p[0] - q[0]) <= 4 and abs(p[1] - q[1]) <= 4 for q in g)]
        merged = [p] + [q for g in near for q in g]
        groups = [g for g in groups if g not in near] + [merged]
    boxes = [(min(x for x, _ in g), min(y for _, y in g), max(x for x, _ in g), max(y for _, y in g)) for g in groups]
    assert all(10 <= len(g) <= 30 for g in groups), f'unexpected blue blobs (not a plane): {[len(g) for g in groups]}'
    return boxes
def restyle(name):
    old = Image.open(f'/home/ojm/cp-wt-s3/assets/ui/lesson-{name}.png').convert('RGBA')
    boxes = planes_in(old)
    big = old.resize((old.width * 2, old.height * 2), Image.NEAREST)
    covered = {}   # pixels the Comet covers (its own white and dark outline are fine there)
    for (x0, y0, x1, y1) in boxes:
        X0, Y0, X1, Y1 = 2 * (x0 - 4), 2 * (y0 - 4), 2 * (x1 + 4), 2 * (y1 + 4)   # the old plane with its white body and outline
        bg = big.getpixel((max(0, X0 - 2), (Y0 + Y1) // 2))
        ImageDraw.Draw(big).rectangle([X0, Y0, X1, Y1], fill=bg)
        cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2
        px = min(max(0, cx - COMET.width // 2), big.width - COMET.width)   # inside the frame
        big.paste(COMET, (px, cy - COMET.height // 2), COMET)
        a = COMET.getchannel('A')
        for yy in range(COMET.height):
            for xx in range(COMET.width):
                if a.getpixel((xx, yy)): covered[(px + xx, cy - COMET.height // 2 + yy)] = True
    # Nothing of the old plane may survive (the Coordinator saw doubled planes on black/red blocks): no old blue stripe anywhere,
    # and inside each replaced area no old outline (INK) or white body except where the Comet itself covers it.
    px = big.load()
    assert not any(px[x, y][:3] == BLUE for x in range(big.width) for y in range(big.height)), f'{name}: old blue stripe left'
    for (x0, y0, x1, y1) in boxes:
        for y in range(max(0, 2 * (y0 - 4)), min(big.height, 2 * (y1 + 4) + 1)):
            for x in range(max(0, 2 * (x0 - 4)), min(big.width, 2 * (x1 + 4) + 1)):
                if covered.get((x, y)): continue
                assert px[x, y][:3] not in (INK, WHITE), f'{name}: old plane pixels left at {(x, y)}'
    big.save(OUT + f'lesson-{name}.png')
    return len(boxes)
for n in ['tap', 'seed', 'day', 'night', 'heat', 'land', 'plot']:
    print(n, 'planes replaced:', restyle(n))

# The storm and hangar pictures use the Comet too (rebuilt here so the check covers them).
im = base(False); c = crop(obj('cloud'))
im.paste(c.transpose(Image.FLIP_TOP_BOTTOM), (120 - c.width // 2, 0), c.transpose(Image.FLIP_TOP_BOTTOM)); im.paste(c, (120 - c.width // 2, 128 - c.height), c)
d = ImageDraw.Draw(im); dashes(d, 64, 4, 84); dashes(d, 64, 158, 236)
im.paste(COMET, (120 - COMET.width // 2, 64 - COMET.height // 2), COMET); im.save(OUT + 'lesson-storm.png')
im = base(); h = crop(obj('hangar-empty')); h = h.resize((h.width * 2, h.height * 2), Image.NEAREST); hx, hy = 120 - h.width // 2, 113 - h.height
im.paste(h, (hx, hy), h); im.paste(COMET, (120 - COMET.width // 2, 112 - COMET.height), COMET); im.save(OUT + 'lesson-hangar.png')
print('storm + hangar rebuilt with the Comet, nose right')

# ---- Redone with the game's own pieces (the user, 2026-10-27): the seed picture used old big seeds, and the overheating
# picture was "terrible". Seed = the in-game token (assets/token.png); heat = the in-game Earth face + the HUD's heat bar.
A = '/home/ojm/cp-wt-s3/assets/'
TOKEN = Image.open(A + 'token.png').convert('RGBA'); TOKEN2 = TOKEN.resize((28, 28), Image.NEAREST)
def runway(d, x0, x1, y):
    d.rectangle([x0, y, x1, y + 5], fill=(90, 90, 100, 255))
    for x in range(x0 + 4, x1 - 6, 14): d.rectangle([x, y + 2, x + 7, y + 3], fill=(240, 240, 240, 255))
def check(d, cx, cy):   # a green tick
    for i in range(6): d.rectangle([cx - 8 + i, cy + i - 2, cx - 6 + i, cy + i], fill=(60, 170, 70, 255))
    for i in range(10): d.rectangle([cx - 2 + i, cy + 4 - i, cx + i, cy + 6 - i], fill=(60, 170, 70, 255))
# Seed: the plane grabs seeds in the sky (a trail of tokens), then lands on a runway and keeps them (a tick).
im = base(); d = ImageDraw.Draw(im)
dashes(d, 40, 4, 236)
for i, x in enumerate([92, 128, 164, 200]): im.paste(TOKEN2, (x, 26), TOKEN2)
im.paste(COMET, (16, 40 - COMET.height // 2), COMET)
runway(d, 130, 236, 106); im.paste(COMET, (150, 106 - COMET.height + 2), COMET)
for i, x in enumerate([160, 178, 196]): im.paste(TOKEN, (x, 68), TOKEN)
check(d, 222, 72)
im.save(OUT + 'lesson-seed.png')
# Heat: the Earth bar full of red, the Earth's hot face, and the flight ending (the plane gliding down to the ground).
FACE = Image.open(A + 'face-melting-0.png').convert('RGBA'); FACE = FACE.resize((FACE.width * 2, FACE.height * 2), Image.NEAREST)
im = base(); d = ImageDraw.Draw(im)
bx, by0, by1 = 200, 10, 108                                  # the bar, as on the right of the game screen
d.rectangle([bx - 2, by0 - 2, bx + 16, by1 + 2], fill=(27, 27, 47, 255)); d.rectangle([bx, by0, bx + 14, by1], fill=(60, 60, 80, 255))
d.rectangle([bx, by0, bx + 14, by1], fill=(232, 67, 58, 255))  # full to the top
for i in range(4): d.rectangle([bx - 6 + i * 2, by0 - 8 + i, bx + 20 - i * 2, by0 - 7 + i], fill=(232, 67, 58, 255))   # flashing top
im.paste(FACE, (120 - FACE.width // 2, 64 - FACE.height // 2), FACE)
p2 = COMET.rotate(-14, expand=True); im.paste(p2, (12, 70), p2)          # the flight is over: the plane glides down
im.save(OUT + 'lesson-heat.png')
print('seed + heat redone with the game\'s token, face and bar')
