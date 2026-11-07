"""Hangar upgrade layers for the 2030s truss-braced wing and the far-future hydrogen blended wing (2026-11), drawn in code on the real
PixelLab portraits (same convention as make_787_layers.py: the WHOLE 400x176 plane with only that part changed (planelook.js composeOnto diffs against the base), drawn only where the plane is).
An ENGINE layer replaces the engine look (fleet.js lookParts shows the last engine level's part); BODY layers add up.
Run: python3 tools/art/make_future_layers.py -> assets/ui/upgrades/hangar-truss-*.png, hangar-hydrogen-*.png"""
from PIL import Image
import math, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'assets/ui/upgrades')
YELLOW = (255, 208, 64, 255)
CYAN, ICE, GREEN, BLACK = (70, 200, 235, 255), (190, 235, 250, 255), (70, 190, 110, 255), (14, 14, 26, 255)

def load(name): return Image.open(os.path.join(ROOT, f'assets/ui/plane-hangar-{name}.png')).convert('RGBA')
def blank(base): return Image.new('RGBA', base.size, (0, 0, 0, 0))
def on(base, x, y): return 0 <= x < base.width and 0 <= y < base.height and base.getpixel((x, y))[3] > 0
def put(L, base, x, y, c):
    if on(base, x, y): L.putpixel((x, y), c)
def ring(L, base, cx, cy, r, c, w=1):
    for y in range(cy - r - w, cy + r + w + 1):
        for x in range(cx - r - w, cx + r + w + 1):
            d = math.hypot(x - cx, y - cy)
            if r - 0.5 <= d <= r + w - 0.5: put(L, base, x, y, c)
def disc(L, base, cx, cy, r, c):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if math.hypot(x - cx, y - cy) <= r: put(L, base, x, y, c)
def hline(L, base, x0, x1, y, c, step=1):
    for x in range(x0, x1, step): put(L, base, x, y, c)
def recolour_dark(L, base, box, to, thresh=110):
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            r, g, b, a = base.getpixel((x, y))
            if a and r < thresh and g < thresh and b < thresh + 30 and (r, g, b) != BLACK[:3]: L.putpixel((x, y), to)

def truss():
    base = load('truss'); out = {}
    fans = [(213, 128), (262, 128)]
    L = blank(base)                                   # open-fan engines: a bright cyan ring round each fan
    for cx, cy in fans: ring(L, base, cx, cy, 14, CYAN)
    out['openfan'] = L
    L = blank(base)                                   # bigger open fans: a wider double ring
    for cx, cy in fans: ring(L, base, cx, cy, 14, CYAN); ring(L, base, cx, cy, 17, ICE)
    out['bigfan'] = L
    L = blank(base)                                   # hybrid-electric assist: green electric ring + a green stripe along each pod
    for cx, cy in fans: ring(L, base, cx, cy, 14, GREEN); ring(L, base, cx, cy, 17, ICE); hline(L, base, cx + 12, cx + 24, cy + 9, GREEN); hline(L, base, cx + 12, cx + 24, cy + 10, GREEN)
    out['hybrid'] = L
    L = blank(base)                                   # folding wingtips: a bold black-and-yellow hinge across the wing near each tip (3 px wide)
    for x in (88, 89, 90, 91, 336, 337, 338, 339):
        ys = [y for y in range(35, 75) if on(base, x, y)]
        for k, y in enumerate(ys): L.putpixel((x, y), YELLOW if (k + (x % 2)) % 2 == 0 else BLACK)
    out['fold'] = L
    L = blank(base)                                   # laminar-flow skin: a bold cyan dashed sheen along the wing (3 rows, 8 px dashes)
    for x in range(100, 345):
        if (x // 8) % 2 == 0:
            for y in range(48, 60):
                if on(base, x, y) and base.getpixel((x, y))[:3] != BLACK[:3] and sum(base.getpixel((x, y))[:3]) > 300: L.putpixel((x, y), CYAN)
    out['laminar'] = L
    L = blank(base)                                   # window-wall lounge: the cabin windows become one long pale-blue band
    recolour_dark(L, base, (90, 98, 340, 110), ICE)
    out['lounge'] = L
    return out

def hydrogen():
    base = load('hydrogen'); out = {}
    fans = [(95, 61), (129, 60)]
    L = blank(base)                                   # fuel-cell pods: two small green pods on the wing's front edge
    for x in (210, 240): disc(L, base, x, 108, 3, GREEN); disc(L, base, x, 108, 1, ICE)
    out['fuelcell'] = L
    L = blank(base)                                   # superconducting motors: a cold cyan glow round each fan
    for cx, cy in fans: ring(L, base, cx, cy, 10, CYAN, 2)
    out['supercon'] = L
    L = blank(base)                                   # quieter ducted fans: a soft white ring and a green inner ring
    for cx, cy in fans: ring(L, base, cx, cy, 10, ICE, 2); ring(L, base, cx, cy, 7, GREEN)
    out['ducted'] = L
    L = blank(base)                                   # insulated hydrogen tanks: a bold frosty band (5 rows, pale blue with a cyan edge) along the back of the body
    for y in range(80, 87):
        for x in range(150, 290):
            if on(base, x, y) and base.getpixel((x, y))[:3] != BLACK[:3]: L.putpixel((x, y), CYAN if y in (80, 86) else ICE)
    out['tanks'] = L
    L = blank(base)                                   # laminar flow all over: a bold cyan dashed sheen along the body (3 rows)
    for x in range(150, 345):
        if (x // 8) % 2 == 0:
            for y in range(86, 91):
                if on(base, x, y) and base.getpixel((x, y))[:3] != BLACK[:3]: L.putpixel((x, y), CYAN)
    out['laminar'] = L
    L = blank(base)                                   # panorama seats: the cabin windows become big pale panels
    recolour_dark(L, base, (255, 92, 372, 101), ICE)
    out['panorama'] = L
    return out

if __name__ == '__main__':
    for plane, fn in (('truss', truss), ('hydrogen', hydrogen)):
        for part, im in fn().items():
            n = sum(1 for p in im.getdata() if p[3]); assert n > 15, (plane, part, n)
            full = load(plane).copy(); full.alpha_composite(im); full.save(os.path.join(OUT, f'hangar-{plane}-{part}.png'))   # the WHOLE plane with only that part changed (planelook.js diffs against the base); print(plane, part, n, 'px')
