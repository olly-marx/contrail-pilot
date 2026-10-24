"""Sweat drops on the PixelLab planet faces (the user, 2026-10-24: "it should start sweating as it gets hotter,
little sweat drops coming down"). Drawn here, not by PixelLab, so they sit exactly where they should.

    python3 tools/art/face_sweat.py <faces_dir> <assets_dir>

Writes face-<mood>-0.png and -1.png (32x32): frame 1 has every drop 2 px lower, so swapping the frames makes
them run down. More drops as it gets hotter.
"""
import sys
from pathlib import Path

from PIL import Image

DROP = ['.o.', 'oLo', 'LHL', 'LLL', '.L.']   # o: outline, L: light blue, H: white shine
COL = {'o': (40, 80, 160, 255), 'L': (140, 205, 255, 255), 'H': (255, 255, 255, 255)}
DROPS = {'happy': [], 'ok': [(25, 6)], 'hot': [(25, 6), (3, 10)], 'melting': [(25, 5), (3, 9), (27, 15)]}


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    for mood, drops in DROPS.items():
        base = Image.open(src / f'face-{mood}.png').convert('RGBA')
        for f in (0, 1):
            im = base.copy(); px = im.load()
            for x0, y0 in drops:
                for dy, row in enumerate(DROP):
                    for dx, ch in enumerate(row):
                        x, y = x0 + dx, y0 + dy + 2 * f
                        if ch != '.' and 0 <= x < 32 and 0 <= y < 32: px[x, y] = COL[ch]
            im.save(dst / f'face-{mood}-{f}.png')


if __name__ == '__main__':
    main()
