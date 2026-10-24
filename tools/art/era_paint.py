"""Era factory paint (art session, 2026-10-23; the user approved the ladder): one table, applied the same way to
every plane's in-flight sprite and hangar portrait, so the era shows at a glance. Warm and worn in the past,
cool and shiny in the future:

  1950s rust red on faded cream (worn) -> 1970s burnt orange on off-white -> 1990s golden amber on white ->
  2010s fresh green on bright white -> 2030s teal-cyan on pearl -> far future iridescent (cyan -> violet ->
  magenta along the plane) on chrome.

Only three kinds of pixel change: the white body, the livery accent (saturated blues in the source art) and
the grey metal. Outlines, windows and cockpit glass are left alone, and so is the alpha: the collision outline
never changes. Deterministic (fixed random seed for the wear).

    python3 tools/art/era_paint.py <era> in.png out.png        era: 1950s 1970s 1990s 2010s 2030s future

Careful with upgrade colours: the ladder uses the whole hue range, so an upgrade that recolours a part must
not borrow another era's accent (see research/PLANE-ERAS-1-3.md, Looks).
"""
import colorsys
import random
import sys

from PIL import Image

#        body white        accent hue (None = iridescent), sat   metal (hue, sat)   wear share
ERAS = {
    '1950s':  ((232, 222, 196), 0.02, 0.74, (0.07, 0.12), 0.07),
    '1970s':  ((240, 234, 220), 0.075, 0.85, (0.07, 0.08), 0.03),
    '1990s':  ((248, 247, 242), 0.12, 0.85, (0.10, 0.05), 0.0),
    '2010s':  ((252, 252, 252), 0.33, 0.70, (0.30, 0.04), 0.0),
    '2030s':  ((240, 248, 255), 0.50, 0.85, (0.52, 0.08), 0.0),
    'future': ((206, 214, 226), None, 0.85, (0.60, 0.14), 0.0),
}


def _hsv(c):
    return colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)


def _rgb(h, s, v):
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return round(r * 255), round(g * 255), round(b * 255)


def glass_mask(im):
    """Windows and cockpit glass: pale blue-greys, AND dark navy/teal panes enclosed by the white body (the
    accent blues are larger bands touching the outline, the panes are small islands)."""
    w, h = im.size
    px = im.load()
    glass = set()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a:
                continue
            hh, s, v = _hsv((r, g, b))
            if 0.5 < hh < 0.7 and 0.12 <= s <= 0.45 and v > 0.6:
                glass.add((x, y))
    # small dark-blue islands (window panes): flood-fill blue regions and keep the small ones
    seen = set()
    for y in range(h):
        for x in range(w):
            if (x, y) in seen or not px[x, y][3]:
                continue
            hh, s, v = _hsv(px[x, y][:3])
            if not (0.5 < hh < 0.75 and s > 0.35):
                continue
            region, stack = [], [(x, y)]
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop()
                region.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and px[nx, ny][3]:
                        h2, s2, v2 = _hsv(px[nx, ny][:3])
                        if 0.5 < h2 < 0.75 and s2 > 0.35:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
            if len(region) <= max(6, (w * h) // 600):   # window-sized (scales: ~6 px in a sprite, ~117 in a portrait)
                glass.update(region)
    return glass


def paint(src, era):
    body, hue, sat, metal, wear = ERAS[era]
    im = src.convert('RGBA').copy()
    px = im.load()
    W, H = im.size
    glass = glass_mask(im)
    rnd = random.Random(7)
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if not a or (x, y) in glass:
                continue
            h, s, v = _hsv((r, g, b))
            if v < 0.2:
                continue                                       # outlines
            if s < 0.12 and v > 0.82:                          # white body
                k = v / 0.97
                c = tuple(min(255, round(ch * k)) for ch in body)
                if era == 'future' and (x + 2 * y) % 9 == 0:
                    c = (244, 248, 255)                        # chrome glints
            elif s > 0.45 and 0.5 < h < 0.75:                  # livery accent
                hh = hue if hue is not None else (0.50 + 0.40 * x / W) % 1.0
                vv = min(1.0, v * (1.15 if hue is None else 1.0))
                c = _rgb(hh, min(1, sat * (s / 0.8)), vv)
            elif s < 0.2:                                      # grey metal
                c = _rgb(metal[0], metal[1], v)
            else:
                continue
            if wear and rnd.random() < wear:
                c = tuple(max(0, round(ch * 0.86)) for ch in c)
            px[x, y] = c + (255,)
    return im


if __name__ == '__main__':
    era, src, dst = sys.argv[1:4]
    paint(Image.open(src), era).save(dst)
    print(era, '->', dst)
