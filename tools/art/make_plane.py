"""Upgrade overlays for the plane: one PNG per upgrade line and level, drawn ON TOP of the base.

Run from the repo root:  python3 tools/art/make_plane.py
assets/plane.png (62x27) is the base and is never changed. Collisions use the base only
(GameScene.planePixels reads alphaMask('plane')), so overlays are LOOK ONLY: draw them as
separate sprites, never bake them into the 'plane' texture.

Every overlay is 74x39: the base canvas plus a 6 px margin on every side, so parts can reach
past the base's edges (longer wings stick out behind). Same centre as the base, so in the game
it takes planeSprite's x, y and rotation with origin 0.5.
"""
from pathlib import Path

from PIL import Image

A = Path(__file__).resolve().parents[2] / 'assets'
M = 6                                   # margin around the base canvas
BW, BH = 62, 27                         # base plane size
W, H = BW + 2 * M, BH + 2 * M

K = (10, 10, 10, 255)                   # outline, as on the base
G = (184, 192, 200, 255)                # wing grey (#b8c0c8, the base's wing shade)
GL = (232, 235, 242, 255)               # lit grey (#e8ebf2)


class Overlay:
    def __init__(self):
        self.img = Image.new('RGBA', (W, H), (0, 0, 0, 0))

    def px(self, x, y, c):
        """x, y in BASE coordinates (0,0 = base top-left); may be negative, into the margin."""
        X, Y = x + M, y + M
        if 0 <= X < W and 0 <= Y < H:
            self.img.putpixel((X, Y), c)

    def save(self, name):
        self.img.save(A / f'{name}.png')
        print('wrote', name)


# ---------- Long Wings ----------
# Side view hides a wing's length, so the upgrade shows as winglets (as on real jets): a fin turned
# up at the end of the swept strip at the base's left edge (outline row 14, grey row 15, outline
# row 16, closed at x=0). Level 1: a short blended winglet. Level 2: a tall curved "sharklet".
BLUE = (11, 71, 185, 255)                       # the livery blue (#0b47b9)
BASE = Image.open(A / 'plane.png').convert('RGBA')


def wings(level):
    o = Overlay()
    # Wing carried on 2 px past the old end cap, so the winglet grows out of it.
    body = {(0, 15), (-1, 15), (-2, 15), (-3, 15)}
    if level == 1:                              # blended winglet: a short wedge
        fin = {(-3, 14), (-2, 14), (-1, 14), (-3, 13), (-2, 13), (-3, 12)}
        tip = (-3, 11)
    else:                                       # sharklet: taller, raked back
        fin = {(-3, 14), (-2, 14), (-1, 14), (-4, 13), (-3, 13), (-2, 13), (-4, 12), (-3, 12),
               (-5, 11), (-4, 11), (-5, 10)}
        tip = (-6, 9)
    shape = body | fin | {tip}
    for x, y in shape:                          # outline every empty neighbour, as the base does
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in shape and not (0 <= n[0] < BW and 0 <= n[1] < BH and BASE.getpixel(n)[3]):
                o.px(*n, K)
    for x, y in body | fin:
        o.px(x, y, GL if (x + 1, y) not in shape or y < 13 else G)   # lit leading edge
    o.px(*tip, BLUE)                            # blue tip in the livery colour
    o.save(f'plane-wings-{level}')


# ---------- shared helpers ----------

C = {'grey': (184, 192, 200, 255), 'lit': (232, 235, 242, 255), 'dark': (120, 126, 140, 255),
     'ink': (27, 27, 47, 255), 'white': (250, 250, 249, 255), 'blue': BLUE, 'cyan': (110, 220, 255, 255),
     'green': (76, 175, 80, 255), 'green_d': (46, 125, 50, 255), 'leaf_l': (139, 212, 142, 255),
     'carbon': (58, 62, 72, 255), 'carbon_l': (92, 98, 112, 255), 'red': (240, 64, 64, 255),
     'silver': (214, 222, 232, 255), 'amber': (255, 194, 61, 255)}


def outline_set(o, shape, skip_base=True):
    for x, y in shape:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n in shape:
                continue
            if skip_base and 0 <= n[0] < BW and 0 <= n[1] < BH and BASE.getpixel(n)[3]:
                continue
            o.px(*n, K)


def is_base(x, y):
    return 0 <= x < BW and 0 <= y < BH and BASE.getpixel((x, y))[3] > 0


# ---------- Better Engines ----------
PODS = [(16, 26), (29, 39)]                     # x span of each pod; intakes face right


