"""Hangar-portrait upgrade parts (art session, 2026-10-23; recipe: research/PLANE-ART-RECIPE.md, "hangar parts").

For each part: cut a <=256 px WINDOW of the 400x176 portrait, paste a rough SKETCH of the new part (the bold
in-flight look: silver, gloss black, gold), PixelLab inpaint-v3 the masked area, and paste back ONLY the mask.
Writes tools/art/planes/upgrades/hangar-<gen>-<part>.png (+ -sketch.png) and appends provenance.jsonl there.

    PIXELLAB_TOKEN=... python3 tools/art/hangar_parts.py <gen> <part> [--seed N] [--sketch-only]

The token comes from the environment only and is never printed or written anywhere.
"""
import argparse
import base64
import io
import json
import os
import time
import urllib.request
from datetime import date

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'planes', 'upgrades')
API = 'https://api.pixellab.ai/v2'
PORTRAIT = {'747': os.path.join(HERE, '..', '..', 'assets', 'ui', 'plane-hangar-jumbo.png'),
            'twin': os.path.join(HERE, '..', '..', 'assets', 'ui', 'plane-hangar-twin.png'),
            'comet': os.path.join(HERE, '..', '..', 'assets', 'ui', 'plane-hangar-comet.png')}

SILVER = [(40, 44, 52), (110, 118, 130), (170, 178, 190), (214, 220, 228), (246, 248, 252)]
GOLD = [(70, 50, 10), (150, 112, 28), (206, 162, 48), (236, 198, 90), (255, 232, 160)]
BLACK = [(8, 8, 10), (16, 18, 22), (26, 30, 38), (40, 46, 58), (66, 76, 94)]


def lum(c):
    return (c[0] * 3 + c[1] * 6 + c[2]) / 10


def recolour(im, mask, ramp, keep_dark=45):
    """Sketch step: repaint the masked opaque pixels with a ramp, keeping light and shade and the black outline."""
    px, m = im.load(), mask.load()
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if m[x, y] and c[3] and lum(c) >= keep_dark:
                px[x, y] = ramp[min(4, int(lum(c) / 256 * 5))] + (255,)


