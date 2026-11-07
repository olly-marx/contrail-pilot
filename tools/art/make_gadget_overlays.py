"""Hangar gadget overlays for the 787, the truss-braced wing and the hydrogen blended wing (2026-11): the SAME device pictures the twin uses
(assets/ui/upgrades/gadget-twin-*.png: magnet disc, cargo pod, landing gear, nose sensor, radome) cut out and placed on each plane's own geometry.
Run: python3 tools/art/make_gadget_overlays.py -> assets/ui/upgrades/gadget-{787,truss,hydrogen}-{magnet,hold,gear,sensor,auto}.png
POS[plane][gadget] = (x, y) of the cut-out's top-left corner on the 400x176 portrait."""
from PIL import Image
import os, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
UP = os.path.join(ROOT, 'assets/ui/upgrades')
POS = {
    '787':      {'magnet': (54, 34), 'hold': (96, 126), 'gear': (170, 134), 'sensor': (345, 96), 'auto': (222, 66)},
    'truss':    {'magnet': (54, 34), 'hold': (56, 120), 'gear': (110, 124), 'sensor': (345, 96), 'auto': (175, 66)},
    'hydrogen': {'magnet': (14, 48), 'hold': (180, 104), 'gear': (240, 110), 'sensor': (350, 84), 'auto': (215, 52)},
}
SRC = {g: Image.open(os.path.join(UP, f'gadget-twin-{g}.png')).convert('RGBA') for g in ('magnet', 'hold', 'gear', 'sensor', 'auto')}
def keep_largest(im):
    px = im.load(); W, H = im.size; seen = set(); best = []
    for y in range(H):
        for x in range(W):
            if px[x, y][3] and (x, y) not in seen:
                comp, q = [], [(x, y)]; seen.add((x, y))
                while q:
                    cx, cy = q.pop(); comp.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < W and 0 <= ny < H and px[nx, ny][3] and (nx, ny) not in seen: seen.add((nx, ny)); q.append((nx, ny))
                if len(comp) > len(best): best = comp
    keep = set(best)
    for y in range(H):
        for x in range(W):
            if (x, y) not in keep: px[x, y] = (0, 0, 0, 0)
def keep_disc(im):   # the twin's magnet overlay is a 26 px disc plus debris round it (livery flecks, spark scraps): keep only the disc
    bb = im.getbbox(); cx, cy, rad = bb[0] + 21.0, bb[1] + 22.0, 13.7; px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2) ** 0.5 > rad: px[x, y] = (0, 0, 0, 0)
def make(plane, gadget):
    s = SRC[gadget].copy(); px = s.load()
    for yy in range(s.height):   # the twin's gold sparkles / flecks (its livery colour) are not part of the device
        for xx in range(s.width):
            r, g, b, a = px[xx, yy]
            if a and r > g + 12 and g > b + 8 and r > 55: px[xx, yy] = (0, 0, 0, 0)
    if gadget == 'magnet': keep_disc(s)
    if gadget == 'sensor': keep_largest(s)   # drop the twin overlay's stray sparkle pixels: keep the device itself
    bb = s.getbbox(); piece = s.crop(bb); out = Image.new('RGBA', s.size, (0, 0, 0, 0))
    x, y = POS[plane][gadget]; out.alpha_composite(piece, (x, y)); return out
if __name__ == '__main__':
    only = sys.argv[1:] or POS
    for plane in only:
        for g in POS[plane]:
            make(plane, g).save(os.path.join(UP, f'gadget-{plane}-{g}.png'))
        print(plane, 'done')
