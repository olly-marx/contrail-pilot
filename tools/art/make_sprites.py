"""Draw the game's small sprites (storms, tokens, parcels, trees, animals) as PNGs in assets/.

Run from the repo root:  python3 tools/art/make_sprites.py
Sizes match what GameScene.js expects; change one only together with the code that uses it.
Light comes from the upper left everywhere, to match the plane and the background strips.
"""
import math
import random
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
    # Buried lumps: a soft lit crescent on each one's upper left, so the column reads as
    # cauliflower billows rather than a flat slab.  No dark outlines (they read as scales).
    for cx, cy, rad in [(18, 10, 7), (27, 27, 7), (16, 40, 6)]:
        for a in range(195, 275, 5):
            ang = math.radians(a)
            for k in (0, 1):
                x, y = round(cx + (rad - k) * math.cos(ang)), round(cy + (rad - k) * math.sin(ang)) % 48
                if s.filled(x, y) and s.filled(x - 2, y):
                    s.px(x, y, STORM['light'] if k == 0 else STORM['mid'])
    s.save('storm-body')


def storm_cap(flip):
    # Rounded end of a column; the flat edge joins the body, the billowed edge faces open sky.
    # Fill uses the body's own left-to-right shading so the join is invisible; the billows come
    # from the outline plus a lit top (rising storm) or a shadowed underside (hanging storm).
    s = Sprite(SW, 10)
    bumps = [(7, 8), (19, 10), (31, 9), (40, 6)]   # (centre x, height in px from the join)
    def height(x):
        return max((round(math.sqrt(max(0.0, 1 - ((x - bx) / (h * 0.8)) ** 2)) * h) for bx, h in bumps), default=0)
    for x in range(1, SW - 1):
        h = min(10, height(x))
        for i in range(h):                       # i = pixels from the join edge
            y = 9 - i if not flip else i
            storm_px(x, y, 1, 1, s)
        if h == 0:
            continue
        tip = 9 - (h - 1) if not flip else h - 1   # sky-facing pixel of this column
        step = -1 if not flip else 1               # direction from the join toward the sky
        rising = height(x - 1) <= height(x)        # this column is on the left (sunlit) flank of a billow
        if not flip:
            s.px(x, tip, STORM['rim'] if rising and x < 34 else STORM['light'])
            if rising and x < 30:
                s.px(x, tip - step, STORM['light'])
        else:
            s.px(x, tip, STORM['deep'])
            s.px(x, tip - step, STORM['dark'] if rising else STORM['deep'])
            if rising and x < 30 and h > 3:
                s.px(x, tip - 2 * step, STORM['light'] if x < 20 else STORM['mid'])
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


# ---------- ground features ----------

def plot():
    # 32x9: a raised mound (rows 0-2, above the grass line) over a bed of dug soil (rows 3-8).
    s = Sprite(32, 9)
    c = {'m': hexc('#8a5530'), 'M': hexc('#a46a3e'), 'f': hexc('#5a3318'), 's': hexc('#6a3c1c'),
         'S': hexc('#55301a'), 'p': hexc('#93694a')}
    for x in range(2, 30):                        # mound
        s.px(x, 1, c['M'] if x < 12 else c['m'])
        s.px(x, 2, c['m'])
    for x in range(4, 28):
        s.px(x, 0, c['M'] if x < 10 else c['m'])
    for i in range(5, 27, 6):                     # furrows
        s.px(i, 1, c['f']); s.px(i + 1, 1, c['f']); s.px(i + 2, 2, c['f'])
    for y in range(3, 9):                         # dug soil bed
        for x in range(32):
            s.px(x, y, c['S'] if (y == 8 or (y == 7 and (x + y) % 2 == 0)) else c['s'])
    rnd = random.Random('plot')
    for _ in range(9):
        s.px(rnd.randrange(1, 31), rnd.randrange(4, 7), c['p'])
    s.save('plot')


