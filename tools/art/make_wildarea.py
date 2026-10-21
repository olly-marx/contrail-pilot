"""Wild Area screen art (HTML-only, assets/ui/): a scene backdrop per region, habitat project icons,
and a card frame for found animals.

Run from the repo root:  python3 tools/art/make_wildarea.py [out_dir]
Backdrops are composed from the region's own flight strips (make_regions.py / make_background.py),
so they always match what you fly over: 288x120 = 54 px of sky + 46 px hills + the top 20 px of ground
(grass for the animals to stand on, plus a sliver of soil).
"""
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1] if (HERE.parents[1] / 'assets').exists() else Path.home() / 'contrail-pilot'
A = ROOT / 'assets'
sys.path.insert(0, str(ROOT / 'tools' / 'art'))
from make_diagrams import Pic, C, hexc, cross   # noqa: E402
from species import REGIONS                     # noqa: E402

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else A / 'ui'


def save(im, name):
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / f'{name}.png')
    print('wrote', name, im.size)


# ---------- 1. scene backdrops ----------

SKY = {'woodland': ('#6ec6e8', '#a8dff2'), 'mediterranean': ('#5ab8ee', '#a8dcf8'), 'desert': ('#7ac8ea', '#f0e4c0'),
       'monsoon': ('#7ab8d8', '#c8e4ec'), 'eastasia': ('#8ac0dc', '#e0ecf0'), 'boreal': ('#6aa8d8', '#d0e4f4'),
       'plains': ('#62b8ea', '#d8ecf4'), 'tundra': ('#8aaed0', '#dce8f0')}


def backdrop(region):
    top, bot = (hexc(c) for c in SKY[region])
    im = Image.new('RGBA', (288, 120))
    for y in range(54 + 46):                       # sky gradient in four bands (pixel-art, not smooth)
        t = min(3, y * 4 // 100) / 3
        c = tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3)) + (255,)
        for x in range(288):
            im.putpixel((x, y), c)
    clouds = Image.open(A / 'clouds.png').convert('RGBA')
    clouds.putalpha(clouds.getchannel('A').point(lambda a: int(a * 0.7)))
    im.alpha_composite(clouds, (0, 8))
    hills = 'hills' if region == 'woodland' else f'hills-{region}'
    ground = 'ground' if region == 'woodland' else f'ground-{region}'
    im.alpha_composite(Image.open(A / f'{hills}.png').convert('RGBA'), (0, 54))
    im.alpha_composite(Image.open(A / f'{ground}.png').convert('RGBA').crop((0, 0, 288, 20)), (0, 100))
    save(im, f'scene-{region}')


# ---------- 2. habitat project icons (24x24, same rounded tile as the mission icons) ----------

def tile(p, night=False):
    bg, edge = (C['night'], hexc('#0e1226')) if night else (C['sky'], hexc('#3f8fb5'))
    for y in range(24):
        for x in range(24):
            corner = (x in (0, 23) and y in (0, 1, 22, 23)) or (y in (0, 23) and x in (1, 22))
            if not corner:
                p.px(x, y, edge if x in (0, 23) or y in (0, 23) or (x in (1, 22) and y in (1, 22)) else bg)


def grass(p, top=18):
    for y in range(top, 23):
        for x in range(1, 23):
            p.px(x, y, C['grass_rim'] if y == top else C['grass'])


def sprite(p, path, x, y, k=1):
    im = Image.open(path).convert('RGBA')
    if k != 1:
        im = im.resize((im.width * k, im.height * k), Image.NEAREST)
    p.img.alpha_composite(im, (x, y))


def proj(name, draw):
    p = Pic(24, 24)
    tile(p)
    draw(p)
    save(p.img, f'proj-{name}')


def deadwood(p):                                    # a mossy log with a beetle
    grass(p)
    for y in range(13, 18):
        for x in range(3, 20):
            p.px(x, y, hexc('#8a5a32') if y > 13 else hexc('#a87444'))
    for y in range(13, 18):
        p.px(3, y, hexc('#c89a60')); p.px(19, y, hexc('#c89a60'))
    p.px(11, 15, hexc('#c89a60')); p.px(11, 16, hexc('#5a3a20'))
    for x in range(5, 15, 2):
        p.px(x, 12, hexc('#6aaa3a'))
    p.px(16, 12, hexc('#1b1b2f')); p.px(17, 12, hexc('#1b1b2f')); p.px(16, 11, hexc('#3a6a3a'))


def meadow(p):                                      # wildflowers in long grass
    grass(p, 16)
    for x in range(2, 22):
        p.px(x, 15 - (x % 3 == 0), C['grass'])
    for x, y, c in ((5, 9, '#ffeb3b'), (10, 7, '#e040fb'), (15, 10, '#ff7043'), (19, 8, '#ffffff'), (8, 12, '#ff7043')):
        p.px(x, y + 1, hexc('#3e9a30')); p.px(x, y + 2, hexc('#3e9a30')); p.px(x, y + 3, hexc('#3e9a30'))
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, -1), (0, 1)):
            p.px(x + dx, y + dy, hexc(c) if (dx or dy) else hexc('#ffe15a'))


