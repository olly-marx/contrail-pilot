"""The overheating-planet faces from ONE PixelLab face (the user, 2026-10-24: "the shape and size should stay the
same for each face ... just get redder, and the face's emotion should change").

    PIXELLAB_TOKEN=... python3 tools/art/pixellab_faces.py <happy.png> <out_dir>

Each mood: the happy face's colours are warmed (code, so the outline never moves), then PixelLab inpaint-v3
repaints ONLY the eyes-and-mouth box; only masked pixels are pasted back, snapped to the face's own palette
plus a few face colours. 10 generations per mood. Writes face-<mood>.png (32x32) and provenance.jsonl.
"""
import base64
import io
import json
import sys
import time
from datetime import date
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pixellab_batch import call, log  # noqa: E402

BOX = (7, 10, 25, 25)   # x0, y0, x1, y1 (exclusive): eyes and mouth on the 32x32 happy face
MOODS = {   # warmth 0..1 (hue pulled towards red, more saturated), what the face shows
    'ok': (0.25, 'a slightly nervous face, small uneasy smile, eyebrows tilted up worried'),
    'hot': (0.6, 'a worried hot face, eyebrows up, small wobbly open mouth, one blue sweat drop on the forehead'),
    'melting': (0.95, 'a crying face, eyes squeezed shut with big blue tears streaming down the cheeks, wailing open mouth'),
}
EXTRA = [(255, 255, 255), (20, 20, 28), (230, 90, 100), (120, 190, 255)]   # white, dark, mouth pink, sweat blue


def warm(rgb, t):
    """Blend towards a hot colour of the same brightness: yellowish, then orange, then red as t grows."""
    if max(rgb) < 50 or min(rgb) > 225:   # the outline and the eye whites keep their colour
        return rgb
    hot = [round(255 + (220 - 255) * t), round(200 + (50 - 200) * t), round(60 + (30 - 60) * t)]
    lum = lambda c: 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]
    k = lum(rgb) / lum(hot)
    hot = [min(255, c * k) for c in hot]
    mix = min(1, 0.35 + 0.65 * t) if t > 0.3 else t * 1.5
    return tuple(round(c + (h - c) * mix) for c, h in zip(rgb, hot))


def b64img(im):
    buf = io.BytesIO(); im.convert('RGB').save(buf, 'PNG')
    return {'image': {'type': 'base64', 'base64': base64.b64encode(buf.getvalue()).decode(), 'format': 'png'},
            'size': {'width': im.width, 'height': im.height}}


def first_b64(o):
    if isinstance(o, dict):
        if 'base64' in o: return o['base64'].split(',')[-1]
        o = list(o.values())
    if isinstance(o, list):
        for v in o:
            r = first_b64(v)
            if r: return r
    return None


def inpaint(img, desc):
    mask = Image.new('RGB', img.size, (0, 0, 0)); mask.paste((255, 255, 255), BOX)
    flat = Image.new('RGBA', img.size, (110, 198, 232, 255)); flat.alpha_composite(img)
    job = call('/inpaint-v3', {'description': desc, 'seed': 7, 'inpainting_image': b64img(flat), 'mask_image': b64img(mask)})
    for _ in range(90):
        time.sleep(4)
        r = call(f"/background-jobs/{job['background_job_id']}", method='GET')
        if r.get('status') == 'completed': return Image.open(io.BytesIO(base64.b64decode(first_b64(r['last_response'])))).convert('RGBA')
        if r.get('status') == 'failed': raise RuntimeError(f'inpaint failed: {json.dumps(r)[:300]}')
    raise RuntimeError('inpaint timed out')


def main():
    happy = Image.open(sys.argv[1]).convert('RGBA'); out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    for mood, (t, face) in MOODS.items():
        dst = out / f'face-{mood}.png'
        if dst.exists(): print('skip', mood); continue
        base = happy.copy(); px = base.load()
        for y in range(32):
            for x in range(32):
                r, g, b, a = px[x, y]
                if a: px[x, y] = (*warm((r, g, b), t), a)
        palette = sorted({p[:3] for p in base.getdata() if p[3]}) + EXTRA
        desc = f'pixel art planet Earth face icon, {face}, same style, black outline'
        got = inpaint(base, desc).resize(base.size, Image.NEAREST)
        gp, bp = got.load(), base.load()
        for y in range(BOX[1], BOX[3]):
            for x in range(BOX[0], BOX[2]):
                if bp[x, y][3] == 0: continue   # keep the round outline exactly
                c = gp[x, y][:3]
                bp[x, y] = (*min(palette, key=lambda q: sum((q[i] - c[i]) ** 2 for i in range(3))), 255)
        base.save(dst)
        log(out, 'provenance.jsonl', {'file': dst.name, 'tool': 'inpaint-v3 on face-happy (recoloured)', 'prompt': desc,
                                      'warmth': t, 'box': BOX, 'size': '32x32', 'date': date.today().isoformat()})
        print('done', mood)


if __name__ == '__main__':
    main()
