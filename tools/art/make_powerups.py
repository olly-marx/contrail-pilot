"""Pick-ups you can grab in flight (2026-10-22), 14 x 14 like the seed token, dark outline:

  power-saf   a green SAF fuel can with a leaf: cleaner fuel for a while
  power-auto  a blue autopilot badge with a white plane: the plane flies itself for a while
  meter-tree-0..3  the forest meter's slots: bare soil, seedling, young tree, grown tree (trees.py oak)

Run from the repo root:  python3 tools/art/make_powerups.py
"""
from pathlib import Path

from PIL import Image

from trees import WOODLAND, render_tree

A = Path(__file__).resolve().parents[2] / 'assets'
INK = (26, 26, 34, 255)


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def draw(rows, pal):
    """rows: strings of palette letters ('.' = clear); adds a 1 px outline round the shape."""
    h, w = len(rows), len(rows[0])
    im = Image.new('RGBA', (w + 2, h + 2), (0, 0, 0, 0))
    px = im.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                px[x + 1, y + 1] = hexc(pal[ch])
    a = im.copy().load()
    for y in range(h + 2):
        for x in range(w + 2):
            if a[x, y][3] == 0 and any(0 <= x + dx < w + 2 and 0 <= y + dy < h + 2 and a[x + dx, y + dy][3]
                                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = INK
    return im


SAF = [                     # 12 x 12: a jerry can, handle top left, spout top right, leaf on the side
    '..hhhh....s.',
    '..h..h...ss.',
    '.GGGGGGGGgg.',
    '.GLLGGGGGGg.',
    '.GLGGGGwGGg.',
    '.GLGGGwwwGg.',
    '.GGGGwwwwGg.',
    '.GGGGGwwGGg.',
    '.GGGGGlGGGg.',
    '.GGGGGGGGGg.',
    '.ggggggggggg',
    '..gggggggg..',
]
AUTO = [                    # 12 x 12: a round blue badge, white plane flying right, gold rim
    '...yyyyyy...',
    '..yBBBBBBy..',
    '.yBLLBBBBBy.',
    'yBLBBBwBBBby',
    'yBBBBBwwBBby',
    'yBwwwwwwwwby',
    'yBBBBBwwBBby',
    'yBBwBBwBBBby',
    'yBBwwBBBBbby',
    '.yBBBBBBbby.',
    '..ybbbbbby..',
    '...yyyyyy...',
]


def main():
    draw(SAF, {'G': '#43a047', 'L': '#8dffb0', 'g': '#2c7a31', 'h': '#5a5a64', 's': '#5a5a64',
               'w': '#f4f1e8', 'l': '#c9e58f'}).save(A / 'power-saf.png')
    draw(AUTO, {'B': '#2a7fd0', 'L': '#8ac8ff', 'b': '#1a5aa0', 'w': '#ffffff', 'y': '#ffe15a'}).save(A / 'power-auto.png')
    soil = Image.new('RGBA', (9, 3), (0, 0, 0, 0))
    for x in range(1, 8):
        soil.putpixel((x, 1), hexc('#8a5a30')); soil.putpixel((x, 2), hexc('#5f3d20'))
    soil.save(A / 'meter-tree-0.png')
    for st in range(3):
        render_tree(WOODLAND['oak'], st, 0.75 if st else 1.2).save(A / f'meter-tree-{st + 1}.png')
    print('drew power-saf, power-auto, meter-tree-0..3')


if __name__ == '__main__':
    main()
