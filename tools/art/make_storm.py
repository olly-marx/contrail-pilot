"""Repaint the thunderclouds as soft cumulus (the user, 2026-10-23, from a reference picture).

Run from the repo root, AFTER make_sprites.py:  python3 tools/art/make_storm.py
The OUTLINE of every storm sprite is kept exactly (GameScene builds the collision masks from the
sprites' alpha, so the gameplay does not change): only the inside is repainted, PALE and SOFT: billows
only near the edge, smooth irregular light inside. The big top-to-base gradient (white crown, slate
base) is a tint GameScene puts on each column (STORM_TINT), so it spans the whole column; the user's
note: hard puffs read as stone, the gradient is what makes it a cloud. The body still tiles top to bottom (puffs repeat every 48 px).
The flash versions are the same cloud, lit up for lightning.
"""
import math
from pathlib import Path

from PIL import Image

A = Path(__file__).resolve().parents[2] / 'assets'
# From the reference picture, dark to light.
RAMP = ['#353b4d', '#52586a', '#6a6e7f', '#7c8090', '#9a9daa', '#b2b1ba', '#c6c4c9', '#d5d2d6', '#fdfdfc']
OUT = '#2b3048'                     # rim
FLASH = (255, 251, 224)             # lightning tint

hexc = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
RAMP_C = [hexc(c) for c in RAMP]
PERIOD, ROW, COL, R = 48, 8, 11, 7.2   # body repeat; puff rows/columns; puff radius


def puffs(width, height, wrap):
    """Puff centres on a staggered grid (rows every ROW px, alternate rows shifted half a column)."""
    out = []
    rows = range(-1, PERIOD // ROW + 1) if wrap else range(-1, height // ROW + 2)
    for j in rows:
        y = j * ROW + 4
        off = (COL / 2) if j % 2 else 0
        x = -COL + off + 3
        k = 0
        while x < width + COL:
            # Irregular billows: each puff a little bigger or smaller and nudged (fixed, so the art is repeatable).
            hsh = (j * 7919 + k * 104729) % 97
            out.append((x + (hsh % 5) - 2, y + (hsh // 5) % 3 - 1, R - 1.8 + (hsh % 7) * 0.6))
            x += COL; k += 1
    return out


def shade(src, wrap=False, under=0.0, top_boost=0.0, flash=False):
    """Repaint `src` inside its own alpha. under: 0-1 darkening towards the bottom; top_boost: lighter top."""
    w, h = src.size
    al = [[src.getpixel((x, y))[3] for x in range(w)] for y in range(h)]
    P = puffs(w, h, wrap)
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))

    def owner(x, y):
        best = None
        for (cx, cy, r) in P:
            dy = y - cy
            if wrap:
                dy = (dy + PERIOD / 2) % PERIOD - PERIOD / 2
            d = math.hypot(x - cx, dy)
            if d <= r and (best is None or cy > best[1] or (cy == best[1] and cx > best[0])):   # lower / right puffs in front
                best = (cx, cy, x - cx, dy, d, r)
        return best

    for y in range(h):
        for x in range(w):
            if al[y][x] == 0:
                continue
            edge = any(not (0 <= x + ax < w and (0 <= y + ay < h or wrap)) or al[(y + ay) % h if wrap else y + ay][x + ax] == 0
                       for ax, ay in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + ax < w and (wrap or 0 <= y + ay < h)) \
                or x == 0 or x == w - 1
            o = owner(x, y)
            # Inside the cloud: soft, irregular light (smooth noise that repeats with the body), no shapes.
            depth = min([abs(x - xx) for xx in range(w) if al[y][xx] == 0] + [x + 1, w - x])   # px from the side
            if depth > 3:
                n = (math.sin(x * 0.55 + 2.1 * math.sin(y * 2 * math.pi / PERIOD)) + math.sin(y * 4 * math.pi / PERIOD + x * 0.21)) * 0.5
                l = 0.74 + 0.1 * n + 0.06 * (1 - x / w)
                l = max(0.0, min(1.0, l))
                c = RAMP_C[round(l * (len(RAMP_C) - 1))]
                if flash:
                    c = tuple(round(a + (b - a) * 0.55) for a, b in zip(c, FLASH))
                img.putpixel((x, y), c + (al[y][x],))
                continue
            if o is None:
                l = 0.25
            else:
                _, _, dx, dy, d, r = o
                l = 0.76 - 0.2 * dy / r - 0.06 * dx / r           # barely-there billows, lit tops: the column tint does the big gradient
                if d > r - 1.0 and dy > -r * 0.2:
                    l -= 0.05                                      # only a hint of each billow
                o_above = owner(x, y - 1)
                if o_above and o and (o_above[0], o_above[1]) != (o[0], o[1]):
                    l -= 0.04                                      # where one puff overlaps another
            l += 0.08 * (1 - x / w)                                # the left side catches a little more light
            l += top_boost * (1 - y / h) - under * (y / h)
            l = max(0.0, min(1.0, l))
            c = RAMP_C[round(l * (len(RAMP_C) - 1))]
            if edge:
                c = tuple(round(v * 0.82) for v in c)              # a soft edge, not a dark outline
            if flash:
                c = tuple(round(a + (b - a) * 0.55) for a, b in zip(c, FLASH))
            img.putpixel((x, y), c + (al[y][x],))
    return img


def main():
    jobs = [('storm-body', dict(wrap=True)), ('storm-top', dict(top_boost=0.35)), ('storm-bottom', dict(under=0.6)),
            ('storm-flash', dict(wrap=True, flash=True)), ('storm-flash-top', dict(top_boost=0.35, flash=True)),
            ('storm-flash-bottom', dict(under=0.6, flash=True))]
    for name, kw in jobs:
        p = A / f'{name}.png'
        src = Image.open(p).convert('RGBA')
        out = shade(src, **kw)
        assert [px[3] for px in out.getdata()] == [px[3] for px in src.getdata()], f'{name}: outline changed'
        out.save(p)
        print('repainted', name, src.size)


if __name__ == '__main__':
    main()
