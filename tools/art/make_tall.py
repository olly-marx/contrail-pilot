# THE TALL PIXEL FONT (0.79.0; Oliver, 2026-11-24, font trial pick G): the game's 'Pixel' font (Press Start 2P + Maori macrons, tools/art/add_macrons.py) stretched
# vertically, every glyph and the vertical metrics times SY (1.25: capitals 7 wide x 8.75 tall at 8 px, lower case 7 x 7.75; were 7 x 7 and 7 x 5.4). OFL: the name gets ' Tall'.
#   python3.10 tools/art/make_tall.py vendor/fonts/contrail-pixel.woff2 vendor/fonts/contrail-pixel-tall.woff2 1.25   (needs fontTools + brotli)
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
src, out, sy = sys.argv[1], sys.argv[2], float(sys.argv[3])
f = TTFont(src); gs = f.getGlyphSet(); glyf = f['glyf']
new = {}
for name in f.getGlyphOrder():
    pen = TTGlyphPen(gs); gs[name].draw(TransformPen(pen, (1, 0, 0, sy, 0, 0))); new[name] = pen.glyph()
for name, g in new.items(): glyf[name] = g
for t, attrs in (('hhea', ['ascent', 'descent', 'lineGap']), ('OS/2', ['sTypoAscender', 'sTypoDescender', 'sTypoLineGap', 'usWinAscent', 'usWinDescent', 'sCapHeight', 'sxHeight'])):
    for a in attrs:
        if hasattr(f[t], a): setattr(f[t], a, round(getattr(f[t], a) * sy))
for rec in f['name'].names:
    if rec.nameID in (1, 4, 6, 16): rec.string = (rec.toUnicode() + ' Tall').replace(' ', '' if rec.nameID == 6 else ' ')
f.flavor = 'woff2' if out.endswith('.woff2') else None; f.save(out); print('saved', out)
