"""Generate PixelLab animal art straight from the REST API (no AI in the loop; the user's style, 2026-10-23).

    PIXELLAB_TOKEN=... python3 tools/art/pixellab_batch.py <list.txt> <out_dir> [--cap 2.00] [--workers 4]

<list.txt>: lines 'id|name|kind|pose' (pose: ground, flying, standing; a header line is skipped).
Per animal, as approved by the user (see STATE.md, "PIXELLAB PREVIEW"):
  <id>-s.png      in-flight sprite: pixflux 32x32, flat 2D side-on, black outline, flat shading, low detail
  <id>-a0..a3.png animate-with-text-v3, 4 frames
  <id>-f0/f1.png  frames a0 and a2 reduced TOGETHER to 10 colours (one shared palette)
  <id>-card.png   collection card: pixen 64x64, realistic field-guide, plain background
Resume-safe (existing files are skipped). provenance.jsonl and spend.jsonl are appended in <out_dir>.
Stops starting new animals once the batch has spent --cap US dollars.
The token comes from the environment only, and is never printed or written anywhere.
"""
import argparse
import base64
import json
import os
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

API = 'https://api.pixellab.ai/v2'
SWIM = ('salmon', 'pirarucu', 'dolphin', 'turtle', 'seal', 'oyster', 'loggerhead')
lock = threading.Lock()
spent = [0.0]


def call(path, body=None, method='POST', tries=6):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + os.environ['PIXELLAB_TOKEN'], 'Content-Type': 'application/json'})
    for k in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')[:300]
            if e.code in (429, 500, 502, 503, 504) and k < tries - 1:
                time.sleep(5 * (k + 1)); continue   # busy (another batch or session shares the account)
            raise RuntimeError(f'{path}: HTTP {e.code} {msg}')
        except urllib.error.URLError:
            if k < tries - 1: time.sleep(5 * (k + 1)); continue
            raise


def b64(path): return {'type': 'base64', 'base64': base64.b64encode(Path(path).read_bytes()).decode(), 'format': 'png'}
def save(img, path): Path(path).write_bytes(base64.b64decode(img['base64']))


def log(out, name, rec):
    with lock:
        with open(Path(out) / name, 'a') as f: f.write(json.dumps(rec) + '\n')


def charge(out, step, resp):
    usd = ((resp or {}).get('usage') or {}).get('usd') or 0
    with lock: spent[0] += usd
    log(out, 'spend.jsonl', {'step': step, 'usd': usd})


def phrase(name, pose):
    swim = any(w in name.lower() for w in SWIM)
    if pose == 'flying':
        return (f'tiny flat 2D game sprite of a {name} flying right, STRICT SIDE PROFILE: head turned sideways, beak or face '
                'pointing right, only one eye visible, body horizontal, wings raised, natural colours, chunky pixels, few '
                'colours, simple, not facing the viewer'), 'flapping wings, flying, staying in side profile'
    if pose == 'standing':
        return (f'tiny flat 2D game sprite of a {name} standing, facing right, completely side-on profile, true proportions, '
                'natural colours, chunky pixels, few colours, simple'), 'standing still, small head movement'
    verb = 'swimming right' if swim else 'walking right'
    return (f'tiny flat 2D game sprite of a {name} {verb}, completely side-on profile, true proportions, natural colours, '
            'chunky pixels, few colours, simple'), ('swimming' if swim else 'walking')


def card_prompt(name):
    return (f'realistic field-guide pixel art of a {name}, adult, accurate anatomy and true proportions, natural colours, full '
            'body, side view, plain empty transparent background, no ground, no grass, no scenery, no text, not chibi, not cartoon')


NO_ANIMATE = [False]   # --no-animate (the user's art budget, 2026-10-28): 2 gens an animal; the walk frames are made here


def local_frames(src, f0, f1):
    """The two walk frames without animate-with-text: the sprite reduced to 10 colours, and the same frame bobbed 1 px up."""
    from PIL import Image
    im = Image.open(src).convert('RGBA'); a = im.split()[3]
    q = im.convert('RGB').quantize(colors=10, dither=0).convert('RGBA'); q.putalpha(a)
    q.save(f0); b = Image.new('RGBA', q.size, (0, 0, 0, 0)); b.alpha_composite(q, (0, -1)); b.save(f1)


