"""Upgrade art for eras 1-3 (art session, 2026-10-23; looks: research/PLANE-UPGRADE-ART-NOTES.md and the
"Look" columns of research/PLANE-ERAS-1-3.md). Deterministic: rerun = identical PNGs. Writes UNWIRED art to
tools/art/planes/upgrades/ (the build session copies what it wires into assets/).

- In-flight upgrade variants: pixel edits on the ERA-PAINTED sprite (tools/art/planes/plane-<gen>.png). Each
  edit only recolours pixels or adds pixels within 2 px of the original outline (check_outline asserts it);
  collisions keep the base 'plane' mask. Upgrade marks use neutral/metallic colours only (gold, silver, black).
- Gadget stickers: bold ~5x4 px with a dark outline, drawn on their own transparent canvas (decoration only).
- ATC towers 13x30, no outline (the style of assets/tower.png), one visible addition per level.
- Weather stations 16x16, one per era.

    python3 tools/art/make_upgrades.py          # writes the PNGs and tools/art/planes/upgrades/sheet-*.png
"""
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PLANES = os.path.join(HERE, 'planes')
OUT = os.path.join(PLANES, 'upgrades')

# metallic / neutral upgrade colours (never an era accent)
GOLD, GOLD_D, GOLD_L = (214, 170, 52, 255), (150, 112, 28, 255), (246, 214, 120, 255)
SILV, SILV_D, SILV_L = (176, 182, 190, 255), (112, 118, 128, 255), (232, 236, 240, 255)
BLACK, INK, GLASS = (12, 12, 14, 255), (34, 36, 42, 255), (40, 54, 70, 255)


def put(im, pts, c):
    for x, y in pts:
        im.putpixel((x, y), c)


def opaque(im, x, y):
    return im.getpixel((x, y))[3] > 0


def check_outline(base, im, slack=2):
    """Every pixel the variant adds or removes must lie within `slack` px of the base outline."""
    w, h = base.size
    a = [[base.getpixel((x, y))[3] > 0 for x in range(w)] for y in range(h)]
    for y in range(h):
        for x in range(w):
            if (im.getpixel((x, y))[3] > 0) == a[y][x]:
                continue
            near = any(a[j][i] != a[y][x] for j in range(max(0, y - slack), min(h, y + slack + 1))
                       for i in range(max(0, x - slack), min(w, x + slack + 1)))
            assert near, f'pixel {x},{y} changes the outline by more than {slack} px'


# ---- 747 (1970s) plane-line variants. Coordinates read off tools/art/planes/plane-747.png. ----
# BOLD rule (user, 2026-10-23): a bought upgrade must be obvious at 1x in flight. Upgrades repaint big areas in
# metal (option 1); engines and the hump may grow the outline up to SHAPE_SLACK px (option 2; collisions still use
# the base 'plane' mask); motion effects (option 3) are code, done by the build session.
SHAPE_SLACK = 5
SILVER_RAMP = [(34, 38, 46, 255), (96, 104, 116, 255), (150, 158, 170, 255), (200, 206, 214, 255), (244, 247, 250, 255)]
GOLD_RAMP = [(70, 50, 10, 255), (150, 112, 28, 255), (214, 170, 52, 255), (240, 204, 96, 255), (255, 236, 170, 255)]
BLACK_RAMP = [(6, 6, 8, 255), (18, 20, 26, 255), (34, 38, 48, 255), (60, 68, 84, 255), (120, 132, 150, 255)]


def lum(c):
    return (c[0] * 3 + c[1] * 6 + c[2]) / 10


def metal(im, box, ramp, keep_outline=True):
    """Repaint every opaque pixel in box with a metal ramp, keeping the light and shade (outline stays black)."""
    x0, y0, x1, y1 = box
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = im.getpixel((x, y))
            if c[3] == 0 or (keep_outline and lum(c) < 40):
                continue
            im.putpixel((x, y), ramp[min(4, int(lum(c) / 256 * 5))])