def nacelle(o, x0, x1, y0=21, y1=26, band=True, intake=None, chevrons=False, length_cut=0):
    x0 += length_cut
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            corner = (x in (x0, x1)) and (y in (y0, y1))
            if corner:
                continue
            edge = y in (y0, y1) or x in (x0, x1)
            c = K if edge else C['lit'] if y == y0 + 1 else C['dark'] if y == y1 - 1 else C['grey']
            o.px(x, y, c)
    if band:
        for x in range(x0 + 2, x1 - 1):
            o.px(x, y0 + 3, BLUE)
    ic = intake or C['ink']
    for y in range(y0 + 1, y1):                 # intake at the front
        o.px(x1 - 1, y, ic)
    o.px(x1 - 2, y0 + 1, C['white'])            # rim glint
    if chevrons:                                 # serrated nozzle at the back (quieter, cleaner)
        for y in range(y0 + 1, y1):
            o.px(x0, y, K if y % 2 else C['grey'])
            if y % 2 == 0:
                o.px(x0 - 1, y, K)


def engine(level):
    o = Overlay()
    for x0, x1 in PODS:
        if level == 1:                           # tune-up: a bright ring round each intake
            for y in range(22, 26):
                o.px(x1, y, C['cyan'])
        elif level == 2:
            nacelle(o, x0, x1)
        elif level == 3:
            nacelle(o, x0, x1, chevrons=True)
        elif level == 4:                         # open rotor: shorter pod, a spinning see-through disc at the back
            nacelle(o, x0, x1, length_cut=3)
            bx = x0 + 1                              # spinning blades read as a pale blur, not as legs
            for y in range(18, 30):
                if 21 <= y <= 26:
                    continue
                fade = 200 - abs(y - 23.5) * 14
                o.px(bx, y, (255, 255, 255, int(fade)))
                o.px(bx + 1, y, (255, 255, 255, int(fade * 0.5)))
                o.px(bx - 1, y, (255, 255, 255, int(fade * 0.35)))
        else:                                     # next-gen: sleek white pod, rounded, glowing intake
            pod = {(x, y) for x in range(x0 - 1, x1 + 2) for y in range(22, 26)}
            pod |= {(x, y) for x in range(x0 + 1, x1) for y in (21, 26)}
            for x, y in pod:
                o.px(x, y, C['white'] if y < 24 else C['lit'])
            for x in range(x0 + 1, x1):
                o.px(x, 24, BLUE)
            for y in range(22, 26):                  # dark intake, ringed in cyan
                o.px(x1 + 1, y, C['cyan'])
                o.px(x1, y, C['ink'])
            outline_set(o, pod, skip_base=False)
            o.px(x1 + 3, 23, (110, 220, 255, 140)); o.px(x1 + 3, 24, (110, 220, 255, 140))   # glow
    o.save(f'plane-engine-{level}')


# ---------- Lighter Plane (carbon-fibre parts, sleeker panels) ----------

