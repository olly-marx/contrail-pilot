"""Draw the game's small sprites (storms, tokens, parcels, trees, animals) as PNGs in assets/.

Run from the repo root:  python3 tools/art/make_sprites.py
Sizes match what GameScene.js expects; change one only together with the code that uses it.
Light comes from the upper left everywhere, to match the plane and the background strips.
"""
import math
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[2] / 'assets'


def hexc(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


class Sprite:
    def __init__(self, w, h, wrap_y=False):
        self.w, self.h, self.wrap_y = w, h, wrap_y
        self.img = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    def px(self, x, y, c):
        if self.wrap_y:
            y %= self.h
        if 0 <= x < self.w and 0 <= y < self.h:
            self.img.putpixel((x, y), c)

    def get(self, x, y):
        if self.wrap_y:
            y %= self.h
        if 0 <= x < self.w and 0 <= y < self.h:
            return self.img.getpixel((x, y))
        return None

    def filled(self, x, y):
        c = self.get(x, y)
        return c is not None and c[3] > 0

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.px(xx, yy, c)

    def grid(self, rows, colours, ox=0, oy=0):
        """Paint a hand-drawn pixel map; '.' is transparent."""
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != '.':
                    self.px(ox + x, oy + y, colours[ch])

    def outline(self, c):
        """Draw c on every empty pixel that touches a filled one (4-neighbour)."""
        edge = [(x, y) for y in range(self.h) for x in range(self.w)
                if not self.filled(x, y) and any(self.filled(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
        for x, y in edge:
            self.px(x, y, c)

    def save(self, name):
        self.img.save(OUT / f'{name}.png')
        print('wrote', name)


# ---------- storms ----------

STORM = {'rim': hexc('#9a9fc0'), 'light': hexc('#6d7296'), 'mid': hexc('#4f5372'),
         'dark': hexc('#3a3d57'), 'deep': hexc('#2a2c42')}
SW = 44


def scallop(y, period, depth, phase=0):
    """Inset of a billowing edge: round bulges `period` px tall, `depth` px deep notches between them."""
    t = ((y + phase) % period) / period * 2 - 1          # -1..1 across one bulge
    return 1 + round(depth * (1 - math.sqrt(max(0.0, 1 - t * t))))


def storm_px(x, y, l, r, s, bulge_t=None):
    """Colour one storm pixel from its place across the column: lit left, shadowed right."""
    f = (x - l) / max(1, (SW - r) - l)
    d = (x + y) % 2 == 0
    if f < 0.18 or (f < 0.26 and d):
        c = STORM['light']
    elif f < 0.55 or (f < 0.62 and d):
        c = STORM['mid']
    elif f < 0.84 or (f < 0.9 and d):
        c = STORM['dark']
    else:
        c = STORM['deep']
    s.px(x, y, c)


def storm_body():
    # Tiles vertically every 48 px: every period below divides 48.
    s = Sprite(SW, 48)
    for y in range(48):
        l = scallop(y, 16, 5)
        r = scallop(y, 24, 6, phase=8)
        for x in range(l, SW - r):
            storm_px(x, y, l, r, s)
        # Each left bulge: bright rim on its upper half, dark underside where it tucks in.
        t = (y % 16) / 16
        if t < 0.55:
            s.px(l, y, STORM['rim'])
            if t < 0.35:
                s.px(l + 1, y, STORM['rim'] if t < 0.2 else STORM['light'])
        elif t > 0.8:
            for x in range(l, l + 4):
                s.px(x, y, STORM['mid'])
        tr = ((y + 8) % 24) / 24
        if tr > 0.8:
            for x in range(SW - r - 4, SW - r):
                s.px(x, y, STORM['deep'])
    # Inner folds: the dark underside arc of lumps buried in the column (cauliflower look).
    for cx, cy, rad in [(17, 10, 7), (27, 26, 8), (15, 38, 6), (24, 46, 6)]:
        for a in range(20, 161, 6):
            ang = math.radians(a)
            x, y = round(cx + rad * math.cos(ang)), round(cy + rad * math.sin(ang)) % 48
            if s.filled(x, y):
                s.px(x, y, STORM['dark'] if x < 26 else STORM['deep'])
                if s.filled(x, (y - 1) % 48) and a % 12 == 8:
                    s.px(x, (y - 1) % 48, STORM['light'] if x < 22 else STORM['mid'])
    s.save('storm-body')


def storm_cap(flip):
    # Rounded end of a column; the flat edge joins the body, the bulging edge faces open sky.
    s = Sprite(SW, 10)
    # Three billows across the end, the middle one tallest.
    bumps = [(9, 7, 7), (22, 10, 9), (35, 7, 7)]
    for i in range(10):          # i = rows away from the sky-facing tip
        y = i if not flip else 9 - i
        xs = [x for x in range(SW) if any(abs(x - bx) <= math.sqrt(max(0, br * br - (bh - 1 - i) ** 2)) and i < bh or i >= bh
                                          for bx, bh, br in bumps) and 1 <= x < SW - 1]
        if i >= 6:
            xs = list(range(1, SW - 1))
        if not xs:
            continue
        l, r = min(xs), SW - 1 - max(xs)
        for x in xs:
            storm_px(x, y, l, r, s)
    # Highlight the sky-facing top of each billow (or shade its underside for a hanging storm).
    for bx, bh, br in bumps:
        for x in range(bx - br, bx + br + 1):
            for i in range(10):
                y = i if not flip else 9 - i
                if s.filled(x, y):
                    if not flip and x < bx + 2:
                        s.px(x, y, STORM['rim'] if x < bx - 1 else STORM['light'])
                    if flip:
                        s.px(x, y, STORM['dark'] if x < bx + 2 else STORM['deep'])
                    break
    s.save('storm-bottom' if flip else 'storm-top')


# ---------- tokens and parcels ----------

def token(name, ring, ring_light):
    s = Sprite(14, 14)
    c = {'R': ring, 'L': ring_light, 'w': hexc('#ffffff'), 'p': hexc('#e3f2ea'),
         'g': hexc('#4caf50'), 'G': hexc('#2e7d32'), 'h': hexc('#8bd48e'), 't': hexc('#7a4a24')}
    s.grid([
        '....RRRRRR....',
        '..RRLwwwwwRR..',
        '.RLwwwhwwwppR.',
        '.RwwwhggwwwpR.',
        'RLwwhgggGwwwpR',
        'RwwwgggGGwwwpR',
        'RwwhgggggGwwpR',
        'RwwggggGGGGwpR',
        'RwwwwGtGGwwwpR',
        'RwwwwwtwwwwppR',
        '.Rwwwwtwwwwpp.',
        '.RpwwwwwwwppR.',
        '..RRppppppRR..',
        '....RRRRRR....',
    ], c)
    s.save(name)


def chute():
    s = Sprite(11, 7)
    c = {'w': hexc('#ffffff'), 'r': hexc('#e0483c'), 'R': hexc('#a8302a'), 's': hexc('#d9d9d9'), 'S': hexc('#b8b8b8'), 'l': hexc('#cfcfcf')}
    s.grid([
        '...wwrww...',
        '.wwwrrrwww.',
        'wwwwrrrwwws',
        'sSwSRRRSwSS',
        'l...l.l...l',
        '.l..l.l..l.',
        '..l.l.l.l..',
    ], c)
    s.save('chute')


def crate():
    s = Sprite(7, 9)
    c = {'g': hexc('#5cbf60'), 'G': hexc('#2e7d32'), 'k': hexc('#d8b07a'), 'K': hexc('#a87c48'), 'd': hexc('#6e4a26')}
    s.grid([
        '..gG...',
        '.gGgG..',
        '..Gg...',
        'dddddd.',
        'dkkkKd.',
        'dkdkKd.',
        'dkkdKd.',
        'dKKKKd.',
        'dddddd.',
    ], c)
    s.save('crate')


# ---------- trees ----------

SPECIES = {
    #           leaf light, leaf,     leaf dark, outline,   trunk,     trunk dark
    'spruce':  ('#4f9a52', '#2e7d32', '#1f5e25', '#174a1d', '#6e4424', '#4f2f18'),
    'birch':   ('#c9e58f', '#9ccc65', '#6f9f3d', '#557a2e', '#f2f2ee', '#3a3a3a'),
    'oak':     ('#7cc77f', '#4caf50', '#2f8034', '#22602a', '#7a4a24', '#57341a'),
    'rowan':   ('#6cbf6f', '#43a047', '#2c7a31', '#215d26', '#80532d', '#5a3a1f'),
    'orchard': ('#93d394', '#66bb6a', '#3f8f44', '#2f6e34', '#8a5a30', '#5f3d20'),
}
SIZES = [(3, 4), (7, 9), (11, 14)]


def tree(kind, stage):
    w, h = SIZES[stage]
    s = Sprite(w, h)
    ll, l, d, o, t, td = (hexc(v) for v in SPECIES[kind])
    cx = (w - 1) / 2
    if stage == 0:  # seedling: a stem and two leaves
        s.px(1, 3, t if kind != 'birch' else td)
        s.px(1, 2, d)
        s.px(0, 1, l); s.px(2, 1, ll); s.px(1, 0, ll)
        s.save(f'tree-{kind}-0')
        return
    trunk_h = 2 if stage == 1 else 4
    tw = 1 if stage == 1 else 2
    tx = int(cx) if stage == 1 else int(cx)
    for y in range(h - trunk_h, h):
        for x in range(tx, tx + tw):
            s.px(x, y, t)
        if kind == 'birch' and y % 2 == 0:
            s.px(tx + (y // 2) % tw, y, td)          # birch bark marks
        elif tw == 2:
            s.px(tx + 1, y, td)                      # shadow side of the trunk
    crown_h = h - trunk_h
    cells = []
    if kind == 'spruce':
        # Stacked tiers, each wider than the one above.
        for y in range(crown_h + (1 if stage == 2 else 0)):
            tier = y % 3
            frac = (y + 1) / crown_h
            half = max(0, round(frac * (w / 2 - 0.5)) - (1 if tier == 0 and y > 0 else 0))
            for x in range(round(cx - half), round(cx + half) + 1):
                cells.append((x, y))
    else:
        # Round crown: overlapping blobs give each species its outline.
        r = crown_h / 2
        blobs = {'oak': [(cx, r, r * 1.05), (cx - r * 0.5, r * 1.2, r * 0.7), (cx + r * 0.5, r * 1.2, r * 0.7)],
                 'birch': [(cx, r * 0.95, r * 0.8), (cx, r * 1.3, r * 0.7)],
                 'rowan': [(cx, r, r * 0.95), (cx - r * 0.4, r * 0.7, r * 0.6)],
                 'orchard': [(cx, r * 1.05, r * 1.0), (cx - r * 0.6, r * 1.2, r * 0.6), (cx + r * 0.6, r * 1.2, r * 0.6)]}[kind]
        for y in range(crown_h + 1):
            for x in range(w):
                if any((x - bx) ** 2 + ((y - by) * 1.1) ** 2 <= br * br for bx, by, br in blobs):
                    cells.append((x, y))
    cset = set(cells)
    for x, y in cells:
        u, v = (x - cx) / max(1, w / 2), (y - crown_h / 2) / max(1, crown_h / 2)
        lit = -0.6 * u - 0.8 * v
        if kind == 'spruce':
            lit = -0.9 * u - (0.6 if y % 3 == 2 else -0.2)
        if lit > 0.45:
            c = ll
        elif lit > -0.35 or (lit > -0.55 and (x + y) % 2 == 0):
            c = l
        else:
            c = d
        # Outline on the shadowed, sky-facing edge only, so trees stay soft.
        edge = any((x + dx, y + dy) not in cset for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)))
        if edge and lit < -0.2 and stage == 2:
            c = o
        s.px(x, y, c)
    if kind == 'orchard' and stage == 2:
        for fx, fy in [(2, 4), (7, 3), (4, 7), (8, 7)]:
            s.px(fx, fy, hexc('#e53935')); s.px(fx, fy - 1, hexc('#ff8a80'))
    if kind == 'rowan':
        for fx, fy in ([(1, 3), (w - 2, 4), (int(cx), 1)] if stage == 2 else [(1, 2), (w - 2, 3)]):
            s.px(fx, fy, hexc('#ff5722'))
    s.save(f'tree-{kind}-{stage}')


# ---------- animals ----------

def birds():
    c = {'#': hexc('#2b2b3f'), 'w': hexc('#4a4a66'), 'o': hexc('#ffffff'), '>': hexc('#ffa000')}
    up = ['w.......w',
          '#w.....w#',
          '.#w...w#.',
          '..##w##o>',
          '...###...',
          '.........']
    down = ['.........',
            '.........',
            '.........',
            '..##w##o>',
            '.##...##.',
            '#w.....w#']
    for i, rows in enumerate((up, down)):
        s = Sprite(9, 6)
        s.grid(rows, c)
        s.save(f'bird-{i}')


def stork():
    # 14x7, flying left (GameScene drifts storks leftward over the ground): long red beak
    # and outstretched neck in front, black flight feathers on the wing, red legs trailing.
    s = Sprite(14, 7)
    c = {'w': hexc('#ffffff'), 's': hexc('#d5dde8'), 'k': hexc('#1b1b2f'), 'b': hexc('#ff7043'), 'e': hexc('#1b1b2f')}
    s.grid([
        '.......kkkk...',
        '......kwwwwk..',
        'bbbwewwwwwwwbb',
        '.....swwwwws..',
        '.......kkk....',
    ], c, oy=1)
    s.save('stork')


if __name__ == '__main__':
    storm_body()
    storm_cap(False)
    storm_cap(True)
    token('token', hexc('#2e7d32'), hexc('#5cbf60'))
    token('token-gold', hexc('#e0a020'), hexc('#ffe08a'))
    chute()
    crate()
    for kind in SPECIES:
        for st in range(3):
            tree(kind, st)
    birds()
    stork()
