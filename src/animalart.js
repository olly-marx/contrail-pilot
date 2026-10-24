// Where an animal's pictures are (2026-10-24): ONE place, so flight, the NATURE cards and field, and the results
// screen's NEW ANIMALS list always agree. (The results list once built the old portrait path itself and kept
// showing the old pictures after the PixelLab animals went live: the user's bug report.)
// PixelLab art (src/pixellab.js, on unless ?pixelart=off) wins when this sprite has it.
import { FEATURES } from './config.js';
import { PIXELLAB } from './pixellab.js';

const pixel = sprite => FEATURES.pixelArt && PIXELLAB.has(sprite);

// The folder of the in-flight frames <sprite>-0/1.png.
export const animalDir = sprite => (pixel(sprite) ? 'assets/pixellab' : 'assets');

// The card picture: PixelLab portrait, else the generated portrait, else the sprite; '' if not drawn yet.
export const animalPortrait = w => (pixel(w.sprite) ? `assets/pixellab/ui/portrait-${w.sprite}-0.png`
  : w.portrait ? `${w.portrait}-0.png` : w.sprite ? `assets/${w.sprite}-0.png` : '');
