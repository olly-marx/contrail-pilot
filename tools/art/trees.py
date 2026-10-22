"""Trees drawn with shapes.py (like the animals): one description, any size, 3 growth stages.

Units are the old tree grid's pixels (a grown oak is about 12 x 15 units). rasterise() paints them
at TREE_SMALL px per unit in flight (outlined) and TREE_PORTRAIT for the big collection picture.
Every crown is a cluster of ellipse "clumps": each clump shades itself from the upper left, which
is what makes a crown read as leafy rather than as one flat blob.

    tree_parts(art, stage) -> parts, palette       art = species.py TREES[i]['art'] (or WOODLAND[id])
"""
import math
import random

from shapes import Ellipse, Capsule, Poly, Masked, rasterise

TREE_SMALL = 2          # in flight and in the Wild Area field (1x there)
TREE_PORTRAIT = 5       # collection portrait

# The 5 woodland trees (were hand-drawn in make_sprites.py), as dials.
WOODLAND = {
    'spruce': dict(shape='cone', leaf='#2e7d32', lit='#4f9a52', dark='#1f5e25', trunk='#6e4424', h=(10, 16)),
    'birch': dict(shape='birch', leaf='#9ccc65', lit='#c9e58f', dark='#6f9f3d', trunk='#f2f2ee', bark='#3a3a3a'),
    'oak': dict(shape='oak', leaf='#4caf50', lit='#7cc77f', dark='#2f8034', trunk='#7a4a24'),
    'rowan': dict(shape='round', leaf='#43a047', lit='#6cbf6f', dark='#2c7a31', trunk='#80532d', fruit='#ff5722'),
    'orchard': dict(shape='round', leaf='#66bb6a', lit='#93d394', dark='#3f8f44', trunk='#8a5a30', fruit='#e53935', wide=True),
}


def _clumps(rng, cx, cy, rx, ry, n, size, role='leaf'):
    """n leafy clumps scattered inside an ellipse (cx, cy, rx, ry), biggest in the middle."""
    out = [Ellipse(cx, cy, rx * 0.8, ry * 0.8, role)]
    for k in range(n):
        a = 2 * math.pi * (k + rng.random() * 0.5) / n
        d = 0.55 + 0.3 * rng.random()
        out.append(Ellipse(cx + math.cos(a) * rx * d, cy + math.sin(a) * ry * d,
                           size * (0.8 + 0.4 * rng.random()), size * (0.7 + 0.3 * rng.random()), role))
    out.sort(key=lambda e: e.cy)                   # lower clumps drawn last, in front
    return out