def pod(im, x0, x1, y0, y1, ramp, fan=True, cone=0):
    """A turbofan nacelle side view: outlined capsule, shaded ramp, big dark fan face at the front (right)."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            edge = y in (y0, y1) or x in (x0, x1)
            corner = (x in (x0, x1) and y in (y0, y1, y0 + 1, y1 - 1)) or (x in (x0 + 1, x1 - 1) and y in (y0, y1))
            if (x in (x0 + 1, x1 - 1) and y in (y0 + 1, y1 - 1)) or (x in (x0, x1) and not corner):
                im.putpixel((x, y), BLACK)
                continue
            if corner:
                continue
            t = (y - y0) / max(1, y1 - y0)
            im.putpixel((x, y), BLACK if edge else ramp[4 if t < 0.3 else 3 if t < 0.6 else 2])
    if fan:
        rect(im, x1 - 2, y0 + 1, x1 - 1, y1 - 1, INK)
        put(im, [(x1 - 1, (y0 + y1) // 2)], SILV_L)
    for k in range(cone):                            # exhaust cone behind the pod
        put(im, [(x0 - 1 - k, y) for y in range(y0 + 2 + k // 2, y1 - 1 - k // 2 + 1)], BLACK if k % 2 else SILV_D)


POD_CREAM = [(0, 0, 0, 255)] * 2 + [(190, 182, 168, 255), (222, 214, 200, 255), (244, 238, 224, 255)]


def jt9d_fans(im):
    """Fatter high-bypass pods with a big black fan face."""
    pod(im, 16, 26, 21, 26, POD_CREAM)
    pod(im, 30, 41, 21, 26, POD_CREAM)


def hush_kit(im):
    jt9d_fans(im)
    pod(im, 16, 26, 21, 26, POD_CREAM, cone=3)
    pod(im, 30, 41, 21, 26, POD_CREAM, cone=3)


def nextgen_engines(im):
    """Big polished-silver nacelles, longer and deeper than the originals."""
    pod(im, 14, 27, 20, 26, SILVER_RAMP, cone=2)
    pod(im, 29, 42, 20, 26, SILVER_RAMP, cone=2)


def glass_cockpit(im):
    """A gloss-black nose cone with a silver windscreen frame."""
    for y, x0 in ((10, 54), (11, 53), (12, 54), (13, 55), (14, 56), (15, 56), (16, 55), (17, 55)):
        for x in range(x0, 62):
            c = im.getpixel((x, y))
            if c[3] and lum(c) >= 40:
                im.putpixel((x, y), BLACK_RAMP[3] if y == 12 else BLACK_RAMP[2] if y < 15 else BLACK_RAMP[1])
    put(im, [(55, 11), (56, 12), (57, 13), (58, 14)], SILV_L)


def gold_stripe(im):
    """Business class: a broad gold band framing the window row, plus a gold tail tip."""
    for y in (13, 14, 16):
        for x in range(10, 60):
            c = im.getpixel((x, y))
            if c[3] and lum(c) > 150:
                im.putpixel((x, y), GOLD_RAMP[3 if y == 13 else 2])
    metal(im, (2, 0, 7, 3), GOLD_RAMP)


def stretched_deck(im):
    """747-300 hump: the upper deck starts 5 px further back, with a row of extra windows."""
    x8 = next(x for x in range(30, 62) if opaque(im, x, 8))
    for y, x0 in ((8, x8), (9, x8 - 3), (10, x8 - 6)):          # roof row stays the outline, then a slope
        fill = BLACK if y == 8 else im.getpixel((next(x for x in range(30, 62) if opaque(im, x, y)) + 3, y))
        xa = next(x for x in range(30, 62) if opaque(im, x, y))
        put(im, [(x, y) for x in range(x0 - 5, xa)], fill)
        put(im, [(x0 - 5, y)], BLACK)
    put(im, [(32, 10), (34, 10), (36, 10), (38, 10)], (11, 71, 185, 255))


VARIANTS_747 = [('jt9d', jt9d_fans), ('hushkit', hush_kit), ('nextgen', nextgen_engines),
                ('glass', glass_cockpit), ('business', gold_stripe), ('upperdeck', stretched_deck)]


# ---- Comet 4 (1950s) plane-line variants. Coordinates read off tools/art/planes/plane-comet.png. ----
# Engines are buried in the wing root (rows 19-21); window row = row 15; rust cheatline rows 17-18.
def comet_intakes(im):
    """Engines L1: a polished silver engine bay in the wing root with two dark intake mouths."""
    rect(im, 27, 19, 42, 21, SILVER_RAMP[3])
    rect(im, 27, 19, 42, 19, SILVER_RAMP[4])
    rect(im, 27, 21, 42, 21, SILVER_RAMP[2])
    rect(im, 43, 19, 44, 21, INK)
    put(im, [(43, 20)], SILV_L)
    rect(im, 26, 19, 26, 21, BLACK)


def comet_reversers(im):
    """Engines L2: black clamshell reverser doors with silver edges at the back of the engine bay."""
    rect(im, 18, 19, 26, 21, BLACK)
    for x in (19, 22, 25):
        put(im, [(x, 20)], SILV)
    put(im, [(17, 18), (17, 22), (16, 17), (16, 23)], BLACK)   # doors flared open, 2 px out
    put(im, [(18, 18), (18, 22)], SILV_L)


def comet_pinion(im):
    """Wings L1: a polished pinion fuel tank on the wing, with a pointed nose and black outline."""
    rect(im, 42, 21, 53, 24, BLACK)
    rect(im, 43, 22, 52, 23, SILVER_RAMP[3])
    put(im, [(x, 22) for x in range(44, 52)], SILVER_RAMP[4])
    put(im, [(54, 22), (54, 23)], BLACK)
    put(im, [(42, 24), (53, 24)], (0, 0, 0, 0))


def comet_oval(im):
    """Wings L2: big oval windows: each window 2 px tall with a silver rim (the post-1954 redesign)."""
    for x in range(18, 52, 3):
        put(im, [(x, 15), (x, 16)], GLASS)
        put(im, [(x - 1, 15), (x + 1, 15), (x - 1, 16), (x + 1, 16)], SILV_L)


def comet_tourist(im):
    """Cabin L1: a denser window row: one continuous dark glass band with silver frames."""
    for x in range(16, 53):
        im.putpixel((x, 15), INK if x % 2 else SILV)


def comet_galley(im):
    """Cabin L2: a gold-framed galley door behind the cockpit."""
    rect(im, 46, 13, 49, 18, GOLD)
    rect(im, 47, 14, 48, 17, GOLD_D)
    put(im, [(48, 16)], GOLD_L)


VARIANTS_COMET = [('intakes', comet_intakes), ('reversers', comet_reversers), ('pinion', comet_pinion),
                  ('oval', comet_oval), ('tourist', comet_tourist), ('galley', comet_galley)]


# ---- 1990s twin plane-line variants. Coordinates read off tools/art/planes/plane-twin.png. One pod x 26-40,
# rows 22-26; tail fin rows 0-13; window row 15. The 1990s accent is AMBER, so marks are silver/black, never gold.
def twin_giantfan(im):
    """Engines L2: one huge polished-silver pod."""
    pod(im, 23, 42, 21, 26, SILVER_RAMP)


def twin_blades(im):
    """Engines L4: a big dark fan face with broad silver blades."""
    rect(im, 37, 23, 39, 25, INK)
    put(im, [(38, 23), (39, 24), (38, 25)], SILV)
    put(im, [(38, 24)], SILV_L)


def twin_tail(im):
    """Wings L1: carbon-black composite fin."""
    metal(im, (1, 0, 13, 13), BLACK_RAMP)


def twin_riblets(im):
    """Wings L4: silver sheen streaks across the white fuselage."""
    for y in (13, 14, 16):
        for x in range(10, 56):
            c = im.getpixel((x, y))
            if c[3] and lum(c) > 180 and (x + y) % 4 == 0:
                im.putpixel((x, y), SILVER_RAMP[2])


def twin_premium(im):
    """Cabin L3: a broad charcoal band above the windows with a silver pinstripe."""
    for y in (13, 14):
        for x in range(11, 56):
            c = im.getpixel((x, y))
            if c[3] and lum(c) > 150:
                im.putpixel((x, y), SILV_L if y == 13 else BLACK_RAMP[2])


def twin_glow(im):
    """Cabin L4, flat beds: the windows glow warm white."""
    for x in range(10, 56):
        c = im.getpixel((x, 15))
        if c[3] and c[2] > c[0] + 30:
            im.putpixel((x, 15), (255, 236, 170, 255))


VARIANTS_TWIN = [('giantfan', twin_giantfan), ('blades', twin_blades), ('tail', twin_tail),
                 ('riblets', twin_riblets), ('premium', twin_premium), ('glow', twin_glow)]


# ---- gadget stickers (decoration; drawn alone, placed by the build session) ----
def sticker(rows, pal):
    im = Image.new('RGBA', (max(len(r) for r in rows), len(rows)))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                im.putpixel((x, y), pal[ch])
    return im


# BOLD stickers (user, 2026-10-24: the 5x5 v2 were invisible in flight). One look per era for each gadget.
# k outline, s/w/d silver, r red, c/C copper, i iron, b spark blue, t/T canvas, g gold string, e dark glass.
SP = {'k': BLACK, 's': SILV, 'w': SILV_L, 'd': SILV_D, 'r': (220, 40, 36, 255), 'R': (150, 20, 20, 255),
      'c': (206, 120, 52, 255), 'C': (150, 78, 30, 255), 'i': (96, 96, 104, 255), 'b': (120, 210, 255, 255),
      't': (214, 196, 150, 255), 'T': (164, 144, 100, 255), 'g': GOLD, 'e': INK, 'W': (250, 250, 252, 255)}
STICKERS = {
    # magnet: red horseshoe -> copper coil -> silver disc
    'magnet-1950s': ['kwwk.kwwk', 'krrk.krrk', 'krrk.krrk', 'krrkkkrrk', 'krrrrrrrk', '.kRrrrRk.', '..kkkkk..'],
    'magnet-1970s': ['b.......b', '.kkkkkkk.', 'kicCcCcik', 'kiCcCcCik', 'kicCcCcik', '.kkkkkkk.', 'b...b...b'],
    'magnet-1990s': ['b...b...b', '..kkkkk..', '.kwwsssk.', 'kwssssddk', 'kssssdddk', '.ksdddk..', '..kkkkk..', 'b..b..b..'],
    # cargo hold: mail sacks -> belly fairing -> bigger fairing
    'hold-1950s': ['..kk...kk..', '.kgk..kgk..', 'kttTk.kttTk', 'ktttTkkttTk', 'kttttkktttk', '.kkkk..kkk.'],
    'hold-1970s': ['.kkkkkkkkkkkk.', 'keeeeeeeeeeeek', 'kewwwwwwwwwwek', 'keeeeeeeeeeeek', '.kkkkkkkkkkkk.'],
    'hold-1990s': ['..kkkkkkkkkkkkkk..', '.keeeeeeeeeeeeeek.', 'keewwwwwwwwwwwweek', 'keeeeeeeeeeeeeeeek',
                   'keesssssssssssseek', '.kkkkkkkkkkkkkkkk.'],
    # landing gear (shown only when the gear is down): two-wheel legs -> four-wheel -> six-wheel bogies
    'gear-1950s': ['...ks...', '...ks...', '...ks...', '..kkkk..', '.kekkek.', '.keekee.', '..kk.kk.'],
    'gear-1970s': ['....ks....', '....ks....', '....ks....', '.kkkkkkkk.', 'kekk..kkek', 'keek..keek', '.kk....kk.'],
    'gear-1990s': ['......ks......', '......ks......', '......ks......', '.kkkkkkkkkkkk.', 'kekk.kekk.kekk', 'keek.keek.keek', '.kk...kk...kk.'],
    # sensors: nose thermometer probe -> black radar nose cone -> side humidity probe
    'sensor-1950s': ['......kkk.', '......krrk', 'kkkkkkkrrk', 'krkrkrkrrk', 'kkkkkkkkk.'],
    'sensor-1970s': ['kk....', 'keek..', 'keeeek', 'keeeek', 'keeek.', 'kk.k..'],
    'sensor-1990s': ['.kkkkk.', 'kwssbsk', 'ksssbbk', '.kkkkk.', '..kk...'],
    # autopilot: antenna on top -> two antennas -> satellite dome
    'auto-1950s': ['.kk', '.kk', 'kkk', 'kk.', 'kkkk'],
    'auto-1970s': ['.kk...kk', '.kk...kk', 'kkk..kkk', 'kk...kk.', 'kkkkkkkk'],
    'auto-1990s': ['..kkkkk..', '.kWWWWsk.', 'kWWWWsssk', 'kWWsssddk', 'kkkkkkkkk'],
}
# where each sticker sits on the 62x27 in-flight sprite of its era (top-left x, y). Gear and sensor probes may
# hang outside the sprite: decoration only, never collision.
STICKER_AT = {
    'magnet': {'1950s': (3, 5), '1970s': (4, 5), '1990s': (3, 4)},
    'hold':   {'1950s': (42, 18), '1970s': (40, 19), '1990s': (36, 18)},
    'gear':   {'1950s': (40, 21), '1970s': (42, 22), '1990s': (38, 21)},
    'sensor': {'1950s': (56, 12), '1970s': (57, 11), '1990s': (50, 15)},
    'auto':   {'1950s': (30, 7), '1970s': (46, 3), '1990s': (30, 8)},
}


# ---- ATC towers 13x30, no outline ----
BRICK, BRICK_D, MORTAR = (176, 84, 58, 255), (140, 62, 44, 255), (214, 170, 140, 255)
CONC, CONC_D, CREAM = (204, 206, 202, 255), (166, 168, 164, 255), (234, 230, 216, 255)
CAB, CAB_D, WIN = (66, 72, 86, 255), (44, 48, 58, 255), (150, 200, 236, 255)
WIN_D, METAL, RED, ORANGE, WHITE = (88, 150, 210, 255), (96, 102, 112, 255), (226, 52, 46, 255), (246, 146, 40, 255), (240, 244, 248, 255)


def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= x < im.width and 0 <= y < im.height:
                im.putpixel((x, y), c)


def tower(level):
    im = Image.new('RGBA', (13, 30))
    if level <= 2:                                   # brick tower, small cab
        rect(im, 3, 14, 9, 29, BRICK)
        for y in range(15, 30, 2):
            put(im, [(x, y) for x in range(3 + (y // 2) % 2 * 2, 10, 4)], MORTAR)
        rect(im, 9, 14, 9, 29, BRICK_D)
        rect(im, 2, 10, 10, 13, CAB)
        rect(im, 3, 11, 9, 12, WIN)
        rect(im, 6, 3, 6, 9, METAL)                   # radio mast
        rect(im, 7, 3, 9, 4, RED)                     # flag
        if level == 2:
            rect(im, 0, 1, 0, 9, METAL)               # aerial
            rect(im, 11, 6, 11, 9, METAL)
            put(im, [(12, 6), (12, 7)], ORANGE)       # windsock
    elif level <= 4:                                  # concrete tower, radar dish
        rect(im, 4, 13, 8, 29, CONC)
        rect(im, 8, 13, 8, 29, CONC_D)
        rect(im, 1, 8, 11, 12, CAB)
        rect(im, 2, 9, 10, 11, WIN)
        rect(im, 6, 5, 6, 7, METAL)
        w = 3 if level == 3 else 5
        rect(im, 6 - w, 3, 6 + w, 4, WHITE)
        rect(im, 6 - w, 4, 6 + w, 4, CONC_D)
        if level == 4:
            put(im, [(6, 1), (6, 2)], RED)            # beacon
    else:                                             # tall slim tower, glass top
        rect(im, 5, 13, 7, 29, CREAM)
        rect(im, 7, 13, 7, 29, CONC)
        rect(im, 0, 12, 12, 12, CAB_D)
        rect(im, 0, 7, 12, 11, WIN)
        for x in (2, 6, 10):
            rect(im, x, 7, x, 11, WIN_D)
        rect(im, 0, 6, 12, 6, CAB_D)
        rect(im, 9, 2, 11, 4, WHITE)                  # satellite dish
        put(im, [(10, 5)], METAL)
        if level == 6:
            for x in (1, 3, 5):
                rect(im, x, 1, x, 5, METAL)           # antenna array
            put(im, [(3, 0)], RED)
    return im


# ---- weather stations 16x16 ----
def station(era):
    im = Image.new('RGBA', (16, 16))
    if era == '1950s':                                # Stevenson screen, cup anemometer, balloon
        rect(im, 1, 8, 6, 12, WHITE)
        for y in (9, 11):
            rect(im, 1, y, 6, y, CONC)
        rect(im, 2, 13, 2, 15, METAL)
        rect(im, 5, 13, 5, 15, METAL)
        rect(im, 11, 4, 11, 15, METAL)
        rect(im, 9, 4, 13, 4, METAL)
        put(im, [(9, 3), (13, 3)], INK)
        rect(im, 13, 0, 15, 2, WHITE)                 # balloon
        put(im, [(14, 3)], CONC_D)
    elif era == '1970s':                              # office + radar dome
        rect(im, 0, 9, 15, 15, CONC)
        rect(im, 2, 11, 4, 13, WIN)
        rect(im, 11, 11, 13, 13, WIN)
        rect(im, 5, 2, 10, 8, WHITE)
        rect(im, 4, 4, 11, 7, WHITE)
        rect(im, 4, 5, 11, 5, CONC)
        rect(im, 6, 1, 9, 1, WHITE)
    else:                                             # hut with a glowing screen + satellite dish
        rect(im, 0, 9, 10, 15, CONC)
        rect(im, 2, 10, 8, 13, (60, 224, 140, 255))
        rect(im, 12, 6, 12, 15, METAL)
        rect(im, 10, 1, 15, 6, WHITE)
        put(im, [(10, 1), (15, 1), (10, 6), (15, 6)], (0, 0, 0, 0))
        put(im, [(12, 3), (13, 3)], METAL)
    return im


def board(items, zoom=6, bg=(110, 198, 232, 255), gap=12):
    """Side-by-side zoomed sheet (labels go in the chat reply)."""
    W = sum(i.width * zoom for i in items) + gap * (len(items) + 1)
    H = max(i.height for i in items) * zoom + 2 * gap
    out = Image.new('RGBA', (W, H), bg)
    x = gap
    for i in items:
        out.alpha_composite(i.resize((i.width * zoom, i.height * zoom), Image.NEAREST), (x, gap))
        x += i.width * zoom + gap
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    base = Image.open(os.path.join(PLANES, 'plane-747.png')).convert('RGBA')
    shots = [base]
    for name, fn in VARIANTS_747:
        im = base.copy()
        fn(im)
        check_outline(base, im, SHAPE_SLACK)
        im.save(os.path.join(OUT, f'plane-747-{name}.png'))
        shots.append(im)
    full = base.copy()
    for _, fn in VARIANTS_747:
        if fn not in (hush_kit, jt9d_fans):                        # next-gen replaces the hush kit
            fn(full)
    check_outline(base, full, SHAPE_SLACK)
    full.save(os.path.join(OUT, 'plane-747-full.png'))
    shots.append(full)
    cbase = Image.open(os.path.join(PLANES, 'plane-comet.png')).convert('RGBA')
    cshots = [cbase]
    for name, fn in VARIANTS_COMET:
        im = cbase.copy(); fn(im); check_outline(cbase, im, SHAPE_SLACK)
        im.save(os.path.join(OUT, f'plane-comet-{name}.png')); cshots.append(im)
    cfull = cbase.copy()
    for _, fn in VARIANTS_COMET:
        if fn is not comet_tourist:                                  # oval windows replace the dense row
            fn(cfull)
    check_outline(cbase, cfull, SHAPE_SLACK)
    cfull.save(os.path.join(OUT, 'plane-comet-full.png')); cshots.append(cfull)
    tbase = Image.open(os.path.join(PLANES, 'plane-twin.png')).convert('RGBA')
    for name, fn in VARIANTS_TWIN:
        im = tbase.copy(); fn(im); check_outline(tbase, im, SHAPE_SLACK)
        im.save(os.path.join(OUT, f'plane-twin-{name}.png'))
    tfull = tbase.copy()
    for _, fn in VARIANTS_TWIN:
        fn(tfull)                                                    # blades go on the giant pod's fan face
    check_outline(tbase, tfull, SHAPE_SLACK)
    tfull.save(os.path.join(OUT, 'plane-twin-full.png'))
    board(shots[:4]).save(os.path.join(OUT, 'sheet-747-a.png'))
    board(shots[4:]).save(os.path.join(OUT, 'sheet-747-b.png'))

    eras = {'1950s': cbase, '1970s': base, '1990s': tbase}
    rows = []
    for gadget in STICKER_AT:
        row = []
        for era, plane in eras.items():
            st = sticker(STICKERS[f'{gadget}-{era}'], SP)
            st.save(os.path.join(OUT, f'sticker-{gadget}-{era}.png'))
            canvas = Image.new('RGBA', (62, 32)); canvas.alpha_composite(plane, (0, 0))
            canvas.alpha_composite(st, STICKER_AT[gadget][era])
            row.append(canvas)
        rows.append(row)
    zoom, gap = 5, 10
    sheet = Image.new('RGBA', (3 * (62 * zoom + gap) + gap, len(rows) * (32 * zoom + gap) + gap), (110, 198, 232, 255))
    for j, row in enumerate(rows):
        for i, im in enumerate(row):
            sheet.alpha_composite(im.resize((62 * zoom, 32 * zoom), Image.NEAREST), (gap + i * (62 * zoom + gap), gap + j * (32 * zoom + gap)))
    sheet.save(os.path.join(OUT, 'review-stickers.png'))
    real = Image.new('RGBA', (3 * 134 + 10, len(rows) * 70 + 10), (110, 198, 232, 255))
    for j, row in enumerate(rows):
        for i, im in enumerate(row):
            real.alpha_composite(im.resize((124, 64), Image.NEAREST), (10 + i * 134, 6 + j * 70))
    real.save(os.path.join(OUT, 'real-size-2x-stickers.png'))

    tw = [Image.open(os.path.join(HERE, '..', '..', 'assets', 'tower.png')).convert('RGBA')]
    for lv in range(1, 7):
        t = tower(lv)
        t.save(os.path.join(OUT, f'tower-{lv}.png'))
        tw.append(t)
    ws = []
    for era in ('1950s', '1970s', '1990s'):
        s = station(era)
        s.save(os.path.join(OUT, f'station-{era}.png'))
        ws.append(s)
    board(tw + ws, zoom=8).save(os.path.join(OUT, 'sheet-towers-stations.png'))
    print('wrote', OUT)


if __name__ == '__main__':
    main()
