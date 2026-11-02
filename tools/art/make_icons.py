#!/usr/bin/env python3
"""The home-screen icons (assets/icons/icon-192.png, icon-512.png), drawn in code: the loading screen's night sky, its pixel plane and a contrail.
  python3 tools/art/make_icons.py        (run from the repo root; needs Pillow)"""
from PIL import Image
SKY = ['#10142b', '#16204a', '#1d2f66', '#264080', '#3a5a9c', '#5b82b8']
PLANE = ['....wwwwww..', '.rrwwwwwwwww', 'rrrwwbwwwwww', '.rrwwwwwwwwg', '....gggggg..', '....g.......']
COL = {'w': '#f4f4f4', 'r': '#e0463c', 'g': '#8c97a8', 'b': '#ffd34d'}
def draw(n=32):
    im = Image.new('RGB', (n, n))
    px = im.load()
    for y in range(n):
        for x in range(n):
            px[x, y] = tuple(int(SKY[min(5, y * 6 // n)][i:i + 2], 16) for i in (1, 3, 5))
    px_at = lambda x, y, c: px.__setitem__((x, y), tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))) if 0 <= x < n and 0 <= y < n else None
    ox, oy = 17, 13
    for yy, row in enumerate(PLANE):
        for xx, ch in enumerate(row):
            if ch in COL: px_at(ox + xx, oy + yy, COL[ch])
    for i in range(14):   # the contrail: thick near the plane, thinner and drifting down behind it
        x = ox - 1 - i
        for dy in range(3 if i < 6 else 2): px_at(x, oy + 2 + dy + (i // 7), '#ffffff' if i < 8 else '#c9d8ea')
    return im
for size in (192, 512):
    draw().resize((size, size), Image.NEAREST).save(f'assets/icons/icon-{size}.png')
print('wrote assets/icons/icon-192.png, icon-512.png')
