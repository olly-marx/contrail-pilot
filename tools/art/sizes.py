"""Real animal sizes -> the size class each animal is drawn at (Oliver, 2026-11-13: "real size classes").

pixellab/sizes.tsv declares each animal's size in metres (largest of head-and-body length or standing height).
A class picks how the sprite is made and installed, by whole-number factors only, so pixels stay crisp:
  tiny   < 0.12 m   32 px art, half size         (insects, frogs, hummingbirds; quarter until 2026-11-13, too small to see)
  small  < 0.5 m    32 px art, half size         (rabbit, robin)
  medium < 1.8 m    32 px art, full size         (fox, wolf, sheep)
  large  < 3.5 m    48 px art, full size         (cow, deer, lion)
  huge   < 5 m      48 px art, full size         (hippo, rhino)
  giant >= 5 m      64 px art, full size         (elephant, giraffe, whale)
Why 'giant' (look-check, 2026-11-13): with elephants on the 64 px canvas a lion (48 px canvas) stood almost as tall as an
elephant. Each canvas step is ~1.3x, close to the square root of the real size ratio between classes.
Narrowed (Oliver, 2026-11-13, on 0.63.0: "shrink the animals a bit and make the biggest vs smallest difference smaller",
trees looked tiny): tiny halved not quartered, huge 64 -> 48, giant 80 -> 64; range ~12-55 px instead of ~7-75; trees
were redrawn at 64 px at the same time (tools/art/install_trees.py).
"""
from pathlib import Path

TSV = Path(__file__).resolve().parent / 'pixellab' / 'sizes.tsv'
LIMITS = (('tiny', 0.12), ('small', 0.5), ('medium', 1.8), ('large', 3.5), ('huge', 5.0))
CANVAS = {'tiny': 32, 'small': 32, 'medium': 32, 'large': 48, 'huge': 48, 'giant': 64}
SHRINK = {'tiny': 2, 'small': 2, 'medium': 1, 'large': 1, 'huge': 1, 'giant': 1}   # installed size = art size / SHRINK (nearest, exact)


def sizes():
    out = {}
    for line in TSV.read_text().splitlines():
        if line.strip() and not line.startswith('#'):
            k, m = line.split('\t')[:2]; out[k] = float(m)
    return out


def size_class(m):
    return next((c for c, lim in LIMITS if m < lim), 'giant')
