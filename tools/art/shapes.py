"""Shape-based creature renderer: one species, any size.

A species (the same dials as creatures.py) is turned into smooth shapes measured in UNITS, where
one unit = one pixel of the original small sprites. rasterise(parts, scale) then paints them at
`scale` pixels per unit with no anti-aliasing (crisp pixel art):

  scale 1.5  in-flight sprite: a little bigger than before, with a dark outline
  scale 4    collection portrait: three shades of light, a real eye with a highlight, patterns

Light comes from the upper left everywhere, as in the rest of the game's art.
Templates done here: quad, flyer. The others still come from creatures.py until converted.
"""
import math

from PIL import Image

from creatures import hexc, shade, INK

# ---------- shapes (all coordinates in units; y grows downwards, feet at y = ground) ----------


class Ellipse:
    def __init__(self, cx, cy, rx, ry, role, rot=0.0):
        self.cx, self.cy, self.rx, self.ry, self.role, self.rot = cx, cy, rx, ry, role, rot

    def inside(self, x, y):
        dx, dy = x - self.cx, y - self.cy
        if self.rot:
            c, s = math.cos(-self.rot), math.sin(-self.rot)
            dx, dy = dx * c - dy * s, dx * s + dy * c
        return (dx / self.rx) ** 2 + (dy / self.ry) ** 2 <= 1

    def light(self, x, y):
        """-1 (shadow side) .. +1 (lit side): where this point sits on the shape's surface."""
        return -0.6 * (x - self.cx) / self.rx - 0.8 * (y - self.cy) / self.ry


class Capsule:
    """A thick line from (x0,y0) to (x1,y1), radius r0 at the start tapering to r1 at the end."""

    def __init__(self, x0, y0, x1, y1, r0, r1, role):
        self.a, self.b, self.r0, self.r1, self.role = (x0, y0), (x1, y1), r0, r1, role

    def _t(self, x, y):
        (ax, ay), (bx, by) = self.a, self.b
        vx, vy = bx - ax, by - ay
        L2 = vx * vx + vy * vy or 1e-9
        t = max(0.0, min(1.0, ((x - ax) * vx + (y - ay) * vy) / L2))
        return t, ax + t * vx, ay + t * vy

    min_r = 0.0                                  # set by rasterise: thin parts stay >= ~1 px at any scale

    def inside(self, x, y):
        t, px, py = self._t(x, y)
        r = max(self.min_r, self.r0 + (self.r1 - self.r0) * t)
        return (x - px) ** 2 + (y - py) ** 2 <= r * r

    def light(self, x, y):
        t, px, py = self._t(x, y)
        r = max(1e-3, self.r0 + (self.r1 - self.r0) * t)
        return -0.6 * (x - px) / r - 0.8 * (y - py) / r


class Poly:
    """Filled polygon (ears, horns' tips, beaks, wings)."""

    def __init__(self, pts, role):
        self.pts, self.role = pts, role
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        self.cx, self.cy = sum(xs) / len(xs), sum(ys) / len(ys)
        self.r = max(max(xs) - min(xs), max(ys) - min(ys)) / 2 or 1

    def inside(self, x, y):
        n, c = len(self.pts), False
        for i in range(n):
            (x1, y1), (x2, y2) = self.pts[i], self.pts[(i + 1) % n]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                c = not c
        return c

    def light(self, x, y):
        return -0.6 * (x - self.cx) / self.r - 0.8 * (y - self.cy) / self.r


class Masked:
    """A pattern (spots, stripes, ...) that only shows where its host shape is."""

    def __init__(self, host, test, role):
        self.host, self.test, self.role = host, test, role

    def inside(self, x, y):
        return self.host.inside(x, y) and self.test(x, y)

    def light(self, x, y):
        return self.host.light(x, y)


# ---------- rasteriser ----------

