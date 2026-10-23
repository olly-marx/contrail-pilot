"""Local steps of the plane art recipe (art session, 2026-10-23; recipe: research/PLANE-ART-RECIPE.md).

PixelLab does the drawing (through a headless `claude -p` run with the mcp__pixellab__* tools); this script
does everything around it, the same way for every plane:

    python3 tools/art/plane_art.py upscale4 small.png big.png       # smooth 4x (Scale2x twice): init for the portrait
    python3 tools/art/plane_art.py enlarge  in.png out.png 400 176  # fit and enlarge (Lanczos) onto a WxH canvas
    python3 tools/art/plane_art.py keyout   in.png out.png          # flood-fill the flat background away
    python3 tools/art/plane_art.py pad      sprite.png out.png 64 28  # centre a sprite on a WxH canvas (PixelLab
                                                                   #   needs sides that are multiples of 4)
    python3 tools/art/plane_art.py sheet    out.png a.png b.png ... # side-by-side comparison at 6x zoom

Never shrink a portrait to make the in-flight sprite: averaging makes blur, which the user rejected. The
in-flight sprite is drawn natively at 64x28 (see the recipe).
"""
import sys
from collections import deque

from PIL import Image


def scale2x(im):
    """Scale2x / EPX: doubles a pixel-art image, rounding staircases into curves with no new colours."""
    w, h = im.size
    s = im.load()
    out = Image.new('RGBA', (w * 2, h * 2))
    o = out.load()

    def g(x, y):
        return s[min(max(x, 0), w - 1), min(max(y, 0), h - 1)]
    for y in range(h):
        for x in range(w):
            P, A, B, C, D = g(x, y), g(x, y - 1), g(x + 1, y), g(x - 1, y), g(x, y + 1)
            o[2 * x, 2 * y] = C if (C == A and C != D and A != B) else P
            o[2 * x + 1, 2 * y] = A if (A == B and A != C and B != D) else P
            o[2 * x, 2 * y + 1] = D if (D == C and D != B and C != A) else P
            o[2 * x + 1, 2 * y + 1] = B if (B == D and B != A and D != C) else P
    return out


def enlarge(im, w, h, margin=4):
    im = im.convert('RGBA')
    im = im.crop(im.getbbox())
    s = min((w - 2 * margin) / im.width, (h - 2 * margin) / im.height)
    big = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(big, ((w - big.width) // 2, (h - big.height) // 2))
    return out


def keyout(im, tol=18):
    """PixelLab ignores 'no background' on big canvases and paints flat grey: remove it from the corners in."""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    ref = px[0, 0]
    seen, q = set(), deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
    while q:
        x, y = q.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        c = px[x, y]
        if c[3] == 0 or all(abs(c[i] - ref[i]) <= tol for i in range(3)):
            px[x, y] = (0, 0, 0, 0)
            q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def pad(im, w, h):
    im = im.convert('RGBA')
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(im, ((w - im.width) // 2, (h - im.height) // 2))
    return out


def sheet(paths, zoom=6, bg=(110, 198, 232, 255), gap=10):
    ims = [Image.open(p).convert('RGBA') for p in paths]
    z = [max(1, round(zoom * 64 / max(64, i.width))) for i in ims]   # big portraits get less zoom
    W = sum(i.width * k for i, k in zip(ims, z)) + gap * (len(ims) + 1)
    H = max(i.height * k for i, k in zip(ims, z)) + 2 * gap
    out = Image.new('RGBA', (W, H), bg)
    x = gap
    for i, k in zip(ims, z):
        out.alpha_composite(i.resize((i.width * k, i.height * k), Image.NEAREST), (x, gap))
        x += i.width * k + gap
    return out


if __name__ == '__main__':
    cmd, a = sys.argv[1], sys.argv[2:]
    if cmd == 'upscale4':
        scale2x(scale2x(Image.open(a[0]).convert('RGBA'))).save(a[1])
    elif cmd == 'enlarge':
        enlarge(Image.open(a[0]), int(a[2]), int(a[3])).save(a[1])
    elif cmd == 'keyout':
        keyout(Image.open(a[0])).save(a[1])
    elif cmd == 'pad':
        pad(Image.open(a[0]), int(a[2]), int(a[3])).save(a[1])
    elif cmd == 'sheet':
        sheet(a[1:]).save(a[0])
    else:
        sys.exit(__doc__)
    print(cmd, 'done')
