"""Era 4-6 airport and gadget pictures (2026-11): control towers 7-12 (ATC levels 7-12), ground stations for the 2010s / 2030s / far future (Forecasting),
and the in-flight sensor / autopilot stickers for the 2010s / 2030s / far future. Tiny pictures drawn by hand as character grids in the SAME palette as the 1950s-1990s
set (assets/upgrades/tower-1..6, station-*, sticker-*): PixelLab cannot draw 13x30 / 7x5 pictures, so these are authored here.
Run: python3 tools/art/make_future_airport.py -> assets/upgrades/{tower-7..12, station-2010s|2030s|future, sticker-sensor-*, sticker-auto-*}.png"""
from PIL import Image
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'assets/upgrades')
P = {'a': (226, 52, 46), 'b': (96, 102, 112), 'c': (240, 244, 248), 'd': (44, 48, 58), 'e': (150, 200, 236), 'f': (88, 150, 210), 'g': (234, 230, 216), 'h': (204, 206, 202),
     'k': (12, 12, 14), 'l': (176, 182, 190), 'm': (112, 118, 128), 'G': (60, 224, 140), 'Y': (255, 208, 64), 'S': (40, 80, 170), 's': (110, 160, 230),
     'T': (60, 200, 200), 'V': (170, 120, 230), 'M': (230, 100, 200), 'W': (200, 236, 244), 'C': (120, 210, 255)}
