"""The LAP LIVERY (L2 of research/CROSSING-REWARD-PLAN.md section 8): a cosmetic part for the pilot who has flown the lap, one per plane: a small pixel GLOBE on the tail fin and a thin GOLD STRIPE just behind the nose.
12 pictures: for each of the 6 planes the flight sprite (62x27) and the hangar portrait (400x176). Free and deterministic: nothing is generated, nothing is bought.

Each output is the WHOLE plane picture with only the livery pixels changed (src/planelook.js composeOnto diffs a part against the base, so a part must be the base with a few pixels painted, never a transparent
layer: the hangar's 'composing keeps >= 95 percent opaque pixels' check proves it). Livery pixels are painted ONLY onto pixels the base already draws (alpha is never changed).

Run: python3 tools/art/make_livery.py [--out DIR] [--install]
  default: writes the 12 pictures, two contact sheets (base | livery, nearest-neighbour enlarged: the thing to LOOK at) and provenance.json to ~/shots-art/livery/ (NOT into the repo);
  --install: also copies the 12 pictures to assets/upgrades/plane-<art>-livery.png and assets/ui/upgrades/hangar-<art>-livery.png (a later, separate step).
The anchors are DECLARED in tools/art/livery-anchors.tsv (nothing is searched for; the old automatic search only prints a suggestion).
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


def fit_globe(body, g, x_lo, x_hi, y_lo, y_hi):
    """The highest row (then the middle of the fitting columns) where EVERY pixel of the globe lies on a drawn pixel of the plane; None if it fits nowhere."""
    for cy in range(y_lo, y_hi):
        xs = [cx for cx in range(x_lo, x_hi + 1) if all((cx + dx, cy + dy) in body for (dx, dy) in g)]
        if xs:
            return xs[len(xs) // 2], cy
    return None


def anchors(base, kind, art):
    """Where the livery goes, found from the base picture (the plane faces RIGHT): the body's box, a globe position where the WHOLE globe lies on the tail end, the nose of the FUSELAGE (not a wing tip that reaches further)."""
    px = drawn(base)
    body = main_body(px)
    xs, ys = [p[0] for p in body], [p[1] for p in body]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    w, h = x1 - x0 + 1, y1 - y0 + 1
    mid = int(round((y0 + y1) / 2.0))
    rear_to = int(x0 + REAR.get(art, 0.30) * w)
    found, how = None, 'fin'
    for r in ((1,) if kind == 'sprite' else (7, 6, 5, 4)):   # the biggest globe that fits inside the tail end
        g = globe_sprite() if kind == 'sprite' else globe_portrait(r)
        found = fit_globe(body, g, x0 + r, rear_to, y0 + r, mid)
        if found:
            how = f'fin r={r}'
            break
    if not found:   # fits nowhere: the middle of the widest tail-end row above the centre line (some pixels will fall outside: the script reports it)
        best = max(range(y0, mid), key=lambda y: len([1 for (x, yy) in body if yy == y and x <= rear_to]))
        row = [x for (x, yy) in body if yy == best and x <= rear_to]
        found, how = ((min(row) + max(row)) // 2, best + 2), 'NO FIT: widest tail-end row'
        g = globe_sprite() if kind == 'sprite' else globe_portrait(7)
    # the FUSELAGE: at 80 percent of the length (clear of the tail, the engines on top and the strut) the longest vertical run of drawn pixels is the fuselage's cross-section: its middle row and thickness
    xm = int(x0 + 0.8 * w)
    col = sorted(y for (x, y) in body if x == xm)
    runs, cur = [], [col[0]] if col else []
    for y in col[1:]:
        if y == cur[-1] + 1:
            cur.append(y)
        else:
            runs.append(cur); cur = [y]
    if cur:
        runs.append(cur)
    fus = max(runs, key=len) if runs else [mid]
    fmid, hf = (fus[0] + fus[-1]) // 2, len(fus)
    # the nose: the farthest drawn pixel within the fuselage's own rows (a wing tip above or below does not count)
    nose = max(x for (x, y) in body if abs(y - fmid) <= 0.3 * hf)
    return {'body': (x0, y0, x1, y1), 'mid': mid, 'fmid': fmid, 'hf': hf, 'globe_centre': found, 'globe': g, 'nose_x': nose, 'how': how}


def fuselage_rows(px, x, mid, hf):
    """The rows of the contiguous drawn run through (x, mid), limited to 30 percent of the height each side: the fuselage's cross-section (an engine or a wing under it is another part of the run)."""
    if (x, mid) not in px:
        return []
    top = bot = mid
    lim = int(0.6 * hf)
    while (x, top - 1) in px and mid - top < lim:
        top -= 1
    while (x, bot + 1) in px and bot - mid < lim:
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


def load_anchors(path=None):
    """The DECLARED anchors (tools/art/livery-anchors.tsv): {(art, kind): dict}. Nothing is searched for: a missing row is an error."""
    path = path or os.path.join(HERE, 'livery-anchors.tsv')
    table = {}
    for line in open(path):
        if not line.strip() or line.startswith('#'):
            continue
        art, kind, gx, gy, gr, sx0, sx1, sy0, sy1 = line.rstrip('\n').split('\t')
        table[(art, kind)] = dict(gx=int(gx), gy=int(gy), gr=int(gr), sx0=int(sx0), sx1=int(sx1), sy0=int(sy0), sy1=int(sy1))
    return table


def make(base, kind, art, decl):
    """Paint the livery at the DECLARED anchors. Returns (picture, info, problems): every check that can fail is listed in problems, none is repaired by searching."""
    px = drawn(base)
    body = main_body(px)
    problems = []
    g = globe_sprite() if kind == 'sprite' else globe_portrait(decl['gr'])
    if kind == 'sprite' and decl['gr'] != 1:
        problems.append(f'{art} {kind}: a sprite globe is the fixed 3x3 glyph (gr must be 1, got {decl["gr"]})')
    if kind == 'portrait' and not 4 <= decl['gr'] <= 7:
        problems.append(f'{art} {kind}: globe radius {decl["gr"]} is outside 4..7')
    cx, cy = decl['gx'], decl['gy']
    globe = [((cx + dx, cy + dy), c) for (dx, dy), c in g.items()]
    globe_outside = sum(1 for (p, _) in globe if p not in body)
    cells = [(x, y) for x in range(decl['sx0'], decl['sx1'] + 1) for y in range(decl['sy0'], decl['sy1'] + 1)]
    stripe_off = [c for c in cells if c not in body]   # a declared stripe cell that is not a drawn pixel of the plane: the anchor is off the fuselage
    if stripe_off:
        problems.append(f'{art} {kind}: {len(stripe_off)} of {len(cells)} declared stripe cells are not on the plane (first {stripe_off[0]})')
    lim = 60 if kind == 'sprite' else 90
    stripe = [(c, GOLD) for c in cells if c in body and luminance(base.getpixel(c)) >= lim]   # the dark outline and the windows stay
    spots, cols = [p for p, _ in globe + stripe], [c for _, c in globe + stripe]
    n_globe = len(globe)
    out, painted, skipped = paint(base, spots, cols, px)
    diff = [(x, y) for y in range(base.size[1]) for x in range(base.size[0]) if out.getpixel((x, y)) != base.getpixel((x, y))]
    stripe_changed = sum(1 for (x, y) in spots[n_globe:] if (x, y) in px and out.getpixel((x, y))[:3] != base.getpixel((x, y))[:3])
    if cells and stripe_changed * 2 < len(cells):
        problems.append(f'{art} {kind}: only {stripe_changed} of {len(cells)} declared stripe cells took the gold (the stripe is mostly outline or window)')
    bbox = (min(p[0] for p in diff), min(p[1] for p in diff), max(p[0] for p in diff), max(p[1] for p in diff)) if diff else None
    try:   # the automatic search is only a SUGGESTION, printed for comparison; it never changes what is painted
        sug = anchors(base, kind, art)
        suggestion = {'globe_centre': sug['globe_centre'], 'nose_x': sug['nose_x'], 'how': sug['how']}
    except Exception as e:   # a failed suggestion is not a failed picture
        suggestion = {'error': str(e)}
    return out, {'declared': decl, 'globe_centre': (cx, cy), 'glyph_pixels': len(g), 'stripe_cells': len(cells), 'painted': painted, 'skipped_outside_the_plane': skipped,
                 'globe_outside_the_plane': globe_outside, 'stripe_changed': stripe_changed, 'changed_bbox': bbox, 'changed': len(diff), 'suggestion': suggestion}, problems


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
    table = load_anchors()
    prov, bad, sheets = {}, [], {'sprite': [], 'portrait': []}
    for art, (spr, por) in PLANES.items():
        for kind, rel in (('sprite', spr), ('portrait', por)):
            base = Image.open(os.path.join(ROOT, rel)).convert('RGBA')
            want = (62, 27) if kind == 'sprite' else (400, 176)
            if base.size != want:
                bad.append(f'{art} {kind}: base is {base.size}, expected {want}'); continue
            if (art, kind) not in table:
                bad.append(f'{art} {kind}: no declared anchor row in livery-anchors.tsv'); continue
            out, info, probs = make(base, kind, art, table[(art, kind)])
            bad += probs
            name = f'plane-{art}-livery.png' if kind == 'sprite' else f'hangar-{art}-livery.png'
            out.save(os.path.join(args.out, name))
            prov[name] = info
            sheets[kind].append((art, base, out))
            if info['changed'] > BUDGET[kind]:
                bad.append(f'{name}: {info["changed"]} changed pixels, budget {BUDGET[kind]}')
            if info['globe_outside_the_plane']:
                bad.append(f'{name}: {info["globe_outside_the_plane"]} GLOBE pixels lie outside the drawn plane (zero allowed)')
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
        print(f'{name:28s} changed {info["changed"]:4d}/{BUDGET["sprite" if name.startswith("plane") else "portrait"]}  stripe {info["stripe_changed"]:3d}/{info["stripe_cells"]:3d}  globe {info["glyph_pixels"]:3d} px at {info["globe_centre"]} outside {info["globe_outside_the_plane"]}  box {info["changed_bbox"]}  (suggested globe {info["suggestion"].get("globe_centre")}, nose {info["suggestion"].get("nose_x")})')
    if bad:
        print('PROBLEMS:\n - ' + '\n - '.join(bad))
        sys.exit(1)
    print(f'ok: 12 pictures + 2 contact sheets in {args.out}')


if __name__ == '__main__':
    main()
