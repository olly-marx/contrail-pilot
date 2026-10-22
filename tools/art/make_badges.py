"""Badge medals for the achievements screen (HTML-only): assets/ui/badge-<id>-<tier>.png.

Run from the repo root:  python3 tools/art/make_badges.py [out_dir]
32x32: a ribbon on top, a round medal whose rim shows the tier (1 bronze, 2 silver, 3 gold; a
badge with a single tier is gold), and a picture in the middle built from the game's own sprites.
Also badge-locked.png (not earned yet) and badge-secret.png (a secret badge nobody has found).
"""
import math
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1] if (HERE.parents[1] / 'assets').exists() else Path.home() / 'contrail-pilot'
A = ROOT / 'assets'
sys.path.insert(0, str(ROOT / 'tools' / 'art'))
from make_diagrams import Pic, C, hexc, PLANE, PLANE_PAL, GLYPHS   # noqa: E402

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else A / 'ui'

TIER = {1: ('#c87a3a', '#e8a868', '#8a4a1e'),       # bronze: base, light, dark
        2: ('#b8c0cc', '#e8eef6', '#7a8290'),       # silver
        3: ('#e8b830', '#fff0a0', '#a87a10')}       # gold
RIBBON = {'flying': ('#3a6ad0', '#2a4a9a'), 'climate': ('#3aa0d0', '#1e7098'), 'seeds': ('#5ab040', '#3a8028'),
          'nature': ('#2e8a4a', '#1e6030'), 'explorer': ('#d05a3a', '#9a3a20'), 'secret': ('#7a4ab0', '#52307a')}
INNER = '#f4f1e8'


def medal(theme, tier, icon):
    p = Pic(32, 32)
    r1, r2 = (hexc(c) for c in RIBBON[theme])
    for y in range(0, 12):                          # ribbon: two tails in a V
        for x in range(9, 23):
            left = x < 16
            if abs((x - 9 if left else 22 - x) - y * 0.35) < 3.2:
                p.px(x, y, r1 if (x + y) % 5 else r2)
    base, lit, dark = (hexc(c) for c in TIER[tier])
    cx, cy, R = 15.5, 19.5, 11.5
    for y in range(32):
        for x in range(32):
            d = math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy - 0.5)
            if d <= R:
                if d > R - 1.2:
                    c = hexc('#3a2a1e')                       # outline
                elif d > R - 3.2:
                    k = -(x - cx) * 0.6 - (y - cy) * 0.8
                    c = lit if k > 4 else dark if k < -4 else base
                    if (x + y) % 4 == 0 and d > R - 2.4:      # milled edge
                        c = dark
                else:
                    c = hexc(INNER)
                p.px(x, y, c)
    icon(p, 16, 20)                                  # icon drawn centred on (16, 20), inside a ~14 px disc
    return p.img


# ---------- icons (centred on cx, cy; keep within about 13x13) ----------

