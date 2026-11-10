"""The LAP LIVERY (L2 of research/CROSSING-REWARD-PLAN.md section 8): a cosmetic part for the pilot who has flown the lap, one per plane: a small pixel GLOBE on the tail fin and a thin GOLD STRIPE just behind the nose.
12 pictures: for each of the 6 planes the flight sprite (62x27) and the hangar portrait (400x176). Free and deterministic: nothing is generated, nothing is bought.

Each output is the WHOLE plane picture with only the livery pixels changed (src/planelook.js composeOnto diffs a part against the base, so a part must be the base with a few pixels painted, never a transparent
layer: the hangar's 'composing keeps >= 95 percent opaque pixels' check proves it). Livery pixels are painted ONLY onto pixels the base already draws (alpha is never changed).

Run: python3 tools/art/make_livery.py [--out DIR] [--install]
  default: writes the 12 pictures, two contact sheets (base | livery, nearest-neighbour enlarged: the thing to LOOK at) and provenance.json to ~/shots-art/livery/ (NOT into the repo);
  --install: also copies the 12 pictures to assets/upgrades/plane-<art>-livery.png and assets/ui/upgrades/hangar-<art>-livery.png (a later, separate step).
Exit status 1 if any picture breaks its budget (14 changed pixels on a sprite, 500 on a portrait) or paints outside the base's drawn pixels.
"""
import argparse
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
# art id (fleet.js LOOKS[...].art) -> (flight sprite, hangar portrait)
PLANES = {
    'comet': ('assets/plane-comet.png', 'assets/ui/plane-hangar-comet.png'),
    '747': ('assets/plane-747.png', 'assets/ui/plane-hangar-jumbo.png'),
    'twin': ('assets/plane-twin.png', 'assets/ui/plane-hangar-twin.png'),
    '787': ('assets/plane-787.png', 'assets/ui/plane-hangar-787.png'),
    'truss': ('assets/plane-truss.png', 'assets/ui/plane-hangar-truss.png'),
    'hydrogen': ('assets/plane-hydrogen.png', 'assets/ui/plane-hangar-hydrogen.png'),
}
BUDGET = {'sprite': 14, 'portrait': 500}
REAR = {'hydrogen': 0.16}   # the share of the width that counts as 'the tail end' (default 0.30; the blended wing's engines sit further back than a fin would)
GOLD = (255, 208, 64, 255)
OCEAN, OCEAN_DARK, OCEAN_LIGHT, LAND = (40, 110, 200, 255), (24, 64, 140, 255), (160, 214, 244, 255), (60, 200, 120, 255)


def drawn(im):
    """The mask of pixels the base draws (alpha >= 128), as a set of (x, y)."""
    a = im.getchannel('A')
    w, h = im.size
    return {(x, y) for y in range(h) for x in range(w) if a.getpixel((x, y)) >= 128}


def main_body(px):
    """The largest 4-connected component of the drawn pixels (a shadow or a stray pixel is not the plane)."""
    seen, best = set(), set()
    for start in px:
        if start in seen:
            continue
        comp, stack = set(), [start]
        while stack:
            p = stack.pop()
            if p in comp or p not in px:
                continue
            comp.add(p)
            x, y = p
            stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        seen |= comp
        if len(comp) > len(best):
            best = comp
    return best


def luminance(c):
    return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]


def globe_sprite():
    """3x3: a blue dot with a green continent. {(dx, dy): colour} around the centre."""
    return {(0, -1): LAND, (-1, 0): OCEAN, (0, 0): LAND, (1, 0): OCEAN, (0, 1): OCEAN}


def globe_portrait(r=7):
    """A circle of radius r: dark rim, ocean, two fixed green continents, a light highlight top-left."""
    g = {}
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            d2 = dx * dx + dy * dy
            if d2 > r * r + 1:
                continue
            if d2 >= (r - 1) * (r - 1):
                c = OCEAN_DARK
            elif ((dx + 2) ** 2) / 9.0 + ((dy + 1) ** 2) / 16.0 < 1 or ((dx - 3) ** 2) / 4.0 + ((dy - 3) ** 2) / 4.0 < 1:
                c = LAND
            elif dx + dy <= -r + 1:
                c = OCEAN_LIGHT
            else:
                c = OCEAN
            g[(dx, dy)] = c
    return g


def anchors(base, kind, art):
    """Where the livery goes, found from the base picture (the plane faces RIGHT): the body's box, the globe's centre inside the tail fin, the nose column of the FUSELAGE (not a wing tip that reaches further)."""
    px = drawn(base)
    body = main_body(px)
    xs, ys = [p[0] for p in body], [p[1] for p in body]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    w, h = x1 - x0 + 1, y1 - y0 + 1
    mid = int(round((y0 + y1) / 2.0))
    r = 1 if kind == 'sprite' else 7
    need = 4 if kind == 'sprite' else 2 * r + 3          # the fin must be this many pixels wide at the globe's top row
    rear_to = x0 + REAR.get(art, 0.30) * w
    cx = cy = None
    for y in range(y0, mid):                              # walk down from the top: the first row where the tail end is wide enough for the globe
        row = [x for (x, yy) in body if yy == y and x <= rear_to]
        if row and max(row) - min(row) + 1 >= need:
            cx, cy = (min(row) + max(row)) // 2, y + r + (1 if kind == 'sprite' else 2)
            break
    how = 'fin'
    if cx is None:                                        # no row wide enough: the widest tail-end row above the centre line
        best = max(range(y0, mid), key=lambda y: len([1 for (x, yy) in body if yy == y and x <= rear_to]))
        row = [x for (x, yy) in body if yy == best and x <= rear_to]
        cx, cy, how = (min(row) + max(row)) // 2, best + r + 1, 'widest tail-end row'
    # the fuselage's nose: scan right from the centre line: the last drawn pixel of the run that contains (x, mid)
    nose = x0
    for x in range(x0, x1 + 1):
        if (x, mid) in body:
            nose = x
    return {'body': (x0, y0, x1, y1), 'mid': mid, 'globe_centre': (cx, cy), 'nose_x': nose, 'how': how}


