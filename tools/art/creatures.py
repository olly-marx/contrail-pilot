"""Creature generator: a species is a few dials, the templates draw both animation frames.

Used by make_wildlife.py. Style is taken from the hand-drawn animals in make_sprites.py:
side view facing right, no outline, flat colour plus one shade, dark pixels for legs, eyes and
noses, frame 1 = the walk (legs move) or the flap (wings move). Feet always on the bottom row.

Templates
  quad    four legs: body box, legs, neck + head, ears, tail, horns, patterns
  low     shell or spines over short legs (tortoise, hedgehog, armadillo)
  long    lizards and snakes: long low body, long tail, legs optional
  sitter  sits upright (monkeys, panda, meerkat); frame 1 bobs the head
  hopper  rabbit-like: crouched body, big hind legs; frame 1 hops
  wader   standing bird (crane, peacock, puffin); frame 1 dips the head
  flyer   flying bird; frame 0 wings up, frame 1 wings down
"""
from PIL import Image


def hexc(h, a=255):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (a,)


def shade(c, k):
    return tuple(max(0, min(255, round(v * k))) for v in c[:3]) + (255,)


INK = hexc('#2b2b33')


class Grid:
    """Sparse pixel grid; coordinates may go negative, the image is cropped to what's drawn."""

    def __init__(self):
        self.p = {}

    def px(self, x, y, c):
        self.p[(x, y)] = c

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.px(xx, yy, c)

    def has(self, x, y):
        return (x, y) in self.p

    def image(self, bottom_align=True):
        xs = [x for x, _ in self.p]; ys = [y for _, y in self.p]
        x0, y0 = min(xs), min(ys)
        im = Image.new('RGBA', (max(xs) - x0 + 1, max(ys) - y0 + 1), (0, 0, 0, 0))
        for (x, y), c in self.p.items():
            im.putpixel((x - x0, y - y0), c)
        return im


def frames_same_size(a, b):
    """Pad two frames to one size, feet (bottom) aligned and left aligned, so they swap in place."""
    w, h = max(a.width, b.width), max(a.height, b.height)
    out = []
    for im in (a, b):
        c = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        c.alpha_composite(im, (0, h - im.height))
        out.append(c)
    return out


# ---------- shared parts ----------

def pattern(g, kind, x0, y0, w, h, col, seed=1):
    if kind == 'spots':
        for i, (dx, dy) in enumerate(((1, 0), (4, 1), (2, 2), (6, 0), (8, 2), (5, 3), (10, 1))):
            if dx < w - 1 and dy < h - 1:
                g.px(x0 + dx, y0 + dy, col)
    elif kind == 'stripes':
        for dx in range(1, w - 1, 3):
            for dy in range(0, h - 1):
                if (dx + seed) % 2 or dy < h - 2:
                    g.px(x0 + dx, y0 + dy, col)
    elif kind == 'patches':          # cow-like blotches
        for dx, dy in ((1, 0), (2, 0), (2, 1), (6, 1), (7, 1), (7, 2), (10, 0)):
            if dx < w and dy < h:
                g.px(x0 + dx, y0 + dy, col)
    elif kind == 'saddle':            # dark back
        for dx in range(1, w - 1):
            g.px(x0 + dx, y0, col)
    elif kind == 'band':              # panda: dark band over the shoulders
        for dx in (w - 3, w - 2):
            for dy in range(h + 1):
                g.px(x0 + dx, y0 + dy, col)
    elif kind == 'bristle':           # spiky ridge along the back
        for dx in range(0, w, 2):
            g.px(x0 + dx, y0 - 1, col)


def legs(g, xs, y, n, col, frame, width=1, hoof=None):
    """Legs under the body. Frame 1 splays each pair at the feet (the walk)."""
    for i, x in enumerate(xs):
        for k in range(n):
            dx = 0
            if frame == 1 and k == n - 1:
                dx = -1 if i % 2 == 0 else 1
            for wdx in range(width):
                g.px(x + dx + wdx, y + k, col)
        if hoof:
            last_dx = (-1 if i % 2 == 0 else 1) if frame == 1 else 0
            for wdx in range(width):
                g.px(x + last_dx + wdx, y + n - 1, hoof)