def tree_parts(a, stage, seed=0):
    rng = random.Random(seed * 7 + stage)
    shape = a['shape']
    pal = {'leaf': a['leaf'], 'lit': a.get('lit', a['leaf']), 'dark': a.get('dark', a['leaf']),
           'trunk': a.get('trunk', '#7a4a24'), 'bark': a.get('bark', '#3a3a3a'),
           'fruit': a.get('fruit', a.get('flower', '#ffffff')), 'flower': a.get('flower', '#ffffff'),
           'snow': '#f4f8ff', 'ground': '#6a4a2a'}
    pal['fruit!flat'] = pal['flower!flat'] = pal['bark!flat'] = True
    pal['leaf!tones'] = (pal['lit'], pal['dark'])     # the species' own light and shadow greens
    P = []
    if stage == 0:                                  # seedling: a stem and a pair of leaves
        if shape in ('grass', 'moss', 'scrub'):
            for dx, h in ((-0.9, 2.2), (0, 3.0), (0.9, 2.4)):
                P.append(Capsule(dx * 0.6, 3.6, dx * 1.2, 3.6 - h, 0.35, 0.12, 'leaf'))
        elif shape == 'cone':
            P += [Capsule(0, 4.5, 0, 3.5, 0.25, 0.25, 'trunk'), Poly([(-1.4, 3.6), (0, 0.6), (1.4, 3.6)], 'leaf')]
        elif shape in ('palm', 'bamboo'):
            P += [Capsule(0, 4.5, 0.2, 2.0, 0.3, 0.25, 'leaf'), Capsule(0.2, 2.0, -1.4, 1.2, 0.35, 0.12, 'leaf'),
                  Capsule(0.2, 2.0, 1.6, 1.0, 0.35, 0.12, 'leaf')]
        else:
            P += [Capsule(0, 4.5, 0, 2.0, 0.25, 0.22, 'trunk'), Ellipse(-0.9, 1.7, 0.9, 0.5, 'leaf', rot=-0.5),
                  Ellipse(0.9, 1.5, 0.9, 0.5, 'leaf', rot=0.5), Ellipse(0, 0.9, 0.4, 0.6, 'lit')]
        return P, pal
    big = stage == 2
    W = a.get('w', (8, 12))[stage - 1]
    H = a.get('h', (10, 15))[stage - 1]
    g = H                                           # ground line (feet of the trunk)
    tw = 0.7 if big else 0.45                       # trunk half-width

    if shape in ('round', 'oak', 'birch', 'blossom'):
        crown_h = H * (0.72 if shape != 'birch' else 0.8)
        cy, rx, ry = crown_h / 2, W / 2 * (1.1 if a.get('wide') else 1), crown_h / 2
        P.append(Capsule(0, g, 0, cy, tw * (1.2 if shape == 'oak' else 1), tw * 0.7, 'trunk'))
        if big:                                     # two limbs into the crown
            P += [Capsule(0, cy + ry * 0.5, -rx * 0.45, cy, tw * 0.6, 0.25, 'trunk'), Capsule(0, cy + ry * 0.3, rx * 0.4, cy - ry * 0.2, tw * 0.6, 0.25, 'trunk')]
        if shape == 'birch':
            trunk = P[0]
            P.append(Masked(trunk, lambda x, y: int(y * 1.3) % 3 == 0 and (x < 0.1 or int(y) % 2), 'bark'))
            ry *= 0.85; rx *= 0.8
        n = 7 if big else 5
        if shape == 'oak':
            rx *= 1.12; n += 2
        crown = _clumps(rng, 0, cy, rx * 0.75, ry * 0.75, n, (2.6 if big else 1.9) * (1.1 if shape == 'oak' else 1))
        P += crown
        if shape == 'blossom' or 'fruit' in a:
            dots = [(rng.uniform(-rx, rx) * 0.8, rng.uniform(cy - ry, cy + ry) * 0.95) for _ in range(14 if big else 7)]
            if shape == 'blossom':
                dots += [(rng.uniform(-rx, rx) * 0.8, rng.uniform(cy - ry, cy + ry) * 0.95) for _ in range(10 if big else 4)]
            r2 = 0.16 if shape != 'blossom' else 0.12
            role = 'flower' if shape == 'blossom' else 'fruit'
            for e in crown:
                P.append(Masked(e, lambda x, y, d=dots: any((x - p) ** 2 + (y - q) ** 2 < r2 for p, q in d), role))
    elif shape == 'cone':                           # fir / spruce: stacked drooping tiers
        P.append(Capsule(0, g, 0, g - 2.5, tw, tw, 'trunk'))
        tiers = 4 if big else 3
        top, bot = 0.0, g - 1.6
        for k in range(tiers):
            y0 = top + (bot - top) * k / tiers - 0.4 * k
            y1 = top + (bot - top) * (k + 1) / tiers + 0.6
            hw = W / 2 * (k + 1.4) / (tiers + 0.4)
            pts = [(0, y0), (hw * 0.55, y1 - 1.2), (hw, y1), (hw * 0.4, y1 - 0.5), (0, y1 - 0.2), (-hw * 0.4, y1 - 0.5), (-hw, y1), (-hw * 0.55, y1 - 1.2)]
            tier = Poly(pts, 'leaf')
            P.append(tier)
            if a.get('snow'):
                P.append(Masked(tier, lambda x, y, y1=y1, hw=hw: y < y1 - 0.9 and x < -hw * 0.3 and (y - y1 + 1.4) > -abs(x) * 0.6, 'snow'))
    elif shape == 'cypress':                        # tall narrow green flame
        P.append(Capsule(0, g, 0, g - 1.5, tw, tw, 'trunk'))
        hw = W / 2
        P.append(Ellipse(0, (g - 1) / 2 + 0.3, hw, (g - 1) / 2 + 0.3, 'leaf'))
        for k in range(4 if big else 3):
            yy = (g - 1) * (0.25 + 0.2 * k)
            P.append(Ellipse(-hw * 0.25 + 0.5 * hw * (k % 2), yy, hw * 0.7, (g - 1) * 0.16, 'leaf'))
        P.append(Poly([(-hw * 0.4, 1.5), (0, -1.0), (hw * 0.4, 1.5)], 'leaf'))
    elif shape == 'umbrella':                       # umbrella pine / acacia: wide flat top on a forked trunk
        top = H * 0.38
        P += [Capsule(0, g, 0, g * 0.6, tw, tw * 0.8, 'trunk'), Capsule(0, g * 0.62, -W * 0.28, top, tw * 0.8, 0.3, 'trunk'),
              Capsule(0, g * 0.62, W * 0.25, top + 0.2, tw * 0.8, 0.3, 'trunk')]
        for k in range(5 if big else 4):
            fx = -W / 2 + W * (k + 0.5) / (5 if big else 4)
            P.append(Ellipse(fx, top - 0.6 - (0.5 if k % 2 else 0), W / (4.2 if big else 3.6), top * 0.45, 'leaf'))
        P.append(Ellipse(0, top - 1.3, W * 0.32, top * 0.4, 'leaf'))
    elif shape == 'palm':                           # date palm: curved bare trunk, drooping fronds
        lean = 1.2 if big else 0.7
        segs = 6
        pts = [(lean * math.sin(math.pi * k / segs / 2), g - g * 0.82 * k / segs) for k in range(segs + 1)]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            P.append(Capsule(x0, y0, x1, y1, tw * 0.9, tw * 0.8, 'trunk'))
        tx, ty = pts[-1]
        fr = W / 2 + 0.5
        for d in (-1, 1):                           # fronds arch out from the crown, then droop
            for reach, sag in ((1.0, 2.2), (0.8, 0.6), (0.55, -0.6)):
                mx, my = tx + d * fr * reach * 0.5, ty - 1.2 - (0.6 if sag < 0 else 0)
                P += [Capsule(tx, ty, mx, my, 0.55, 0.45, 'leaf'), Capsule(mx, my, tx + d * fr * reach, ty + sag, 0.45, 0.12, 'leaf')]
        P.append(Capsule(tx, ty, tx + 0.3, ty - 2.6, 0.5, 0.15, 'leaf'))
        if a.get('dates') and big:
            P += [Ellipse(tx - 0.6, ty + 1.0, 0.6, 0.7, 'fruit'), Ellipse(tx + 0.7, ty + 1.1, 0.55, 0.65, 'fruit')]
            pal['fruit'] = '#c07a2a'; pal.pop('fruit!flat')
    elif shape == 'banyan':                         # huge spreading crown, roots hanging to the ground
        crown = _clumps(rng, 0, H * 0.32, W * 0.55, H * 0.24, 8 if big else 6, 2.4 if big else 1.8)
        P.append(Capsule(0, g, 0, H * 0.4, tw * 1.3, tw, 'trunk'))
        for k in (-0.75, -0.45, 0.4, 0.7) if big else (-0.6, 0.55):
            P.append(Capsule(W * k * 0.6, H * 0.45, W * k * 0.6 + 0.1, g, 0.22, 0.25, 'trunk'))
        P += crown
    elif shape == 'bamboo':                         # a clump of jointed canes with leaf sprays
        canes = (-1.6, 0, 1.4) if big else (-0.8, 0.8)
        for k, x in enumerate(canes):
            top = H * (0.1 + 0.12 * (k % 2))
            P.append(Capsule(x, g, x + 0.3 * (k - 1), top, 0.4, 0.35, 'lit'))
            cane = P[-1]
            P.append(Masked(cane, lambda xx, yy: int(yy * 0.75) % 3 == 0 and abs(yy * 0.75 - round(yy * 0.75)) < 0.18, 'dark'))
            for j in range(3 if big else 2):
                yy = top + 1.5 + j * 3.0
                d = -1 if (j + k) % 2 else 1
                P.append(Capsule(x, yy, x + d * 2.4, yy - 0.8, 0.45, 0.1, 'leaf'))
    elif shape == 'grass':                          # prairie grass: thin arching blades and seed heads
        n = 9 if big else 6
        for k in range(n):
            t = (k + 0.5) / n - 0.5
            mx, my = t * W * 0.6, g - H * 0.4
            tx, ty = t * W * 1.4, H * (0.05 + 0.3 * abs(t) + 0.1 * (k % 2))
            role = ('leaf', 'dark', 'lit')[k % 3]
            P += [Capsule(t * 1.2, g, mx, my, 0.3, 0.22, role), Capsule(mx, my, tx, ty, 0.22, 0.08, role)]
            if k % 3 == 1:
                P.append(Ellipse(tx, ty - 0.3, 0.3, 0.9, 'trunk'))
        pal['trunk'] = '#a06a40'
    elif shape == 'moss':                           # cushions of moss with tiny flowers
        m = 1.3 if big else 1.0
        mounds = [(-W * 0.3, 1.9 * m), (W * 0.25, 1.7 * m), (0, 2.5 * m)] if big else [(-W * 0.2, 1.6), (W * 0.2, 1.8), (0, 2.1)]
        for x, r in mounds:
            P.append(Ellipse(x, g - r, r * 1.3, r, 'leaf'))
        dots = [(rng.uniform(-W / 2, W / 2) * 0.7, g - rng.uniform(0.6, 3.2)) for _ in range(8 if big else 4)]
        for e in list(P):
            P.append(Masked(e, lambda x, y, d=dots: any((x - p) ** 2 + (y - q) ** 2 < 0.07 for p, q in d), 'flower'))
    elif shape == 'scrub':                          # dwarf birch: low twiggy bush
        hh = max(H, 6 if big else 5)
        for x in (-W * 0.25, W * 0.2):
            P.append(Capsule(x * 0.3, g, x, g - hh * 0.5, 0.25, 0.15, 'trunk'))
        P += _clumps(rng, 0, g - hh * 0.55, W * 0.45, hh * 0.32, 6 if big else 4, 1.7 if big else 1.3)
    else:
        raise ValueError(shape)
    return P, pal


def render_tree(a, stage, scale=TREE_SMALL, seed=0):
    parts, pal = tree_parts(a, stage, seed)
    # leaf clumps get the three leaf tones: lit/leaf/dark from the shared light model
    return rasterise(parts, pal, scale, outline=True)
