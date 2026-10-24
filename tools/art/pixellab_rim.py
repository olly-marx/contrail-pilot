"""The storm 'pipe rim' (the user, 2026-10-24: the gap end should fill the box and feel like a Flappy Bird pipe).

    PIXELLAB_TOKEN=... python3 tools/art/pixellab_rim.py <tower.png> <out.png>

Takes the top 64 x 48 of a storm tower (crown up), sketches a flat-topped rounded cloud slab over the crown (the art
session's tip: a rough sketch in the right colours, then inpaint), and lets PixelLab inpaint-v3 repaint just that area
as billowing cloud with a flat top edge. Writes the inpainted top (64 x 48); 10 generations.
"""
import sys
from datetime import date
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pixellab_batch import log  # noqa: E402
import pixellab_faces as pf  # noqa: E402

SKY = (110, 198, 232)
RIM = (2, 2, 62, 24)   # the slab: x0, y0, x1, y1


def main():
    tower = Image.open(sys.argv[1]).convert('RGBA'); tower = tower.crop(tower.getbbox())
    top = Image.new('RGBA', (64, 48)); top.alpha_composite(tower.crop((0, 0, tower.width, 48)), ((64 - tower.width) // 2, 0))
    sketch = Image.new('RGBA', (64, 48), (*SKY, 255)); sketch.alpha_composite(top)
    g = ImageDraw.Draw(sketch)
    g.rounded_rectangle(RIM, radius=6, fill=(170, 176, 188, 255))
    g.rectangle((RIM[0] + 4, RIM[1], RIM[2] - 4, RIM[1] + 3), fill=(245, 247, 250, 255))   # sunlit flat top
    pf.BOX = (0, 0, 64, RIM[3] + 4)
    desc = ('pixel art storm cloud, a wide flat-topped billowing cloud rim, perfectly flat straight top edge, puffy rounded '
            'sides, sunlit white top, grey shading below, same style as the cloud below, sky blue background')
    got = pf.inpaint(sketch, desc).resize((64, 48), Image.NEAREST)
    out = top.copy(); op, gp = out.load(), got.load()
    for y in range(pf.BOX[3]):
        for x in range(64):
            r, g2, b, _ = gp[x, y]
            sky = abs(r - SKY[0]) + abs(g2 - SKY[1]) + abs(b - SKY[2]) < 60
            op[x, y] = (0, 0, 0, 0) if sky else (r, g2, b, 255)
    out.save(sys.argv[2])
    log(Path(sys.argv[2]).parent, 'provenance.jsonl', {'file': Path(sys.argv[2]).name, 'tool': 'inpaint-v3 on a sketched rim',
        'prompt': desc, 'from': sys.argv[1], 'size': '64x48', 'date': date.today().isoformat()})


if __name__ == '__main__':
    main()
