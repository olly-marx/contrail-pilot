// SEASON 2 start choice (the redesign, M2; research/MASTER-PLAN.md Part B): a new season 2 player picks a starter
// area, then a city in it (the area's default first). That area is unlocked; the rest wait for crossings.
// Built as its own overlay so the live game's screens are untouched.
import { AREAS } from './areas.js';
import { city } from './network.js';
import { REGION_NAMES } from './habitats.js';

import { tip } from './tips.js';
export const needsStartChoice = save => !(save.areas && save.areas.length);

// Shows the overlay and resolves { area, city } once the player has chosen.
export function chooseStart() {
  return new Promise(done => {
    const el = document.createElement('section');
    el.id = 'startChoice'; el.className = 'overlay top full';   // a full first screen, not a pop-up over the hub (S3)
    const panel = document.createElement('div'); panel.className = 'panel'; el.appendChild(panel);
    const lands = k => [...new Set(AREAS[k].cities.map(n => (city(n) || {}).region))].map(r => REGION_NAMES[r] || r).join(' + ');
    const areas = () => {
      panel.innerHTML = `<h2>Where do you start?</h2><p>${tip('start-area')}</p>
        <div class="jways s2areas">${Object.keys(AREAS).filter(k => AREAS[k].starter).map(k => `<button class="btn jway" type="button" data-area="${k}">
          <b>${AREAS[k].name}</b><small>${lands(k)}</small></button>`).join('')}</div>`;
      panel.querySelectorAll('[data-area]').forEach(b => b.onclick = () => cities(b.dataset.area));
    };
    const cities = k => {
      const a = AREAS[k], list = [a.start, ...a.cities.filter(n => n !== a.start).sort()];
      panel.innerHTML = `<h2>${a.name}</h2><p>${tip('start-city')}</p>
        <div class="jways s2cities">${list.map(n => `<button class="btn jway ${n === a.start ? 'on' : ''}" type="button" data-city="${n}"><b>${n}</b></button>`).join('')}</div>
        <button class="btn tiny" type="button" data-back>back</button>`;
      panel.querySelectorAll('[data-city]').forEach(b => b.onclick = () => { el.remove(); done({ area: k, city: b.dataset.city }); });
      panel.querySelector('[data-back]').onclick = areas;
    };
    areas();
    document.body.appendChild(el);
  });
}
// Apply a choice to the save.
export function applyStart(save, { area, city: name }) {
  save.areas = [area]; save.homeArea = area; save.city = name; save.heading = null;
  save.visited = [name];   // not the default save's LONDON (the non-UK starter audit, 2026-10-28)
}