def nacelle(d, box, ramp):
    """A bigger capsule nacelle with a dark fan face at the front (right)."""
    x0, y0, x1, y1 = box
    d.rounded_rectangle(box, radius=(y1 - y0) // 2, fill=ramp[3] + (255,), outline=(0, 0, 0, 255), width=2)
    d.rectangle((x0 + 10, y0 + 3, x1 - 12, y0 + (y1 - y0) // 3), fill=ramp[4] + (255,))
    d.rectangle((x0 + 10, y1 - (y1 - y0) // 4, x1 - 12, y1 - 3), fill=ramp[2] + (255,))
    d.ellipse((x1 - 14, y0 + 2, x1 - 2, y1 - 2), fill=(26, 28, 34, 255), outline=ramp[4] + (255,), width=2)


# part: (window x0, prompt, sketch function(window image) -> mask)
def sk_nextgen(w):
    mask = Image.new('L', w.size)
    d, dm = ImageDraw.Draw(w), ImageDraw.Draw(mask)
    for box in ((58, 137, 128, 172), (128, 137, 192, 172)):     # window coords (window x0 = 60)
        nacelle(d, box, SILVER)
        dm.rounded_rectangle((box[0] - 4, box[1] - 4, box[2] + 4, min(175, box[3] + 3)), radius=8, fill=255)
    return mask


def sk_glass(w):
    """Nose cap only: the black ends on a slanted seam behind the windscreen, like a radome."""
    mask = Image.new('L', w.size)
    ImageDraw.Draw(mask).polygon([(214, 56), (232, 56), (256, 92), (256, 118), (238, 118), (206, 90)], fill=255)
    recolour(w, mask, BLACK)
    return mask


def sk_jt9d(w):
    """Big black fan faces with a silver spinner over the front of both engines (window x0 = 60)."""
    mask = Image.new('L', w.size)
    d, dm = ImageDraw.Draw(w), ImageDraw.Draw(mask)
    for cx in (101, 173):
        d.ellipse((cx - 8, 141, cx + 7, 171), fill=(14, 14, 18, 255), outline=(0, 0, 0, 255), width=2)
        d.ellipse((cx - 2, 152, cx + 3, 160), fill=SILVER[4] + (255,))
        dm.ellipse((cx - 12, 137, cx + 11, 175), fill=255)
    return mask


def sk_hushkit(w):
    """Long ribbed black-and-silver exhaust cones behind both engines (window x0 = 60)."""
    mask = Image.new('L', w.size)
    d, dm = ImageDraw.Draw(w), ImageDraw.Draw(mask)
    for x1 in (68, 140):
        d.polygon([(x1, 146), (x1, 166), (x1 - 22, 160), (x1 - 22, 152)], fill=SILVER[2] + (255,), outline=(0, 0, 0, 255))
        for x in range(x1 - 18, x1, 5):
            d.line([(x, 149), (x, 163)], fill=(20, 20, 24, 255), width=2)
        dm.polygon([(x1 + 3, 142), (x1 + 3, 170), (x1 - 25, 164), (x1 - 25, 148)], fill=255)
    return mask


def sk_upperdeck(w):
    """747-300 hump: the upper deck runs about 40 px further back (window x0 = 100)."""
    mask = Image.new('L', w.size)
    d, dm = ImageDraw.Draw(w), ImageDraw.Draw(mask)
    body = w.getpixel((150, 70))
    d.polygon([(46, 82), (116, 58), (170, 58), (170, 84)], fill=body)
    d.line([(44, 81), (116, 56), (172, 56)], fill=(0, 0, 0, 255), width=4)
    for x in (96, 110, 124, 138):
        d.rectangle((x, 70, x + 4, 75), fill=(40, 60, 90, 255), outline=(120, 130, 140, 255))
    dm.polygon([(34, 88), (114, 50), (176, 50), (176, 88)], fill=255)
    return mask


def sk_winglet(w):
    """An upturned winglet on the near wing tip, in the metal grey of the wing (window x0 = 0)."""
    mask = Image.new('L', w.size)
    d, dm = ImageDraw.Draw(w), ImageDraw.Draw(mask)
    d.polygon([(86, 130), (80, 96), (90, 96), (102, 128)], fill=SILVER[3] + (255,), outline=(0, 0, 0, 255))
    d.line([(84, 100), (92, 126)], fill=SILVER[4] + (255,), width=2)
    dm.polygon([(78, 136), (74, 90), (96, 90), (110, 136)], fill=255)
    return mask


# Comet portrait (assets/ui/plane-hangar-comet.png): engines in the wing root x 160-262, y 132-150 (intakes at the
# front, x 240-262); windows y 105-114 centred x 153 + 12.4k; existing door x 236-246.
COMET_WINDOWS = [153 + round(12.45 * k) for k in range(14)]


def sk_c_intakes(w):
    """Polished silver engine bay and big intake lips (window x0 = 60)."""
    mask = Image.new('L', w.size)
    ImageDraw.Draw(mask).polygon([(98, 134), (205, 130), (206, 152), (98, 150)], fill=255)
    recolour(w, mask, SILVER)
    d = ImageDraw.Draw(w)
    for cx in (184, 196):
        d.ellipse((cx - 6, 137, cx + 6, 151), fill=(20, 22, 28, 255), outline=SILVER[4] + (255,), width=3)
    return mask


def sk_c_reversers(w):
    """Slim black reverser doors with silver edges ON the back of the engine bay, flush, slightly open (x0 = 60)."""
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.polygon([(100, 136), (118, 134), (118, 146), (100, 148)], fill=(18, 18, 22, 255), outline=SILVER[4] + (255,))
    d.line([(100, 136), (95, 133)], fill=SILVER[3] + (255,), width=2)
    d.line([(100, 148), (95, 151)], fill=SILVER[3] + (255,), width=2)
    ImageDraw.Draw(mask).polygon([(92, 131), (121, 131), (121, 151), (92, 154)], fill=255)
    return mask


def sk_c_pinion(w):
    """A polished silver pinion fuel tank slung under the wing (window x0 = 60)."""
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.rounded_rectangle((150, 147, 200, 158), radius=5, fill=SILVER[3] + (255,), outline=(0, 0, 0, 255), width=2)
    d.line([(156, 150), (194, 150)], fill=SILVER[4] + (255,), width=2)
    ImageDraw.Draw(mask).rounded_rectangle((144, 143, 206, 162), radius=7, fill=255)
    return mask


def sk_c_oval(w):
    """Big oval windows with polished silver rims (window x0 = 100)."""
    mask = Image.new('L', w.size)
    d, dm = ImageDraw.Draw(w), ImageDraw.Draw(mask)
    for cx in COMET_WINDOWS:
        x = cx - 100
        if 0 <= x - 7 and x + 7 < 256:
            d.ellipse((x - 5, 102, x + 5, 117), fill=SILVER[4] + (255,), outline=(0, 0, 0, 255))
            d.ellipse((x - 3, 104, x + 3, 115), fill=(30, 50, 90, 255))
            dm.ellipse((x - 7, 100, x + 7, 119), fill=255)
    return mask


def sk_c_tourist(w):
    """Denser window row: an extra window between every pair (window x0 = 100)."""
    mask = Image.new('L', w.size)
    d, dm = ImageDraw.Draw(w), ImageDraw.Draw(mask)
    for a, b in zip(COMET_WINDOWS, COMET_WINDOWS[1:]):
        x = (a + b) // 2 - 100
        if a in (228, 240) or not (4 <= x < 250):
            continue
        d.ellipse((x - 3, 106, x + 3, 113), fill=(30, 60, 140, 255), outline=(150, 150, 150, 255))
        dm.ellipse((x - 5, 104, x + 5, 115), fill=255)
    return mask


def sk_c_galley(w):
    """A gold-framed galley door behind the cockpit (window x0 = 144)."""
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.rounded_rectangle((176, 96, 190, 126), radius=3, fill=GOLD[2] + (255,), outline=GOLD[0] + (255,), width=2)
    d.rectangle((180, 100, 186, 122), fill=GOLD[3] + (255,))
    d.rectangle((183, 110, 185, 112), fill=GOLD[0] + (255,))
    ImageDraw.Draw(mask).rounded_rectangle((172, 92, 194, 130), radius=4, fill=255)
    return mask


# Twin portrait (assets/ui/plane-hangar-twin.png): one big pod x 183-245, y 140-172 (fan face x 228-245);
# near wing tip about x 95-110, y 128-142. 1990s accent is AMBER, so twin upgrade marks use silver and black, not gold.
def sk_t_giantfan(w):
    """A much bigger silver GE90-style pod (window x0 = 60)."""
    mask = Image.new('L', w.size)
    nacelle(ImageDraw.Draw(w), (110, 132, 196, 175), SILVER)
    ImageDraw.Draw(mask).rounded_rectangle((104, 127, 201, 175), radius=12, fill=255)
    return mask


def sk_t_blades(w):
    """Broad swept titanium fan blades in the intake (window x0 = 60)."""
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    cx, cy = 177, 156
    d.ellipse((cx - 10, cy - 15, cx + 9, cy + 15), fill=(24, 26, 32, 255))
    for k in range(6):
        y = cy - 13 + k * 5
        d.polygon([(cx, cy), (cx + 7, y), (cx + 3, y + 4)], fill=SILVER[3 + k % 2] + (255,))
    d.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=SILVER[4] + (255,))
    ImageDraw.Draw(mask).ellipse((cx - 12, cy - 17, cx + 11, cy + 17), fill=255)
    return mask


def sk_t_winglet(w):
    """A tall upturned silver winglet at the near wing tip (window x0 = 0)."""
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.polygon([(100, 138), (94, 104), (104, 104), (114, 136)], fill=SILVER[3] + (255,), outline=(0, 0, 0, 255))
    d.line([(98, 108), (106, 134)], fill=SILVER[4] + (255,), width=2)
    ImageDraw.Draw(mask).polygon([(92, 144), (88, 98), (110, 98), (122, 144)], fill=255)
    return mask


PARTS = {
    't-giantfan': (60, 'one huge polished silver modern turbofan engine nacelle under the wing, GE90 style, dark fan '
                       'face at the front, metallic highlights, pixel art, same style as the airliner', sk_t_giantfan),
    't-blades': (60, 'jet engine intake seen from the side front with broad wide-chord swept titanium fan blades, '
                     'silver spinner, pixel art, same style', sk_t_blades),
    't-winglet': (0, 'tall upturned silver winglet at the tip of the airliner wing, metallic, black outline, pixel '
                     'art, same style as the airliner', sk_t_winglet),
    'c-intakes': (60, 'polished silver chrome jet engine bay in the wing root with two big round intakes with '
                      'shiny metal lips, 1950s jetliner, pixel art, same style', sk_c_intakes),
    'c-reversers': (60, 'slim black thrust reverser doors with silver edges set flush into the back of the engine bay '
                        'in the wing root, 1950s jetliner, pixel art, same style', sk_c_reversers),
    'c-pinion': (60, 'polished silver streamlined fuel tank pod under the wing, 1950s jetliner, pixel art, same '
                     'style', sk_c_pinion),
    'c-oval': (100, 'row of large oval passenger windows with polished silver rims on a cream fuselage, 1950s '
                    'jetliner, pixel art, same style', sk_c_oval),
    'c-tourist': (100, 'dense row of small round passenger windows close together on a cream fuselage, pixel art, '
                       'same style', sk_c_tourist),
    'c-galley': (144, 'gold painted airliner passenger door with a gold frame and handle on a cream fuselage, '
                      'pixel art, same style', sk_c_galley),
    'jt9d': (60, 'big high-bypass turbofan engines seen from the side, large dark black fan face with a silver '
                 'spinner at the front of each engine nacelle, pixel art, same style as the airliner', sk_jt9d),
    'hushkit': (60, 'long ribbed hush kit exhaust cones in black and silver behind each jet engine, metallic, '
                    'pixel art, same style as the airliner', sk_hushkit),
    'upperdeck': (100, 'stretched jumbo jet upper deck hump running further back along the fuselage, cream body, '
                       'black outline, a row of small passenger windows, pixel art, same style as the airliner',
                  sk_upperdeck),
    'winglet': (0, 'tall upturned silver winglet at the tip of the airliner wing, metallic, black outline, pixel '
                   'art, same style as the airliner', sk_winglet),
    'nextgen': (60, 'two large polished silver chrome modern turbofan engine nacelles under the wing, dark fan '
                    'face with spinner at the front, metallic highlights, pixel art, same style as the airliner',
                sk_nextgen),
    'glass': (144, 'gloss black painted airliner nose cap with dark modern glass cockpit windscreen, thin silver '
                   'trim along the seam, smooth curved nose, shiny highlights, pixel art, same style as the airliner', sk_glass),
}


def b64png(im):
    buf = io.BytesIO(); im.save(buf, 'PNG')
    return base64.b64encode(buf.getvalue()).decode()


def call(path, body=None, method='POST'):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body else None,
                                 headers={'Authorization': 'Bearer ' + os.environ['PIXELLAB_TOKEN'],
                                          'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read())


def first_image(o):
    if isinstance(o, dict):
        if 'base64' in o and isinstance(o['base64'], str):
            return o['base64']
        for v in o.values():
            r = first_image(v)
            if r: return r
    if isinstance(o, list):
        for v in o:
            r = first_image(v)
            if r: return r
    return None


def inpaint(win, mask, prompt, seed):
    size = {'width': win.width, 'height': win.height}
    flat = Image.new('RGBA', win.size, (110, 198, 232, 255)); flat.alpha_composite(win)
    r = call('/inpaint-v3', {'description': prompt, 'seed': seed,
                             'inpainting_image': {'image': {'type': 'base64', 'base64': b64png(flat.convert('RGB')), 'format': 'png'}, 'size': size},
                             'mask_image': {'image': {'type': 'base64', 'base64': b64png(mask.convert('RGB')), 'format': 'png'}, 'size': size}})
    job = r.get('background_job_id')
    if job:
        for _ in range(150):
            j = call(f'/background-jobs/{job}', method='GET')
            if j['status'] in ('completed', 'failed'): break
            time.sleep(4)
        if j['status'] != 'completed': raise RuntimeError(f'inpaint {j["status"]}: {str(j)[:300]}')
        r = j.get('last_response') or j
    data = first_image(r)
    if not data: raise RuntimeError(f'no image in response keys {list(r)}')
    return Image.open(io.BytesIO(base64.b64decode(data.split(',')[-1]))).convert('RGBA')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('gen'); ap.add_argument('part'); ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--sketch-only', action='store_true')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    src = Image.open(PORTRAIT[a.gen]).convert('RGBA')
    x0, prompt, sketch = PARTS[a.part]
    win = src.crop((x0, 0, x0 + 256, src.height))
    mask = sketch(win)
    sk = src.copy(); sk.paste(win, (x0, 0))
    sk.save(os.path.join(OUT, f'hangar-{a.gen}-{a.part}-sketch.png'))
    if a.sketch_only:
        print('sketch written'); return
    res = inpaint(win, mask, prompt, a.seed).resize(win.size, Image.NEAREST)
    out = src.copy()
    m = mask.point(lambda v: 255 if v > 127 else 0)
    # paste back ONLY the mask; background-blue pixels the model drew become transparent again
    px = res.load()
    for y in range(res.height):
        for x in range(res.width):
            c = px[x, y]
            if abs(c[0] - 110) + abs(c[1] - 198) + abs(c[2] - 232) < 40:
                px[x, y] = (0, 0, 0, 0)
    region = Image.new('RGBA', win.size); region.paste(res, (0, 0), m)
    base = out.crop((x0, 0, x0 + 256, out.height)); base.paste(region, (0, 0), m)
    out.paste(base, (x0, 0))
    name = f'hangar-{a.gen}-{a.part}.png'
    out.save(os.path.join(OUT, name))
    with open(os.path.join(OUT, 'provenance.jsonl'), 'a') as f:
        f.write(json.dumps({'file': name, 'tool': 'inpaint-v3', 'prompt': prompt, 'seed': a.seed,
                            'window_x0': x0, 'source': os.path.basename(PORTRAIT[a.gen]),
                            'sketch': f'hangar-{a.gen}-{a.part}-sketch.png', 'date': str(date.today())}) + '\n')
    print('wrote', name)


if __name__ == '__main__':
    main()


# ---- livery parts: recolours that keep the portrait's own light, shade and texture (no PixelLab) ----
GOLD = [(70, 50, 10), (150, 112, 28), (206, 162, 48), (236, 198, 90), (255, 232, 160)]


def gold_band(im):
    """Business class: a broad gold band above and below the main window row, and a gold tail tip (747)."""
    px = im.load()
    for y in list(range(88, 95)) + list(range(106, 111)):
        for x in range(95, 392):
            c = px[x, y]
            if c[3] and lum(c) > 150 and abs(c[0] - c[2]) < 60:          # cream body only, not windows
                px[x, y] = GOLD[3 if y < 100 else 2] + (255,)
    for y in range(2, 22):
        for x in range(10, 60):
            c = px[x, y]
            if c[3] and lum(c) >= 45:
                px[x, y] = GOLD[min(4, int(lum(c) / 256 * 5) + 1)] + (255,)
    return im



def body_px(c):
    """White/cream fuselage paint (not windows, outline or the era accent)."""
    return c[3] and lum(c) > 170 and max(c[:3]) - min(c[:3]) < 40


def t_tail(im):
    """Twin Wings L1, composite tail: the fin turns carbon black with a satin sheen (keeps its shading)."""
    px = im.load()
    for y in range(5, 92):
        for x in range(20, 125):
            c = px[x, y]
            if c[3] and lum(c) >= 40 and (y < 84 or x < 110):
                px[x, y] = BLACK[min(4, int(lum(c) / 256 * 5))] + (255,)
    return im


def t_riblets(im):
    """Twin Wings L4, riblet film: fine silver diagonal sheen streaks across the white fuselage."""
    px = im.load()
    for y in range(80, 135):
        for x in range(100, 390):
            c = px[x, y]
            if body_px(c) and (x + y) % 14 in (0, 1):
                px[x, y] = SILVER[2] + (255,)
    return im


def t_premium(im):
    """Twin Cabin L3, premium economy: a broad charcoal band above the window row with a silver pinstripe."""
    px = im.load()
    for y in range(87, 96):
        for x in range(105, 385):
            c = px[x, y]
            if body_px(c):
                px[x, y] = (SILVER[4] if y == 89 else BLACK[3] if y < 92 else BLACK[2]) + (255,)
    return im


def t_glow(im):
    """Twin Cabin L4, flat beds: every window glows warm white, with a soft halo."""
    px = im.load()
    for y in range(96, 112):
        for x in range(105, 335):
            c = px[x, y]
            if c[3] and 40 <= lum(c) < 120:
                px[x, y] = (255, 246, 214, 255)
            elif c[3] and lum(c) < 40 and 98 <= y <= 109:
                px[x, y] = (255, 228, 160, 255)
    return im


def combine(gen, parts, name):
    """Stack finished parts: each part's changed pixels (vs the clean portrait) go on top, in order."""
    src = Image.open(PORTRAIT[gen]).convert('RGBA')
    out = src.copy()
    for p in parts:
        im = Image.open(os.path.join(OUT, f'hangar-{gen}-{p}.png')).convert('RGBA')
        diff = Image.new('L', src.size)
        a, b, d = src.load(), im.load(), diff.load()
        for y in range(src.height):
            for x in range(src.width):
                if a[x, y] != b[x, y]:
                    d[x, y] = 255
        out.paste(im, (0, 0), diff)
    out.save(os.path.join(OUT, f'hangar-{gen}-{name}.png'))


# ---- hangar GADGETS (user, 2026-10-24): each is a transparent OVERLAY the size of the portrait (only the pixels
# the gadget changes), so the hangar can stack any gadgets on any plane-part variant. Shape additions go through
# PixelLab (sketch + inpaint); flat panels and recolours are drawn locally for free (the "cheaper route").
INK4 = (14, 14, 18, 255)


def g_sketch_magnet747(w):          # window x0 = 0; on the tail fin
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.rounded_rectangle((48, 30, 78, 64), radius=12, fill=(220, 40, 36, 255), outline=(0, 0, 0, 255), width=3)
    d.rectangle((56, 30, 70, 52), fill=w.getpixel((40, 60)))
    d.rectangle((54, 28, 72, 50), outline=None, fill=None)
    d.rectangle((48, 28, 56, 36), fill=SILVER[4] + (255,), outline=(0, 0, 0, 255), width=2)
    d.rectangle((70, 28, 78, 36), fill=SILVER[4] + (255,), outline=(0, 0, 0, 255), width=2)
    d.rectangle((57, 30, 69, 50), fill=w.getpixel((62, 70)))
    ImageDraw.Draw(mask).rectangle((43, 23, 83, 69), fill=255)
    return mask


def g_sketch_coil747(w):            # 1970s electromagnet, sitting INSIDE the fin (user: it stuck out of the tail)
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.rounded_rectangle((40, 58, 72, 76), radius=3, fill=(96, 96, 104, 255), outline=(0, 0, 0, 255), width=2)
    for x in range(45, 68, 4):
        d.rectangle((x, 59, x + 2, 75), fill=(206, 120, 52, 255))
        d.line([(x + 2, 59), (x + 2, 75)], fill=(150, 78, 30, 255))
    for x, y in ((38, 55), (74, 55), (56, 53), (38, 79)):
        d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=(120, 210, 255, 255))
    ImageDraw.Draw(mask).rectangle((35, 52, 77, 80), fill=255)
    return mask


def g_sketch_gear747(w):            # window x0 = 144; four-wheel bogie under the belly, gear down
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    for cx in (148, 178):
        d.rectangle((cx - 2, 146, cx + 2, 162), fill=SILVER[2] + (255,), outline=(0, 0, 0, 255))
        d.rectangle((cx - 12, 161, cx + 12, 164), fill=(30, 30, 34, 255))
        for wx in (cx - 8, cx + 8):
            d.ellipse((wx - 6, 162, wx + 6, 174), fill=INK4, outline=(0, 0, 0, 255), width=1)
            d.ellipse((wx - 2, 166, wx + 2, 170), fill=SILVER[3] + (255,))
    ImageDraw.Draw(mask).rectangle((128, 144, 198, 175), fill=255)
    return mask


def g_sketch_auto747(w):            # window x0 = 144; two blade antennas on the hump roof
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    for x in (126, 146):
        d.polygon([(x, 56), (x + 3, 40), (x + 7, 40), (x + 9, 56)], fill=(24, 24, 28, 255), outline=(0, 0, 0, 255))
        d.line([(x + 4, 42), (x + 5, 54)], fill=SILVER[3] + (255,))
    ImageDraw.Draw(mask).rectangle((120, 34, 162, 58), fill=255)
    return mask


GADGETS = {
    ('747', 'magnet'): (0, 'copper electromagnet coil wound on an iron core stuck on the tail fin, blue electric '
                          'sparks around it, bold, pixel art, same style as the airliner', g_sketch_coil747),
    ('747', 'gear'): (144, 'airliner main landing gear down: chrome strut and a four-wheel bogie with black tyres '
                           'under the belly, pixel art, same style as the airliner', g_sketch_gear747),
    ('747', 'auto'): (144, 'two black blade radio antennas on the roof of the airliner, pixel art, same style',
                      g_sketch_auto747),
}


def overlay(src, out):
    """Pixels of `out` that differ from `src`, on a transparent canvas."""
    ov = Image.new('RGBA', src.size)
    a, b, o = src.load(), out.load(), ov.load()
    for y in range(src.height):
        for x in range(src.width):
            if a[x, y] != b[x, y]:
                o[x, y] = b[x, y] if b[x, y][3] else (0, 0, 0, 0)
    return ov


def gadget_pixellab(gen, gadget, seed=7, sketch_only=False):
    src = Image.open(PORTRAIT[gen]).convert('RGBA')
    x0, prompt, sketch = GADGETS[(gen, gadget)]
    win = src.crop((x0, 0, x0 + 256, src.height))
    mask = sketch(win)
    if sketch_only:
        sk = src.copy(); sk.paste(win, (x0, 0)); return sk
    res = inpaint(win, mask, prompt, seed).resize(win.size, Image.NEAREST)
    px = res.load()
    for y in range(res.height):
        for x in range(res.width):
            c = px[x, y]
            if abs(c[0] - 110) + abs(c[1] - 198) + abs(c[2] - 232) < 40:
                px[x, y] = (0, 0, 0, 0)
    m = mask.point(lambda v: 255 if v > 127 else 0)
    out = src.copy(); base = out.crop((x0, 0, x0 + 256, out.height)); base.paste(res, (0, 0), m); out.paste(base, (x0, 0))
    name = f'gadget-{gen}-{gadget}.png'
    overlay(src, out).save(os.path.join(OUT, name))
    with open(os.path.join(OUT, 'provenance.jsonl'), 'a') as f:
        f.write(json.dumps({'file': name, 'tool': 'inpaint-v3', 'prompt': prompt, 'seed': seed, 'window_x0': x0,
                            'kind': 'overlay', 'source': os.path.basename(PORTRAIT[gen]), 'date': str(date.today())}) + '\n')
    return out


def gadget_hold747():
    """1970s belly fairing: a black panel with a light stripe on the 747 belly (local, free)."""
    src = Image.open(PORTRAIT['747']).convert('RGBA'); out = src.copy(); px = out.load()
    for y in range(126, 140):
        for x in range(250, 330):
            c = px[x, y]
            if c[3] and lum(c) >= 45:
                px[x, y] = (SILVER[3] if y == 129 else BLACK[2] if y < 134 else BLACK[1]) + (255,)
    return overlay(src, out)


def gadget_radar747():
    """1970s weather-radar nose cone: a dark grey radome over the nose tip (local, free)."""
    src = Image.open(PORTRAIT['747']).convert('RGBA'); out = src.copy(); px = out.load()
    for y in range(70, 125):
        for x in range(372, 400):
            c = px[x, y]
            if c[3] and lum(c) >= 45 and (x - 372) * 2 > abs(y - 100) - 10:
                px[x, y] = BLACK[min(4, int(lum(c) / 256 * 5)) if lum(c) < 200 else 3] + (255,)
    return overlay(src, out)


# ---- Comet (1950s) and twin (1990s) gadgets, and the 747 belly fairing reshaped (2026-10-24) ----
RED, RED_D = (220, 40, 36, 255), (150, 20, 20, 255)


def g_sketch_horseshoe(w):          # Comet, window x0 = 0: red horseshoe magnet inside the fin
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.rounded_rectangle((42, 52, 66, 76), radius=10, fill=RED, outline=(0, 0, 0, 255), width=2)
    d.rectangle((49, 50, 59, 68), fill=w.getpixel((70, 80)))
    for x in (42, 59):
        d.rectangle((x, 50, x + 7, 56), fill=SILVER[4] + (255,), outline=(0, 0, 0, 255))
    ImageDraw.Draw(mask).rectangle((37, 46, 71, 80), fill=255)
    return mask


def g_sketch_sacks(w):              # Comet, window x0 = 144: two canvas mail sacks at the hold door
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    for x in (146, 162):
        d.rounded_rectangle((x, 122, x + 13, 142), radius=5, fill=(214, 196, 150, 255), outline=(0, 0, 0, 255), width=2)
        d.line([(x + 3, 125), (x + 10, 125)], fill=GOLD[1] + (255,), width=2)
        d.line([(x + 9, 130), (x + 9, 139)], fill=(164, 144, 100, 255))
    ImageDraw.Draw(mask).rectangle((141, 117, 181, 147), fill=255)
    return mask


def g_sketch_gear2(w):              # Comet, window x0 = 144: single leg with two wheels, gear down
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.rectangle((158, 142, 162, 160), fill=SILVER[2] + (255,), outline=(0, 0, 0, 255))
    for wx in (153, 167):
        d.ellipse((wx - 6, 160, wx + 6, 172), fill=INK4, outline=(0, 0, 0, 255))
        d.ellipse((wx - 2, 164, wx + 2, 168), fill=SILVER[3] + (255,))
    ImageDraw.Draw(mask).rectangle((143, 140, 177, 175), fill=255)
    return mask


def g_sketch_disc(w):               # twin, window x0 = 0: silver neodymium disc with blue field sparkles
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.ellipse((50, 40, 76, 66), fill=SILVER[3] + (255,), outline=(0, 0, 0, 255), width=2)
    d.ellipse((55, 45, 66, 56), fill=SILVER[4] + (255,))
    for x, y in ((46, 36), (80, 36), (46, 70), (80, 70), (63, 34)):
        d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=(120, 210, 255, 255))
    ImageDraw.Draw(mask).rectangle((42, 31, 85, 75), fill=255)
    return mask


def g_sketch_gear6(w):              # twin, window x0 = 144: six-wheel bogie (three wheels visible), gear down
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.rectangle((166, 134, 170, 158), fill=SILVER[2] + (255,), outline=(0, 0, 0, 255))
    d.rectangle((148, 157, 188, 160), fill=(30, 30, 34, 255))
    for wx in (153, 168, 183):
        d.ellipse((wx - 6, 160, wx + 6, 172), fill=INK4, outline=(0, 0, 0, 255))
        d.ellipse((wx - 2, 164, wx + 2, 168), fill=SILVER[3] + (255,))
    ImageDraw.Draw(mask).rectangle((143, 132, 194, 175), fill=255)
    return mask


def g_sketch_humid(w):              # twin, window x0 = 144: side humidity probe on the forward fuselage
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.rounded_rectangle((200, 112, 214, 122), radius=2, fill=SILVER[3] + (255,), outline=(0, 0, 0, 255), width=2)
    d.rectangle((206, 115, 209, 118), fill=(120, 210, 255, 255))
    d.line([(214, 117), (222, 117)], fill=(0, 0, 0, 255), width=2)
    ImageDraw.Draw(mask).rectangle((196, 108, 226, 126), fill=255)
    return mask


def g_sketch_dome(w):               # twin, window x0 = 144: white satellite-communications dome on the roof
    mask = Image.new('L', w.size)
    d = ImageDraw.Draw(w)
    d.chord((122, 66, 156, 96), 180, 360, fill=(250, 250, 252, 255), outline=(0, 0, 0, 255), width=2)
    d.line([(128, 76), (146, 72)], fill=SILVER[2] + (255,))
    ImageDraw.Draw(mask).rectangle((118, 62, 160, 84), fill=255)
    return mask


GADGETS.update({
    ('comet', 'magnet'): (0, 'red horseshoe magnet with silver tips stuck on the tail fin, bold, pixel art, same style',
                          g_sketch_horseshoe),
    ('comet', 'hold'): (144, 'two canvas mail sacks tied with string at the cargo door of a 1950s airliner, pixel '
                             'art, same style', g_sketch_sacks),
    ('comet', 'gear'): (144, '1950s airliner landing gear down: a chrome leg with two black tyres, pixel art, same style',
                        g_sketch_gear2),
    ('twin', 'magnet'): (0, 'polished silver disc magnet on the tail fin with small blue sparkles around it, pixel art, '
                            'same style', g_sketch_disc),
    ('twin', 'gear'): (144, 'airliner main landing gear down: chrome strut and a six-wheel bogie, three black tyres '
                            'visible, pixel art, same style', g_sketch_gear6),
    ('twin', 'sensor'): (144, 'small silver humidity sensor probe box with a blue light on the side of the airliner '
                              'nose, pixel art, same style', g_sketch_humid),
    ('twin', 'auto'): (144, 'white satellite communications dome fairing on the roof of the airliner, pixel art, same style',
                       g_sketch_dome),
})


def local_overlay(gen, draw):
    src = Image.open(PORTRAIT[gen]).convert('RGBA'); out = src.copy()
    draw(ImageDraw.Draw(out))
    return overlay(src, out)


def fairing(d, x0, x1, y0, y1):
    """A rounded black belly fairing with a light stripe, bulging below the belly line."""
    d.rounded_rectangle((x0, y0, x1, y1), radius=(y1 - y0) // 2, fill=BLACK[2] + (255,), outline=(0, 0, 0, 255), width=2)
    d.line([(x0 + 8, y0 + 4), (x1 - 8, y0 + 4)], fill=SILVER[3] + (255,), width=2)
    d.line([(x0 + 8, y1 - 4), (x1 - 8, y1 - 4)], fill=BLACK[1] + (255,), width=2)


def gadget_hold747():
    return local_overlay('747', lambda d: fairing(d, 268, 336, 130, 148))


def gadget_hold_twin():
    return local_overlay('twin', lambda d: fairing(d, 262, 342, 124, 144))


def gadget_probe_comet():           # thermometer probe: red-and-black striped rod with a red bulb under the nose
    def draw(d):
        d.line([(366, 124), (392, 126)], fill=(0, 0, 0, 255), width=4)
        for x in range(368, 390, 6):
            d.line([(x, 125), (x + 2, 125)], fill=RED, width=2)
        d.ellipse((388, 121, 398, 131), fill=RED, outline=(0, 0, 0, 255), width=2)
    return local_overlay('comet', draw)


def gadget_antenna_comet():         # one black blade antenna on the roof
    def draw(d):
        d.polygon([(250, 89), (254, 72), (259, 72), (262, 89)], fill=(24, 24, 28, 255), outline=(0, 0, 0, 255))
        d.line([(255, 75), (257, 87)], fill=SILVER[3] + (255,))
    return local_overlay('comet', draw)