def plot_sign():
    s = Sprite(6, 9)
    c = {'b': hexc('#f4f1e8'), 'B': hexc('#c9c2ae'), 'g': hexc('#4caf50'), 'G': hexc('#2e7d32'), 'p': hexc('#7a4a24'), 'P': hexc('#57341a')}
    s.grid(['BbbbbB',
            'bbggbB',
            'bgGGbB',
            'bbpbbB',
            'BBBBBB',
            '..pP..',
            '..pP..',
            '..pP..',
            '..pP..'], c)
    s.save('plot-sign')


def plot_arrow():
    s = Sprite(9, 6)
    c = {'o': hexc('#1b5e20'), 'g': hexc('#8dffb0'), 'w': hexc('#e6fff0')}
    s.grid(['ooooooooo',
            'owgggggo.',
            '.owgggo..',
            '..ogggo..',
            '...ogo...',
            '....o....'], c)
    s.save('plot-arrow')


def runway_tile():
    # 20x6, repeated along the 220 px runway; the centre dash sits at x 8..17 like the old marks.
    s = Sprite(20, 6)
    edge, tar, tar_d, mark = hexc('#c9c9c2'), hexc('#55555f'), hexc('#46464f'), hexc('#f2f2f2')
    for x in range(20):
        s.px(x, 0, edge)
        for y in range(1, 5):
            s.px(x, y, tar_d if (x * 7 + y * 3) % 11 == 0 else tar)
        s.px(x, 5, hexc('#3a3a42'))
    for x in range(8, 18):
        s.px(x, 2, mark); s.px(x, 3, hexc('#cfcfcf'))
    s.save('runway')


def tower():
    # 13x30 control tower; drawn with its base on the ground line (origin bottom-left).
    s = Sprite(13, 30)
    c = {'k': hexc('#2c3446'), 'r': hexc('#3e4a61'), 'R': hexc('#55637e'), 'g': hexc('#9fd8ff'), 'G': hexc('#d8f2ff'),
         'w': hexc('#ece8dc'), 'W': hexc('#c9c4b4'), 'l': hexc('#ff5252'), 'a': hexc('#8a8f99')}
    s.grid(['......l......',
            '......a......',
            '..RRRRRRRRr..',
            '.RrrrrrrrrrrR',
            'kkkkkkkkkkkkk',
            'kGgggGgggGggk',
            'kgGggggGggggk',
            'kggggggggggGk',
            'rrrrrrrrrrrrr',
            '..rrrrrrrrk..'], c)
    for y in range(10, 30):                       # shaft, lit on the left
        for x in range(3, 10):
            s.px(x, y, c['w'] if x < 7 else c['W'])
        if y % 5 == 2:
            s.px(5, y, c['g']); s.px(6, y, c['g'])
    for x in range(2, 11):
        s.px(x, 29, c['W'])
    s.save('tower')


# ---------- sky features ----------

def issr_tile():
    # 32x32, tiles both ways; drawn at 30-50% alpha over the sky, so keep it pale and quiet.
    s = Sprite(32, 32)
    base, shim, f_mid, f_hi = hexc('#f4fbff'), hexc('#e2f2fc'), hexc('#8fc9ef'), hexc('#ffffff')
    for y in range(32):
        for x in range(32):
            band = (x + y) % 16                    # faint diagonal shimmer; 16 divides 32 so it tiles
            s.px(x, y, shim if band in (0, 1) or (band == 2 and (x % 2 == 0)) else base)
    def flake(fx, fy, big):
        if big:
            for d in (-2, -1, 1, 2):
                s.px(fx + d, fy, f_mid); s.px(fx, fy + d, f_mid)
            for d in (-1, 1):
                s.px(fx + d, fy + d, hexc('#b5ddf5')); s.px(fx + d, fy - d, hexc('#b5ddf5'))
        else:
            for d in (-1, 1):
                s.px(fx + d, fy, f_mid); s.px(fx, fy + d, f_mid)
        s.px(fx, fy, f_hi)
    for fx, fy, big in [(6, 6, True), (21, 4, False), (13, 15, False), (26, 20, True), (5, 25, False), (18, 28, False)]:
        flake(fx, fy, big)
    for fx, fy in [(10, 10), (24, 11), (15, 23), (29, 29), (2, 16)]:
        s.px(fx, fy, hexc('#b5ddf5'))
    s.save('issr-tile')