def margins(p):                                     # a sunny bee bank with a bee
    grass(p, 17)
    for y in range(12, 17):
        for x in range(2 + (16 - y), 22 - (16 - y)):
            p.px(x, y, hexc('#c8a070') if (x + y) % 4 else hexc('#a08050'))
    for x in (7, 11, 15):
        p.px(x, 14, hexc('#5a3a20'))
    p.rect(12, 6, 3, 2, hexc('#ffc23d')); p.px(13, 6, hexc('#1b1b2f')); p.px(12, 7, hexc('#1b1b2f'))
    p.px(12, 5, hexc('#ffffff')); p.px(14, 5, hexc('#ffffff')); p.px(15, 7, hexc('#1b1b2f'))


def hedgerow(p):
    grass(p)
    for x in range(1, 23):
        h = 7 + (x * 7) % 3
        for y in range(18 - h, 18):
            p.px(x, y, hexc('#2e6b2e') if (x + y) % 3 else hexc('#4a8a3a'))
    for x, y in ((5, 12), (13, 11), (18, 13)):
        p.px(x, y, hexc('#ffffff')); p.px(x + 1, y + 1, hexc('#e02020'))


def pond(p):
    grass(p, 14)
    for y in range(15, 21):
        w = 9 - abs(y - 17) * 2
        for x in range(12 - w, 12 + w):
            p.px(x, y, hexc('#3d8fd1') if y > 15 else hexc('#8fd3ff'))
    for x in (4, 6):
        for y in range(9, 15):
            p.px(x, y, hexc('#6a8a3a'))
        p.rect(x, 8, 1, 2, hexc('#7a4a24'))
    p.rect(14, 16, 3, 1, hexc('#4caf50'))


def woodland(p):
    grass(p)
    sprite(p, A / 'tree-oak-1.png', 3, 9)
    sprite(p, A / 'tree-birch-1.png', 9, 9)
    sprite(p, A / 'tree-rowan-1.png', 15, 9)


def creature(icon_key, scale_to=20):
    def draw(p):
        grass(p)
        im = Image.open(A / f'{icon_key}-0.png').convert('RGBA')
        if im.width > scale_to:
            k = scale_to / im.width
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.NEAREST)
        p.img.alpha_composite(im, ((24 - im.width) // 2, 19 - im.height))
    return draw


def beavers(p):                                     # a beaver dam across a stream
    for y in range(14, 23):
        for x in range(1, 23):
            p.px(x, y, hexc('#3d8fd1') if y > 17 else hexc('#8fd3ff'))
    for k, (x, y) in enumerate(((3, 13), (6, 12), (9, 13), (12, 12), (15, 13), (18, 12))):
        p.rect(x, y, 4, 2, hexc('#6d4c2f') if k % 2 else hexc('#8a6a44'))
    for x in range(3, 21, 3):
        p.px(x, 15, hexc('#5a3a20')); p.px(x + 1, 14, hexc('#5a3a20'))


def rewet(p):                                       # wet marsh: reeds and puddles
    for y in range(15, 23):
        for x in range(1, 23):
            p.px(x, y, hexc('#5a8a3a') if (x // 4 + y) % 3 else hexc('#5aa0d8'))
    for x in (4, 8, 11, 16, 19):
        for y in range(7, 15):
            p.px(x, y, hexc('#7a9a3a'))
        p.rect(x, 6, 1, 3, hexc('#6a4a2a'))


def storks(p):                                      # a stork nest on a chimney top
    p.rect(9, 12, 6, 11, hexc('#c06040')); p.rect(9, 12, 1, 11, hexc('#e08060'))
    for x in range(5, 19):
        p.px(x, 11, hexc('#8a6a44')); p.px(x, 10, hexc('#a08050') if x % 2 else hexc('#8a6a44'))
    im = Image.open(A / 'sky-stork-0.png').convert('RGBA')
    p.img.alpha_composite(im.crop((0, 0, im.width, min(im.height, 10))), (12 - im.width // 2, 0))


# ---------- 3. card frame (CSS border-image, slice 4) ----------

def card_frame(name, edge, lit, dark, inner):
    """12x12: a 4 px border round a transparent middle; use as border-image: url(...) 4 / 8px stretch,
    with the card's own background behind it."""
    im = Image.new('RGBA', (12, 12), (0, 0, 0, 0))
    for y in range(12):
        for x in range(12):
            d = min(x, y, 11 - x, 11 - y)
            if d >= 4:
                continue
            corner = (x in (0, 11) and y in (0, 11))
            if corner:
                continue
            c = edge if d == 0 else (lit if (x < 6 and y < 6) or x < y else dark) if d == 1 else inner if d == 2 else edge
            im.putpixel((x, y), hexc(c))
    for x, y in ((1, 1), (10, 1), (1, 10), (10, 10)):
        im.putpixel((x, y), hexc(lit))                # little studs in the corners
    save(im, name)


if __name__ == '__main__':
    card_frame('card-frame', '#5a3a20', '#ffe08a', '#c8902a', '#f4f1e8')
    card_frame('card-frame-locked', '#2b2b33', '#8a8a96', '#5a5a66', '#c9c4b4')
    for r in REGIONS:
        backdrop(r)
    for name, fn in (('deadwood', deadwood), ('meadow', meadow), ('margins', margins), ('hedgerow', hedgerow),
                     ('pond', pond), ('woodland', woodland), ('voles', creature('animal-watervole')),
                     ('beavers', beavers), ('rewet', rewet), ('storks', storks),
                     ('martens', creature('animal-pinemarten'))):
        proj(name, fn)
