"""The 787 Dreamliner's art, made in code from the 1990s twin (eras 4-6, 2026-10-28: NO PixelLab for eras 4-6 until the
user tops up). The twin's gold livery becomes a metallic steel blue (the user: neutral / metallic colours only); the
outline, size (62x27 in flight, the same alpha mask) and hangar portrait (400x176) are the twin's.
Run: python3 tools/art/make_787.py  -> assets/plane-787.png, assets/ui/plane-hangar-787.png, and the 2030s truss-braced
wing (graphite: the same outline until real art) -> assets/plane-truss.png, assets/ui/plane-hangar-truss.png
"""
import colorsys
from PIL import Image

STEEL = (0.60, 0.38, 0.95)   # target hue (steel blue), saturation scale, brightness
GRAPHITE = (0.58, 0.08, 0.8)   # the 2030s: nearly grey, darker
SILVER = (0.55, 0.05, 1.15)   # the far future: pale silver

def recolour(src, dst, to=STEEL):
    im = Image.open(src).convert('RGBA'); px = im.load(); n = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 0.08 <= h <= 0.17 and s > 0.25:   # the twin's gold / brown livery
                r2, g2, b2 = colorsys.hsv_to_rgb(to[0], s * to[1], min(1, v * to[2]))
                px[x, y] = (round(r2 * 255), round(g2 * 255), round(b2 * 255), a); n += 1
    im.save(dst); return n

if __name__ == '__main__':
    a = recolour('assets/plane-twin.png', 'assets/plane-787.png')
    b = recolour('assets/ui/plane-hangar-twin.png', 'assets/ui/plane-hangar-787.png')
    assert a > 20 and b > 500, (a, b)   # the livery was found and changed
    recolour('assets/plane-twin.png', 'assets/plane-hydrogen.png', SILVER); recolour('assets/ui/plane-hangar-twin.png', 'assets/ui/plane-hangar-hydrogen.png', SILVER)
    recolour('assets/plane-twin.png', 'assets/plane-truss.png', GRAPHITE); recolour('assets/ui/plane-hangar-twin.png', 'assets/ui/plane-hangar-truss.png', GRAPHITE)
    print('787 art:', a, 'flight px,', b, 'hangar px recoloured')
