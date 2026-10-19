"""Pixel versions of the partner logos, for the About page and title credit (assets/ui/).

Run from the repo root:  python3 tools/art/make_logos.py
Originals live in tools/art/logos/ (not deployed: the site ships only index/style/src/assets/vendor).
Faithful by construction, not redrawn by eye: each logo is cropped to its content, shrunk with
area averaging, then every pixel is snapped to the logo's own brand colours (or transparent).
A dotted mark is rebuilt dot by dot (dots()), because averaging would smear the dots into a blob.
"""
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
SRC = HERE / 'logos'
OUT = HERE.parents[1] / 'assets' / 'ui'

IMPERIAL_BLUE = (0, 0, 205)
OFF_WHITE = (245, 245, 245)
CZ_ORANGE = (244, 126, 58)
CZ_SQUARE_ORANGE = (253, 103, 26)
CZ_BROWN = (59, 36, 22)


def ink_mask(im, is_ink):
    """Boolean coverage image (L, 0/255) of the logo's ink."""
    rgba = im.convert('RGBA')
    m = Image.new('L', rgba.size, 0)
    src, dst = rgba.load(), m.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            if is_ink(src[x, y]):
                dst[x, y] = 255
    return m


def shrink(mask, size, thresh=128):
    """Area-average the coverage down to `size`, then threshold to hard pixels."""
    small = mask.resize(size, Image.BOX)
    return small.point(lambda v: 255 if v >= thresh else 0)


def paint(mask, ink, bg=None):
    out = Image.new('RGBA', mask.size, bg + (255,) if bg else (0, 0, 0, 0))
    m, o = mask.load(), out.load()
    for y in range(mask.height):
        for x in range(mask.width):
            if m[x, y]:
                o[x, y] = ink + (255,)
    return out


def crop_to(mask, pad=0):
    l, t, r, b = mask.getbbox()
    return (l - pad, t - pad, r + pad, b + pad)


def save(im, name):
    OUT.mkdir(exist_ok=True)
    im.save(OUT / f'{name}.png')
    print('wrote ui/' + name, im.size)


def wordmark(file, ink_test, ink, height, name, thresh=128):
    im = Image.open(SRC / file).convert('RGBA')
    mask = ink_mask(im, ink_test)
    mask = mask.crop(crop_to(mask))
    w = round(mask.width * height / mask.height)
    save(paint(shrink(mask, (w, height), thresh), ink), name)


def square(file, ink_test, ink, bg, size, name, thresh=128):
    """Square badge: keep the original's full square framing (glyph placement included)."""
    im = Image.open(SRC / file).convert('RGBA')
    save(paint(shrink(ink_mask(im, ink_test), (size, size), thresh), ink, bg), name)


def dots(file, name, pad=2):
    """Not called: for logos/dotted-i-unknown.png once we know whose mark it is.
    Rebuild the dotted mark: find each dot, place it at its centre, sized by its area."""
    im = Image.open(SRC / file).convert('RGB')
    px = im.load()
    green = lambda c: c[1] > 150 and c[2] < 200
    seen = set()
    found = []
    for y in range(im.height):
        for x in range(im.width):
            if (x, y) in seen or not green(px[x, y]):
                continue
            stack, pts = [(x, y)], []
            seen.add((x, y))
            while stack:                                   # flood fill one dot
                cx, cy = stack.pop()
                pts.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < im.width and 0 <= ny < im.height and (nx, ny) not in seen and green(px[nx, ny]):
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            if len(pts) > 10:
                mx = sum(p[0] for p in pts) / len(pts)
                my = sum(p[1] for p in pts) / len(pts)
                found.append((mx, my, len(pts)))
    areas = sorted(a for _, _, a in found)
    big_cut = areas[len(areas) // 2] * 2                  # big dots have well over twice the median area
    small = [(x, y) for x, y, a in found if a < big_cut]
    # Scale so neighbouring small dots land 2 px apart: a 1 px dot with a 1 px gap.
    nn = sorted(min(((x - u) ** 2 + (y - v) ** 2) ** 0.5 for u, v in small if (u, v) != (x, y)) for x, y in small)
    scale = 2 / nn[len(nn) // 2]
    x0 = min(x for x, _, _ in found); y0 = min(y for _, y, _ in found)
    col = tuple(sorted((px[int(x), int(y)] for x, y, _ in found), key=lambda c: c[1])[len(found) // 2])
    w = round((max(x for x, _, _ in found) - x0) * scale) + 2 + 2 * pad
    h = round((max(y for _, y, _ in found) - y0) * scale) + 2 + 2 * pad
    out = Image.new('RGBA', (w, h), IMPERIAL_BLUE + (255,))
    o = out.load()
    for x, y, a in found:
        X, Y = pad + round((x - x0) * scale), pad + round((y - y0) * scale)
        cells = [(X, Y)] if a < big_cut else [(X, Y), (X + 1, Y), (X, Y + 1), (X + 1, Y + 1)]
        for cx, cy in cells:
            if 0 <= cx < w and 0 <= cy < h:
                o[cx, cy] = col + (255,)
    print('  dots:', len(found), 'pitch px', round(nn[len(nn) // 2], 1), 'big:', sum(1 for *_, a in found if a >= big_cut), 'green', col)
    save(out, name)



def greyscale_lockup(file, width, name, keep_subtitle):
    """Greyscale logo on white: shrink, then snap to four greys (white -> transparent).
    The original's soft gradient (the AEIS globe) becomes a few clear pixel bands."""
    im = Image.open(SRC / file).convert('RGBA')
    flat = Image.new('RGBA', im.size, (255, 255, 255, 255))
    flat.alpha_composite(im)
    g = flat.convert('L')
    ink = g.point(lambda v: 255 if v < 245 else 0)
    l, t, r, b = ink.getbbox()
    if not keep_subtitle:                 # the subtitle sits below a blank band: cut at the last gap
        rows = [any(ink.getpixel((x, y)) for x in range(l, r)) for y in range(t, b)]
        gaps = [i for i in range(1, len(rows)) if rows[i - 1] and not rows[i]]
        b = t + gaps[-1]
    g = g.crop((l, t, r, b))
    h = round(g.height * width / g.width)
    small = g.resize((width, h), Image.LANCZOS)
    levels = [(70, (0, 0, 0)), (130, (85, 85, 85)), (180, (136, 136, 136)), (225, (187, 187, 187))]
    out = Image.new('RGBA', small.size, (0, 0, 0, 0))
    sp, op = small.load(), out.load()
    for y in range(h):
        for x in range(width):
            for cut, c in levels:
                if sp[x, y] < cut:
                    op[x, y] = c + (255,)
                    break
    save(out, name)


if __name__ == '__main__':
    blue = lambda c: c[3] > 128 and c[2] > 150 and c[0] < 80 and c[1] < 80
    light = lambda c: c[0] > 200 and c[1] > 200 and c[2] > 200
    orange = lambda c: c[3] > 128 and c[0] > 200 and 80 < c[1] < 160 and c[2] < 100
    wordmark('imperial-wordmark.png', blue, IMPERIAL_BLUE, 14, 'logo-imperial')
    square('imperial-i.png', light, OFF_WHITE, IMPERIAL_BLUE, 24, 'logo-imperial-i')
    greyscale_lockup('aeis-official.png', 120, 'logo-aeis', keep_subtitle=False)
    wordmark('citizenzoo-wordmark.png', orange, CZ_ORANGE, 28, 'logo-citizenzoo')
    square('citizenzoo-cz.png', orange, CZ_SQUARE_ORANGE, CZ_BROWN, 32, 'logo-cz')
