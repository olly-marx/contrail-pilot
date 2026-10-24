"""Generate non-animal PixelLab art (landmarks, icons, badges, faces, fields, globe) from the REST API.

    PIXELLAB_TOKEN=... python3 tools/art/pixellab_misc.py <list.txt> <out_dir> [--workers 4]

<list.txt>: lines 'id|tool|width|height|colours|prompt' ('#' lines skipped). tool: pixflux (small in-game art,
the user's style: flat 2D side-on, black outline, flat shading, low detail) or pixen (detailed, realistic).
colours > 0 reduces the picture to that many colours (reduce-colors, no dithering) as <id>.png; the raw result
is kept as <id>-raw.png. Resume-safe (existing <id>.png skipped). provenance.jsonl is appended in <out_dir>.
The token comes from the environment only, and is never printed or written anywhere.
"""
import argparse
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pixellab_batch import b64, call, log, save  # noqa: E402

FLAT = {'outline': 'single color black outline', 'shading': 'flat shading', 'detail': 'low detail'}


def one(out, line):
    pid, tool, w, h, colours, prompt = line.split('|', 5)
    final = out / f'{pid}.png'
    if final.exists():
        return f'skip {pid}'
    raw = out / f'{pid}-raw.png'
    size = {'width': int(w), 'height': int(h)}
    if tool == 'pixflux':
        r = call('/create-image-pixflux', {'description': prompt, 'image_size': size, 'no_background': True, 'view': 'side', **FLAT})
    else:
        r = call('/create-image-pixen', {'description': prompt, 'image_size': size, 'no_background': True, 'view': 'side'})
    save(r['image'], raw)
    if int(colours) > 0:
        save(call('/reduce-colors', {'images': [b64(raw)], 'num_colors': int(colours), 'dithering': 'none'})['images'][0], final)
    else:
        final.write_bytes(raw.read_bytes())
    log(out, 'provenance.jsonl', {'file': final.name, 'tool': f'create-image-{tool}', 'prompt': prompt, 'size': f'{w}x{h}',
                                  'colours': int(colours), 'date': date.today().isoformat()})
    return f'done {pid}'


def main():
    a = argparse.ArgumentParser()
    a.add_argument('list'); a.add_argument('out'); a.add_argument('--workers', type=int, default=4)
    o = a.parse_args()
    out = Path(o.out); out.mkdir(parents=True, exist_ok=True)
    lines = [l.strip() for l in Path(o.list).read_text().splitlines() if l.strip() and not l.startswith('#')]
    with ThreadPoolExecutor(o.workers) as ex:
        for r in ex.map(lambda l: _safe(out, l), lines):
            print(r, flush=True)


def _safe(out, line):
    try:
        return one(out, line)
    except Exception as e:  # one bad picture must not stop the batch
        return f'FAIL {line.split("|")[0]}: {type(e).__name__} {str(e)[:200]}'


if __name__ == '__main__':
    main()
