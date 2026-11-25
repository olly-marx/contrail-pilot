# THE APP ICON (0.79.0; Oliver, 2026-11-24: 'make the game an icon'): one 128 px PixelLab picture (tools/art/app-icon-128.png: create_image_pro candidate, its frame
# cropped, then a pixflux img2img pass to full bleed) scaled by whole pixels (nearest) to every slot: iOS 1024 (no alpha), the web manifest 192/512, Android's legacy,
# round and adaptive-foreground mipmaps. Adaptive: the picture is the whole foreground layer, so Android's mask crops its edge; the background colour is its sky blue.
#   python3.10 tools/art/make_icons.py
from pathlib import Path
from PIL import Image, ImageDraw
R = Path(__file__).resolve().parents[2]
src = Image.open(R / 'tools/art/app-icon-128.png').convert('RGB')
def up(size): return src.resize((size, size), Image.NEAREST)
up(1024).save(R / 'native/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')   # (1024x1024, RGB: App Store icons may not have alpha)
up(192).save(R / 'assets/icons/icon-192.png'); up(512).save(R / 'assets/icons/icon-512.png')
res = R / 'native/android/app/src/main/res'
for d, n in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    im = up(n); im.save(res / f'mipmap-{d}/ic_launcher.png')
    m = Image.new('L', (n, n), 0); ImageDraw.Draw(m).ellipse((0, 0, n - 1, n - 1), fill=255); rnd = im.convert('RGBA'); rnd.putalpha(m); rnd.save(res / f'mipmap-{d}/ic_launcher_round.png')
    fg = int(n * 108 / 48); up(fg).save(res / f'mipmap-{d}/ic_launcher_foreground.png')   # adaptive foreground: 108 dp of which the middle 72 show
bg = src.getpixel((64, 4)); (res / 'values/ic_launcher_background.xml').write_text(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#{bg[0]:02X}{bg[1]:02X}{bg[2]:02X}</color>\n</resources>\n')
print('icons written; adaptive background', bg)