def nofly():
    # 16x16 hazard stripes, tiling both ways: 4 px red bands on cream, each with a shaded edge.
    s = Sprite(16, 16)
    cream, cream_d, red, red_d = hexc('#f4f1e8'), hexc('#dcd6c6'), hexc('#d02a2a'), hexc('#9e1c1c')
    for y in range(16):
        for x in range(16):
            k = (x + y) % 8
            s.px(x, y, red if k < 3 else red_d if k == 3 else cream_d if k == 4 else cream)
    s.save('nofly')


# ---------- HUD ----------

def faces():
    # 19x19 Earth with a face, one sprite per mood; Hud.js swaps between them.
    land_mask = ['...................',
                 '...................',
                 '.......##..........',
                 '.....####......#...',
                 '....#####.....###..',
                 '....####......##...',
                 '.....##............',
                 '...................',
                 '...................',
                 '...................',
                 '...................',
                 '.............##....',
                 '...##.......####...',
                 '...###.......###...',
                 '....##........#....',
                 '...................',
                 '...................',
                 '...................',
                 '...................']
    moods = {
        'happy':   ('#3fa8e0', '#7cc8f0', '#2a7fb0', '#3f9a45'),
        'ok':      ('#4aa0c8', '#80c0dc', '#33789a', '#5aa04a'),
        'hot':     ('#e8a33c', '#f5c878', '#b97a22', '#a07a2a'),
        'melting': ('#e0483c', '#f08070', '#a8302a', '#8a4a22'),
    }
    for mood, (sea, sea_l, sea_d, land) in moods.items():
        s = Sprite(19, 19)
        cx = cy = 9
        for y in range(19):
            for x in range(19):
                d2 = (x - cx) ** 2 + (y - cy) ** 2
                if d2 <= 8.5 ** 2:
                    lit = -(x - cx) * 0.6 - (y - cy) * 0.8
                    c = hexc(sea_l) if lit > 4 else hexc(sea_d) if lit < -4.5 else hexc(sea)
                    if land_mask[y][x] == '#':
                        c = hexc(land)
                    s.px(x, y, c)
        s.outline(hexc('#000000'))
        s.px(6, 4, hexc('#ffffff')); s.px(5, 5, hexc('#ffffff'))   # shine
        k = hexc('#000000')
        for ex in (6, 11):                                         # eyes
            s.rect(ex, 8, 2, 2, k)
            if mood == 'happy':
                s.px(ex, 8, hexc('#ffffff'))
        mouth = {'happy': [(6, 12), (7, 13), (8, 13), (9, 13), (10, 13), (11, 13), (12, 12)],
                 'ok': [(7, 13), (8, 13), (9, 13), (10, 13), (11, 13)],
                 'hot': [(7, 13), (8, 12), (9, 12), (10, 12), (11, 13)],
                 'melting': [(7, 14), (8, 13), (9, 12), (10, 13), (11, 14), (9, 13)]}[mood]
        for mx, my in mouth:
            s.px(mx, my, k)
        if mood == 'happy':                                        # rosy cheeks
            s.px(4, 11, hexc('#ff9aa8')); s.px(14, 11, hexc('#ff9aa8'))
        if mood in ('hot', 'melting'):                             # sweat
            drop = hexc('#9fe0ff')
            s.px(15, 4, drop); s.rect(15, 5, 2, 2, drop); s.px(16, 5, hexc('#ffffff'))
            if mood == 'melting':
                s.px(2, 7, drop); s.rect(1, 8, 2, 2, drop)
                s.rect(8, 17, 2, 2, hexc(sea_d)); s.px(8, 18, hexc(sea))  # dripping
        s.save(f'face-{mood}')


if __name__ == '__main__':
    plot(); plot_sign(); plot_arrow(); runway_tile(); tower(); issr_tile(); nofly(); faces()

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