def fuselage_rows(px, x, mid):
    """The rows of the contiguous drawn run through (x, mid): the fuselage's cross-section at that column (a wing above or below it is a different run)."""
    if (x, mid) not in px:
        return []
    top = bot = mid
    while (x, top - 1) in px:
        top -= 1
    while (x, bot + 1) in px:
        bot += 1
    return list(range(top, bot + 1))


def paint(base, spots, colours, px):
    """Copy of the base with the colours painted ONLY where the base draws (alpha untouched). Returns (picture, painted count, skipped count)."""
    out = base.copy()
    painted = skipped = 0
    for (x, y), c in zip(spots, colours):
        if (x, y) in px:
            out.putpixel((x, y), c[:3] + (base.getpixel((x, y))[3],))
            painted += 1
        else:
            skipped += 1
    return out, painted, skipped


def make(base, kind, art):
    px = drawn(base)
    a = anchors(base, kind, art)
    spots, cols = [], []
    # 1. the globe on the tail fin
    g = globe_sprite() if kind == 'sprite' else globe_portrait()
    r = 1 if kind == 'sprite' else 7
    cx, cy = a['globe_centre']
    for (dx, dy), c in g.items():
        spots.append((cx + dx, cy + dy)); cols.append(c)
    # 2. the gold stripe just behind the nose: a column (sprite: 1 px) or a 6 px band (portrait) of the body's light pixels (the dark outline and the windows stay)
    nx = a['nose_x']
    band = [nx - 3] if kind == 'sprite' else list(range(nx - 34, nx - 28))
    for x in band:
        for y in fuselage_rows(px, x, a['mid']):
            if luminance(base.getpixel((x, y))) >= (60 if kind == 'sprite' else 90):   # the dark outline and the windows stay
                spots.append((x, y)); cols.append(GOLD)
    out, painted, skipped = paint(base, spots, cols, px)
    changed = sum(1 for y in range(base.size[1]) for x in range(base.size[0]) if out.getpixel((x, y)) != base.getpixel((x, y)))
    return out, {'anchors': a, 'globe_centre': (cx, cy), 'glyph_pixels': len(g), 'stripe_columns': band, 'painted': painted, 'skipped_outside_the_plane': skipped, 'changed': changed}


def contact_sheet(rows, scale, path):
    """Each row: the base and the livery side by side on a grey ground, enlarged nearest-neighbour."""
    w, h = rows[0][1].size
    pad = 6
    sheet = Image.new('RGBA', (2 * w * scale + 3 * pad, len(rows) * (h * scale + pad) + pad), (96, 108, 128, 255))  # type: ignore[arg-type]
    for i, (_, base, liv) in enumerate(rows):
        y = pad + i * (h * scale + pad)
        for j, im in enumerate((base, liv)):
            big = im.resize((w * scale, h * scale), Image.NEAREST)
            sheet.alpha_composite(big, (pad + j * (w * scale + pad), y))
    sheet.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.expanduser('~/shots-art/livery'))
    ap.add_argument('--install', action='store_true')
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    prov, bad, sheets = {}, [], {'sprite': [], 'portrait': []}
    for art, (spr, por) in PLANES.items():
        for kind, rel in (('sprite', spr), ('portrait', por)):
            base = Image.open(os.path.join(ROOT, rel)).convert('RGBA')
            want = (62, 27) if kind == 'sprite' else (400, 176)
            if base.size != want:
                bad.append(f'{art} {kind}: base is {base.size}, expected {want}'); continue
            out, info = make(base, kind, art)
            name = f'plane-{art}-livery.png' if kind == 'sprite' else f'hangar-{art}-livery.png'
            out.save(os.path.join(args.out, name))
            prov[name] = info
            sheets[kind].append((art, base, out))
            if info['changed'] > BUDGET[kind]:
                bad.append(f'{name}: {info["changed"]} changed pixels, budget {BUDGET[kind]}')
            if info['skipped_outside_the_plane']:
                bad.append(f'{name}: {info["skipped_outside_the_plane"]} glyph pixels fell outside the drawn plane (anchor wrong: look at the sheet)')
            if info['changed'] == 0:
                bad.append(f'{name}: nothing changed')
            if args.install:
                dest = os.path.join(ROOT, 'assets/upgrades' if kind == 'sprite' else 'assets/ui/upgrades', name)
                out.save(dest)
    contact_sheet(sheets['sprite'], 6, os.path.join(args.out, 'contact-sprites.png'))
    contact_sheet(sheets['portrait'], 2, os.path.join(args.out, 'contact-portraits.png'))
    with open(os.path.join(args.out, 'provenance.json'), 'w') as f:
        json.dump(prov, f, indent=1, default=list)
    for name, info in prov.items():
        print(f'{name:28s} changed {info["changed"]:4d}  glyph {info["glyph_pixels"]:3d}  anchor {info["anchors"]["how"]:14s} globe at {info["globe_centre"]}')
    if bad:
        print('PROBLEMS:\n - ' + '\n - '.join(bad))
        sys.exit(1)
    print(f'ok: 12 pictures + 2 contact sheets in {args.out}')


if __name__ == '__main__':
    main()
