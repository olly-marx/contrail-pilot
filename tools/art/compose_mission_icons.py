"""Compose the PixelLab mission pictograms (tools/art/pixellab/mission-icons/<id>.png, 32x32, transparent) onto the framed tile the
older mi-*.png icons use (a sky-blue square with a darker frame; a dark navy tile for night things) and write assets/ui/mi32-<id>.png.

    python3 tools/art/compose_mission_icons.py            (from the repo root; reads tools/art/pixellab/mission-icons, writes assets/ui)

32 px, not 24: the MISSIONS row's picture slot is 32 px, so these are shown 1:1 (no resampling)."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / 'tools' / 'art' / 'pixellab' / 'mission-icons', ROOT / 'assets' / 'ui'
SKY, SKY_FRAME = (110, 198, 232, 255), (74, 150, 190, 255)
NIGHT, NIGHT_FRAME = (27, 33, 64, 255), (60, 70, 110, 255)
DARK = {'moonpatch', 'stormgap'}   # pictures made for a dark ground


def tile(dark):
    fill, frame = (NIGHT, NIGHT_FRAME) if dark else (SKY, SKY_FRAME)
    im = Image.new('RGBA', (32, 32), fill)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 31, 31], outline=frame)
    for x, y in ((0, 0), (31, 0), (0, 31), (31, 31)):
        im.putpixel((x, y), (0, 0, 0, 0))   # the same notched corners as the older tiles
    return im


def main():
    n = 0
    for f in sorted(SRC.glob('*.png')):
        if f.name.endswith('-raw.png'):
            continue
        sid = f.stem
        t = tile(sid in DARK)
        t.alpha_composite(Image.open(f).convert('RGBA'), (0, 0))
        t.save(OUT / f'mi32-{sid}.png')
        n += 1
    print(n, 'icons written to', OUT)


if __name__ == '__main__':
    main()
