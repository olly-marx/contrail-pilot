# THE TALL PIXEL FONT (0.79.0; Oliver, 2026-11-24, font trial pick G: today's font, 25% taller): the game's 'Pixel' font (Press Start 2P + Maori macrons, tools/art/add_macrons.py)
# made 10 pixel rows tall instead of 8 by DOUBLING two whole rows, so every glyph stays on a whole-pixel grid at 8 px (a plain 1.25 stretch gave 1.25 px rows, and at 8 px on a
# 1x canvas, as Phaser draws its text, whole rows dropped out: tests/macrons.cjs caught it in CI, 2026-11-25).
# The font's grid is 125 units a row: row 0 (y 0-125) is the descender row, rows 1-7 the capitals, rows 1-5 the lower case. Rows 2 and 4 are doubled: lower case becomes
# 7 wide x 7 tall (was 7 x 5), capitals 7 x 9 (were 7 x 7); the macron's bar and gap (rows 6-7) stay one row each. Composite glyphs are decomposed first.
#   python3.10 tools/art/make_tall.py vendor/fonts/contrail-pixel.woff2 vendor/fonts/contrail-pixel-tall.woff2   (needs fontTools + brotli)
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
ROW = 125
HEIGHTS = [1, 1, 2, 1, 2, 1, 1, 1]   # new height (in rows) of each old row 0..7, bottom up
OLD = [i * ROW for i in range(len(HEIGHTS) + 1)]
NEW = [0]
for h in HEIGHTS: NEW.append(NEW[-1] + h * ROW)
SY = NEW[-1] / OLD[-1]   # 1.25: the metrics scale
def mapy(y):
    if y <= 0: return y   # (nothing in this font goes below the baseline row)
    if y >= OLD[-1]: return NEW[-1] + (y - OLD[-1])
    k = int(y // ROW); return NEW[k] + (y - OLD[k]) * HEIGHTS[k]
class MapPen:
    def __init__(self, out): self.out = out
    def _m(self, pts): return [(x, mapy(y)) for x, y in pts]
    def moveTo(self, p): self.out.moveTo(*self._m([p]))
    def lineTo(self, p): self.out.lineTo(*self._m([p]))
    def curveTo(self, *ps): self.out.curveTo(*self._m(ps))
    def qCurveTo(self, *ps): self.out.qCurveTo(*[None if p is None else self._m([p])[0] for p in ps])
    def closePath(self): self.out.closePath()
    def endPath(self): self.out.endPath()
    def addComponent(self, *a): raise RuntimeError('components are decomposed first')
src, out = sys.argv[1], sys.argv[2]
f = TTFont(src); gs = f.getGlyphSet(); glyf = f['glyf']; new = {}
for name in f.getGlyphOrder():
    rec = DecomposingRecordingPen(gs); gs[name].draw(rec)
    pen = TTGlyphPen(None); rec.replay(MapPen(pen)); new[name] = pen.glyph()
for name, g in new.items(): glyf[name] = g
for t, attrs in (('hhea', ['ascent', 'descent', 'lineGap']), ('OS/2', ['sTypoAscender', 'sTypoDescender', 'sTypoLineGap', 'usWinAscent', 'usWinDescent'])):
    for a in attrs:
        if hasattr(f[t], a): setattr(f[t], a, round(getattr(f[t], a) * SY))
f['OS/2'].sCapHeight = mapy(f['OS/2'].sCapHeight) if getattr(f['OS/2'], 'sCapHeight', 0) else 0
f['OS/2'].sxHeight = mapy(f['OS/2'].sxHeight) if getattr(f['OS/2'], 'sxHeight', 0) else 0
for rec in f['name'].names:
    if rec.nameID in (1, 4, 6, 16): rec.string = (rec.toUnicode() + ' Tall').replace(' ', '' if rec.nameID == 6 else ' ')
f.flavor = 'woff2' if out.endswith('.woff2') else None; f.save(out); print('saved', out, 'rows', HEIGHTS, 'em', NEW[-1])
