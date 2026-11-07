"""The 787 Dreamliner's hangar upgrade layers, drawn in code on top of the real PixelLab portrait (era 4, 2026-11).
Each part picture is the WHOLE 400x176 plane with only that part changed (src/planelook.js composeOnto: a part = the pixels where it differs from the base); an ENGINE layer
replaces the whole nacelle (src/fleet.js lookParts shows the last engine level's part), a BODY layer adds to the others.
Run: python3 tools/art/make_787_layers.py  -> assets/ui/upgrades/hangar-787-<part>.png  (parts: genx chevron trent barrel raked dimmable)
Real facts drawn: GEnx and Trent 1000 are the 787's two engine families; chevrons = the saw-tooth trailing edge of the 787's engine
cowls (noise); raked wingtips; the carbon-fibre barrel; dimmable (electrochromic) windows."""
from PIL import Image
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
BASE = Image.open(os.path.join(ROOT, 'assets/ui/plane-hangar-787.png')).convert('RGBA')
OUT = os.path.join(ROOT, 'assets/ui/upgrades')
BLACK = (14, 14, 26, 255)
NAC = (281, 119, 322, 149)   # the engine nacelle's box on the portrait

def blank(): return Image.new('RGBA', BASE.size, (0, 0, 0, 0))
def copy_box(layer, box):
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            layer.putpixel((x, y), BASE.getpixel((x, y)))
def px(layer, pts, c):
    for x, y in pts: layer.putpixel((x, y), c)

def nacelle(kind):
    L = blank(); copy_box(L, (277, 119, 323, 149))
    # clear the base pixels that are only sky behind the box (keep the layer transparent there)
    for y in range(119, 149):
        for x in range(277, 323):
            if BASE.getpixel((x, y))[3] == 0: L.putpixel((x, y), (0, 0, 0, 0))
    if kind == 'genx':   # GE's painted blue band round the cowl, close to the fan
        for y in range(122, 146):
            for x in (306, 307, 308):
                if BASE.getpixel((x, y))[3]: L.putpixel((x, y), (52, 92, 158, 255))
    else:                # chevrons: the saw-tooth rear edge of the cowl (teeth point back, left)
        for k in range(6):
            y0 = 122 + 4 * k
            for dy, w in enumerate((1, 2, 3, 2)):
                for dx in range(w):
                    L.putpixel((281 - dx, y0 + dy), (226, 230, 240, 255) if dx < w - 1 else BLACK)
        if kind == 'trent':   # Trent 1000: a bigger dark fan face and spinner at the front, the blue band kept thin
            for y in range(125, 143):
                for x in (318, 319, 320):
                    if BASE.getpixel((x, y))[3]: L.putpixel((x, y), (40, 44, 64, 255))
            for y in range(131, 137): L.putpixel((321, y), (40, 44, 64, 255))
            for y in range(122, 146): L.putpixel((307, y), (110, 130, 170, 255)) if BASE.getpixel((307, y))[3] else None
    return L

def barrel():   # carbon-fibre fuselage: a dark woven strip under the windows
    L = blank()
    for x in range(118, 262):
        for y in (108, 109):
            if BASE.getpixel((x, y))[3]: L.putpixel((x, y), (46, 52, 70, 255) if (x + y) % 2 else (86, 94, 116, 255))
    return L

def raked():    # the raked (upward-curved) wingtip, on the far wing's tip
    L = blank()
    tip = [(152, 81), (150, 80), (148, 79), (146, 78), (145, 77), (144, 75), (143, 73), (143, 72)]
    for x, y in tip:
        L.putpixel((x, y), BLACK); L.putpixel((x, y + 1), (208, 214, 226, 255)); L.putpixel((x + 1, y + 1), (170, 178, 196, 255))
    return L

def dimmable():  # electrochromic windows: the dark window squares turn deep blue-violet
    L = blank()
    for y in range(95, 104):
        for x in range(120, 340):
            r, g, b, a = BASE.getpixel((x, y))
            if a and r < 100 and g < 105 and b < 140 and y in range(96, 103): L.putpixel((x, y), (36, 76, 196, 255))
    return L

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in [('genx', lambda: nacelle('genx')), ('chevron', lambda: nacelle('chevron')), ('trent', lambda: nacelle('trent')), ('barrel', barrel), ('raked', raked), ('dimmable', dimmable)]:
        im = fn(); n = sum(1 for p in im.getdata() if p[3]); assert n > 20, (name, n)
        full = BASE.copy(); full.alpha_composite(im); full.save(os.path.join(OUT, f'hangar-787-{name}.png'))   # a PART picture is the WHOLE plane with only that part changed (src/planelook.js composeOnto diffs against the base); print(name, n, 'px')
