// The BOARDS screen in season 2 = MY RECORDS (src/records.js): the 4 good and 4 oops boards as cards, THIS WEEK / EVER, your own numbers.
// Renders into the existing #boards section (index.html). Online is off in season 2, so there are no other pilots yet.
import { BOARDS, PERIODS, values, fresh, clearFresh } from './records.js';
import { writeSave } from './save.js';

const $ = id => document.getElementById(id);
let period = 'week', pick = 'longest';

export function showRecords(save) {
  const fr = fresh(save);   // the NEW RECORD! marks: boards beaten since the screen was last opened
  clearFresh(save); writeSave(save);
  const intro = !(save.seenTips || []).includes('records-intro');
  if (intro) { save.seenTips = [...(save.seenTips || []), 'records-intro']; writeSave(save); }
  $('boards').classList.add('records');
  $('bInfo').hidden = true;   // no points to explain
  $('boards').querySelector('h2').textContent = 'Your records';
  const render = () => {
    const v = values(save)[period];
    const card = b => `<button class="btn rec ${b.oops ? 'oops' : ''} ${pick === b.id ? 'on' : ''}" type="button" data-board="${b.id}">`
      + `<b>${b.name}</b><span class="val">${v[b.id] === null || v[b.id] === undefined ? '-' : b.fmt(v[b.id])}</span>`
      + `${fr.includes(b.id) ? '<i class="new">NEW RECORD!</i>' : ''}</button>`;
    $('bBoards').innerHTML = BOARDS.filter(b => !b.oops).map(card).join('') + '<p class="oops-head">OOPS!</p>' + BOARDS.filter(b => b.oops).map(card).join('');
    $('bBoards').querySelectorAll('[data-board]').forEach(el => el.onclick = () => { pick = el.dataset.board; render(); });
    $('bPeriods').innerHTML = PERIODS.map(p => `<button class="btn ${p.id === period ? 'on' : ''}" type="button" data-period="${p.id}">${p.name}</button>`).join('');
    $('bPeriods').querySelectorAll('[data-period]').forEach(el => el.onclick = () => { period = el.dataset.period; render(); });
    const b = BOARDS.find(x => x.id === pick);
    $('bWhat').textContent = b.rule; $('bWhat').classList.toggle('oops', !!b.oops);
    $('bList').innerHTML = '';
    $('bMsg').textContent = intro ? 'These are YOUR records. Beat yourself! And watch out for the OOPS ones. Rankings against other pilots come back with online.' : 'Rankings against other pilots come back with online.';
  };
  render();
}
