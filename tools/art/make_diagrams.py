"""Draw the Flight School lesson diagrams and mission-card icons (HTML-only, assets/ui/).

Run from the repo root:  python3 tools/art/make_diagrams.py   (after make_sprites.py)
No text in the pictures: the coach bubble adds the words.
Built from the game's own sprites where they fit, so lessons look like the game.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'assets'
UI = A / 'ui'


def hexc(h, a=255):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (a,)


C = {
    'sky': hexc('#6ec6e8'), 'night': hexc('#1b2140'), 'grass': hexc('#5a9a3c'), 'grass_rim': hexc('#9ad46a'),
    'soil': hexc('#8a6a48'), 'white': hexc('#ffffff'), 'ink': hexc('#1b1b2f'),
    'up': hexc('#4caf50'), 'up_d': hexc('#2e7d32'), 'down': hexc('#e0483c'), 'down_d': hexc('#a8302a'),
    'sun': hexc('#ffe15a'), 'ray': hexc('#fff3a0'), 'moon': hexc('#f4f1e8'), 'moon_d': hexc('#c9c4b4'),
    'heat': hexc('#ff6a3d'), 'cool': hexc('#7fd3ff'), 'warm': hexc('#ff4040'), 'bar_bg': hexc('#2c3446'),
    'shadow': hexc('#000000', 70), 'cross': hexc('#e0483c'), 'skin': hexc('#ffd2a8'), 'skin_d': hexc('#e0a878'),
    'bag': hexc('#c8a165'), 'bag_d': hexc('#8a6a38'),
}


class Pic:
    def __init__(self, w, h, bg=None):
        self.img = Image.new('RGBA', (w, h), bg or (0, 0, 0, 0))
        self.w, self.h = w, h

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            if len(c) == 4 and c[3] < 255:
                self.img.alpha_composite(Image.new('RGBA', (1, 1), c), (x, y))
            else:
                self.img.putpixel((x, y), c)

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.px(xx, yy, c)

    def grid(self, rows, pal, ox, oy):
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != '.':
                    self.px(ox + x, oy + y, pal[ch])

    def sprite(self, name, x, y, flip_y=False, crop=None):
        im = Image.open(A / f'{name}.png').convert('RGBA')
        if crop:
            im = im.crop(crop)
        if flip_y:
            im = im.transpose(Image.FLIP_TOP_BOTTOM)
        self.img.alpha_composite(im, (x, y))

    def line(self, x0, y0, x1, y1, c, dash=0):
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy, err, n = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1), abs(x1 - x0) - abs(y1 - y0), 0
        while True:
            if not dash or (n // dash) % 2 == 0:
                self.px(x0, y0, c)
            n += 1
            if (x0, y0) == (x1, y1):
                return
            e2 = 2 * err
            if e2 >= dy:
                err += dy; x0 += sx
            if e2 <= dx:
                err += dx; y0 += sy

    def save(self, name):
        UI.mkdir(exist_ok=True)
        self.img.save(UI / f'{name}.png')
        print('wrote ui/' + name)


# ---------- shared pieces ----------

PLANE = ['...b............',
         '..bb............',
         '.bbwwwwwwwwwwkk.',
         'wwbbbbbbbbbbwwwk',
         '.wwwwwbbwwwwww..',
         '.....bb.........']
PLANE_PAL = {'b': hexc('#2f6fd0'), 'w': hexc('#ffffff'), 'k': hexc('#1b1b2f')}


def plane(p, x, y, tilt=0):
    """16x6 mini plane facing right. tilt -1 nose up, +1 nose down (one-pixel stair)."""
    rows = PLANE
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch != '.':
                shift = 0 if tilt == 0 else (-(c // 6) if tilt < 0 else c // 6)
                p.px(x + c, y + r + shift, PLANE_PAL[ch])


def arrow(p, x, y, length, up, col, col_d):
    """Fat pixel arrow, 5 px wide, pointing up or down; (x, y) is its top-left."""
    head = ['..c..', '.ccc.', 'ccccc']
    if up:
        p.grid(head, {'c': col}, x, y)
        p.rect(x + 1, y + 3, 3, length - 3, col); p.rect(x + 3, y + 3, 1, length - 3, col_d)
    else:
        p.rect(x + 1, y, 3, length - 3, col); p.rect(x + 3, y, 1, length - 3, col_d)
        p.grid(head[::-1], {'c': col}, x, y + length - 3)


def ground(p, top, night=False):
    for x in range(p.w):
        p.px(x, top, C['grass_rim'] if not night else hexc('#3e6b28'))
        for y in range(top + 1, p.h):
            p.px(x, y, (C['grass'] if y < top + 4 else C['soil']) if not night else (hexc('#2e4f22') if y < top + 4 else hexc('#4a3a2a')))


def cross(p, x, y, size, c=None):
    c = c or C['cross']
    for k in range(size):
        for t in (0, 1):
            p.px(x + k + t, y + k, c); p.px(x + size - 1 - k + t, y + k, c)


def bar(p, x, y, h, fill, frac):
    """The Earth bar: dark track with a fill rising from the bottom."""
    p.rect(x - 1, y - 1, 6, h + 2, C['ink'])
    p.rect(x, y, 4, h, C['bar_bg'])
    fh = round(h * frac)
    p.rect(x, y + h - fh, 4, fh, fill)


# ---------- lessons ----------

def lesson_tap():
    p = Pic(120, 64, C['sky'])
    # Left: a finger taps, the plane climbs.
    hand = ['..ss......',
            '.sSSs.....',
            '.sSSs.....',
            '.sSSs.....',
            '.sSSsss...',
            'ssSSsSSs..',
            'sSSSSSSSs.',
            'sSSSSSSSs.',
            '.sSSSSSs..',
            '..sSSSs...']
    p.grid(hand, {'s': C['skin_d'], 'S': C['skin']}, 6, 40)
    for r in (3, 5):                                     # tap ripples above the fingertip
        p.px(8 - r, 40 - r // 2, C['white']); p.px(9 + r, 40 - r // 2, C['white'])
    plane(p, 22, 22, tilt=-1)
    arrow(p, 27, 4, 14, True, C['up'], C['up_d'])
    p.line(20, 40, 24, 30, C['white'], dash=2)          # path from the tap up to the plane
    # Divider.
    for y in range(4, 60, 3):
        p.px(60, y, C['white'])
    # Right: no tap, the plane falls.
    plane(p, 80, 16, tilt=1)
    arrow(p, 86, 28, 16, False, C['down'], C['down_d'])
    ground(p, 58)
    p.save('lesson-tap')


def lesson_storm():
    p = Pic(120, 64, C['sky'])
    gap_top, gap_bot = 22, 42
    for x in (52,):
        for y in range(0, gap_top - 10, 48):
            p.sprite('storm-body', x, y, crop=(0, 0, 44, min(48, gap_top - 10 - y)))
        p.sprite('storm-bottom', x, gap_top - 10)
        p.sprite('storm-top', x, gap_bot)
        p.sprite('storm-body', x, gap_bot + 10, crop=(0, 0, 44, 64 - gap_bot - 10))
    p.line(4, 34, 48, 32, C['white'], dash=2)           # the safe route through the gap
    p.line(98, 32, 116, 30, C['white'], dash=2)
    plane(p, 66, 29)
    p.save('lesson-storm')


def lesson_seed():
    p = Pic(120, 64, C['sky'])
    # Top left: the plane grabs a seed.
    p.sprite('token', 30, 4)
    plane(p, 10, 8)
    for x, y in ((28, 6), (27, 13), (46, 7)):           # grab sparkles
        p.px(x, y, C['white'])
    # Divider down the middle of the lower half.
    for x in range(4, 116, 3):
        p.px(x, 24, C['white'])
    # Bottom left: landed on the runway, seed goes into the bag (kept).
    ground(p, 56)
    p.sprite('runway', 2, 56); p.sprite('runway', 22, 56); p.sprite('runway', 42, 56, crop=(0, 0, 10, 6))
    plane(p, 8, 50)
    bag = ['..dd..', '.dbbd.', 'dbbbbd', 'dbbbbd', 'dbbbbd', '.dddd.']
    p.grid(bag, {'b': C['bag'], 'd': C['bag_d']}, 40, 44)
    p.sprite('ui/icon-seed', 38, 27)                     # seed dropping in
    arrow(p, 41, 37, 6, False, C['up'], C['up_d'])
    # Bottom right: crashed plane, seed crossed out.
    for x in range(62, 120):
        p.px(x, 56, C['grass_rim'])
    plane(p, 80, 50, tilt=1)
    for x, y in ((78, 48), (96, 46), (85, 44)):          # crash puffs
        p.rect(x, y, 2, 2, hexc('#9a9a9a'))
    p.sprite('ui/icon-seed', 98, 28)
    cross(p, 97, 28, 18)
    p.save('lesson-seed')


def lesson_day():
    p = Pic(120, 64, C['sky'])
    p.grid(['..yyyy..', '.yyyyyy.', 'yyyyyyyy', 'yyyyyyyy', 'yyyyyyyy', 'yyyyyyyy', '.yyyyyy.', '..yyyy..'],
           {'y': C['sun']}, 4, 3)
    trail_y, tx0, tx1 = 26, 40, 86                        # the contrail: y and its x span
    sx, sy, gy = 8, 10, 56                                # rays start near the sun, ground at gy
    slope = 22 / 45                                       # px right per px down
    shade = []
    for x0 in range(14, 100, 10):
        x_at_trail = x0 + round((trail_y - sy) * slope)
        if tx0 <= x_at_trail <= tx1:                      # this ray hits the contrail
            p.line(x0, sy, x_at_trail, trail_y - 1, C['ray'], dash=3)
            p.line(x_at_trail, trail_y - 1, x_at_trail - 5, trail_y - 9, C['ray'], dash=2)   # back to space
            shade.append(x0 + round((gy - sy) * slope))   # where it would have landed
        else:
            p.line(x0, sy, x0 + round((gy - 1 - sy) * slope), gy - 1, C['ray'], dash=3)
    p.rect(tx0, trail_y, tx1 - tx0, 2, C['white'])
    plane(p, 86, trail_y - 3)
    ground(p, 56)
    p.rect(min(shade) - 3, 56, max(shade) - min(shade) + 6, 2, C['shadow'])   # its shadow, where blocked rays would land
    bar(p, 110, 6, 44, C['cool'], 0.35)
    arrow(p, 103, 30, 16, False, hexc('#2a7fb0'), hexc('#1d5a80'))
    p.save('lesson-day')


def lesson_night():
    p = Pic(120, 64, C['night'])
    for x, y in ((10, 20), (30, 8), (52, 14), (70, 6), (95, 22), (82, 12), (40, 30)):
        p.px(x, y, C['white'])
    p.grid(['..mmmm..', '.mmmmmm.', 'mmmMmmmm', 'mmmmmmMm', 'mMmmmmmm', 'mmmmmMmm', '.mmmmmm.', '..mmmm..'],
           {'m': C['moon'], 'M': C['moon_d']}, 6, 4)
    trail_y = 22
    p.rect(30, trail_y, 50, 2, C['white'])               # the contrail, a lid over the ground
    plane(p, 80, trail_y - 3)
    ground(p, 56, night=True)
    for x in (36, 50, 64):                                 # heat rising, caught, sent back down
        arrow(p, x, trail_y + 4, 26, True, C['heat'], hexc('#c04a20'))
        arrow(p, x + 7, trail_y + 4, 14, False, C['heat'], hexc('#c04a20'))
    arrow(p, 16, 26, 26, True, C['heat'], hexc('#c04a20'))  # away from the contrail it escapes
    bar(p, 110, 6, 44, C['warm'], 0.75)
    arrow(p, 104, 14, 12, True, C['warm'], C['down_d'])
    p.save('lesson-night')


def lesson_land():
    p = Pic(120, 64, C['sky'])
    ground(p, 52)
    for x in range(14, 114, 20):
        p.sprite('runway', x, 52, crop=(0, 0, min(20, 114 - x), 6))
    p.sprite('tower', 100, 22)
    p.line(4, 14, 40, 44, C['white'], dash=2)            # gentle glide path
    plane(p, 40, 45, tilt=0)
    for x in (58, 66):                                     # touchdown dust
        p.px(x, 51, C['white']); p.px(x + 1, 50, C['white'])
    p.save('lesson-land')


def lesson_heat():
    p = Pic(120, 64, C['sky'])
    big = Image.open(A / 'face-melting.png').convert('RGBA').resize((38, 38), Image.NEAREST)
    p.img.alpha_composite(big, (24, 10))
    bar(p, 74, 6, 50, C['warm'], 1.0)
    p.rect(71, 5, 12, 2, C['warm'])                        # over the danger line
    for x, y in ((8, 40), (14, 52), (64, 48), (20, 30)):    # seeds falling away
        p.sprite('ui/icon-seed', x, y)
    cross(p, 90, 18, 24)
    p.save('lesson-heat')


# ---------- mission icons (24x24) ----------

def icon(name, draw, night=False):
    """24x24 icon on a rounded sky tile, so white contrails and dashes show on cream cards."""
    p = Pic(24, 24)
    bg, edge = (C['night'], hexc('#0e1226')) if night else (C['sky'], hexc('#3f8fb5'))
    for y in range(24):
        for x in range(24):
            corner = (x in (0, 23) and y in (0, 1, 22, 23)) or (y in (0, 23) and x in (1, 22))
            if not corner:
                border = x in (0, 23) or y in (0, 23) or (x in (1, 22) and y in (1, 22))
                p.px(x, y, edge if border else bg)
    draw(p)
    p.save(name)


def mi_land(p):
    p.rect(1, 15, 22, 5, hexc('#55555f')); p.rect(1, 15, 22, 1, hexc('#c9c9c2'))
    for x in (3, 10, 17):
        p.rect(x, 17, 4, 1, C['white'])
    plane(p, 4, 6, tilt=1)


def mi_seed(p):
    bag = ['....dd....', '...dbbd...', '..dbbbbd..', '.dbbbbbbd.', 'dbbbbbbbbd', 'dbbbbbbbbd',
           'dbbbbbbbbd', 'dbbbbbbbbd', '.dbbbbbbd.', '..dddddd..']
    p.grid(bag, {'b': C['bag'], 'd': C['bag_d']}, 7, 12)
    p.sprite('ui/icon-seed', 4, 0)


def mi_night(p):
    p.grid(['..mmmm..', '.mmmmmm.', 'mmmMmmmm', 'mmmmmmmm', 'mmmmmMmm', '.mmmmmm.', '..mmmm..'],
           {'m': C['moon'], 'M': C['moon_d']}, 2, 2)
    p.rect(3, 16, 18, 2, C['white'])
    cross(p, 13, 13, 8)


def mi_airports(p):
    for x, y in ((0, 19), (14, 19)):
        p.rect(x, y, 10, 3, hexc('#55555f')); p.rect(x + 2, y + 1, 4, 1, C['white'])
    p.line(5, 15, 18, 15, C['white'], dash=2)
    p.grid(['c.', 'cc', 'c.'], {'c': C['white']}, 19, 14)
    plane(p, 4, 4)


def mi_shade(p):
    p.grid(['.yyy.', 'yyyyy', 'yyyyy', 'yyyyy', '.yyy.'], {'y': C['sun']}, 1, 1)
    p.line(5, 6, 9, 12, C['ray'], dash=2)
    p.rect(6, 12, 16, 2, C['white'])
    p.rect(1, 21, 22, 3, C['grass'])
    p.rect(8, 21, 12, 1, C['shadow'])


def mi_tree(p):
    im = Image.open(A / 'tree-oak-2.png').convert('RGBA').resize((22, 28), Image.NEAREST)
    p.img.alpha_composite(im.crop((0, 0, 22, 24)), (1, 1))   # crown in view; trunk runs off the bottom edge


def mi_crystal(p):
    im = Image.open(UI / 'icon-crystal.png').convert('RGBA')
    p.img.alpha_composite(im, (4, 4))


def mi_globe(p):
    globe = Image.open(A / 'face-happy.png').convert('RGBA')
    # A plain globe: the happy Earth without its face (eyes, mouth, cheeks painted back as sea).
    px = globe.load()
    for x, y in [(6, 8), (7, 8), (6, 9), (7, 9), (11, 8), (12, 8), (11, 9), (12, 9),
                 (6, 12), (7, 13), (8, 13), (9, 13), (10, 13), (11, 13), (12, 12), (4, 11), (14, 11)]:
        px[x, y] = hexc('#3fa8e0')
    p.img.alpha_composite(globe, (3, 5))
    p.line(1, 12, 6, 2, C['white'], dash=1)
    p.line(6, 2, 17, 1, C['white'], dash=1)
    plane(p, 8, 0)


if __name__ == '__main__':
    lesson_tap()
    lesson_storm()
    lesson_seed()
    lesson_day()
    lesson_night()
    lesson_land()
    lesson_heat()
    for spec in (('mi-land', mi_land), ('mi-seed', mi_seed), ('mi-night', mi_night, True), ('mi-airports', mi_airports),
                 ('mi-shade', mi_shade), ('mi-tree', mi_tree), ('mi-crystal', mi_crystal, True), ('mi-globe', mi_globe)):
        icon(*spec)
