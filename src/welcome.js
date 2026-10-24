// "Welcome to the <era>!" (eras build, stage 3c, 2026-10-23): a full-screen celebration when an era
// opens (after the flight that opened it) and once at the eras reset ("Welcome to the 1950s", with
// the starting gift). Era picture: assets/ui/era-<id>.png (PixelLab; a painted gradient if missing).
import { ERAS } from './eras.js';
import { PLANES, SYSTEMS, GADGETS, levelEra, START_BONUS } from './fleet.js';
import { sfx } from './sound.js';

const $ = id => document.getElementById(id);
const TAGLINE = {
  '1950s': 'The jet age begins! Faster than ever, and high above the weather.',
  '1970s': 'The jumbo jet! Big fans, big cabins, and radar on the ground.',
  '1990s': 'Two big engines instead of four, and computers everywhere.',
};

// What an era brings: its plane, and the system and gadget levels that open in it.
export function eraUnlocks(i) {
  const planes = PLANES.filter(p => p.era === i).map(p => p.name);
  const levels = [...SYSTEMS, ...GADGETS].flatMap(g => g.levels.filter((_, k) => levelEra(k + 1) === i).slice(0, 1).map(l => l.name));
  return { planes, levels };
}

// Show the card. `reset`: the first one, after the eras reset (explains it and the gift). Resolves on OK.
export function showEraWelcome(i, { reset = false, bonus = START_BONUS } = {}) {
  const era = ERAS[i], { planes, levels } = eraUnlocks(i);
  let el = $('eraCard');
  if (!el) { el = document.createElement('section'); el.id = 'eraCard'; el.className = 'overlay top era-card'; document.body.appendChild(el); }
  const plane = PLANES.find(p => p.era === i);
  const confetti = Array.from({ length: 28 }, (_, k) => `<i style="left:${(k * 37) % 100}%;animation-delay:${(k % 7) * 0.18}s;background:${['#ffe15a', '#7fd0ff', '#ff7a59', '#8dffb0'][k % 4]}"></i>`).join('');
  el.dataset.era = era.id;
  el.innerHTML = `<div class="ec-sky" style="background-image:url(assets/ui/era-${era.id}.png)"></div><div class="ec-confetti">${confetti}</div>
    <div class="ec-body">
      <p class="ec-kicker">${reset ? 'A NEW START' : 'NEW ERA!'}</p>
      <h2 class="ec-title">Welcome to<br> <span>${era.id === 'future' ? 'the far future' : `the ${era.id}`}</span></h2>
      ${plane ? `<div class="ec-runway"><img class="ec-plane" src="assets/${plane.sprite}.png" alt=""></div>` : ''}
      <p class="ec-tag">${TAGLINE[era.id] || ''}</p>
      ${reset ? `<p class="ec-note">Planes now have <b>eras</b>! Your plane upgrades are back at the start, and you fly the <b>Comet</b>, the first jet airliner.
        You keep all your seeds, crystals, nature, badges and records. Here are <b>${bonus} seeds</b> to get going!</p>
        <p class="ec-note">Fly to open new eras: <b>30 minutes</b> of flying opens the 1970s.</p>` : ''}
      <div class="ec-list">${planes.map(n => `<span class="ec-new big">NEW PLANE: <b>${n}</b></span>`).join('')}${levels.map(n => `<span class="ec-new">${n}</span>`).join('')}</div>
      <button id="ecOk" class="btn go big" type="button">${reset ? "LET'S FLY!" : 'TO THE HANGAR!'}</button>
    </div>`;
  el.hidden = false;
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');   // restart the animations
  sfx.fanfare();
  return new Promise(res => { $('ecOk').onclick = () => { el.hidden = true; sfx.coin(); res(); }; });
}