def animal(out, sid, name, pose, cap):
    o = Path(out); p = lambda s: o / f'{sid}-{s}.png'
    if p('card').exists() and p('f1').exists(): return 'done'
    if spent[0] >= cap: return 'cap'
    sprite, action = phrase(name, pose)
    today = str(date.today())
    if not p('s').exists():
        r = call('/create-image-pixflux', {'description': sprite, 'image_size': {'width': 32, 'height': 32}, 'no_background': True,
                 'view': 'side', 'direction': 'east', 'outline': 'single color black outline', 'shading': 'flat shading', 'detail': 'low detail'})
        save(r['image'], p('s')); charge(out, f'{sid}-s', r)
        log(out, 'provenance.jsonl', {'file': p('s').name, 'tool': 'create-image-pixflux', 'prompt': sprite, 'size': '32x32', 'date': today})
    if NO_ANIMATE[0] and not p('f1').exists():
        local_frames(p('s'), p('f0'), p('f1'))
        log(out, 'provenance.jsonl', {'file': f'{sid}-f0/f1.png', 'tool': 'local (10 colours + 1 px bob)', 'prompt': '-', 'size': '32x32', 'date': today})
    if not NO_ANIMATE[0] and not p('a2').exists():
        r = call('/animate-with-text-v3', {'first_frame': b64(p('s')), 'action': action, 'frame_count': 4, 'no_background': True})
        job = r.get('background_job_id'); charge(out, f'{sid}-anim', r)
        for _ in range(225):   # up to 15 min: animations can queue behind other jobs on the account
            j = call(f'/background-jobs/{job}', method='GET')
            if j['status'] in ('completed', 'failed'): break
            time.sleep(4)
        if j['status'] != 'completed': raise RuntimeError(f'{sid}: animation {j["status"]}')
        lr = j.get('last_response') or {}
        frames = lr.get('images') or lr.get('frames') or next((v for v in lr.values() if isinstance(v, list) and v and isinstance(v[0], dict) and 'base64' in v[0]), [])
        if len(frames) < 3: raise RuntimeError(f'{sid}: animation returned {len(frames)} frames; keys {list(lr)}')
        for i, fr in enumerate(frames[:4]):
            save(fr, p(f'a{i}'))
        log(out, 'provenance.jsonl', {'file': f'{sid}-a0..a3.png', 'tool': 'animate-with-text-v3', 'prompt': action, 'size': '32x32', 'date': today})
    if not p('f1').exists():
        r = call('/reduce-colors', {'images': [b64(p('a0')), b64(p('a2'))], 'num_colors': 10, 'dithering': 'none'})
        save(r['images'][0], p('f0')); save(r['images'][1], p('f1')); charge(out, f'{sid}-reduce', r)
        log(out, 'provenance.jsonl', {'file': f'{sid}-f0/f1.png', 'tool': 'reduce-colors', 'prompt': '10 colours, shared palette', 'size': '32x32', 'date': today})
    if not p('card').exists():
        cp = card_prompt(name)
        r = call('/create-image-pixen', {'description': cp, 'image_size': {'width': 64, 'height': 64}, 'no_background': True, 'view': 'side'})
        save(r['image'], p('card')); charge(out, f'{sid}-card', r)
        log(out, 'provenance.jsonl', {'file': p('card').name, 'tool': 'create-image-pixen', 'prompt': cp, 'size': '64x64', 'date': today})
    return 'made'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('list'); ap.add_argument('out'); ap.add_argument('--cap', type=float, default=2.0); ap.add_argument('--workers', type=int, default=4); ap.add_argument('--no-animate', action='store_true')
    a = ap.parse_args()
    NO_ANIMATE[0] = a.no_animate
    Path(a.out).mkdir(parents=True, exist_ok=True)
    rows = [l.split('|') for l in Path(a.list).read_text().splitlines() if '|' in l and not l.startswith('id|')]
    def one(r):
        try: return r[0], animal(a.out, r[0], r[1], r[3] if len(r) > 3 else 'ground', a.cap)
        except Exception as e:
            log(a.out, 'failed.jsonl', {'id': r[0], 'error': str(e)[:300]}); return r[0], f'FAILED {str(e)[:120]}'
    with ThreadPoolExecutor(a.workers) as ex:
        for sid, res in ex.map(one, rows): print(f'{sid:16s} {res}', flush=True)
    print(f'spent ${spent[0]:.3f}', flush=True)


if __name__ == '__main__':
    main()
