"""Add the Maori macron vowels to the pixel font (the user, 2026-10-28: Press Start 2P lacks them, and Maori names need
correct spellings). Each is drawn on the font's own 8x8 pixel grid (125 units a pixel), following its accent convention:
the accent in rows 0-1, the letter's body in rows 2-6 - and the body is TAKEN from the font's own accented letter (A acute
for A macron, a acute for a macron, ...), so capitals keep the font's squashed accented shapes. Row 0 = the macron bar.
    python3 tools/art/add_macrons.py        (reads vendor/fonts/press-start-2p.woff2, writes vendor/fonts/contrail-pixel.woff2;
                                             needs fontTools + brotli)
LICENCE: Press Start 2P is SIL OFL 1.1 with the Reserved Font Name "Press Start 2P". A modified font may NOT use that name,
so the output is renamed "Contrail Pixel" (name table), keeps the copyright notice and the OFL, and the original file stays
in the repo untouched as the source.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / 'vendor/fonts/press-start-2p.woff2'   # the original (never written)
OUT = ROOT / 'vendor/fonts/contrail-pixel.woff2'
PX = 125
MACRON = '.#####..'
PAIRS = {'Amacron': ('Á', 0x100), 'amacron': ('á', 0x101), 'Emacron': ('É', 0x112), 'emacron': ('é', 0x113),
         'Imacron': ('Í', 0x12A), 'imacron': ('í', 0x12B), 'Omacron': ('Ó', 0x14C), 'omacron': ('ó', 0x14D),
         'Umacron': ('Ú', 0x16A), 'umacron': ('ú', 0x16B)}


def grid(font, ch):
    im = Image.new('L', (8, 8), 0); ImageDraw.Draw(im).text((0, 0), ch, font=font, fill=255)
    return [''.join('#' if im.getpixel((x, y)) > 127 else '.' for x in range(8)) for y in range(8)]


def glyph_from(rows):
    pen = TTGlyphPen(None)
    for r, row in enumerate(rows):
        x = 0
        while x < 8:
            if row[x] == '#':
                x0 = x
                while x < 8 and row[x] == '#': x += 1
                top, bot = 1000 - PX * r, 1000 - PX * (r + 1)
                pen.moveTo((x0 * PX, bot)); pen.lineTo((x0 * PX, top)); pen.lineTo((x * PX, top)); pen.lineTo((x * PX, bot)); pen.closePath()
            else:
                x += 1
    return pen.glyph()


def main():
    f = TTFont(FONT)
    tmp = '/tmp/ps2p-src.ttf'; g2 = TTFont(FONT); g2.flavor = None; g2.save(tmp)
    raster = ImageFont.truetype(tmp, 8)
    order = f.getGlyphOrder()
    for name, (base, code) in PAIRS.items():
        rows = grid(raster, base)
        rows = [MACRON, '........'] + rows[2:]          # the font's own body in rows 2-6, the bar on top
        f['glyf'][name] = glyph_from(rows)
        f['hmtx'][name] = (1000, min(rows[0].index('#') if '#' in rows[0] else 0, *[r.index('#') for r in rows if '#' in r]) * PX)
        if name not in order: order.append(name)
        for t in f['cmap'].tables:
            if t.isUnicode(): t.cmap[code] = name
    f.setGlyphOrder(order)
    f['maxp'].numGlyphs = len(order)
    # OFL: the Reserved Font Name may not be used by a modified version: rename it, keep the copyright and the licence.
    nt = f['name']
    for r in list(nt.names):
        if r.nameID in (1, 16): r.string = 'Contrail Pixel'
        elif r.nameID in (3, 4): r.string = 'Contrail Pixel Regular'
        elif r.nameID == 6: r.string = 'ContrailPixel-Regular'
        elif r.nameID == 0: r.string = r.toUnicode() + '. Modified 2026 for Contrail Pilot (Maori macron vowels added); not the original Press Start 2P.'
    f.save(OUT)
    print('added', ', '.join(PAIRS), '->', OUT.relative_to(ROOT))


if __name__ == '__main__':
    main()
