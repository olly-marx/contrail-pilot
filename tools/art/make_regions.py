"""Regional terrain: a ground strip and a hills backdrop per region (assets/ground-<r>.png, hills-<r>.png).

Run from the repo root:  python3 tools/art/make_regions.py [preview.png]
Same sizes and rules as the woodland strips in make_background.py (which stay as ground.png and
hills.png): 288 px wide, seamless (every period divides 288), hills light enough for the night
tint, the ground's top rows plain enough for plots, runways and trees to stand out on.
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_background import OUT, W, Strip, hexc, ridge   # noqa: E402

# Ground palette per region: grass top (rim, lit, base, dark, edge), soil (base, dark, light, pebble).
GROUND = {
    'mediterranean': dict(top=('#e0d088', '#c8b860', '#a8a048', '#8a8638', '#6e6a2a'), soil=('#b8643a', '#94502e', '#d08050', '#e8c8a0'), tufts='#7a8a3a'),
    'desert':        dict(top=('#f4e0b0', '#ecd49c', '#e0c488', '#c8aa70', '#b09058'), soil=('#d8b478', '#bc9860', '#ecca90', '#f8e8c0'), ripples=True),
    'monsoon':       dict(top=('#7ad05a', '#5ab840', '#3e9a30', '#2e7e26', '#226420'), soil=('#a8482a', '#883820', '#c0603a', '#d89060'), tufts='#2e7e26'),
    'eastasia':      dict(top=('#a8d880', '#88c060', '#6aa848', '#528a38', '#3e6e2a'), soil=('#7a6a58', '#605446', '#94826c', '#b8a890'), terraces=True),
    'boreal':        dict(top=('#6a9a5a', '#4e7e44', '#3a6634', '#2c5228', '#203e1e'), soil=('#5a4a3a', '#463a2e', '#6e5c48', '#8a7a68'), snow=True),
    'plains':        dict(top=('#e8d070', '#d4b850', '#bca040', '#9e8432', '#806a28'), soil=('#6a4a30', '#543a26', '#80603e', '#a08868'), tufts='#9e8432'),
    'tundra':        dict(top=('#a8b890', '#8aa070', '#6e8458', '#566a44', '#3e4e32'), soil=('#3a3a40', '#2a2a30', '#50505a', '#7a7a86'), snow=True),
}

# Hills: a profile kind plus back and front colours (each: base, rim) and an optional detail.
HILLS = {
    'mediterranean': dict(kind='rolling', back=('#c8d0a0', '#dde4b8'), front=('#a8b070', '#c4ca8a'), detail='cypress'),
    'desert':        dict(kind='dunes', back=('#f0dcb0', '#f8ecd0'), front=('#e4c88e', '#f4dca8')),
    'monsoon':       dict(kind='canopy', back=('#9ad09a', '#b8e2b0'), front=('#5aa860', '#7cc47a')),
    'eastasia':      dict(kind='karst', back=('#b8cab8', '#d4e0d0'), front=('#88a890', '#a8c2aa'), detail='mist'),
    'boreal':        dict(kind='peaks', back=('#c0ccd8', '#ffffff'), front=('#5a8070', '#76987e'), detail='firs'),
    'plains':        dict(kind='low', back=('#d8d8a0', '#e8e8b8'), front=('#c4b870', '#d8cc88')),
    'tundra':        dict(kind='peaks', back=('#8a8a96', '#ffffff'), front=('#5a5a66', '#787884'), detail='lava'),
}


def ground(region):
    g = GROUND[region]
    rim, lit, base, dark, edge = (hexc(c) for c in g['top'])
    soil, soil_d, soil_l, pebble = (hexc(c) for c in g['soil'])
    s = Strip(48)
    rnd = random.Random('ground-' + region)
    top_h = 13
    for x in range(W):
        for y in range(48):
            if y < top_h:
                c = dark if y >= top_h - 3 or (y >= top_h - 5 and (x + y) % 2 == 0) else base
                if g.get('terraces') and y in (5, 9):                 # paddy terrace lines
                    c = hexc('#9ad0e8') if (x // 24) % 2 else dark
            else:
                c = soil_d if (y - top_h) % 9 == 8 or ((y - top_h) % 9 == 7 and (x + y) % 2 == 0) else soil
            s.px(x, y, c)
        s.px(x, 0, rim); s.px(x, 1, lit); s.px(x, top_h, edge)
    if g.get('ripples'):                                               # wind ripples in the sand
        for y in range(3, top_h - 2, 3):
            for x in range(W):
                if (x + y * 5) % 12 < 5:
                    s.px(x, y + (1 if (x // 6) % 2 else 0), dark)
    if 'tufts' in g:
        for _ in range(60):
            x, y = rnd.randrange(W), rnd.randrange(3, top_h - 3)
            s.px(x, y, lit); s.px(x, y - 1, lit); s.px(x + 1, y, hexc(g['tufts']))
    if g.get('snow'):                                                  # lingering snow patches
        for _ in range(9):
            x0, w = rnd.randrange(W), rnd.randrange(6, 16)
            for x in range(x0, x0 + w):
                s.px(x, 0, hexc('#ffffff')); s.px(x, 1, hexc('#e8f0f8'))
                if x0 + 2 < x < x0 + w - 2:
                    s.px(x, 2, hexc('#e8f0f8'))
    for _ in range(40):
        x, y = rnd.randrange(W), rnd.randrange(top_h + 4, 46)
        for dx in range(rnd.choice([1, 2, 2, 3])):
            s.px(x + dx, y, pebble); s.px(x + dx, y + 1, soil_d)
        s.px(x, y, soil_l)
    s.save(f'ground-{region}.png')


def profile(kind, x, layer):
    """Hill height (px from the bottom of the 46 px strip) at column x. Periods divide 288."""
    if kind == 'rolling':
        return ridge(x, 24 if layer == 0 else 16, [(7, 144, 0.5 + layer), (4, 57.6, 1 + layer)])
    if kind == 'low':
        return ridge(x, 18 if layer == 0 else 12, [(4, 144, layer), (2, 72, 2 + layer)])
    if kind == 'dunes':                    # asymmetric: gentle windward slope, steep lee face
        per = 96 if layer == 0 else 72
        t = ((x + layer * 30) % per) / per
        crest = 0.7
        h = t / crest if t < crest else (1 - t) / (1 - crest)
        return round((20 if layer == 0 else 12) + (14 if layer == 0 else 10) * h ** 1.3)
    if kind == 'canopy':                   # lumpy tree-top line
        bumps = 8 * abs(math.sin(math.pi * x / 18 + layer)) + 3 * abs(math.sin(math.pi * x / 7.2))
        return round((22 if layer == 0 else 14) + bumps * (1 if layer == 0 else 0.8))
    if kind == 'karst':                    # steep towers with rounded tops (not pointed)
        per = 48 if layer == 0 else 36
        t = ((x + layer * 17) % per) / per
        d = abs(t - 0.5) * 2                # 0 at the tower's middle, 1 at its edges
        tower = math.sqrt(max(0.0, 1 - (d / 0.62) ** 2)) if d < 0.62 else 0
        return round((10 if layer == 0 else 6) + (32 if layer == 0 else 22) * tower)
    if kind == 'peaks':                    # jagged mountains: two peak spacings mixed, so no two repeat
        def tri(per, off):
            t = ((x + off) % per) / per
            return 1 - abs(t - 0.5) * 2
        if layer == 0:
            h = 0.65 * tri(96, 0) + 0.35 * tri(57.6, 11)
            return round(12 + 34 * h + (x * 7 % 3))
        h = 0.6 * tri(72, 23) + 0.4 * tri(41.142857, 5)
        return round(8 + 22 * h + (x * 5 % 2))
    raise ValueError(kind)


def hills(region):
    h = HILLS[region]
    s = Strip(46)
    H = s.h
    for layer, (base, rim) in enumerate((h['back'], h['front'])):
        base, rim = hexc(base), hexc(rim)
        shade = tuple(max(0, round(v * 0.88)) for v in base[:3]) + (255,)
        for x in range(W):
            top = H - min(H - 1, profile(h['kind'], x, layer))
            for y in range(top, H):
                depth = y - top
                c = base if depth < 10 or (depth < 13 and (x + y) % 2) else shade
                s.px(x, y, c)
            s.px(x, top, rim)
            if layer == 0 and h['kind'] == 'peaks':                     # snow caps on the far range
                for y in range(top, min(H, top + 5)):
                    s.px(x, y, hexc('#ffffff') if y < top + 3 or (x + y) % 2 else rim)
    rnd = random.Random('hills-' + region)
    if h.get('detail') == 'cypress':
        for _ in range(12):
            x = rnd.randrange(W)
            top = H - profile('rolling', x, 1)
            for k in range(6):
                s.px(x, top - k, hexc('#3a6a3a')); s.px(x + 1, top - k + 1, hexc('#2e5a30')) if k < 5 else None
    if h.get('detail') == 'firs':
        for _ in range(40):
            x = rnd.randrange(W)
            top = H - profile('peaks', x, 1)
            for k in range(4):
                for dx in range(-(k // 2), k // 2 + 1):
                    s.px(x + dx, top - 3 + k, hexc('#2e4e3e'))
    if h.get('detail') == 'mist':                                       # a soft band of mist at the towers' feet
        for x in range(W):
            for y, a in ((27, 60), (28, 110), (29, 150), (30, 150), (31, 110), (32, 60)):
                c = s.img.getpixel((x % W, y))
                if c[3]:
                    m = (228, 236, 228)
                    s.px(x, y, tuple(round(c[i] + (m[i] - c[i]) * a / 255) for i in range(3)) + (255,))
    if h.get('detail') == 'lava':                                       # a faint glow on one peak
        for x in range(140, 146):
            s.px(x, H - profile('peaks', x, 1) - 1, hexc('#ff8a50'))
    s.save(f'hills-{region}.png')


if __name__ == '__main__':
    for r in GROUND:
        ground(r)
        hills(r)
    if len(sys.argv) > 1:
        rows = list(GROUND)
        sheet = Image.new('RGBA', (W, len(rows) * 96), (110, 198, 232, 255))
        for i, r in enumerate(rows):
            sheet.alpha_composite(Image.open(OUT / f'hills-{r}.png'), (0, i * 96 + 2))
            sheet.alpha_composite(Image.open(OUT / f'ground-{r}.png'), (0, i * 96 + 48))
        sheet.resize((W * 2, sheet.height * 2), Image.NEAREST).save(sys.argv[1])
