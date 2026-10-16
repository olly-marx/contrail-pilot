"""Draw the parallax background strips (hills, city, clouds) as PNGs in assets/.

Run from the repo root:  python3 tools/art/make_background.py
Every strip is 288 px wide and tiles seamlessly (all drawing wraps with x % W).
Hills and city are tinted toward blue at night by multiplication, so keep them light.
"""
import math
import random
from pathlib import Path

from PIL import Image

W = 288
OUT = Path(__file__).resolve().parents[2] / 'assets'


def hexc(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


# One shared palette for the background, so every strip reads as the same world.
P = {
    'far_hill': hexc('#a9d3b9'), 'far_hill_rim': hexc('#c4e3cd'),
    'hill': hexc('#7fb98a'), 'hill_rim': hexc('#a6d6a4'), 'hill_shade': hexc('#6aa37a'),
    'bush': hexc('#5f9a6f'), 'bush_lit': hexc('#8cc58f'),
    'bld_a': hexc('#6c7ea0'), 'bld_a_lit': hexc('#8295b6'),
    'bld_b': hexc('#5d6d8c'), 'bld_b_lit': hexc('#73849f'),
    'bld_dark': hexc('#4b5873'),
    'window': hexc('#c7dcef'), 'window_lit': hexc('#ffe9a8'),
    'grass_rim': hexc('#9ad46a'), 'grass_lit': hexc('#7cbf4e'), 'grass': hexc('#5a9a3c'),
    'grass_dark': hexc('#467f2e'), 'grass_edge': hexc('#3a6a26'),
    'soil': hexc('#8a6a48'), 'soil_dark': hexc('#735637'), 'soil_light': hexc('#a1825e'), 'pebble': hexc('#b9a68c'),
    'cloud': hexc('#ffffff'), 'cloud_shade': hexc('#dceaf5'), 'cloud_deep': hexc('#c3d8ea'),
}


class Strip:
    def __init__(self, h):
        self.img = Image.new('RGBA', (W, h), (0, 0, 0, 0))
        self.h = h

    def px(self, x, y, c):
        if 0 <= y < self.h:
            self.img.putpixel((x % W, y), c)

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.px(xx, yy, c)

    def save(self, name):
        self.img.save(OUT / name)
        print('wrote', OUT / name)


def ridge(x, base, terms):
    return round(base + sum(a * math.sin(2 * math.pi * x / per + ph) for a, per, ph in terms))


def hills():
    s = Strip(46)
    H = s.h
    # Far ridge: pale, softer, peeks above the near one.  Periods divide 288.
    for x in range(W):
        top = H - ridge(x, 30, [(7, 96, 0.5), (3, 41.142857, 2.0)])
        for y in range(top, H):
            s.px(x, y, P['far_hill'])
        s.px(x, top, P['far_hill_rim'])
    # Near ridge with a lit rim, and a dithered shade band toward the bottom.
    for x in range(W):
        top = H - ridge(x, 20, [(8, 144, 0.0), (5, 57.6, 1.0)])
        for y in range(top, H):
            c = P['hill']
            depth = y - top
            if depth > 12 or (depth > 9 and (x + y) % 2 == 0):
                c = P['hill_shade']
            s.px(x, y, c)
        s.px(x, top, P['hill_rim'])
        s.px(x, top + 1, P['hill_rim'])
    # Bushes sitting on the near ridge.
    rnd = random.Random('hills')
    for _ in range(14):
        bx = rnd.randrange(W)
        top = H - ridge(bx, 20, [(8, 144, 0.0), (5, 57.6, 1.0)])
        r = rnd.choice([2, 3, 3, 4])
        for dy in range(-r, r + 1):
            for dx in range(-r - 1, r + 2):
                if dx * dx * 0.7 + dy * dy <= r * r:
                    lit = dy < 0 and dx < 0
                    s.px(bx + dx, top + 1 + dy, P['bush_lit'] if lit else P['bush'])
    s.save('hills.png')


def city():
    s = Strip(30)
    H = s.h
    rnd = random.Random('contrail-city')
    x = 0
    while x < W - 8:
        w = rnd.randint(10, 22)
        h = rnd.randint(9, 27)
        if x + w > W - 2:
            w = W - 2 - x
            if w < 8:
                break
        body, lit = (P['bld_a'], P['bld_a_lit']) if rnd.random() < 0.5 else (P['bld_b'], P['bld_b_lit'])
        top = H - h
        s.rect(x, top, w, h, body)
        s.rect(x, top, 2, h, lit)                       # sunlit left edge
        s.rect(x + w - 1, top, 1, h, P['bld_dark'])     # shadow edge
        s.rect(x, top, w, 1, lit)                        # roof line
        roof = rnd.random()
        if roof < 0.25:                                  # antenna
            ax = x + w // 2
            s.rect(ax, top - 4, 1, 4, P['bld_dark'])
            s.px(ax, top - 5, P['window_lit'])
        elif roof < 0.45:                                # stepped top
            s.rect(x + 3, top - 3, w - 6, 3, body)
            s.rect(x + 3, top - 3, w - 6, 1, lit)
        elif roof < 0.6:                                 # water tank
            s.rect(x + w - 6, top - 3, 4, 3, P['bld_dark'])
        # Window grid: a few lit warm, most reflecting sky.
        for wy in range(top + 3, H - 2, 4):
            for wx in range(x + 3, x + w - 3, 3):
                r = rnd.random()
                if r < 0.55:
                    s.px(wx, wy, P['window'])
                    s.px(wx, wy + 1, P['window'])
                elif r < 0.65:
                    s.px(wx, wy, P['window_lit'])
                    s.px(wx, wy + 1, P['window_lit'])
        x += w + rnd.randint(1, 7)
    s.save('city.png')


def clouds():
    s = Strip(40)
    puffs = [(30, 22, [(-14, 3, 8), (-4, -1, 10), (8, 1, 9), (17, 4, 6)]),
             (128, 26, [(-9, 2, 7), (0, -2, 8), (10, 2, 6)]),
             (220, 20, [(-20, 4, 7), (-9, -1, 10), (4, -4, 11), (17, 1, 9), (27, 5, 6)])]
    for cx, cy, blobs in puffs:
        cells = {}
        for bx, by, r in blobs:
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if dx * dx + dy * dy <= r * r + r * 0.6:
                        cells[(cx + bx + dx, cy + by + dy)] = True
        base = max(y for _, y in cells) - 1
        for (x, y) in cells:
            if y > base:
                continue                                 # flat cloud bottom
            c = P['cloud']
            if y >= base - 1:
                c = P['cloud_deep']
            elif y >= base - 4 or ((x + y) % 2 == 0 and y >= base - 6):
                c = P['cloud_shade']
            s.px(x, y, c)
    s.save('clouds.png')


def ground():
    # 288x48, scrolls with the world.  Grass on top (plots, runways and trees sit on its
    # first rows, so it stays plain enough for them to stand out), soil below kept muted
    # because the hint text is drawn over it.
    s = Strip(48)
    rnd = random.Random('ground')
    GRASS = 13
    for x in range(W):
        for y in range(48):
            if y < GRASS:
                c = P['grass']
                if y >= GRASS - 3 or (y >= GRASS - 5 and (x + y) % 2 == 0):
                    c = P['grass_dark']
            else:
                c = P['soil']
                band = (y - GRASS) // 9
                if (y - GRASS) % 9 == 8 or ((y - GRASS) % 9 == 7 and (x + y) % 2 == 0):
                    c = P['soil_dark']          # gentle strata lines
            s.px(x, y, c)
        s.px(x, 0, P['grass_rim'])
        s.px(x, 1, P['grass_lit'])
        s.px(x, GRASS, P['grass_edge'])
    # Grass tufts and darker flecks, so scrolling is visible on the ground too.
    for _ in range(70):
        x, y = rnd.randrange(W), rnd.randrange(3, GRASS - 3)
        s.px(x, y, P['grass_lit']); s.px(x, y - 1, P['grass_lit'])
        s.px(x + 1, y, P['grass_dark'])
    # Grass roots hanging into the soil.
    for x in range(0, W, 3):
        if rnd.random() < 0.6:
            s.px(x, GRASS + 1, P['grass_edge'])
            if rnd.random() < 0.4:
                s.px(x, GRASS + 2, P['grass_edge'])
    # Pebbles in the soil.
    for _ in range(40):
        x, y = rnd.randrange(W), rnd.randrange(GRASS + 4, 46)
        w = rnd.choice([1, 2, 2, 3])
        for dx in range(w):
            s.px(x + dx, y, P['pebble'])
            s.px(x + dx, y + 1, P['soil_dark'])
        s.px(x, y, P['soil_light'])
    s.save('ground.png')


if __name__ == '__main__':
    ground()
    hills()
    city()
    clouds()