def airframe(level):
    o = Overlay()
    for y in range(8, 13):                       # carbon weave patch at the root of the tail fin
        for x in range(6 + (y - 8) // 2, 12 + (y - 8) // 2):
            if is_base(x, y) and BASE.getpixel((x, y))[2] > 120:
                o.px(x, y, C['carbon'] if (x + y) % 2 else C['carbon_l'])
    if level >= 2:                               # carbon nose cone
        for y, xs in ((12, range(57, 59)), (13, range(57, 60)), (14, range(58, 61)), (15, range(59, 61))):
            for x in xs:
                if is_base(x, y):
                    o.px(x, y, C['carbon'] if (x + y) % 2 else C['carbon_l'])
    if level >= 3:                               # silver speed stripe along the upper body
        for x in range(18, 55):
            o.px(x, 13, C['silver'])
    o.save(f'plane-airframe-{level}')


# ---------- Cleaner Fuel ----------

def leaf(o, x, y, big):
    rows = ['.gl', 'ggl', 'Gg.'] if not big else ['..gl', '.ggl', 'gggl', 'Ggg.', 'G...']
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch != '.':
                o.px(x + c, y + r, {'g': C['green'], 'G': C['green_d'], 'l': C['leaf_l']}[ch])


def fuel(level):
    o = Overlay()
    if level in (1, 2, 3):
        leaf(o, 20, 13 if level == 1 else 12, level >= 2)
    if level == 3:                               # green cheatline under the blue one
        for x in range(17, 58):                  # on the white band under the windows
            if is_base(x, 16):
                o.px(x, 16, C['green'])
    if level == 4:                               # hydrogen: cyan stripe and a tank on top
        for x in range(17, 58):
            if is_base(x, 16):
                o.px(x, 16, C['cyan'])
        tank = {(x, y) for x in range(22, 31) for y in (9, 10, 11)} - {(22, 9), (30, 9)}
        for x, y in tank:
            o.px(x, y, C['white'] if y == 9 else C['lit'])
        for y in (9, 10, 11):
            o.px(26, y, C['cyan'])
        outline_set(o, tank)
    o.save(f'plane-fuel-{level}')


# ---------- Greener Cabin: windows tinted green, a quarter more per level ----------

def cabin(level):
    o = Overlay()
    wins = [(x, 15) for x in range(BW) if is_base(x, 15) and BASE.getpixel((x, 15))[2] > BASE.getpixel((x, 15))[0] + 60]
    for i, (x, y) in enumerate(wins):
        if i % 4 < level:
            o.px(x, y, C['green'])
    o.save(f'plane-cabin-{level}')


# ---------- Landing Gear (shown near the ground only) ----------

def wheel(o, x, y):
    for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
        o.px(x + dx, y + dy, C['ink'])
    o.px(x, y, C['dark'])


def gear(level):
    o = Overlay()
    for sx in (31, 44):                          # main gear: strut + two wheels behind the engines
        for y in range(21, 27):
            if not is_base(sx, y):
                o.px(sx, y, C['dark'])
        wheel(o, sx - 2, 27); wheel(o, sx + 1, 27)
    if level >= 2:                               # nose gear and a green "auto-land" light
        for y in range(20, 26):
            if not is_base(53, y):
                o.px(53, y, C['dark'])
        wheel(o, 52, 26)
        o.px(55, 19, C['green'])
    o.save(f'plane-gear-{level}')


# ---------- Bigger Hold: cargo doors, then a belly pod ----------

def hold(level):
    o = Overlay()
    doors = [(44, 49)] if level == 1 else [(42, 46), (48, 52)]
    for x0, x1 in doors:
        for x in range(x0, x1 + 1):
            o.px(x, 19, K); o.px(x, 21, K) if is_base(x, 21) else None
        o.px(x0, 20, K); o.px(x1, 20, K)
        o.px(x0 + 1, 20, C['amber'])            # door handle
    if level == 3:                               # cargo belly pod
        pod = {(x, y) for x in range(40, 54) for y in (21, 22, 23)} - {(40, 23), (53, 23)}
        for x, y in pod:
            if not is_base(x, y) or y >= 21:
                o.px(x, y, C['lit'] if y == 21 else C['grey'])
        outline_set(o, pod)
    o.save(f'plane-hold-{level}')


# ---------- Seed Magnet: antenna on top ----------

def magnet(level):
    o = Overlay()
    ax, top = 45, {1: 6, 2: 4, 3: 4}[level]
    for y in range(top + 1, 9):
        o.px(ax, y, C['dark'])
    o.px(ax, top, C['green'])
    if level >= 2:                               # glow
        for dx, dy in ((-1, 0), (1, 0), (0, -1)):
            o.px(ax + dx, top + dy, C['leaf_l'])
    if level == 3:                               # dish and sparkle
        for x in range(ax - 2, ax + 3):
            o.px(x, top + 2, C['grey'])
        o.px(ax - 2, top + 1, C['grey']); o.px(ax + 2, top + 1, C['grey'])
        o.px(ax + 3, top - 2, C['white']); o.px(ax - 3, top - 1, C['white'])
    o.save(f'plane-magnet-{level}')


# ---------- Research: radar, lens, forecast ----------

def radar(level):
    o = Overlay()
    o.px(62, 14, C['dark']); o.px(63, 14, C['dark']); o.px(64, 14, C['red'])   # nose humidity probe
    if level >= 2:                               # small sensor dome on top, behind the cockpit
        for x in (49, 50, 51):
            o.px(x, 8, C['lit'])
        o.px(50, 7, C['white']); o.px(48, 8, K); o.px(52, 8, K); o.px(49, 7, K); o.px(51, 7, K); o.px(50, 6, K)
    if level >= 3:                               # grey radome nose
        for y, xs in ((14, range(59, 61)), (15, range(59, 61)), (16, range(58, 61))):
            for x in xs:
                if is_base(x, y):
                    o.px(x, y, C['dark'])
    if level >= 4:                               # satellite hump on the upper deck
        hump = {(x, 7) for x in range(38, 43)} | {(x, 6) for x in range(39, 42)}
        for x, y in hump:
            o.px(x, y, C['white'] if y == 6 else C['lit'])
        outline_set(o, hump)
    o.save(f'plane-radar-{level}')


def lens(level):
    o = Overlay()
    dome = {(x, 21) for x in range(47, 51)} | ({(x, 22) for x in range(48, 50)} if level == 2 else set())
    for x, y in dome:
        o.px(x, y, C['cyan'] if (x + y) % 2 else (180, 240, 255, 255))
    outline_set(o, dome)
    if level == 2:
        o.px(51, 23, C['white']); o.px(52, 24, C['white'])
    o.save(f'plane-lens-{level}')


def forecast(level):
    o = Overlay()
    for ax, h in ((24, 4),) + (((28, 3),) if level == 2 else ()):
        for y in range(12 - h, 12):
            if not is_base(ax, y):
                o.px(ax, y, C['dark'])
        o.px(ax, 11 - h, C['white'])
        o.px(ax - 1, 12 - h, C['dark']); o.px(ax + 1, 12 - h, C['dark'])   # little cross-bar
    o.save(f'plane-forecast-{level}')


# ---------- Nature badge on the tail (driven by the total of the nature lines) ----------

def nature(stage):
    o = Overlay()
    cx, cy = 8, 6                                # inside the tail fin
    disc = {(cx + dx, cy + dy) for dx in range(-2, 3) for dy in range(-2, 3) if abs(dx) + abs(dy) <= 3}
    for x, y in disc:
        o.px(x, y, C['white'])
    outline_set(o, disc, skip_base=False)
    g, G, b, w = C['green'], C['green_d'], (122, 74, 36, 255), (255, 150, 190, 255)
    art = {1: [(0, 1, b), (0, 0, g), (-1, -1, g)],
           2: [(0, 1, b), (0, 0, b), (-1, -1, g), (1, -1, g), (0, -1, g)],
           3: [(0, 1, b), (0, 0, G), (-1, -1, g), (1, -1, g), (0, -1, g), (-1, 0, G), (1, 0, G), (0, -2, g)],
           4: [(0, 1, b), (0, 0, G), (-1, -1, w), (1, -1, g), (0, -1, g), (-1, 0, G), (1, 0, w), (0, -2, w)]}[stage]
    for dx, dy, c in art:
        o.px(cx + dx, cy + dy, c)
    o.save(f'plane-nature-{stage}')


# ---------- motion layers ----------

def lights():
    o = Overlay()
    o.px(40, 8, C['red']); o.px(40, 7, (255, 140, 140, 255))   # red beacon on top
    o.px(3, 0, C['white']); o.px(3, -1, (255, 255, 255, 140))  # white strobe on the tail tip
    o.px(-1, 15, C['red'])                                       # tail-end light
    o.save('plane-lights')


def shimmer(frame):
    o = Overlay()
    for x0, x1 in PODS:
        for k in range(4):                       # wavy heat haze behind each pod's exhaust
            x = x0 - 2 - k
            y = 22 + (k + frame) % 3
            o.px(x, y, (255, 255, 255, 110 - k * 22))
            o.px(x, y + 2, (255, 220, 180, 80 - k * 15))
    o.save(f'plane-shimmer-{frame}')


def sparkle(frame):
    o = Overlay()
    spots = [(-3, 2), (12, -4), (30, 4), (50, 2), (64, 12), (58, 28), (36, 30), (8, 28), (-4, 18)]
    for i, (x, y) in enumerate(spots):
        phase = (i + frame) % 4
        if phase == 0:
            o.px(x, y, C['white'])
        elif phase == 1:
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                o.px(x + dx, y + dy, C['amber'] if (dx or dy) else C['white'])
        elif phase == 2:
            for d in (1, 2):
                for dx, dy in ((d, 0), (-d, 0), (0, d), (0, -d)):
                    o.px(x + dx, y + dy, C['amber'])
            o.px(x, y, C['white'])
    o.save(f'plane-sparkle-{frame}')


def preview(names, path):
    base = Image.open(A / 'plane.png').convert('RGBA')
    tiles = []
    for stack in names:
        t = Image.new('RGBA', (W, H), (110, 198, 232, 255))
        t.alpha_composite(base, (M, M))
        for n in stack:
            t.alpha_composite(Image.open(A / f'{n}.png').convert('RGBA'))
        tiles.append(t)
    cols = 5
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * (W + 4), rows * (H + 4)), (40, 40, 60, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * (W + 4), (i // cols) * (H + 4)))
    sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(path)


if __name__ == '__main__':
    import sys
    LINES = {'engine': 5, 'airframe': 3, 'wings': 2, 'fuel': 4, 'cabin': 4, 'gear': 2, 'hold': 3,
             'magnet': 3, 'radar': 4, 'lens': 2, 'forecast': 2, 'nature': 4}
    for line, n in LINES.items():
        for lv in range(1, n + 1):
            globals()[line](lv)
    lights()
    for f in range(3):
        shimmer(f)
    for f in range(4):
        sparkle(f)
    if len(sys.argv) > 1:
        stacks = [[f'plane-{line}-{lv}'] for line, n in LINES.items() for lv in range(1, n + 1)]
        stacks.append(['plane-' + k for k in ('engine-5', 'airframe-3', 'wings-2', 'fuel-4', 'cabin-4', 'gear-2',
                                              'hold-3', 'magnet-3', 'radar-4', 'lens-2', 'forecast-2', 'nature-4', 'lights')])
        preview(stacks, sys.argv[1])