def ears(g, kind, x, y, col, inner=None):
    if kind == 'pointy':
        g.px(x, y - 1, col); g.px(x + 2, y - 1, col)
        g.px(x, y - 2, col); g.px(x + 2, y - 2, col)
    elif kind == 'round':
        g.px(x, y - 1, col); g.px(x + 2, y - 1, col)
    elif kind == 'long':              # rabbit / hare / fennec
        for k in range(1, 5):
            g.px(x, y - k, col); g.px(x + 1, y - k, col)
        if inner:
            for k in range(2, 4):
                g.px(x, y - k, inner)
    elif kind == 'big':               # elephant / fennec: a flap on the side of the head
        g.rect(x - 1, y, 2, 3, col)


def horns(g, kind, x, y, col):
    if kind == 'antlers':
        for k in range(1, 4):
            g.px(x, y - k, col)
        g.px(x - 1, y - 2, col); g.px(x + 1, y - 3, col); g.px(x - 1, y - 4, col); g.px(x + 2, y - 4, col)
    elif kind == 'short':
        g.px(x, y - 1, col); g.px(x + 1, y - 2, col)
    elif kind == 'long':              # oryx: long straight back-swept horns
        for k in range(1, 6):
            g.px(x - k // 2, y - k, col)
    elif kind == 'curved':            # bison / buffalo
        g.px(x, y - 1, col); g.px(x + 1, y - 2, col); g.px(x + 2, y - 2, col)
    elif kind == 'palmate':           # moose
        g.rect(x - 2, y - 3, 5, 2, col)
        for dx in (-2, 0, 2):
            g.px(x + dx, y - 4, col)
        g.px(x, y - 1, col)


def tail(g, kind, x, y, col, tip=None):
    if kind == 'short':
        g.px(x - 1, y, col)
    elif kind == 'long':
        for k in range(1, 4):
            g.px(x - k, y + k // 2, col)
        if tip:
            g.px(x - 4, y + 2, tip)
    elif kind == 'bushy':             # fox
        g.rect(x - 3, y, 3, 2, col); g.px(x - 4, y + 1, col)
        if tip:
            g.px(x - 4, y + 1, tip)
    elif kind == 'tuft':              # lion, cow, bison
        for k in range(1, 4):
            g.px(x - 1, y + k, col)
        g.px(x - 1, y + 4, tip or INK)
    elif kind == 'curl':              # pig / boar
        g.px(x - 1, y, col); g.px(x - 2, y - 1, col)
    elif kind == 'flat':              # beaver
        g.rect(x - 4, y + 1, 4, 2, col)
    elif kind == 'ringed':            # raccoon, lemur
        for k in range(1, 5):
            g.px(x - k, y + k // 2, col if k % 2 else tip or INK)


# ---------- templates ----------

def quad(s, frame):
    """s: dict of dials. Coordinates: body top-left at (0, 0), facing right."""
    g = Grid()
    L, H = s['body']                 # body length and height
    lh = s.get('leg', 2)             # leg length
    col = hexc(s['colour']); dark = hexc(s['shade']) if 'shade' in s else shade(col, 0.75)
    belly = hexc(s['belly']) if 'belly' in s else None
    legc = hexc(s['legs']) if 'legs' in s else INK
    # Body, corners rounded.
    for y in range(H):
        for x in range(L):
            if (x, y) in ((0, 0), (L - 1, 0)) or (y == H - 1 and x in (0, L - 1)):
                continue
            g.px(x, y, col)
    g.rect(1, H - 1, L - 2, 1, dark)
    if belly:
        g.rect(2, H - 1, L - 4, 1, belly)
    if 'pattern' in s:
        pattern(g, s['pattern'], 1, 0 if s['pattern'] not in ('saddle', 'bristle') else 0, L - 1, H - 1,
                hexc(s.get('pattern_colour', '#2b2b33')))
    if s.get('hump'):                 # camel / bison
        hx, hw, hh = s['hump']
        for k in range(hh):
            g.rect(hx + k // 2, -1 - k, hw - k, 1, col)
    # Legs: two at the back, two at the front.
    lw = s.get('leg_width', 1)
    xs = [1, 3, L - 4, L - 2] if L >= 8 else [1, L - 2]
    legs(g, xs, H, lh, legc, frame, lw, hexc(s['hoof']) if 'hoof' in s else None)
    # Neck and head at the front.
    hw, hh = s.get('head', (3, 3))
    neck = s.get('neck', 0)
    hx = L - 1 + (1 if neck else 0)
    hy = -neck - (hh - 2) + s.get('head_drop', 0)
    for k in range(neck):
        g.rect(L - 2, -k, 2, 1, col)
    g.rect(hx, hy, hw, hh, col)
    snout = s.get('snout', 1)
    sc = hexc(s['snout_colour']) if 'snout_colour' in s else col
    g.rect(hx + hw, hy + hh - 2, snout, 2, sc)
    g.px(hx + hw + snout - 1, hy + hh - 2, INK)          # nose
    g.px(hx + hw - 2, hy, INK) if hh <= 2 else g.px(hx + hw - 1, hy + 1, INK)   # eye
    if 'mask' in s:
        g.px(hx, hy + 1, hexc(s['mask'])); g.px(hx + 1, hy + 1, hexc(s['mask']))
    if s.get('eye_patch'):            # panda: a dark patch round the eye, white shine in it
        g.px(hx + hw - 2, hy + 1, INK); g.px(hx + hw - 1, hy + 1, INK); g.px(hx + hw - 2, hy + 2, INK)
        g.px(hx + hw - 1, hy + 1, hexc('#ffffff'))
    if s.get('trunk'):                # elephant
        for k in range(s['trunk']):
            g.px(hx + hw + snout - 1 + (1 if k < 2 else 0), hy + hh - 1 + k, col)
    if s.get('beard'):
        g.px(hx + hw, hy + hh, hexc(s['beard'])); g.px(hx + hw, hy + hh + 1, hexc(s['beard']))
    if s.get('tusk'):
        g.px(hx + hw, hy + hh, hexc('#f4f1e8')); g.px(hx + hw + 1, hy + hh - 1, hexc('#f4f1e8'))
    if 'mane' in s:                   # lion / horse / bison
        mc = hexc(s['mane'])
        g.rect(hx - 1, hy - 1, 2, hh + 2, mc)
    if 'ears' in s:
        ears(g, s['ears'], hx + (0 if s['ears'] != 'big' else 0), hy, hexc(s.get('ear_colour', s['colour'])),
             hexc(s['ear_inner']) if 'ear_inner' in s else None)
    if 'horns' in s:
        horns(g, s['horns'], hx + 1, hy, hexc(s.get('horn_colour', '#c9b08a')))
    if 'tail' in s:
        tail(g, s['tail'], 0, 0 if s['tail'] != 'tuft' else 0, hexc(s.get('tail_colour', s['colour'])),
             hexc(s['tail_tip']) if 'tail_tip' in s else None)
    return g.image()


def low(s, frame):
    """Shelled or spiny: a dome over short legs (tortoise, hedgehog, armadillo)."""
    g = Grid()
    L, H = s['body']
    col = hexc(s['colour']); dark = hexc(s['shade']) if 'shade' in s else shade(col, 0.7)
    for y in range(H):
        inset = 1 if y == 0 else 0                        # rounded top
        for x in range(inset, L - inset):
            g.px(x, y, col if (x + y) % 3 else dark)
    if s.get('spines'):                                  # hedgehog: spikes along the back
        for x in range(1, L - 1, 2):
            g.px(x, -1, dark)
        for x in range(0, L, 2):
            g.px(x, 0, dark)
    if s.get('plates'):               # shell plates
        for x in range(1, L - 1, 3):
            g.px(x, 1, dark); g.px(x, 2, dark)
    skin = hexc(s.get('skin', '#8a7a5a'))
    g.rect(L, H - 2, 2, 2, skin)      # head
    g.px(L + 1, H - 2, INK)
    for i, x in enumerate((1, L - 2)):
        dx = (-1 if i == 0 else 1) if frame == 1 else 0
        g.px(x + dx, H, skin)
    if s.get('tail'):
        g.px(-1, H - 1, skin)
    return g.image()


def long(s, frame):
    """Lizard or snake: long low body, long tail, legs that alternate."""
    g = Grid()
    L = s['body'][0]
    col = hexc(s['colour']); dark = hexc(s['shade']) if 'shade' in s else shade(col, 0.75)
    T = s.get('tail_len', L)
    wave = s.get('wave', 0)
    for x in range(-T, L):
        y = 0 if not wave else (1 if ((x // 3) + frame) % 2 else 0)
        g.px(x, y, col)
        if x > -T // 2:
            g.px(x, y + 1, dark if x < 0 else col)
    if 'pattern' in s:
        for x in range(-T // 2, L, 2):
            g.px(x, 0, hexc(s['pattern_colour']))
    g.rect(L, -1, 2, 2, col)          # head
    g.px(L + 1, -1, INK)
    if s.get('legs', True) and not wave:
        for i, x in enumerate((0, L - 2)):
            dx = (1 if i % 2 == 0 else -1) if frame == 1 else 0
            g.px(x + dx, 2, dark); g.px(x - dx, 2, dark) if frame == 0 else None
    if s.get('frill'):
        g.px(L - 1, -2, hexc(s['frill'])); g.px(L - 1, -1, hexc(s['frill']))
    return g.image()


def sitter(s, frame):
    """Sits upright: a tall body, head on top, arms; frame 1 bobs the head."""
    g = Grid()
    W, H = s['body']
    col = hexc(s['colour']); dark = hexc(s['shade']) if 'shade' in s else shade(col, 0.75)
    face = hexc(s.get('face', s['colour']))
    for y in range(H):
        for x in range(W):
            if y == 0 and x in (0, W - 1):
                continue
            g.px(x, y, col)
    g.rect(W - 2, 1, 1, H - 2, dark)                    # arm
    if 'belly' in s:
        g.rect(1, 2, W - 3, H - 3, hexc(s['belly']))
    bob = 1 if frame == 1 else 0
    hw, hh = s.get('head', (W, 3))
    hx, hy = (W - hw) // 2 + 1, -hh + bob
    g.rect(hx, hy, hw, hh, col)
    g.rect(hx + hw - 2, hy + 1, 2, hh - 1, face)
    g.px(hx + hw - 1, hy + 1, INK)
    if 'eye_patch' in s:              # panda
        g.px(hx + hw - 2, hy + 1, INK); g.px(hx + hw - 1, hy + 1, INK)
        g.px(hx + hw - 1, hy + 1, hexc('#ffffff'))
    if 'ears' in s:
        ears(g, s['ears'], hx, hy, hexc(s.get('ear_colour', s['colour'])))
    if 'limbs' in s:                  # dark arms and legs (panda)
        lc = hexc(s['limbs'])
        g.rect(W - 2, 1, 2, H - 2, lc); g.rect(0, H - 2, W, 2, lc)
    g.rect(0, H, 2, 1, dark); g.rect(W - 2, H, 2, 1, dark)    # feet
    if s.get('tail'):
        tail(g, s['tail'], 0, H - 2, col, hexc(s['tail_tip']) if 'tail_tip' in s else None)
    return g.image()


def hopper(s, frame):
    """Rabbit-like: crouched body with big hind legs; frame 1 stretches into a hop."""
    g = Grid()
    L, H = s['body']
    col = hexc(s['colour']); dark = hexc(s['shade']) if 'shade' in s else shade(col, 0.75)
    for y in range(H):
        for x in range(L):
            if (y == 0 and x in (0, L - 1)):
                continue
            g.px(x, y, col)
    g.rect(0, H - 1, 2, 1, dark)                        # haunch
    hx, hy = L - 1, -1
    g.rect(hx, hy, 2, 2, col); g.px(hx + 1, hy, INK)
    el = s.get('ear_len', 2)                            # rabbits 2, hares 3
    for k in range(1, el + 1):
        g.px(hx, hy - k, col)
    if 'ear_inner' in s:
        g.px(hx, hy - 1, hexc(s['ear_inner']))
    if frame == 0:
        g.rect(0, H, 2, 1, dark); g.px(L - 2, H, dark)
    else:
        g.px(-1, H, dark); g.px(-2, H, dark); g.px(L, H - 1, dark)
    if 'tail_colour' in s:
        g.px(-1, 0, hexc(s['tail_colour']))
    return g.image()


def wader(s, frame):
    """Standing bird: round body, legs, neck and beak; frame 1 dips the head to peck."""
    g = Grid()
    L, H = s['body']
    col = hexc(s['colour']); dark = hexc(s['shade']) if 'shade' in s else shade(col, 0.75)
    for y in range(H):
        for x in range(L):
            if (x, y) in ((0, 0), (L - 1, 0), (0, H - 1)):
                continue
            g.px(x, y, col)
    if 'wing' in s:
        g.rect(1, 1, L - 3, H - 2, hexc(s['wing']))
    if 'belly' in s:
        g.rect(L - 3, 1, 2, H - 1, hexc(s['belly']))
    lh = s.get('leg', 3)
    lc = hexc(s.get('legs', '#e0702a'))
    for x in (L // 2 - 1, L // 2 + 1):
        for k in range(lh):
            g.px(x, H + k, lc)
    neck = s.get('neck', 1)
    dip = 2 if frame == 1 else 0
    nx = L - 1
    for k in range(neck):
        g.px(nx, -k + (dip if k > neck // 2 else 0), hexc(s.get('neck_colour', s['colour'])))
    hx, hy = nx, -neck - 1 + dip
    hc = hexc(s.get('head_colour', s['colour']))
    g.rect(hx, hy, 2, 2, hc); g.px(hx + 1, hy, INK)
    bc = hexc(s.get('beak', '#e0a020'))
    for k in range(s.get('beak_len', 1)):
        g.px(hx + 2 + k, hy + 1, bc)
    if 'crest' in s:
        g.px(hx, hy - 1, hexc(s['crest'])); g.px(hx + 1, hy - 2, hexc(s['crest']))
    if 'train' in s:                  # peacock: a long tail train behind
        tc, ec = hexc(s['train']), hexc(s.get('train_eye', '#2a7fb0'))
        for k in range(1, 7):
            g.rect(-k, 1 + k // 3, 1, 3, tc)
            if k % 2 == 0:
                g.px(-k, 2 + k // 3, ec)
    return g.image()


def flyer(s, frame):
    """Flying bird facing right, modelled on the hand-drawn sky birds: frame 0 wings up in a V
    rising from both sides of the body, frame 1 wings down in an inverted V."""
    g = Grid()
    L = s['body'][0]
    col = hexc(s['colour']); wingc = hexc(s.get('wing', s['colour']))
    tipc = hexc(s['wing_tip']) if 'wing_tip' in s else shade(wingc, 0.7)
    span = s.get('span', 2)
    for x in range(L):                                  # body
        g.px(x, 0, col)
    if 'belly' in s:
        g.px(L - 2, 0, hexc(s['belly'])); g.px(L - 1, 0, hexc(s['belly']))
    g.px(L, 0, hexc(s.get('head', s['colour'])))
    g.px(L, -1, hexc(s.get('head', s['colour']))) if s.get('big_head') else None
    bc = hexc(s.get('beak', '#2b2b33'))
    for k in range(s.get('beak_len', 0)):
        g.px(L + 1 + k, 0, bc)
    if s.get('fork'):                                   # swallow tail
        g.px(-1, -1, col); g.px(-2, -1, col); g.px(-1, 1, col); g.px(-2, 1, col)
    elif s.get('long_tail'):
        g.px(-1, 0, col); g.px(-2, 0, col); g.px(-3, 0, col)
    else:
        g.px(-1, 0, col)
    c0 = L // 2                                         # wings join the body here
    for k in range(1, span + 1):
        dy = -k if frame == 0 else k
        c = tipc if k == span else wingc
        if 'bars' in s and k % 2 == 0:
            c = hexc(s['bars'])
        g.px(c0 - k, dy, c); g.px(c0 + k, dy, c)        # near wing and far wing
        if s.get('broad') and k < span:
            g.px(c0 - k + 1, dy, c); g.px(c0 + k - 1, dy, c)
    if 'crest' in s:                                    # crest last, so the wings never cover it
        g.px(L, -1, hexc(s['crest'])); g.px(L - 1, -2, hexc(s['crest'])); g.px(L - 2, -2, hexc(s['crest']))
    return g.image()


TEMPLATES = {'quad': quad, 'low': low, 'long': long, 'sitter': sitter, 'hopper': hopper,
             'wader': wader, 'flyer': flyer}


def draw(species):
    """Both frames for one species, padded to one size with feet aligned."""
    t = TEMPLATES[species['template']]
    a, b = t(species, 0), t(species, 1)
    return frames_same_size(a, b)


# ---------- trees: three growth stages (seedling, young, grown), base on the bottom row ----------
# Same stage sizes as the hand-coded trees in make_sprites.py: 3x4, 7x9, 11x14, except where the
# shape itself is taller or wider (cypress, palm, acacia). Lit from the upper left.

def _crown_shade(x, y, cx, cy, w, h, leaf, lit, dark):
    u = (x - cx) / max(1, w / 2); v = (y - cy) / max(1, h / 2)
    k = -0.6 * u - 0.8 * v
    return lit if k > 0.45 else dark if k < -0.35 else leaf


def tree(s, stage):
    g = Grid()
    leaf = hexc(s['leaf']); lit = hexc(s.get('lit', '#000000')) if 'lit' in s else shade(leaf, 1.25)
    dark = hexc(s['dark']) if 'dark' in s else shade(leaf, 0.7)
    trunk = hexc(s.get('trunk', '#7a4a24'))
    shape = s['shape']
    if stage == 0:                                   # seedling: stem and two leaves (grass: a tuft)
        if shape in ('grass', 'moss'):
            for x, y in ((0, 2), (1, 1), (2, 2), (1, 2)):
                g.px(x, y, leaf if shape == 'grass' else dark)
            g.px(1, 0, lit)
        else:
            g.px(1, 3, trunk); g.px(1, 2, dark); g.px(0, 1, leaf); g.px(2, 1, lit); g.px(1, 0, lit)
        return g.image()
    big = stage == 2
    W, H = (11, 14) if big else (7, 9)
    W = s.get('w', (W, W))[stage - 1] if 'w' in s else W
    H = s.get('h', (H, H))[stage - 1] if 'h' in s else H
    cx = W // 2
    th = s.get('trunk_h', (2, 4))[stage - 1]
    tw = 2 if big and shape not in ('palm', 'bamboo', 'grass', 'moss', 'cypress') else 1
    if shape not in ('grass', 'moss', 'bamboo'):     # trunk
        for y in range(H - th, H):
            for x in range(cx - (tw // 2), cx - (tw // 2) + tw):
                g.px(x, y, trunk if x <= cx - (tw // 2) else shade(trunk, 0.75))
    ch = H - th                                      # crown height
    if shape == 'round' or shape == 'blossom' or shape == 'banyan':
        rw = W / 2 + (1 if shape == 'banyan' else 0)
        for y in range(ch + 1):
            for x in range(-1 if shape == 'banyan' else 0, W + (1 if shape == 'banyan' else 0)):
                if ((x - cx) / rw) ** 2 + ((y - ch / 2) / (ch / 2 + 0.5)) ** 2 <= 1:
                    g.px(x, y, _crown_shade(x, y, cx, ch / 2, W, ch, leaf, lit, dark))
        if shape == 'blossom':                       # pink flowers dotted through
            fl = hexc(s.get('flower', '#ffb0c8'))
            for i, (x, y) in enumerate(sorted(g.p)):
                if y < ch and (x * 7 + y * 3) % 5 == 0:
                    g.px(x, y, fl)
        if shape == 'banyan':                        # aerial roots hanging from the crown
            for x in range(0, W, 3):
                for y in range(ch, H - 1):
                    if x != cx:
                        g.px(x, y, shade(trunk, 0.9))
    elif shape == 'cypress':                         # tall narrow flame
        for y in range(ch):
            hw = max(0, round((W / 2 - 0.5) * min(1, (y + 1) / (ch * 0.35)) * (1 - 0.25 * y / ch)))
            for x in range(cx - hw, cx + hw + 1):
                g.px(x, y, lit if x < cx else dark if x > cx else leaf)
    elif shape == 'cone':                            # fir / pine: stacked tiers
        for y in range(ch + 1):
            hw = round((y + 1) / (ch + 1) * (W / 2 - 0.5)) - (1 if y % 3 == 0 and y > 0 else 0)
            for x in range(cx - max(0, hw), cx + max(0, hw) + 1):
                g.px(x, y, (lit if x < cx else leaf) if y % 3 != 2 else dark)
        if s.get('snow'):
            for y in range(0, ch, 3):
                hw = round((y + 1) / (ch + 1) * (W / 2 - 0.5))
                g.px(cx - hw, y, hexc('#ffffff'))
    elif shape == 'umbrella':                        # umbrella pine / acacia: a flat wide top
        top = max(2, ch // 2)
        for y in range(top):
            hw = round(W / 2) - (1 if y == 0 else 0)
            for x in range(cx - hw, cx + hw + 1):
                g.px(x, y, lit if y == 0 else (leaf if y < top - 1 else dark))
        for y in range(top, ch):                     # bare forked trunk under the canopy
            g.px(cx - 1 + (y - top) // 2, y, trunk); g.px(cx + 1 - (y - top) // 2, y, trunk)
    elif shape == 'palm':                            # date palm: tall bare trunk, fronds on top
        for y in range(3, H):
            g.px(cx + (1 if y < H // 2 else 0), y, trunk if y % 2 else shade(trunk, 0.8))
        fr = 3 if big else 2
        for k in range(1, fr + 2):
            for dx, dy in ((-k, k // 2), (k, k // 2), (-k, -1 + k // 2), (k, -1 + k // 2)):
                g.px(cx + 1 + dx, 2 + dy, leaf if abs(dx) < fr else dark)
        g.px(cx + 1, 1, lit); g.px(cx, 1, lit)
        if s.get('dates'):
            g.px(cx, 4, hexc('#c06020')); g.px(cx + 2, 4, hexc('#c06020'))
    elif shape == 'bamboo':                          # a clump of jointed stalks
        stalks = (1, 3, 5) if not big else (1, 3, 5, 7, 9)
        for i, x in enumerate(stalks):
            top = 1 + (i % 2) * 2
            for y in range(top, H):
                g.px(x, y, dark if (y - top) % 3 == 0 else leaf)
            g.px(x + 1, top + 1, lit); g.px(x - 1, top + 2, lit)
    elif shape == 'grass':                           # prairie grass: tall blades
        for x in range(W):
            hgt = H - (x * 5 % 4) - (0 if x % 2 else 2)
            for y in range(H - hgt, H):
                g.px(x, y, lit if y == H - hgt else (leaf if (x + y) % 3 else dark))
        if s.get('seedheads'):
            for x in range(1, W, 3):
                g.px(x, H - (H - (x * 5 % 4)) - 1 if False else 0, hexc(s['seedheads']))
    elif shape == 'moss':                            # a low cushion
        mh = 3 if big else 2
        for y in range(H - mh, H):
            for x in range(W):
                if not (y == H - mh and x in (0, W - 1)):
                    g.px(x, y, lit if y == H - mh else leaf if (x + y) % 3 else dark)
        if s.get('flower'):
            g.px(2, H - mh, hexc(s['flower'])); g.px(W - 3, H - mh, hexc(s['flower']))
    elif shape == 'scrub':                           # dwarf birch: short brown stems with leafy clumps
        stems = (1, 4) if not big else (1, 4, 7, 9)
        for i, x in enumerate(stems):
            top = 1 + (i % 2)
            for y in range(top + 1, H):
                g.px(x, y, trunk if y > top + 1 else shade(trunk, 0.8))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    if abs(dx) + abs(dy) < 2:
                        c = lit if dy < 0 or dx < 0 else (leaf if (dx + dy) % 2 == 0 else dark)
                        g.px(x + dx, top + dy, c)
    if 'fruit' in s and big:
        for x, y in ((2, 4), (7, 3), (4, 7), (8, 7)):
            if (x, y) in g.p:
                g.px(x, y, hexc(s['fruit']))
    return g.image()


def tree_stages(s):
    return [tree(s, st) for st in range(3)]
