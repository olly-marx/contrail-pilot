"""Season-2 generic towns composed from existing skyline pieces (0 PixelLab gens; Coordinator 2026-10-28: compose
where a real skyline is not distinctive). Only generic houses, pines, mountains and palms are cropped: never another
city's named landmark.   python3 compose_towns.py <repo> <out_dir>"""
import sys
from PIL import Image, ImageDraw
repo, out = sys.argv[1], sys.argv[2]
src = lambda k: Image.open(f'{repo}/assets/landmark-{k}.png').convert('RGBA')
def crop(k, x0, x1):
    im = src(k); c = im.crop((x0, 0, x1, im.height)); bb = c.getbbox(); return c.crop((bb[0], 0, bb[2], im.height)) if bb else c
GROUND = (42, 47, 69, 255)
def join(parts, gap=-1):
    # Butted together (no seam), each piece's own ground strip trimmed, then ONE ground line under the whole scene.
    parts = [p.crop((0, 0, p.width, p.height - 1)) for p in parts]
    h = max(p.height for p in parts) + 2; w = sum(p.width for p in parts) + gap * (len(parts) - 1)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); x = 0
    for p in parts: im.alpha_composite(p, (x, h - 2 - p.height)); x += p.width + gap
    ImageDraw.Draw(im).rectangle([0, h - 2, w - 1, h - 1], fill=GROUND)
    return im.crop(im.getbbox())
TOWNS = {
    'rovaniemi': [('fairbanks', 0, 80), ('yellowknife', 0, 62)],                   # snowy pines and a cabin, wooden houses
    'puntaarenas': [('reykjavik', 0, 50), ('reykjavik', 68, 120)],                 # a colourful row of houses (no spire)
    'puertomadryn': [('iqaluit', 0, 62), ('reykjavik', 68, 120)],                  # a small white church and houses
    'balmaceda': [('akureyri', 0, 62), ('yellowknife', 60, 123)],                  # a mountain and a few houses
    'cairns': [('darwin', 0, 55), ('darwin', 95, 124)],                            # palms and one tower (no crocodile)
}
for k, parts in TOWNS.items(): join([crop(*p) for p in parts]).save(f'{out}/sky-{k}.png')
print('composed', ', '.join(TOWNS))