def grid(rows):
    w = max(len(r) for r in rows); im = Image.new('RGBA', (w, len(rows)), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.': im.putpixel((x, y), P[ch] + (255,))
    return im
def tower(top, shaft='gg h'.replace(' ', ''), shaftcols=(5, 8), cab_rows=None, extra=None):
    pass
SHAFT = '.....ggh.....'
def stack(top, shaft_rows=17, shaft=SHAFT): return top + [shaft] * shaft_rows
T = {}
# the 2010s (ATC 7, 8): the glass cab of tower 6, a second dish and a green status light; then a solar roof
T[7] = stack(['..W.a........', '.cc.b.b.b.cc.', '.cc.b.b.b.cc.', '..b.b.b.b.b..', '.b.b.b.b.b...', '.b.b.b.b.b...',
              'ddddddddddddd', 'eefeeefeeefee', 'eefeeefeeefee', 'eefeeefeeefee', 'eeGeeefeeeGee', 'eefeeefeeefee', 'ddddddddddddd'], 17)
T[8] = stack(['...a.........', 'SssSssSssSssS', 'SssSssSssSssS', '.b.b.b.b.b.b.', '.b.b.b.b.b.cc', '.b.b.b.b.b.cc',
              'ddddddddddddd', 'eefeeefeeefee', 'eefeeefeeefee', 'eefeeefeeefee', 'eeGeeefeeeGee', 'eefeeefeeefee', 'ddddddddddddd'], 17)
# the 2030s (ATC 9, 10): teal glass cab, a wide solar roof, a white-and-teal shaft; then a hydrogen tank at the foot
TS = '.....cTh.....'
T[9] = stack(['.....a.......', 'SssSssSssSssS', 'SssSssSssSssS', '.....b.......', '.....b.......', '.....b.......',
              'ddddddddddddd', 'TTWTTTWTTTWTT', 'TTWTTTWTTTWTT', 'TTWTTTWTTTWTT', 'TTWTTGWTTTWTT', 'TTWTTTWTTTWTT', 'ddddddddddddd'], 17, TS)
T[10] = stack(['..cc..a......', 'SssSssSssSssS', 'SssSssSssSssS', '..cc.b.......', '.....b.......', '.....b.......',
               'ddddddddddddd', 'TTWTTTWTTTWTT', 'TTWTTTWTTTWTT', 'TTWTTTWTTTWTT', 'TTWTTGWTTTWTT', 'TTWTTTWTTTWTT', 'ddddddddddddd'], 17, TS)
for y in range(22, 30):   # hydrogen tank at the foot (left of the shaft): white capsule with a green band
    row = list(T[10][y]); row[0:4] = 'cccc' if y in (22, 29) else ('cGGc' if y in (25, 26) else 'cWWc'); T[10][y] = ''.join(row)
# the far future (ATC 11, 12): a chrome shaft, an iridescent cab, a floating ring; then a beam up
FS = '.....Wcl.....'
T[11] = stack(['....TTTTT....', '...T.....T...', '...T..V..T...', '...T..b..T...', '....TTTTT....', '.....b.......',
               'ddddddddddddd', 'TTVVMMVVTTVVT', 'TWVVMMVVWTVVT', 'TTVVMMVVTTVVT', 'TWVVMMVVWTVVT', 'TTVVMMVVTTVVT', 'ddddddddddddd'], 17, FS)
T[12] = stack(['.....C.......', '.....C.......', '....TTTTT....', '...T..C..T...', '...T..b..T...', '....TTTTT....',
               'ddddddddddddd', 'TTVVMMVVTTVVT', 'TWVVMMVVWTVVT', 'TTVVMMVVTTVVT', 'TWVVMMVVWTVVT', 'TTVVMMVVTTVVT', 'ddddddddddddd'], 17, FS)
STN = {
 '2010s': ['................', '..........ccc...', '.........ccccc..', '.........cckcc..', '.........ccccc..', '..........ccc...', '...........b....', '...........b....',
           'hhhhhhhhhhh.b...', 'hhGGGGGGGhh.b...', 'hhGGGGGGGhh.b...', 'hhGGGGGGGhh.b...', 'hhGGGGGGGhh.b...', 'hhhhhhhhhhh.b...', 'hhhhhhhhhhh.b...', 'hhhhhhhhhhh.b...'],
 '2030s': ['................', '.SssS.......cc..', '.SssS......cWWc.', '.SssS......cWTc.', '.SssS.......cc..', '..b..........b..', '..b..........b..', '..b..........b..',
           'cccccccccccc.b..', 'cTTTTTTTTTTc.b..', 'cTTTTTTTTTTc.b..', 'cTTTTTTTTTTc.b..', 'cTTTTTTTTTTc.b..', 'cccccccccccc.b..', 'cccccccccccc.b..', 'cccccccccccc.b..'],
 'future': ['................', '..........TTT...', '.........TVVVT..', '.........TVMVT..', '.........TVVVT..', '..........TTT...', '...........W....', '...........W....',
            'lllllllllll.W...', 'lVVVVVVVVVl.W...', 'lVMMMMMMMVl.W...', 'lVMMMMMMMVl.W...', 'lVVVVVVVVVl.W...', 'lllllllllll.W...', 'lllllllllll.W...', 'lllllllllll.W...'],
}
STK = {
 'sensor-2010s': ['..kkkkkk.', '.kccccdck', 'kcccCCcdk', '.kkkkkkk.', '...kk....'],           # a radar dome
 'sensor-2030s': ['.kkkkkk.', 'kTWWWWTk', 'kTTTTTTk', '.kkkkkk.', '..kkkk..'],               # a lidar puck
 'sensor-future': ['..kkk..', '.kVVVk.', 'kVMMMVk', '.kVVVk.', '..kkk..'],                   # a glowing crystal
 'auto-2010s': ['..kkkkk....', '.kcccccckk', 'kcccllcckC', 'kcclmmlckC', 'kkkkkkkkk.'],     # a dome with a little dish
 'auto-2030s': ['...kkkkk...', '.kkWWWWWkk.', 'kTWWWWWWWTk', 'kTTTTTTTTTk', 'kkkkkkkkkkk'],  # a dome with a teal ring
 'auto-future': ['...kkkkk...', '.kkVVVVVkk.', 'kVMMMMMMMVk', 'kVVMMMMMVVk', '.kkkkkkkkk.'],  # a violet orb
}
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for n, rows in T.items():
        assert len(rows) == 30 and all(len(r) == 13 for r in rows), (n, len(rows), [len(r) for r in rows if len(r) != 13])
        grid(rows).save(os.path.join(OUT, f'tower-{n}.png'))
    for era, rows in STN.items():
        assert len(rows) == 16 and all(len(r) == 16 for r in rows), era
        grid(rows).save(os.path.join(OUT, f'station-{era}.png'))
    for k, rows in STK.items(): grid(rows).save(os.path.join(OUT, f'sticker-{k.split("-")[0]}-{k.split("-")[1]}.png'))
    print('towers 7-12, 3 stations, 6 stickers written')
