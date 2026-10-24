"""Install the PixelLab nature-project art (the user, 2026-10-24: all nature projects at once).

    python3 tools/art/install_projects.py

tools/art/pixellab/projects/pi-<id>.png (pixflux 32x32 icon) and pf-<id>.png (pixflux 64x32 field feature; prompts
in projects.txt from projects.json: the project's name + short for the icon, the first step of its chain - the thing
that physically changes - for the feature) ->
  assets/ui/proj-<id>.png   the icon, the whole 32x32 (shown at 32 px, .w-icon)
  assets/ui/wild-<id>.png   the feature, cropped, base on the bottom row (the wild-area field draws it at 1x)
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools/art/pixellab/projects'


def main():
    ids = sorted({p.stem[3:] for p in SRC.glob('pi-*.png') if not p.stem.endswith('-raw')})
    n = 0
    for i in ids:
        Image.open(SRC / f'pi-{i}.png').convert('RGBA').save(ROOT / 'assets/ui' / f'proj-{i}.png')
        f = SRC / f'pf-{i}.png'
        if f.exists():
            im = Image.open(f).convert('RGBA'); im.crop(im.getbbox()).save(ROOT / 'assets/ui' / f'wild-{i}.png'); n += 1
    print(len(ids), 'icons,', n, 'features')


if __name__ == '__main__':
    main()
