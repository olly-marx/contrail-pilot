"""Install the PixelLab trees (the user, 2026-10-24: trees in the agreed style; only the full tree and its card are
generated, the young tree is the full one shrunk, the sapling stays).

    python3 tools/art/install_trees.py

tools/art/pixellab/trees/ts-<id>.png (pixflux 32x32, flat side-on, <= 10 colours) and tc-<id>.png (pixen 64x80,
realistic card; list in trees.txt, redone ones in trees-redo.txt) ->
  assets/tree-<id>-2.png             the full tree, cropped, base on the bottom row
  assets/tree-<id>-1.png             the young tree: the full one at 70 % (nearest neighbour)
  assets/ui/portrait-tree-<id>-0.png the card, cropped
Keys and stage numbers are unchanged (GameScene growth, NATURE cards, the wild-area field).
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools/art/pixellab/trees'


def crop(path):
    im = Image.open(path).convert('RGBA')
    return im.crop(im.getbbox())


def main():
    ids = sorted({p.stem[3:] for p in SRC.glob('ts-*.png') if not p.stem.endswith('-raw')})
    for i in ids:
        full = crop(SRC / f'ts-{i}.png')
        full.save(ROOT / 'assets' / f'tree-{i}-2.png')
        full.resize((max(1, round(full.width * 0.7)), max(1, round(full.height * 0.7))), Image.NEAREST).save(ROOT / 'assets' / f'tree-{i}-1.png')
        crop(SRC / f'tc-{i}.png').save(ROOT / 'assets/ui' / f'portrait-tree-{i}-0.png')
    print(len(ids), 'trees')


if __name__ == '__main__':
    main()
