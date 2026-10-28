// The BOARDS screen in season 2 = MY RECORDS (src/records.js): the 4 good and 4 oops boards as cards, THIS WEEK / EVER, your own numbers.
// Renders into the existing #boards section (index.html). Online (0.18.0): under the cards, the RANKING of the picked board for the picked period
// (the database's leaderboard(): top 50 and your own row), when the device has a pilot name and can reach it; offline, your numbers stand alone.
import { BOARDS, PERIODS, values, fresh, clearFresh } from './records.js';
import { leaderboard, getPilot } from './online.js';
import { writeSave } from './save.js';

const $ = id => document.getElementById(id);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const place = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
let shown = 0;   // the latest ranking asked for: an answer for a board the player has moved off is dropped
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
    const mine = intro ? 'These are YOUR records. Beat yourself! And watch out for the OOPS ones.' : '';
    $('bMsg').textContent = mine;
    const ask = ++shown;
    if (!getPilot()) { $('bMsg').textContent = `${mine} Pick a name in PILOT to join the rankings!`.trim(); return; }
    leaderboard(pick, period).then(rows => {
      if (ask !== shown || !rows) return;   // moved on, or no connection: your own numbers above are enough
      $('bMsg').textContent = rows.length ? `${mine} Everyone's ranking:`.trim() : `${mine} Nobody on this board yet${b.oops ? '. Phew!' : '. Be the first!'}`.trim();
      $('bList').innerHTML = rows.map(r => `<li class="${r.is_me ? 'me' : ''} p${Math.min(r.place, 4)}"><span class="place">${place(Number(r.place))}</span>`
        + `<span class="who"><b>${esc(r.name)}</b><small>#${esc(r.tag)}${r.is_me ? ' (you)' : ''}</small></span><span class="score">${b.fmt(Number(r.score))}</span></li>`).join('');
    });
  };
  render();
}
