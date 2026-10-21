"""Hand-placed pixel landmarks, one per city on the route: assets/landmark-<city>.png.

Run from the repo root:  python3 tools/art/make_landmarks.py [preview.png]
Each is drawn from simple shapes placed by hand, lit from the upper left like everything else,
base on the bottom row (stand it on the ground line). Light enough to survive the night tint.
Also writes src/landmarks.js (city -> texture key) for the game to preload and place.
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / 'assets'


def hexc(h, a=255):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (a,)


P = {
    'stone': hexc('#d8ccb0'), 'stone_l': hexc('#ece4cc'), 'stone_d': hexc('#a8987a'),
    'sand': hexc('#e0c890'), 'sand_l': hexc('#f0dca8'), 'sand_d': hexc('#b89a60'),
    'iron': hexc('#7a6a5a'), 'iron_l': hexc('#9a8a78'), 'iron_d': hexc('#5a4c40'),
    'glass': hexc('#a8c8e0'), 'glass_l': hexc('#d0e4f2'), 'glass_d': hexc('#7898b8'),
    'gold': hexc('#e8c050'), 'gold_d': hexc('#b8902a'), 'red': hexc('#d04030'), 'red_d': hexc('#a02a20'),
    'white': hexc('#f4f1e8'), 'white_d': hexc('#c9c4b4'), 'ink': hexc('#2b2b33'),
    'copper': hexc('#6ab8a0'), 'copper_d': hexc('#4a907a'), 'blue': hexc('#3a5a9a'), 'blue_l': hexc('#5a7aba'),
    'roof': hexc('#3a6a9a'), 'snow': hexc('#ffffff'), 'rock': hexc('#8a8a96'), 'rock_d': hexc('#6a6a76'),
    'window': hexc('#fff3a0'),
}


class L:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.img = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.img.putpixel((x, y), c)

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.px(xx, yy, c)

    def block(self, x, y, w, h, base, lit, dark, lit_w=1):
        """A lit box: left column(s) lit, right column shaded."""
        self.rect(x, y, w, h, base)
        self.rect(x, y, lit_w, h, lit)
        self.rect(x + w - 1, y, 1, h, dark)

    def tri(self, cx, top, half, h, base, lit, dark):
        """Upright triangle (roof/peak) centred on cx: lit left half, shaded right half."""
        for r in range(h):
            hw = round(half * (r + 1) / h)
            for x in range(cx - hw, cx + hw + 1):
                self.px(x, top + r, lit if x < cx else dark if x > cx else base)

    def save(self, name):
        self.img.save(A / f'landmark-{name}.png')
        print('wrote landmark-' + name, self.img.size)
        return self.img


def london():                        # Big Ben (the Elizabeth Tower)
    s = L(11, 46)
    s.block(2, 14, 7, 32, P['sand'], P['sand_l'], P['sand_d'])
    for y in range(16, 46, 4):
        s.rect(4, y, 3, 2, P['sand_d'])                     # windows
    s.block(1, 10, 9, 8, P['sand'], P['sand_l'], P['sand_d'])
    s.rect(3, 11, 5, 5, P['white']); s.px(5, 13, P['ink']); s.px(5, 12, P['ink']); s.px(6, 13, P['ink'])  # clock
    s.block(2, 6, 7, 4, P['sand_d'], P['sand'], P['iron_d'])  # belfry
    s.tri(5, 0, 3, 6, P['iron'], P['iron_l'], P['iron_d'])  # spire
    return s.save('london')


def paris():                         # Eiffel Tower
    s = L(25, 58)
    for y in range(58):
        if y < 6:
            half = 0
        else:
            t = (y - 6) / 52
            half = round(1 + 11 * t ** 1.8)
        for side in (-1, 1):
            for k in range(2 if y > 30 else 1):
                x = 12 + side * (half - k)
                s.px(x, y, P['iron_l'] if side < 0 else P['iron_d'])
        if y > 36 and half > 4 and (y - 36) % 6 < 5:        # the arch between the legs
            arch = round(half - 3 - 2 * ((y - 36) / 21) ** 0.5)
            if arch > 0:
                for x in range(12 - arch, 13 + arch):
                    if y < 44:
                        s.px(x, y, P['iron'])
        if y in (22, 38) or y % 5 == 0 and y > 8:          # cross bracing / platforms
            for x in range(12 - half, 13 + half):
                if y in (22, 38) or (x + y) % 3 == 0:
                    s.px(x, y, P['iron'])
    s.rect(10, 22, 5, 2, P['iron_d']); s.rect(7, 38, 11, 2, P['iron_d'])   # 1st and 2nd floors
    s.rect(12, 0, 1, 6, P['iron_d'])
    return s.save('paris')


def berlin():                        # Brandenburg Gate
    s = L(32, 24)
    s.block(1, 9, 30, 15, P['stone'], P['stone_l'], P['stone_d'])
    for x in range(3, 30, 5):                               # gaps between the columns
        s.rect(x + 2, 12, 3, 12, P['stone_d'] if x > 3 else hexc('#b8a888'))
    s.block(0, 6, 32, 4, P['stone_l'], P['white'], P['stone_d'])   # entablature
    s.block(12, 3, 8, 3, P['stone'], P['stone_l'], P['stone_d'])   # attic
    s.rect(14, 0, 4, 3, P['copper']); s.px(13, 1, P['copper_d']); s.px(18, 1, P['copper_d'])   # quadriga
    s.px(15, 0, P['copper_d'])
    return s.save('berlin')


def rome():                          # Colosseum, with its broken top on one side
    s = L(42, 22)
    for y in range(22):                                    # the left part keeps its top tier
        for x in range(1, 41):
            if y < 4 and x > 24:
                continue
            s.px(x, y, P['sand'] if x > 4 else P['sand_l'])
        s.px(40, y, P['sand_d']) if y >= 4 else None
    for tier, y0 in enumerate((5, 11, 17)):                 # three rows of arches
        for x in range(3, 40, 4):
            s.rect(x, y0, 2, 4, P['sand_d'] if tier < 2 else hexc('#9a8050'))
            s.px(x, y0, P['sand'])
    for x in range(3, 24, 4):
        s.rect(x, 1, 2, 2, P['sand_d'])                      # attic windows on the high side
    for x in range(1, 41):
        s.px(x, 4 if x > 24 else 0, P['sand_l'])
    s.rect(24, 0, 1, 4, P['sand_d'])
    return s.save('rome')


def athens():                        # the Parthenon on the Acropolis rock
    s = L(40, 24)
    for y in range(16, 24):                                 # the rock
        half = 14 + (y - 16) * 0.8
        for x in range(round(20 - half), round(20 + half)):
            s.px(x, y, P['rock'] if x > 20 else hexc('#a8a8b0'))
    s.block(6, 14, 28, 2, P['white'], P['white'], P['white_d'])   # base steps
    for x in range(7, 33, 3):                               # columns
        s.rect(x, 6, 2, 8, P['white']); s.px(x + 1, 6, P['white_d'])
        s.rect(x + 1, 7, 1, 7, P['white_d'])
    s.block(6, 4, 28, 2, P['white'], P['white'], P['white_d'])
    s.tri(20, 0, 14, 4, P['white'], P['white'], P['white_d'])     # pediment
    return s.save('athens')


def cairo():                         # the Pyramids of Giza
    s = L(48, 26)
    for cx, h in ((14, 25), (32, 20), (44, 10)):
        for r in range(h):
            y = 26 - h + r
            hw = r
            for x in range(cx - hw, cx + hw + 1):
                c = P['sand_l'] if x < cx else P['sand_d'] if x > cx else P['sand']
                if (y % 3 == 0) and x != cx:
                    c = P['sand'] if x < cx else hexc('#a08850')
                s.px(x, y, c)
    s.px(14, 1, P['sand_l'])
    return s.save('cairo')


def dubai():                         # Burj Khalifa
    s = L(15, 66)
    tiers = [(0, 1), (6, 1), (12, 2), (20, 2), (28, 3), (36, 4), (44, 5), (52, 6), (58, 7)]
    for y in range(66):
        half = 0
        for ty, th in tiers:
            if y >= ty:
                half = th
        for x in range(7 - half, 8 + half):
            c = P['glass_l'] if x < 7 else P['glass_d'] if x > 7 else P['glass']
            if (y % 4 == 0) and half > 1:
                c = P['glass_l'] if x < 7 else P['glass']
            s.px(x, y, c)
    s.rect(7, 0, 1, 6, P['white_d'])                         # spire
    return s.save('dubai')


def delhi():                         # India Gate
    s = L(24, 30)
    s.block(2, 8, 20, 22, P['sand'], P['sand_l'], P['sand_d'])
    s.rect(8, 16, 8, 14, (0, 0, 0, 0))                       # the arch opening
    for y in range(13, 17):
        w = round(4 - (16 - y) * 1.2)
        s.rect(12 - max(0, w), y, 2 * max(0, w), 1, (0, 0, 0, 0))
    s.rect(8, 16, 1, 14, P['sand_d']); s.rect(15, 16, 1, 14, P['sand_l'])
    s.block(0, 5, 24, 3, P['sand_l'], P['white'], P['sand_d'])
    s.block(6, 2, 12, 3, P['sand'], P['sand_l'], P['sand_d'])
    s.block(9, 0, 6, 2, P['sand_d'], P['sand'], P['iron_d'])
    for x in (4, 19):
        s.rect(x, 10, 1, 4, P['sand_d'])
    return s.save('delhi')


def bangkok():                       # Wat Arun: a tall prang with side towers
    s = L(26, 42)
    def prang(cx, top, h, w):
        for r in range(h):
            y = top + r
            hw = max(1, round(w * (r / h) ** 0.7))
            for x in range(cx - hw, cx + hw + 1):
                c = P['white'] if x < cx else P['white_d'] if x > cx else P['stone_l']
                if r % 4 == 2:
                    c = hexc('#e8a060') if x < cx else hexc('#c08040')   # coloured porcelain bands
                elif r % 4 == 0 and x == cx:
                    c = P['copper']
                s.px(x, y, c)
        s.px(cx, top - 1, P['gold']); s.px(cx, top - 2, P['gold'])
    prang(5, 26, 16, 4)
    prang(20, 26, 16, 4)
    prang(13, 3, 39, 7)
    return s.save('bangkok')


def beijing():                       # Temple of Heaven: three round blue roofs on a white terrace
    s = L(30, 32)
    s.block(0, 28, 30, 4, P['white'], P['white'], P['white_d'])
    s.block(3, 25, 24, 3, P['white'], P['white'], P['white_d'])
    for (y, half) in ((19, 11), (11, 8), (4, 5)):
        for r in range(4):                                   # each roof: a blue cone band
            hw = half - 3 + r
            for x in range(15 - hw, 16 + hw):
                s.px(x, y + r, P['blue_l'] if x < 15 else P['blue'])
        s.rect(15 - half + 3, y + 4, 2 * (half - 3) + 1, 2, P['red'])       # red walls between roofs
        s.rect(15 - half + 3, y + 4, 1, 2, P['red_d'])
    s.rect(14, 2, 2, 2, P['gold']); s.px(15, 1, P['gold']); s.px(15, 0, P['gold_d'])
    return s.save('beijing')


def tokyo():                         # Tokyo Tower: red and white lattice
    s = L(19, 54)
    for y in range(54):
        t = y / 53
        half = round(1 + 8 * t ** 1.6) if y > 4 else 0
        band = (y // 6) % 2 == 0
        c = P['red'] if band else P['white']
        cd = P['red_d'] if band else P['white_d']
        for x in (9 - half, 9 + half):
            s.px(x, y, c if x <= 9 else cd)
        if y % 3 == 0 and y > 4:
            for x in range(9 - half, 10 + half):
                if (x + y) % 2 == 0:
                    s.px(x, y, c)
    s.rect(6, 20, 7, 3, P['white']); s.rect(4, 34, 11, 3, P['white'])       # observation decks
    s.rect(6, 22, 7, 1, P['glass_d']); s.rect(4, 36, 11, 1, P['glass_d'])
    s.rect(9, 0, 1, 5, P['red'])
    return s.save('tokyo')


def anchorage():                     # Denali, snow-capped
    s = L(54, 30)
    for x in range(54):
        h = max(0, 29 - abs(x - 24) * 1.15 - (4 if x > 34 else 0) + (3 if 30 < x < 40 else 0))
        top = round(29 - h)
        for y in range(top, 30):
            snowline = top + 6 + (x % 3)
            c = P['snow'] if y < snowline else (P['rock'] if x < 24 else P['rock_d'])
            if y < snowline and x > 24:
                c = hexc('#dde6f0')
            s.px(x, y, c)
    return s.save('anchorage')


def vancouver():                     # Canada Place: white sails on the pier
    s = L(38, 18)
    s.block(0, 13, 38, 5, P['white_d'], P['white'], P['iron_d'])
    for cx in (6, 13, 20, 27, 34):
        s.tri(cx, 4 + (cx % 3), 4, 9 - (cx % 3), P['white'], P['white'], P['white_d'])
        s.px(cx, 3 + (cx % 3), P['iron_d'])
    s.rect(1, 15, 36, 1, P['glass_d'])
    return s.save('vancouver')


def chicago():                       # Willis Tower: stepped black glass with twin antennas
    s = L(17, 64)
    dark, dark_l, dark_d = hexc('#4a4e5a'), hexc('#6a6e7a'), hexc('#34363e')
    for x0, w, top in ((2, 13, 30), (2, 9, 18), (6, 9, 10), (6, 5, 6)):
        s.block(x0, top, w, 64 - top, dark, dark_l, dark_d)
    for y in range(8, 64, 3):
        for x in range(3, 15, 2):
            if s.img.getpixel((x, y))[3]:
                s.px(x, y, P['window'] if (x * y) % 7 == 0 else hexc('#7a8aa0'))
    s.rect(7, 0, 1, 6, dark_d); s.rect(9, 1, 1, 5, dark_d)
    return s.save('chicago')


def newyork():                       # Statue of Liberty on her pedestal
    s = L(15, 52)
    s.block(3, 34, 9, 18, P['stone'], P['stone_l'], P['stone_d'])          # pedestal
    s.block(2, 32, 11, 2, P['stone_l'], P['white'], P['stone_d'])
    s.block(5, 12, 5, 20, P['copper'], hexc('#8ad0b8'), P['copper_d'])      # robe
    s.rect(4, 24, 1, 8, P['copper_d'])
    s.block(6, 8, 3, 4, P['copper'], hexc('#8ad0b8'), P['copper_d'])        # head
    for x in (5, 7, 9):
        s.px(x, 7, P['copper'])                                              # crown spikes
    s.rect(9, 2, 1, 10, P['copper'])                                         # raised arm
    s.rect(9, 0, 2, 2, P['gold']); s.px(10, 0, hexc('#ffef9a'))              # torch flame
    s.rect(3, 15, 2, 4, P['copper_d'])                                       # tablet
    return s.save('newyork')


def reykjavik():                     # Hallgrimskirkja: stepped concrete wings and a tall tower
    s = L(26, 44)
    for k in range(7):                                       # the stepped wings, like basalt columns
        h = 6 + k * 3
        for side in (-1, 1):
            x = 13 + side * (12 - k)
            s.block(x if side < 0 else x, 44 - h, 2, h, P['white'], P['white'], P['white_d'])
    s.block(10, 4, 6, 40, P['white'], P['white'], P['white_d'])
    s.tri(13, 0, 3, 5, P['white_d'], P['white'], P['rock'])
    s.rect(12, 10, 2, 3, P['glass_d']); s.rect(12, 16, 2, 2, P['glass_d'])
    s.rect(12, 30, 2, 14, hexc('#9aa6b0'))                  # door
    return s.save('reykjavik')


CITIES = {'LONDON': london, 'PARIS': paris, 'BERLIN': berlin, 'ROME': rome, 'ATHENS': athens,
          'CAIRO': cairo, 'DUBAI': dubai, 'DELHI': delhi, 'BANGKOK': bangkok, 'BEIJING': beijing,
          'TOKYO': tokyo, 'ANCHORAGE': anchorage, 'VANCOUVER': vancouver, 'CHICAGO': chicago,
          'NEW YORK': newyork, 'REYKJAVIK': reykjavik}
NAMES = {'LONDON': 'Big Ben', 'PARIS': 'Eiffel Tower', 'BERLIN': 'Brandenburg Gate', 'ROME': 'Colosseum',
         'ATHENS': 'Parthenon', 'CAIRO': 'Pyramids of Giza', 'DUBAI': 'Burj Khalifa', 'DELHI': 'India Gate',
         'BANGKOK': 'Wat Arun', 'BEIJING': 'Temple of Heaven', 'TOKYO': 'Tokyo Tower', 'ANCHORAGE': 'Denali',
         'VANCOUVER': 'Canada Place', 'CHICAGO': 'Willis Tower', 'NEW YORK': 'Statue of Liberty',
         'REYKJAVIK': 'Hallgrimskirkja'}

if __name__ == '__main__':
    ims = []
    rows = {}
    for city, fn in CITIES.items():
        im = fn()
        ims.append(im)
        rows[city] = {'key': f'landmark-{fn.__name__}', 'name': NAMES[city], 'w': im.width, 'h': im.height}
    (ROOT / 'src' / 'landmarks.js').write_text(
        '// GENERATED by tools/art/make_landmarks.py: city -> landmark texture (base on the bottom row).\n'
        f'export const LANDMARKS = {json.dumps(rows, indent=2)};\n')
    print('wrote src/landmarks.js')
    if len(sys.argv) > 1:
        H = max(i.height for i in ims) + 8
        W = sum(i.width + 6 for i in ims) + 6
        c = Image.new('RGBA', (W, H), (110, 198, 232, 255))
        x = 4
        for im in ims:
            c.alpha_composite(im, (x, H - 4 - im.height)); x += im.width + 6
        c.resize((W * 3, H * 3), Image.NEAREST).save(sys.argv[1])
