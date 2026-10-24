"""PixelLab thunderclouds (the user, 2026-10-24): each storm column is a whole PixelLab storm tower.

    python3 tools/art/pixellab_storm.py [out_dir (default assets)]

From tools/art/pixellab/storm2/rise-<v>.png (pixen 64x256, chosen by eye: c, d) with its crown swapped for
tools/art/pixellab/rim/rim-<v>.png (a flat-topped cloud rim, inpainted):
  storm-rise-<v>.png        the tower, crown up, cropped so its top pixel is row 0 (the bottom column:
                            the crown's top sits exactly on the gap edge)
  storm-hang-<v>.png        the same, flipped and darker (the top column hangs down to the gap)
  storm-rise/hang-<v>-flash.png   lit up for lightning
  storm-spark-0..2.png      tiny bolts that flicker INSIDE the clouds (drawn here)
GameScene stacks and places them; the crash shape is the drawn pixels inside the 44 px column.
"""
import sys
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools/art/pixellab/storm2'
VARIANTS = ['c', 'd']
RIM_ROWS = 28   # rows of the inpainted rim used (the rest of its picture is the tower again)
FLASH = (255, 251, 224)
SPARKS = [   # X: bolt core (a glow is added round it)
    ['...XX', '..XX.', '.XX..', 'XXXX.', '..XX.', '.XX..', '.X...', 'XX...', 'X....'],
    ['XX...', '.XX..', '..XX.', '.XXXX', '..XX.', '...XX', '..XX.', '..X..', '.X...', '.X...'],
    ['..XX..', '.XX...', 'XXXXX.', '...XX.', '..XX..', '.XXXX.', '...XX.', '...X..'],
]

def lit(im):
    out = im.copy(); px = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a: px[x, y] = (*(round(c + (f - c) * 0.55) for c, f in zip((r, g, b), FLASH)), a)
    return out


def spark(rows):
    w, h = len(rows[0]) + 2, len(rows) + 2
    im = Image.new('RGBA', (w, h)); px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == 'X':
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        if px[x + 1 + dx, y + 1 + dy][3] == 0: px[x + 1 + dx, y + 1 + dy] = (255, 230, 120, 110)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == 'X': px[x + 1, y + 1] = (255, 255, 235, 255)
    return im


def with_rim(v):
    """The tower with its crown swapped for the flat-topped pipe rim (tools/art/pixellab_rim.py, the user 2026-10-24:
    'fill the box at the gap ... feel like a Flappy Bird pipe'), 64 px wide, cropped so the rim's top is row 0."""
    t = Image.open(SRC / f'rise-{v}.png').convert('RGBA'); t = t.crop(t.getbbox())
    full = Image.new('RGBA', (64, t.height)); full.alpha_composite(t, ((64 - t.width) // 2, 0))
    rim = Image.open(SRC.parent / 'rim' / f'rim-{v}.png').convert('RGBA')
    full.paste(Image.new('RGBA', (64, RIM_ROWS)), (0, 0)); full.alpha_composite(rim.crop((0, 0, 64, RIM_ROWS)), (0, 0))
    return full.crop(full.getbbox())


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'assets'
    for v in VARIANTS:
        im = with_rim(v)
        hang = ImageEnhance.Brightness(im.transpose(Image.FLIP_TOP_BOTTOM)).enhance(0.72)
        im.save(out / f'storm-rise-{v}.png'); lit(im).save(out / f'storm-rise-{v}-flash.png')
        hang.save(out / f'storm-hang-{v}.png'); lit(hang).save(out / f'storm-hang-{v}-flash.png')
        print(v, im.size)
    for i, rows in enumerate(SPARKS):
        spark(rows).save(out / f'storm-spark-{i}.png')


if __name__ == '__main__':
    main()
