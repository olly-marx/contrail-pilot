// "Crossing unlocked!" (Oliver, 2026-11-18: 'when the crossing becomes available ... as soon as you get back into the flight screen or out of flight, there should be a big
// screen that pops up and says, congrats, you've met all the requirements to try and cross into a new part of the globe'). The full-screen card of the era welcome
// (src/welcome.js, the .era-card styles) for the FIRST time a crossing is ready: ui.maybeCrossingSheet opens it instead of the small sheet. A tap on a crossing
// elsewhere (MISSIONS card, the globe ring, UP NEXT) still opens the small confirm sheet (ui.showCrossingSheet).
import { PLANES, fleetOf } from './fleet.js';
import { sfx } from './sound.js';

const $ = id => document.getElementById(id);
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// The words, pure (tests/crossunlock.cjs reads them). `cs` = crossingState (src/crossingview.js): from, to, opens, difficulty, prize.
export const UNLOCK_KICKER = 'CROSSING UNLOCKED!';
export function unlockText(cs, first = false, choices = null) {
  if (choices) return {   // several crossings ready at once (Oliver, 2026-11-20): no one destination; WHERE TO? opens 'Where would you like to go?'
    kicker: UNLOCK_KICKER, title: 'You can cross to a new land!', route: [cs.from, '?'],
    tag: `You have met every need: Era, Plane and Nature. Pick one of ${choices.choices.length} long flights with no stops.`,
    note: first ? 'Missions do not count on a crossing: just get there.' : '', go: 'WHERE TO?', later: 'LATER', opens: choices.opens.replace(/^Opens /, ''),
  };
  return {
    kicker: UNLOCK_KICKER,
    title: `You can cross to ${cs.to}!`,
    route: [cs.from, cs.to],
    tag: 'You have met every need: Era, Plane and Nature. Now one long flight with no stops.',
    note: first ? 'Missions do not count on a crossing: just get there.' : '',
    go: 'FLY THE CROSSING', later: 'LATER',
  };
}

// Show the card. Resolves 'go' or 'later'. The card is REMOVED on close (ui.maybeCrossingSheet treats any .era-card in the page as 'busy').
export function showCrossingUnlocked(cs, { save = null, first = false, choices = null } = {}) {
  const t = unlockText(cs, first, choices);
  let el = $('crossUnlock');
  if (!el) { el = document.createElement('section'); el.id = 'crossUnlock'; el.className = 'overlay top era-card cross-unlock'; document.body.appendChild(el); }
  const plane = PLANES.find(p => p.id === (save ? fleetOf(save).plane : 'comet')) || PLANES[0];
  const confetti = Array.from({ length: 28 }, (_, k) => `<i style="left:${(k * 37) % 100}%;animation-delay:${(k % 7) * 0.18}s;background:${['#ffe15a', '#7fd0ff', '#ff7a59', '#8dffb0'][k % 4]}"></i>`).join('');
  el.innerHTML = `<div class="ec-sky cu-sky"></div><div class="ec-confetti">${confetti}</div>
    <div class="ec-body">
      <p class="ec-kicker">${esc(t.kicker)}</p>
      <h2 class="ec-title">${esc(t.title.replace(/ to [^!]*!$/, ' to'))}<br> <span>${esc(choices ? 'a new land' : cs.to)}!</span></h2>
      <div class="ec-runway cu-route"><b class="cu-end">${esc(t.route[0])}</b><b class="cu-end cu-to">${esc(t.route[1])}</b><img class="ec-plane" src="assets/${esc(plane.sprite)}.png" alt=""></div>
      <p class="ec-tag">${esc(t.tag)}</p>
      ${t.note ? `<p class="ec-note">${esc(t.note)}</p>` : ''}
      <div class="ec-list"><span class="ec-new big">OPENS: <b>${esc(t.opens || cs.opens || '')}</b></span><span class="ec-new">${esc(cs.difficulty || '')}</span></div>
      <button id="cuGo" class="btn go big" type="button">${esc(t.go)}</button>
      <button id="cuLater" class="btn cu-later" type="button">${esc(t.later)}</button>
    </div>`;
  el.hidden = false;
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');   // restart the animations
  sfx.era();
  return new Promise(res => {
    $('cuGo').onclick = () => { el.remove(); sfx.coin(); res('go'); };
    $('cuLater').onclick = () => { el.remove(); sfx.tick(); res('later'); };
  });
}