def paste(p, path, cx, cy, maxw=13, maxh=13):
    im = Image.open(path).convert('RGBA')
    im = im.crop(im.getbbox())
    k = max(1, min(maxw // im.width, maxh // im.height)) if im.width <= maxw and im.height <= maxh else None
    if k:
        im = im.resize((im.width * k, im.height * k), Image.NEAREST)
    else:                                            # too big: shrink by whole steps of 2 with nearest
        while im.width > maxw or im.height > maxh:
            im = im.resize((max(1, im.width // 2), max(1, im.height // 2)), Image.NEAREST)
    p.img.alpha_composite(im, (round(cx - im.width / 2), round(cy - im.height / 2)))


def plane_icon(p, cx, cy):
    for r, row in enumerate(PLANE[:5]):
        for c, ch in enumerate(row):
            if ch != '.' and c < 16:
                p.px(cx - 7 + c, cy - 2 + r, PLANE_PAL[ch])


def number(p, text, cx, cy, col):
    w = 4 * len(text) - 1
    x = cx - w // 2
    for ch in text:
        for r, row in enumerate(GLYPHS[ch]):
            for k, v in enumerate(row):
                if v == 'x':
                    p.px(x + k, cy - 2 + r, col)
        x += 4


def icon_longhaul(p, cx, cy):
    plane_icon(p, cx, cy - 1)
    for x in range(cx - 7, cx + 6, 2):
        p.px(x, cy + 4, hexc('#7a8290'))


def icon_frequent(p, cx, cy):
    p.rect(cx - 6, cy + 3, 13, 2, hexc('#55555f')); p.rect(cx - 4, cy + 3, 2, 1, C['white']); p.rect(cx + 1, cy + 3, 2, 1, C['white'])
    plane_icon(p, cx, cy - 3)


def icon_hopper(p, cx, cy):
    for x0 in (cx - 6, cx + 2):
        p.rect(x0, cy + 4, 5, 2, hexc('#55555f'))
    for k in range(-5, 6):
        p.px(cx + k, cy - 1 - round(3 * (1 - (k / 5) ** 2)), C['white'] if k % 2 else hexc('#3f8fb5'))
    p.px(cx + 5, cy, hexc('#3f8fb5')); p.px(cx + 4, cy - 1, hexc('#3f8fb5'))


def icon_bumpy(p, cx, cy):
    for row in (-3, 1):
        for k in range(-6, 7):
            p.px(cx + k, cy + row + round(math.sin(k * 1.2)), hexc('#7fb0d0'))
    plane_icon(p, cx, cy + 4)


def icon_sun(p, cx, cy):
    for y in range(-3, 4):
        for x in range(-3, 4):
            if x * x + y * y <= 10:
                p.px(cx + x, cy - 2 + y, C['sun'])
    for k in (-5, 5):
        p.px(cx + k, cy - 2, C['sun']); p.px(cx, cy - 2 + k, C['sun'])
    p.rect(cx - 6, cy + 4, 13, 1, C['white'])                       # contrail shading the ground
    p.rect(cx - 4, cy + 6, 9, 1, hexc('#8a8a96'))


def icon_nightowl(p, cx, cy):
    for y in range(-6, 7):                                          # a patch of night sky
        for x in range(-6, 7):
            if x * x + y * y <= 40:
                p.px(cx + x, cy + y, C['night'])
    for y in range(-3, 4):                                          # crescent moon
        for x in range(-3, 4):
            if x * x + y * y <= 10 and (x - 2) ** 2 + (y + 1) ** 2 > 6:
                p.px(cx + x - 1, cy - 1 + y, C['moon'])
    for x, y in ((4, -4), (2, 3), (-4, 3)):
        p.px(cx + x, cy + y, C['white'])
    p.rect(cx - 5, cy + 5, 4, 1, C['white']); p.rect(cx + 2, cy + 5, 4, 1, C['white'])   # contrail dodged


def icon_coolplanet(p, cx, cy):
    paste(p, A / 'face-happy.png', cx, cy, 13, 13)


def icon_zerocarbon(p, cx, cy):
    number(p, '', cx, cy, C['ink'])
    for y in range(-5, 6):                                          # a cyan H for hydrogen
        p.px(cx - 3, cy + y, hexc('#2a9ad0')); p.px(cx - 2, cy + y, hexc('#2a9ad0'))
        p.px(cx + 2, cy + y, hexc('#2a9ad0')); p.px(cx + 3, cy + y, hexc('#2a9ad0'))
    p.rect(cx - 1, cy - 1, 3, 2, hexc('#2a9ad0'))


def icon_seedhunter(p, cx, cy):
    paste(p, A / 'ui' / 'icon-seed.png', cx, cy, 13, 13)


def icon_golden(p, cx, cy):
    paste(p, A / 'token-gold.png', cx, cy, 14, 14)


def icon_forester(p, cx, cy):
    paste(p, A / 'tree-oak-2.png', cx, cy, 13, 14)


def icon_naturalist(p, cx, cy):
    paste(p, A / 'animal-fox-0.png', cx, cy + 1, 14, 12)


def icon_rewilder(p, cx, cy):
    paste(p, A / 'ui' / 'proj-beavers.png', cx, cy, 13, 13)


def icon_globetrotter(p, cx, cy):
    for x0, y0 in ((-5, -4), (2, -2), (-2, 3)):                     # map pins
        p.rect(cx + x0, cy + y0, 3, 3, C['cross']); p.px(cx + x0 + 1, cy + y0 + 3, C['cross']); p.px(cx + x0 + 1, cy + y0 + 1, C['white'])
    for k in range(-6, 7):
        p.px(cx + k, cy + 6, hexc('#5a9a3c'))


def icon_worldflight(p, cx, cy):
    paste(p, A / 'face-ok.png', cx, cy + 1, 11, 11)
    for a in range(0, 360, 20):                                     # an orbit right round it
        x = cx + round(6.5 * math.cos(math.radians(a))); y = cy + 1 + round(3 * math.sin(math.radians(a)))
        if not (a > 30 and a < 150):
            p.px(x, y, C['white'])
    p.px(cx + 6, cy - 1, C['ink']); p.px(cx + 5, cy - 2, C['ink'])


def icon_oops(p, cx, cy):
    plane_icon(p, cx, cy)
    for x, y in ((-6, -4), (5, -5), (-3, 5), (6, 3)):
        p.px(cx + x, cy + y, hexc('#ffc23d')); p.px(cx + x + 1, cy + y, hexc('#ff6a3d'))


def icon_birdstrike(p, cx, cy):
    paste(p, A / 'bird-0.png', cx - 2, cy - 1, 12, 10)
    for d in range(4):
        p.px(cx + 3 + d, cy + 2 - d, hexc('#ffc23d')); p.px(cx + 3 + d, cy + 2 + d, hexc('#ffc23d'))


def icon_toldoff(p, cx, cy):
    for y in range(-5, 6):
        for x in range(-5, 6):
            if x * x + y * y <= 30:
                p.px(cx + x, cy + y, hexc('#d02a2a') if (x + y) % 4 < 2 else C['white'])


def icon_meltdown(p, cx, cy):
    red, dark = hexc('#e0483c'), hexc('#a8302a')
    for y in range(-5, 6):
        for x in range(-5, 6):
            if x * x + y * y <= 26:
                p.px(cx + x, cy - 1 + y, red if -x - y > -3 else dark)
    p.px(cx - 2, cy - 2, C['ink']); p.px(cx + 2, cy - 2, C['ink'])       # sad eyes
    p.px(cx - 2, cy + 2, C['ink']); p.px(cx - 1, cy + 1, C['ink']); p.px(cx, cy + 1, C['ink']); p.px(cx + 1, cy + 1, C['ink']); p.px(cx + 2, cy + 2, C['ink'])
    p.px(cx + 1, cy + 5, dark); p.px(cx + 1, cy + 6, red)                # a drip
    p.px(cx + 5, cy - 4, hexc('#9fe0ff')); p.px(cx + 5, cy - 3, hexc('#9fe0ff'))   # sweat


def icon_closecall(p, cx, cy):
    p.rect(cx - 2, cy - 6, 5, 13, C['ink']); p.rect(cx - 1, cy - 5, 3, 11, hexc('#2c3446'))
    p.rect(cx - 1, cy - 4, 3, 10, C['warm'])
    p.rect(cx - 4, cy - 5, 9, 1, C['warm'])
    p.px(cx + 4, cy + 2, C['white']); p.px(cx + 5, cy + 1, C['white'])


def icon_lucky7(p, cx, cy):
    for r, row in enumerate(['xxxxx', '....x', '...x.', '..x..', '..x..', '.x...', '.x...']):
        for k, v in enumerate(row):
            if v == 'x':
                p.rect(cx - 5 + k * 2, cy - 7 + r * 2, 2, 2, hexc('#5ab040'))


def icon_seeddodger(p, cx, cy):
    paste(p, A / 'ui' / 'icon-seed.png', cx, cy, 11, 11)
    for k in range(-5, 6):
        p.px(cx + k, cy + k, C['cross']); p.px(cx + k + 1, cy + k, C['cross'])


# id: (theme, tiers, icon)
BADGES = {
    'longhaul': ('flying', 3, icon_longhaul), 'frequent': ('flying', 3, icon_frequent), 'hopper': ('flying', 3, icon_hopper),
    'bumpy': ('flying', 1, icon_bumpy),
    'sunshield': ('climate', 3, icon_sun), 'nightowl': ('climate', 3, icon_nightowl), 'coolplanet': ('climate', 3, icon_coolplanet),
    'zerocarbon': ('climate', 1, icon_zerocarbon),
    'seedhunter': ('seeds', 3, icon_seedhunter), 'golden': ('seeds', 3, icon_golden),
    'forester': ('nature', 3, icon_forester), 'naturalist': ('nature', 3, icon_naturalist), 'rewilder': ('nature', 3, icon_rewilder),
    'globetrotter': ('explorer', 3, icon_globetrotter), 'worldflight': ('explorer', 1, icon_worldflight),
    'oops': ('secret', 1, icon_oops), 'birdstrike': ('secret', 1, icon_birdstrike), 'toldoff': ('secret', 1, icon_toldoff),
    'meltdown': ('secret', 1, icon_meltdown), 'closecall': ('secret', 1, icon_closecall), 'lucky7': ('secret', 1, icon_lucky7),
    'seeddodger': ('secret', 1, icon_seeddodger),
}


def locked():
    """Grey medal with a padlock: a badge you have not earned yet."""
    p = Pic(32, 32)
    img = medal('flying', 2, lambda q, cx, cy: None)
    g = img.convert('LA').convert('RGBA')
    p.img.alpha_composite(g)
    for y in range(-2, 5):
        for x in range(-3, 4):
            p.px(16 + x, 21 + y, hexc('#5a5a66'))
    for a in range(0, 181, 15):
        x = 16 + round(2.5 * math.cos(math.radians(a))); y = 19 - round(3 * math.sin(math.radians(a)))
        p.px(x, y, hexc('#5a5a66')); p.px(x, y + 1, hexc('#5a5a66'))
    p.px(16, 22, hexc('#c9c4b4')); p.px(16, 23, hexc('#c9c4b4'))
    return p.img


def secret():
    """Purple medal with a ? : a secret badge nobody has found."""
    def q(p, cx, cy):
        for r, row in enumerate(['.xxx.', 'x...x', '...x.', '..x..', '..x..', '.....', '..x..']):
            for k, v in enumerate(row):
                if v == 'x':
                    p.rect(cx - 5 + k * 2, cy - 7 + r * 2, 2, 2, hexc('#7a4ab0'))
    return medal('secret', 2, q)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for bid, (theme, tiers, icon) in BADGES.items():
        for t in range(1, tiers + 1):
            medal(theme, t if tiers > 1 else 3, icon).save(OUT / f'badge-{bid}-{t}.png')
    locked().save(OUT / 'badge-locked.png')
    secret().save(OUT / 'badge-secret.png')
    print('wrote', sum(t for _, t, _ in BADGES.values()) + 2, 'badge images')
