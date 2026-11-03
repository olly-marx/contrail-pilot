// The BOARDS screen in season 2 (src/records.js): two sub-tabs. RECORDS = the 4 good and 4 oops boards as cards, THIS WEEK / EVER, your own
// numbers. BADGES = the badge grid (moved from the hangar, R9), each tap a sheet. The dots come from src/fresh.js: a dot on the sub-tab that is
// NOT showing, NEW RECORD! on a card and a dot on a badge for what is new since the last visit (taken at the START of the visit, before the
// tab is marked seen). Online (0.18.0): under the cards, the RANKING of the picked board for the picked period (the database's leaderboard(): top 50 and
// your own row), when the device has a pilot name and can reach it; offline, your own numbers stand alone.
import { BOARDS, PERIODS, values } from './records.js';
import { leaderboard, getPilot, onlineOff } from './online.js';
import { writeSave } from './save.js';
import { fresh, markSeen, dots } from './fresh.js';
import { BADGES, THEMES, tierOf, progressOf, tierName, medal } from './badges.js';
import { showSheet } from './sheet.js';

const $ = id => document.getElementById(id);
let period = 'week', pick = 'longest', tab = 'records';
let shown = 0;   // the latest ranking asked for: an answer for a board the player has moved off is dropped
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const place = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
const say = x => x.charAt(0).toUpperCase() + x.slice(1);

// opts: { onSeen() the bar's dots follow, toast(title, body) the one-time intro }
export function showRecords(save, opts = {}) {
  const snap = fresh(save), newRecords = (snap['boards/records'] || []).map(k => k.split(':')[1]), newBadges = (snap['boards/badges'] || []).map(k => k.split(':')[1]);
  const intro = !(save.seenTips || []).includes('records-intro');
  if (intro) { save.seenTips = [...(save.seenTips || []), 'records-intro']; writeSave(save); if (opts.toast) opts.toast('YOUR RECORDS', 'These are YOUR records. Beat yourself, and watch out for the OOPS ones!'); }
  tab = 'records';
  $('boards').classList.add('records');
  $('bInfo').hidden = true;   // no points to explain
  $('boards').querySelector('h2').textContent = 'Your records';
  $('bMsg').textContent = '';
  const seen = () => { const a = markSeen(save, `boards/${tab}`); if (a) { writeSave(save); if (opts.onSeen) opts.onSeen(); } };
  const subtabs = () => {
    const d = dots(save);
    $('bSubtabs').hidden = false;
    $('bSubtabs').innerHTML = [['records', 'RECORDS'], ['badges', 'BADGES']].map(([k, n]) =>
      `<button class="subtab ${tab === k ? 'on' : ''}" type="button" data-btab="${k}">${n}${k !== tab && d[`boards/${k}`] ? '<i class="dot"></i>' : ''}</button>`).join('');
    $('bSubtabs').querySelectorAll('[data-btab]').forEach(el => el.onclick = () => { tab = el.dataset.btab; draw(); });
  };
  const records = () => {
    const v = values(save)[period];
    const card = b => `<button class="btn rec ${b.oops ? 'oops' : ''} ${pick === b.id ? 'on' : ''}" type="button" data-board="${b.id}">`
      + `<b>${b.name}</b><span class="val">${v[b.id] === null || v[b.id] === undefined ? '-' : b.fmt(v[b.id])}</span>`
      + `${newRecords.includes(b.id) ? '<i class="new">NEW RECORD!</i>' : ''}</button>`;
    $('bBoards').innerHTML = BOARDS.filter(b => !b.oops).map(card).join('') + '<p class="oops-head">OOPS!</p>' + BOARDS.filter(b => b.oops).map(card).join('');
    $('bBoards').querySelectorAll('[data-board]').forEach(el => el.onclick = () => { pick = el.dataset.board; draw(); });
    $('bPeriods').innerHTML = PERIODS.map(p => `<button class="btn ${p.id === period ? 'on' : ''}" type="button" data-period="${p.id}">${p.name}</button>`).join('');
    $('bPeriods').querySelectorAll('[data-period]').forEach(el => el.onclick = () => { period = el.dataset.period; draw(); });
    const b = BOARDS.find(x => x.id === pick);
    $('bWhat').textContent = b.rule; $('bWhat').classList.toggle('oops', !!b.oops);
    $('bList').innerHTML = '';
    $('bMsg').textContent = '';
    const ask = ++shown;
    if (onlineOff()) return;   // a tester mode or ?preview=1: nothing is asked of the network
    if (!getPilot()) { $('bMsg').textContent = 'Pick a name in PILOT to join the rankings!'; return; }
    leaderboard(pick, period).then(rows => {
      if (ask !== shown || !rows) return;   // moved on, or no connection: your own numbers above are enough
      $('bMsg').textContent = rows.length ? "Everyone's ranking:" : `Nobody on this board yet${b.oops ? '. Phew!' : '. Be the first!'}`;
      $('bList').innerHTML = rows.map(r => `<li class="${r.is_me ? 'me' : ''} p${Math.min(r.place, 4)}"><span class="place">${place(Number(r.place))}</span>`
        + `<span class="who"><b>${esc(r.name)}</b><small>#${esc(r.tag)}${r.is_me ? ' (you)' : ''}</small></span><span class="score">${b.fmt(Number(r.score))}</span></li>`).join('');
    });
  };
  // What a badge needs and its next tier (the text the hangar's grid used to print under each medal).
  const need = b => {
    const t = tierOf(save, b.id), pr = progressOf(save, b), hidden = b.secret && !t;
    if (hidden) return 'A secret badge. Keep flying!';
    return pr.goal === null ? 'Done!' : b.tiers.length === 1 ? `${say(b.unit)}.`
      : `${tierName(b, t + 1)}: ${pr.goal.toLocaleString()} ${b.unit}${pr.value !== null ? ` (${pr.value.toLocaleString()} so far)` : ''}`;
  };
  const badges = () => {
    $('bBadges').innerHTML = Object.entries(THEMES).map(([th, name]) => `<p class="label">${name}</p><div class="badge-grid">` + BADGES.filter(b => b.theme === th).map(b => {
      const t = tierOf(save, b.id), hidden = b.secret && !t;
      const img = t ? medal(b.id, t) : hidden ? 'assets/ui/badge-secret.png' : 'assets/ui/badge-locked.png';
      return `<button class="badge2 ${t ? 'got' : ''}" type="button" data-badge="${b.id}"><img src="${img}" alt="">${newBadges.includes(b.id) ? '<i class="dot"></i>' : ''}<b>${hidden ? '???' : esc(b.name)}</b><span>${esc(need(b))}</span></button>`;
    }).join('') + '</div>').join('');
    $('bBadges').querySelectorAll('[data-badge]').forEach(el => el.onclick = () => {
      const b = BADGES.find(x => x.id === el.dataset.badge), t = tierOf(save, b.id), hidden = b.secret && !t;
      showSheet({ eyebrow: THEMES[b.theme].toUpperCase(), title: hidden ? '???' : b.name, pic: t ? medal(b.id, t) : hidden ? 'assets/ui/badge-secret.png' : 'assets/ui/badge-locked.png',
        body: `${t && b.tiers.length > 1 ? `You have ${tierName(b, t)}. ` : t ? 'You have it! ' : ''}${need(b)}` });
    });
  };
  const draw = () => {
    subtabs();
    $('bRecords').hidden = tab !== 'records'; $('bBadges').hidden = tab !== 'badges';
    if (tab === 'records') records(); else badges();
    seen();   // this sub-tab is showing: what it shows is now seen (the snapshot above keeps this visit's marks)
  };
  draw();
}
