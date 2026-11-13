"""Redraw the LARGE and HUGE animals on a bigger canvas (Oliver, 2026-11-13: real size classes).

    PIXELLAB_TOKEN=... python3 tools/art/pixellab_big.py [--only id,id] [--cap 1.0] [--workers 3]

Which animals and how big comes from tools/art/sizes.py (declared metres in pixellab/sizes.tsv): large = 48 px canvas,
huge = 64 px. The prompt is the animal's own last pixflux prompt from its batch's provenance.jsonl, with 'tiny' dropped,
so it is the same animal the player already knows. Writes <batch>/<id>-L-s.png and <id>-L-f0/f1.png (10 colours + 1 px
bob, as pixellab_batch.py --no-animate); install_pixellab.py prefers the -L- frames. The card is not redrawn.
Resume-safe: existing -L-f1.png files are skipped.
"""
import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

import pixellab_batch as pb
from sizes import CANVAS, size_class, sizes

SRC = Path(__file__).resolve().parent / 'pixellab'


def last_prompt(sid):
    """(batch dir, prompt) of the newest pixflux sprite for this id."""
    found = None
    for prov in sorted(SRC.glob('*/provenance.jsonl')):
        for line in prov.read_text().splitlines():
            r = json.loads(line)
            if r.get('file') == f'{sid}-s.png' and r.get('tool') == 'create-image-pixflux': found = (prov.parent, r['prompt'])
    if found: return found
    # The first UK batch logged no per-file prompt: rebuild it the way pixellab_batch.py does, from the species name.
    from species import SPECIES
    sp = next(x for x in SPECIES if x['id'] == sid)
    return next(SRC.glob(f'*/{sid}-card.png')).parent, pb.phrase(sp['name'], 'standing' if sp['kind'] == 'bird' else 'ground')[0]


def one(sid, cap):
    d, prompt = last_prompt(sid)
    n = CANVAS[size_class(sizes()[sid])]
    s, f0, f1 = d / f'{sid}-L-s.png', d / f'{sid}-L-f0.png', d / f'{sid}-L-f1.png'
    if f1.exists(): return sid, 'done'
    if pb.spent[0] >= cap: return sid, 'cap'
    prompt = prompt.replace('tiny flat 2D game sprite', 'flat 2D game sprite') + ', the animal fills the picture, facing right, no ground, no shadow'
    r = pb.call('/create-image-pixflux', {'description': prompt, 'image_size': {'width': n, 'height': n}, 'no_background': True,
                'view': 'side', 'direction': 'east', 'outline': 'single color black outline', 'shading': 'flat shading', 'detail': 'low detail'})
    pb.save(r['image'], s); pb.charge(d, f'{sid}-L-s', r)
    pb.log(d, 'provenance.jsonl', {'file': s.name, 'tool': 'create-image-pixflux', 'prompt': prompt, 'size': f'{n}x{n}', 'date': str(date.today())})
    pb.local_frames(s, f0, f1)
    return sid, f'made {n}px'


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--cap', type=float, default=1.0); ap.add_argument('--workers', type=int, default=3)
    a = ap.parse_args()
    ids = [k for k, m in sizes().items() if size_class(m) in ('large', 'huge')]
    if a.only: ids = [k for k in ids if k in a.only.split(',')]
    with ThreadPoolExecutor(a.workers) as ex:
        for sid, res in ex.map(lambda k: one(k, a.cap), ids): print(f'{sid:16s} {res}', flush=True)
    print(f'spent ${pb.spent[0]:.3f}')


if __name__ == '__main__':
    main()