def rasterise(parts, palette, scale, outline=True, eye=None, highlight=True, pad=1):
    """Paint parts (later ones on top) at `scale` px per unit. palette: role -> base colour.
    Three tones per role from the shape's light value; dark outline round the whole creature."""
    xs, ys = [], []
    for p in parts:
        if isinstance(p, Ellipse):
            xs += [p.cx - p.rx, p.cx + p.rx]; ys += [p.cy - p.ry, p.cy + p.ry]
        elif isinstance(p, Capsule):
            r = max(p.r0, p.r1)
            xs += [p.a[0] - r, p.a[0] + r, p.b[0] - r, p.b[0] + r]; ys += [p.a[1] - r, p.a[1] + r, p.b[1] - r, p.b[1] + r]
        elif isinstance(p, Poly):
            xs += [q[0] for q in p.pts]; ys += [q[1] for q in p.pts]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    W = int(math.ceil((x1 - x0) * scale)) + 2 * pad + 1
    H = int(math.ceil((y1 - y0) * scale)) + 2 * pad + 1
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = img.load()
    three = scale >= 3                                   # big portraits get a third (highlight) tone
    Capsule.min_r = 0.42 / scale                         # legs, tails, necks never thinner than 1 px
    for j in range(H):
        for i in range(W):
            ux = x0 + (i - pad + 0.5) / scale
            uy = y0 + (j - pad + 0.5) / scale
            for p in reversed(parts):
                if p.inside(ux, uy):
                    base = hexc(palette[p.role]) if isinstance(palette[p.role], str) else palette[p.role]
                    if palette.get(p.role + '!flat'):
                        px[i, j] = base
                        break
                    k = p.light(ux, uy)
                    if three and k > 0.55:
                        c = shade(base, 1.22)
                    elif k > 0.15 or (not three and k > -0.2):
                        c = base if three or k <= 0.5 else shade(base, 1.12)
                    elif k > -0.55:
                        c = shade(base, 0.86)
                    else:
                        c = shade(base, 0.72)
                    if not three and k <= -0.2:
                        c = shade(base, 0.8)
                    px[i, j] = c
                    break
    if eye:                                              # eye: a dark dot, white highlight when big
        ex, ey, er = eye
        cx, cy = (ex - x0) * scale + pad, (ey - y0) * scale + pad
        r = max(0.5, er * scale)
        for j in range(H):
            for i in range(W):
                if (i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r:
                    px[i, j] = INK
        if highlight and r >= 1.2:
            px[int(cx - r * 0.35), int(cy - r * 0.35)] = (255, 255, 255, 255)
    if outline:                                          # 1 px dark outline outside the silhouette
        a = img.copy().load()
        for j in range(H):
            for i in range(W):
                if a[i, j][3] == 0:
                    for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ii, jj = i + di, j + dj
                        if 0 <= ii < W and 0 <= jj < H and a[ii, jj][3]:
                            c = a[ii, jj]
                            px[i, j] = tuple(max(0, round(v * 0.38)) for v in c[:3]) + (255,)
                            break
    return img.crop(img.getbbox())


# ---------- quad: four legs ----------

def quad_parts(s, frame):
    L, H = s['body']
    lh = s.get('leg', 2)
    hw, hh = s.get('head', (3, 3))
    neck = s.get('neck', 0)
    lw = 0.55 * s.get('leg_width', 1) + 0.25
    pal = {'body': s['colour'], 'belly': s.get('belly', s['colour']), 'legs': s.get('legs', '#3a3a40'),
           'hoof': s.get('hoof', s.get('legs', '#3a3a40')), 'head': s['colour'],
           'snout': s.get('snout_colour', s['colour']), 'nose': '#2b2b33',
           'ear': s.get('ear_colour', s['colour']), 'ear_in': s.get('ear_inner', s.get('ear_colour', s['colour'])),
           'horn': s.get('horn_colour', '#c9b08a'), 'tail': s.get('tail_colour', s['colour']),
           'tip': s.get('tail_tip', s.get('tail_colour', s['colour'])), 'pattern': s.get('pattern_colour', '#2b2b33'),
           'mane': s.get('mane', s['colour']), 'mask': s.get('mask', '#2b2b33'), 'tusk': '#f4f1e8',
           'beard': s.get('beard', s['colour'])}
    parts = []
    ground = H + lh
    cyb = H / 2
    body = Ellipse(L / 2, cyb, L / 2 + 0.3, H / 2 + 0.2, 'body')
    # Legs: far pair first (drawn behind the body), near pair last. Walk: far and near swap angles.
    feet = [(1.2, 0), (L - 1.8, 0), (2.2, 1), (L - 0.8, 1)]            # (x, near?)
    swing = 0.9 if frame == 1 else 0.0
    for x, near in feet:
        if near:
            continue
        dx = -swing if (x < L / 2) == bool(frame) else swing
        parts.append(Capsule(x, cyb + 0.4, x + dx * 0.6, ground - 0.4, lw, lw * 0.8, 'legs'))
    if 'hump' in s:
        hx, hwid, hht = s['hump']
        parts.append(Ellipse(hx + hwid / 2, 0.2, hwid / 2 + 0.3, hht / 2 + 0.5, 'body'))
    # Tail, behind the body.
    t = s.get('tail')
    if t == 'bushy':
        parts.append(Capsule(0.4, cyb - 0.4, -2.6, cyb + 0.4, 0.7, 1.1, 'tail'))
        if 'tail_tip' in s:
            parts.append(Ellipse(-3.0, cyb + 0.5, 0.8, 0.7, 'tip'))
    elif t == 'long':
        parts.append(Capsule(0.3, cyb - 0.3, -2.8, cyb + 1.6, 0.4, 0.3, 'tail'))
        if 'tail_tip' in s:
            parts.append(Ellipse(-2.9, cyb + 1.7, 0.5, 0.5, 'tip'))
    elif t == 'ringed':
        parts.append(Capsule(0.3, cyb - 0.3, -3.2, cyb + 1.0, 0.6, 0.6, 'tail'))
        parts.append(Masked(parts[-1], lambda x, y: int((-x) * 1.3) % 2 == 1, 'tip'))
    elif t == 'tuft':
        parts.append(Capsule(0.2, cyb - 0.6, -0.4, cyb + 2.4, 0.25, 0.25, 'tail'))
        parts.append(Ellipse(-0.45, cyb + 2.7, 0.45, 0.6, 'tip'))
    elif t == 'curl':
        parts.append(Capsule(0.2, cyb - 0.5, -1.0, cyb - 1.2, 0.3, 0.3, 'tail'))
    elif t == 'flat':
        parts.append(Ellipse(-1.8, cyb + 0.9, 2.0, 0.7, 'tail'))
    elif t == 'short':
        parts.append(Ellipse(-0.1, cyb - 0.6, 0.6, 0.5, 'tail'))
    parts.append(body)
    if 'belly' in s:
        parts.append(Masked(body, lambda x, y: y > cyb + H * 0.18, 'belly'))
    if 'bib' in s:                          # pine marten: a pale patch on throat and chest
        pal['bib'] = s['bib']
        parts.append(Masked(body, lambda x, y: x > L - 2.2 and y > cyb - H * 0.3, 'bib'))
    pat = s.get('pattern')
    if pat == 'spots':
        dots = [(L * f, cyb + H * g) for f, g in ((0.2, -0.1), (0.35, 0.2), (0.5, -0.2), (0.62, 0.15), (0.78, -0.05), (0.42, -0.35), (0.7, -0.3))]
        parts.append(Masked(body, lambda x, y: any((x - a) ** 2 + (y - b) ** 2 < 0.28 for a, b in dots), 'pattern'))
    elif pat == 'stripes':
        parts.append(Masked(body, lambda x, y: (x + 0.35 * (y - cyb) * (1 if x > L / 2 else -1)) % 2.2 < 0.7 and y < cyb + H * 0.3, 'pattern'))
    elif pat == 'patches':
        blobs = [(L * 0.25, cyb - 0.2, 1.4, 1.0), (L * 0.6, cyb + 0.3, 1.6, 1.1), (L * 0.85, cyb - 0.5, 0.9, 0.8)]
        parts.append(Masked(body, lambda x, y: any(((x - a) / rx) ** 2 + ((y - b) / ry) ** 2 < 1 for a, b, rx, ry in blobs), 'pattern'))
    elif pat == 'saddle':
        parts.append(Masked(body, lambda x, y: y < cyb - H * 0.18 and 1 < x < L - 1, 'pattern'))
    elif pat == 'band':
        parts.append(Masked(body, lambda x, y: L - 3.2 < x < L - 1.2, 'pattern'))
    elif pat == 'wool':                  # sheep: woolly bumps round the body's edge
        for k in range(int(L) + 1):
            for yy in (-0.2, H * 0.55):
                parts.append(Ellipse(0.3 + k * 1.0, cyb - H / 2 + 0.3 if yy < 0 else cyb + H / 2 - 0.4, 0.75, 0.7, 'body'))
        for k in range(3):
            parts.append(Ellipse(-0.2, cyb - 0.8 + k * 0.9, 0.7, 0.6, 'body'))
    elif pat == 'bristle':
        for k in range(int(L)):
            parts.append(Poly([(k + 0.2, 0.3), (k + 0.6, -0.8), (k + 1.0, 0.3)], 'pattern'))
    for x, near in feet:                                              # near legs, in front
        if not near:
            continue
        dx = swing if (x < L / 2) == bool(frame) else -swing
        parts.append(Capsule(x, cyb + 0.4, x + dx * 0.6, ground - 0.4, lw, lw * 0.8, 'legs'))
        if 'hoof' in s:
            parts.append(Ellipse(x + dx * 0.6, ground - 0.3, lw, 0.3, 'hoof'))
    # Neck and head.
    hx = L - 0.6 + (0.8 if neck else 0)
    hy = -neck + hh / 2 - 0.6 + s.get('head_drop', 0)
    if neck:
        parts.append(Capsule(L - 1.4, cyb - 0.4, hx, hy + 0.3, 1.1, 0.9, 'body'))
    if 'mane' in s:
        parts.append(Ellipse(L - 1.0, cyb - 0.6 - neck * 0.5, 1.3, H / 2 + neck * 0.5, 'mane'))
    ear = s.get('ears')
    hcx, hcy = hx + hw / 2 - 0.3, hy
    if ear == 'pointy':
        parts.append(Poly([(hcx - 0.9, hcy - hh / 2 + 0.3), (hcx - 0.5, hcy - hh / 2 - 1.6), (hcx + 0.1, hcy - hh / 2 + 0.2)], 'ear'))
    elif ear == 'long':
        parts.append(Ellipse(hcx - 0.6, hcy - hh / 2 - 1.6, 0.55, 1.9, 'ear', rot=-0.25))
        if 'ear_inner' in s:
            parts.append(Ellipse(hcx - 0.6, hcy - hh / 2 - 1.5, 0.25, 1.4, 'ear_in', rot=-0.25))
    elif ear == 'big':
        parts.append(Ellipse(hcx - 1.4, hcy + 0.3, 1.6, hh / 2 + 0.6, 'ear'))
    if ear == 'round':
        parts.append(Ellipse(hcx - 0.7, hcy - hh / 2 + 0.1, 0.55, 0.55, 'ear'))
    head = Ellipse(hcx, hcy, hw / 2 + 0.2, hh / 2 + 0.1, 'head')
    parts.append(head)
    if 'horns' in s:                    # after the head, so short horns are never hidden
        hn = s['horns']; bx, by = hcx - 0.3, hcy - hh / 2 + 0.2
        if hn == 'antlers':
            parts += [Capsule(bx, by, bx - 0.6, by - 3.2, 0.25, 0.2, 'horn'), Capsule(bx - 0.4, by - 1.6, bx - 1.6, by - 2.4, 0.2, 0.15, 'horn'),
                      Capsule(bx - 0.55, by - 2.6, bx + 0.6, by - 3.8, 0.2, 0.15, 'horn')]
        elif hn == 'short':
            parts.append(Capsule(bx, by, bx - 0.4, by - 1.2, 0.3, 0.15, 'horn'))
        elif hn == 'long':
            parts.append(Capsule(bx, by, bx - 2.2, by - 4.2, 0.3, 0.15, 'horn'))
        elif hn == 'curved':
            parts += [Capsule(bx, by, bx + 0.6, by - 1.0, 0.35, 0.25, 'horn'), Capsule(bx + 0.6, by - 1.0, bx + 1.3, by - 0.7, 0.25, 0.15, 'horn')]
        elif hn == 'wide':             # water buffalo: big horns sweeping out and back
            parts += [Capsule(bx + 0.2, by + 0.3, bx - 1.6, by - 0.6, 0.5, 0.35, 'horn'), Capsule(bx - 1.6, by - 0.6, bx - 2.4, by - 1.8, 0.35, 0.15, 'horn')]
        elif hn == 'palmate':          # moose: a broad flat paddle sweeping back, points along its top edge
            parts.append(Capsule(bx, by, bx - 0.5, by - 0.9, 0.3, 0.3, 'horn'))
            paddle = [(bx - 0.5, by - 0.8), (bx + 1.4, by - 1.6)]
            for k in range(5):
                tx = bx + 1.4 - k * 0.95
                paddle.append((tx, by - 2.9 - (0.3 if k % 2 else 0)))
                paddle.append((tx - 0.45, by - 2.0))
            paddle += [(bx - 3.4, by - 1.4), (bx - 2.0, by - 0.7)]
            parts.append(Poly(paddle, 'horn'))
    sn = s.get('snout', 1)
    if s.get('droop'):                  # moose: long overhanging nose and a dewlap under the chin
        parts.append(Ellipse(hcx + hw / 2 + 0.6, hcy + hh * 0.3, 1.5, hh * 0.45, 'head'))
        parts.append(Ellipse(hcx - 0.2, hcy + hh / 2 + 0.6, 0.35, 0.9, 'head'))
    if sn:
        parts.append(Ellipse(hcx + hw / 2 + sn / 2 - 0.2, hcy + hh * 0.18, sn / 2 + 0.35, hh * 0.32 + 0.1, 'snout'))
        parts.append(Ellipse(hcx + hw / 2 + sn - 0.15, hcy + hh * 0.08, 0.3, 0.28, 'nose'))
    if s.get('nose_horn'):              # rhino: horns on the snout, a big one and a small one behind
        nx = hcx + hw / 2 + s.get('snout', 1) - 0.3
        parts += [Poly([(nx - 0.6, hcy - hh * 0.15), (nx + 0.3, hcy - hh * 0.95 - 0.8), (nx + 0.5, hcy - hh * 0.1)], 'horn'),
                  Poly([(nx - 1.7, hcy - hh * 0.3), (nx - 1.3, hcy - hh * 0.75 - 0.3), (nx - 0.9, hcy - hh * 0.3)], 'horn')]
    if s.get('trunk'):
        tl = s['trunk']
        parts.append(Capsule(hcx + hw / 2, hcy + 0.3, hcx + hw / 2 + 0.8, hcy + tl + 0.8, 0.75, 0.45, 'head'))
    if s.get('tusk'):
        parts.append(Capsule(hcx + hw / 2 - 0.2, hcy + hh * 0.35, hcx + hw / 2 + 0.9, hcy + hh * 0.1, 0.22, 0.12, 'tusk'))
    if s.get('beard'):
        parts.append(Poly([(hcx + 0.2, hcy + hh / 2 - 0.1), (hcx + 1.0, hcy + hh / 2 - 0.1), (hcx + 0.5, hcy + hh / 2 + 1.3)], 'beard'))
    ex, ey = hcx + hw * 0.18, hcy - hh * 0.12
    if 'bib' in s:
        parts.append(Masked(head, lambda x, y: y > hcy + hh * 0.15, 'bib'))
    if 'mask' in s:
        parts.append(Masked(head, lambda x, y: abs(y - ey) < 0.5 and x < hcx + hw / 2, 'mask'))
    if s.get('eye_patch'):
        parts.append(Ellipse(ex, ey + 0.1, 0.65, 0.55, 'mask'))
    return parts, pal, (ex, ey, 0.32)


# ---------- flyer: flying bird ----------

def flyer_parts(s, frame):
    L = s['body'][0] + 1.0
    span = s.get('span', 2) * 1.6 + 0.6
    pal = {'body': s['colour'], 'head': s.get('head', s['colour']), 'belly': s.get('belly', s['colour']),
           'wing': s.get('wing', s['colour']), 'tip': s.get('wing_tip', s.get('wing', s['colour'])),
           'bar': s.get('bars', s.get('wing', s['colour'])), 'beak': s.get('beak', '#2b2b33'),
           'crest': s.get('crest', s['colour'])}
    parts = []
    up = frame == 0
    root = (L * 0.45, 0.0)
    def wing(side):                                   # side -1 = far wing (behind), +1 = near wing
        k = 0.8 if side < 0 else 1.0
        rx = root[0] + (-0.3 if side < 0 else 0.3)
        chord = (1.5 if s.get('broad') else 1.1) * k
        tipy = (-span if up else span * 0.8) * k
        tipx = rx - span * 0.55 - (0.6 if s.get('broad') else 0)
        # leading edge from the shoulder out to the tip, trailing edge back with 3 feather notches
        pts = [(rx + chord * 0.7, 0.0), (rx + chord * 0.2, tipy * 0.55), (tipx + 0.3, tipy)]
        n = 3
        for f in range(n):
            t = (f + 1) / (n + 1)
            fx, fy = tipx + 0.3 + (rx - chord - tipx) * t, tipy + (0.0 - tipy) * t
            pts += [(fx - 0.15, fy - 0.35 * (1 if up else -1)), (fx + 0.25, fy + 0.15 * (1 if up else -1))]
        pts.append((rx - chord, 0.0))
        return Poly(pts, 'wing'), (tipx, tipy)

    far, ftip = wing(-1)
    parts.append(far)
    if s.get('fork'):
        parts += [Capsule(0.2, 0, -2.0, -0.9, 0.35, 0.15, 'body'), Capsule(0.2, 0, -2.0, 0.9, 0.35, 0.15, 'body')]
    elif s.get('long_tail'):
        parts.append(Capsule(0.3, 0, -2.4, 0.2, 0.4, 0.3, 'body'))
    else:
        parts.append(Poly([(0.6, -0.4), (-1.2, -0.7), (-1.2, 0.7), (0.6, 0.4)], 'body'))
    body = Ellipse(L / 2, 0, L / 2 + 0.2, 0.75, 'body')
    parts.append(body)
    if 'belly' in s:
        parts.append(Masked(body, lambda x, y: y > 0.15, 'belly'))
    if 'breast' in s:                       # robin: the whole front of the bird
        pal['breast'] = s['breast']
        parts.append(Masked(body, lambda x, y: x > L * 0.62, 'breast'))
    hr = 0.85 if s.get('big_head') else 0.7
    head = Ellipse(L + 0.1, -0.15, hr, hr, 'head')
    parts.append(head)
    if 'breast' in s:
        parts.append(Masked(head, lambda x, y: y > -0.25, 'breast'))
    bl = s.get('beak_len', 0) + 0.6
    parts.append(Poly([(L + hr - 0.1, -0.35), (L + hr + bl, -0.05), (L + hr - 0.1, 0.25)], 'beak'))
    if 'crest' in s:
        parts.append(Poly([(L - 0.2, -0.6), (L - 1.6, -1.6), (L + 0.2, -1.0)], 'crest'))
    near, ntip = wing(1)
    parts.append(near)
    if 'bars' in s:
        parts.append(Masked(near, lambda x, y: int(abs(y) * 1.4) % 2 == 1, 'bar'))
    if 'wing_tip' in s:
        tx, ty = ntip
        parts.append(Masked(near, lambda x, y: abs(y - ty) < span * 0.35, 'tip'))
    return parts, pal, (L + 0.25, -0.3, 0.22)


# ---------- low: shell or spines over short legs ----------

def low_parts(s, frame):
    L, H = s['body']
    pal = {'shell': s['colour'], 'plate': s.get('shade', s['colour']), 'skin': s.get('skin', '#8a7a5a'),
           'spine': s.get('shade', s['colour'])}
    parts = []
    st = 0.5 if frame == 1 else 0.0
    for x in (1.0 + st, L - 1.5 - st):
        parts.append(Capsule(x, H - 0.6, x, H + 0.6, 0.5, 0.45, 'skin'))
    if s.get('tail'):
        parts.append(Capsule(0.3, H - 0.6, -0.9, H - 0.2, 0.35, 0.15, 'skin'))
    parts.append(Capsule(L - 0.6, H - 0.9, L + 1.3, H - 1.3, 0.7, 0.65, 'skin'))        # neck + head
    shell = Ellipse(L / 2, H - 0.3, L / 2 + 0.2, H + 0.1, 'shell')
    parts.append(Masked(shell, lambda x, y: y < H - 0.1, 'shell'))
    if s.get('plates'):
        parts.append(Masked(shell, lambda x, y: y < H - 0.1 and (abs((x - L / 2) % 2.0 - 1.0) < 0.22 or abs(y - H * 0.35) < 0.18), 'plate'))
    if s.get('spines'):
        for k in range(int(L * 1.4)):
            x = 0.4 + k * 0.7
            yt = H - 0.3 - (H + 0.1) * math.sqrt(max(0.0, 1 - ((x - L / 2) / (L / 2 + 0.2)) ** 2))
            parts.append(Poly([(x - 0.35, yt + 0.5), (x - 0.2, yt - 0.9), (x + 0.3, yt + 0.4)], 'spine'))
    return parts, pal, (L + 1.4, H - 1.5, 0.25)


# ---------- long: lizards and snakes ----------

def long_parts(s, frame):
    L = s['body'][0]
    T = s.get('tail_len', L)
    pal = {'body': s['colour'], 'dark': s.get('shade', s['colour']), 'dot': s.get('pattern_colour', s.get('shade', s['colour'])),
           'frill': s.get('frill', s['colour'])}
    parts = []
    wave = s.get('wave')
    pts = []
    for k in range(0, L + T + 1):                  # spine from tail tip (x=-T) to the neck (x=L)
        x = -T + k
        y = 0.0 if not wave else 0.7 * math.sin((x / 2.2) + frame * math.pi)
        pts.append((x, y))
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        r0 = 0.25 + 0.55 * max(0.0, min(1.0, (x0 + T) / (T or 1)))
        r1 = 0.25 + 0.55 * max(0.0, min(1.0, (x1 + T) / (T or 1)))
        parts.append(Capsule(x0, y0, x1, y1, min(0.8, r0), min(0.8, r1), 'body'))
    if s.get('legs', True) and not wave:
        for x, ph in ((0.6, 0), (L - 1.2, 1)):
            dx = 0.6 if (frame + ph) % 2 else -0.6
            parts.append(Capsule(x, 0.4, x + dx, 1.5, 0.28, 0.22, 'dark'))
    hx = L + 0.6
    parts.append(Ellipse(hx, -0.15 if not wave else pts[-1][1] - 0.15, 1.1, 0.75, 'body'))
    if 'frill' in s:
        parts.append(Ellipse(hx - 0.7, -0.6, 0.6, 0.8, 'frill'))
    if s.get('pattern'):
        host = parts[len(pts) // 2]
        dots = [(x, y) for x, y in pts[::2]]
        parts.append(Masked(Ellipse(-T / 2 + L / 2, 0, (L + T) / 2 + 1, 1.0, 'body'),
                            lambda x, y: any((x - a) ** 2 + (y - b + 0.2) ** 2 < 0.09 for a, b in dots), 'dot'))
    return parts, pal, (hx + 0.35, -0.35, 0.22)


# ---------- sitter: sits upright (monkeys, meerkats, squirrels) ----------

def sitter_parts(s, frame):
    W, H = s['body']
    hw, hh = s.get('head', (W, 3))
    pal = {'body': s['colour'], 'face': s.get('face', s['colour']), 'belly': s.get('belly', s.get('face', s['colour'])),
           'ear': s.get('ear_colour', s['colour']), 'tail': s['colour'], 'tip': s.get('tail_tip', s['colour']),
           'limb': s.get('limbs', s.get('shade', s['colour']))}
    parts = []
    bob = 0.35 if frame == 1 else 0.0
    t = s.get('tail')
    if t == 'bushy':
        parts.append(Capsule(0.0, H - 0.5, -1.4, -0.6, 1.0, 1.3, 'tail'))
    elif t == 'long':
        parts.append(Capsule(0.2, H - 0.3, -2.4, H + 0.2, 0.35, 0.3, 'tail'))
        if 'tail_tip' in s:
            parts.append(Ellipse(-2.5, H + 0.2, 0.45, 0.4, 'tip'))
    body = Ellipse(W / 2, H / 2 + 0.5, W / 2 + 0.3, H / 2 + 0.3, 'body')
    parts.append(body)
    parts.append(Masked(body, lambda x, y: x > W * 0.5 and y > H * 0.35, 'belly'))
    parts.append(Capsule(W * 0.75, H * 0.45, W + 0.3, H * 0.7, 0.45, 0.4, 'limb'))       # arm
    parts.append(Ellipse(W * 0.3, H + 0.6, 0.9, 0.45, 'limb'))                           # feet
    parts.append(Ellipse(W * 0.8, H + 0.6, 0.8, 0.45, 'limb'))
    hcx, hcy = W / 2 + 0.6, -hh / 2 + 0.6 + bob
    if s.get('ears') == 'pointy':
        parts.append(Poly([(hcx - 0.9, hcy - hh / 2 + 0.3), (hcx - 0.5, hcy - hh / 2 - 1.2), (hcx, hcy - hh / 2 + 0.2)], 'ear'))
    elif s.get('ears') == 'round':
        parts.append(Ellipse(hcx - 0.7, hcy - hh / 2 + 0.2, 0.5, 0.5, 'ear'))
        parts.append(Ellipse(hcx + 0.6, hcy - hh / 2 + 0.2, 0.45, 0.45, 'ear'))
    parts.append(Ellipse(hcx, hcy, hw / 2 + 0.2, hh / 2 + 0.1, 'body'))
    parts.append(Ellipse(hcx + hw * 0.22, hcy + 0.15, hw * 0.32 + 0.1, hh * 0.38, 'face'))
    return parts, pal, (hcx + hw * 0.22, hcy - 0.1, 0.25)


# ---------- hopper: rabbits, hares, jerboas ----------

def hopper_parts(s, frame):
    L, H = s['body']
    pal = {'body': s['colour'], 'leg': s.get('shade', s['colour']), 'tail': s.get('tail_colour', s['colour']),
           'ear_in': s.get('ear_inner', s['colour'])}
    parts = []
    hop = frame == 1
    parts.append(Ellipse(-0.3, 0.6, 0.6, 0.55, 'tail'))
    if hop:                                       # stretched out mid-hop
        parts.append(Capsule(0.8, H - 0.3, -1.4, H + 0.6, 0.7, 0.35, 'leg'))
        body = Ellipse(L / 2, H / 2 - 0.2, L / 2 + 0.6, H / 2, 'body', rot=-0.12)
    else:                                         # crouched
        parts.append(Ellipse(1.2, H - 0.1, 1.4, 0.85, 'leg'))
        body = Ellipse(L / 2, H / 2, L / 2 + 0.3, H / 2 + 0.2, 'body')
    parts.append(body)
    parts.append(Capsule(L - 0.8, H * 0.6, L - 0.4 + (0.6 if hop else 0), H + 0.5, 0.3, 0.25, 'leg'))
    hcx, hcy = L + 0.2, -0.3 - (0.3 if hop else 0)
    el = s.get('ear_len', 2) + 0.6
    parts.append(Ellipse(hcx - 0.6, hcy - el / 2 - 0.4, 0.45, el / 2 + 0.2, 'body', rot=-0.3))
    if 'ear_inner' in s:
        parts.append(Ellipse(hcx - 0.6, hcy - el / 2 - 0.3, 0.2, el / 2 - 0.2, 'ear_in', rot=-0.3))
    parts.append(Ellipse(hcx, hcy, 1.2, 1.0, 'body'))
    return parts, pal, (hcx + 0.35, hcy - 0.15, 0.25)


# ---------- wader: standing birds ----------

def wader_parts(s, frame):
    L, H = s['body']
    lh = s.get('leg', 3)
    neck = s.get('neck', 1)
    pal = {'body': s['colour'], 'wing': s.get('wing', s.get('shade', s['colour'])), 'belly': s.get('belly', s['colour']),
           'neck': s.get('neck_colour', s['colour']), 'head': s.get('head_colour', s['colour']), 'beak': s.get('beak', '#e0a020'),
           'leg': s.get('legs', '#e0702a'), 'crest': s.get('crest', s['colour']), 'train': s.get('train', s['colour']),
           'eye_t': s.get('train_eye', '#2a7fb0')}
    parts = []
    peck = frame == 1
    if 'train' in s:                              # peacock / pheasant: a long tail behind
        tr = Capsule(0.5, H * 0.45, -6.0, H * 0.9, 1.2, 1.6, 'train')
        parts.append(tr)
        parts.append(Masked(tr, lambda x, y: ((x + 6.0) % 1.6 < 0.55) and abs(y - H * 0.75) < 0.45, 'eye_t'))
    for x, ph in ((L * 0.4, 0), (L * 0.6, 1)):
        bend = 0.4 if (frame + ph) % 2 else 0.0
        parts.append(Capsule(x, H - 0.3, x + bend, H + lh, 0.2, 0.18, 'leg'))
        parts.append(Capsule(x + bend, H + lh, x + bend + 0.9, H + lh, 0.15, 0.15, 'leg'))
    body = Ellipse(L / 2, H / 2, L / 2 + 0.3, H / 2 + 0.1, 'body')
    parts.append(body)
    if 'belly' in s:
        parts.append(Masked(body, lambda x, y: x > L * 0.55, 'belly'))
    parts.append(Masked(body, lambda x, y: y < H * 0.55 and x < L * 0.72, 'wing'))
    nx0, ny0 = L - 0.4, H * 0.25
    hx, hy = (L + 0.8 + (1.2 if peck else 0), -neck + (neck + 0.8 if peck else 0))
    parts.append(Capsule(nx0, ny0, hx, hy, 0.55, 0.4, 'neck'))
    parts.append(Ellipse(hx, hy, 0.85, 0.75, 'head'))
    bl = s.get('beak_len', 1) + 0.5
    if peck:
        parts.append(Poly([(hx + 0.4, hy), (hx + 0.7 + bl * 0.5, hy + bl), (hx + 0.9, hy + 0.1)], 'beak'))
    else:
        parts.append(Poly([(hx + 0.6, hy - 0.25), (hx + 0.7 + bl, hy + 0.1), (hx + 0.6, hy + 0.3)], 'beak'))
    if 'crest' in s:
        parts.append(Poly([(hx - 0.4, hy - 0.5), (hx - 0.9, hy - 1.6), (hx + 0.1, hy - 0.7)], 'crest'))
    return parts, pal, (hx + 0.25, hy - 0.2, 0.2)


# ---------- frog: crouched, folded back legs, eyes bulging on top ----------

def frog_parts(s, frame):
    pal = {'body': s['colour'], 'belly': s.get('belly', '#d8d8a0'), 'spot': s.get('pattern_colour', '#3a5a20'),
           'leg': s.get('shade', s['colour'])}
    parts = []
    leap = frame == 1
    if leap:                                       # mid-hop: back legs kicked out behind
        parts += [Capsule(1.0, 1.4, -1.6, 2.2, 0.55, 0.35, 'leg'), Capsule(-1.6, 2.2, -3.0, 2.6, 0.35, 0.3, 'leg')]
    else:                                          # sitting: big thigh folded under, foot forward
        parts += [Ellipse(1.0, 1.6, 1.4, 0.9, 'leg'), Capsule(0.4, 2.3, 2.4, 2.5, 0.3, 0.3, 'leg')]
    body = Ellipse(2.4, 1.2 - (0.4 if leap else 0), 2.2, 1.2, 'body', rot=-0.25 if not leap else -0.05)
    parts.append(body)
    parts.append(Masked(body, lambda x, y: y > 1.5 - (0.4 if leap else 0), 'belly'))
    spots = [(1.6, 0.6), (2.6, 0.3), (3.2, 0.9), (2.0, 1.2)]
    parts.append(Masked(body, lambda x, y: any((x - a) ** 2 + (y - b) ** 2 < 0.09 for a, b in spots), 'spot'))
    parts.append(Capsule(3.6, 1.6 - (0.4 if leap else 0), 4.0, 2.5 - (0.6 if leap else 0), 0.25, 0.25, 'leg'))   # front leg
    ey = 0.0 - (0.4 if leap else 0)
    parts.append(Ellipse(3.6, ey, 0.6, 0.55, 'body'))                                     # eye bulge
    return parts, pal, (3.75, ey - 0.05, 0.3)


BUILDERS = {'quad': quad_parts, 'flyer': flyer_parts, 'low': low_parts, 'long': long_parts,
            'sitter': sitter_parts, 'hopper': hopper_parts, 'wader': wader_parts, 'frog': frog_parts}


def render(species_dials, frame, scale, outline=True):
    parts, pal, eye = BUILDERS[species_dials['template']](species_dials, frame)
    return rasterise(parts, pal, scale, outline=outline, eye=eye, highlight=scale >= 3)
