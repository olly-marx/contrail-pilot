// PixelLab pictures for the hangar's system and gadget rows and NATURE's tool rows (assets/ui/rows/ri-<id>.png, tools/art/pixellab/row-icons.txt); other rows keep the empty slot.
export const ROW_ICONS = new Set(['forecast', 'atc', 'ops', 'magnet', 'hold', 'gear', 'sensors', 'autopilot', 'trees', 'soil', 'nursery']);
export const rowIcon = id => ROW_ICONS.has(id) ? `<img class="rowc-icon" src="assets/ui/rows/ri-${id}.png" alt="">` : '<span class="rowc-slot"></span>';
