"""Polynesia project art, COMPOSED from existing project art (2026-10-30; the Coordinator: PixelLab only for the key animals
and the skylines). Each new project borrows the icon (assets/ui/proj-<id>.png) and field feature (assets/ui/wild-<id>.png)
of the closest existing project. Re-run after make_wildarea.py (which does not draw these ids).

Run from the repo root:  python3 tools/art/compose_polynesia.py
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UI = ROOT / 'assets' / 'ui'
BORROW = {
    'kakerorisave': 'trapyard',        # predator traps keep the flycatchers' nests safe
    'coralplant': 'reef',          # coral planting
    'monarchguard': 'catfree',     # rat and cat control in the monarch valleys
    'manumeasearch': 'eaglewatch', # listening for and watching a rare bird
    'turtleclinic': 'turtlebeach', # sea turtles
    'tetiaroarats': 'islands',     # a predator-free island
    'atollrats': 'puffling',       # seabird atolls cleared of rats
    'coralschool': 'kelpsea',      # a school's underwater nursery
}
if __name__ == '__main__':
    for new, old in BORROW.items():
        for kind in ('proj', 'wild'):
            shutil.copyfile(UI / f'{kind}-{old}.png', UI / f'{kind}-{new}.png')
    print('composed', len(BORROW), 'projects (icon + field feature each)')
