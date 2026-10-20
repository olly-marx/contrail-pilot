// "My pilot" (name + profile) and "Leaderboard" screens. Pop-ups over the title, like About.
import { NAME_WORDS, pilotName, firstNameShapeOk, randomTag, getPilot, savePilot, leaderboard } from './online.js';
import { MISSIONS } from './missions.js';
import { km } from './config.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

// Same ids and order as leaderboard() in supabase/migrations/.
export const BOARDS = [
  { id: 'ultimate', name: 'ULTIMATE FLYER', unit: 'points' },
  { id: 'longest', name: 'LONGEST FLIGHT', fmt: km },
  { id: 'total', name: 'FURTHEST IN TOTAL', fmt: km },
  { id: 'nature', name: 'TREE KINDS', unit: 'kinds' },
  { id: 'cooler', name: 'COOL CONTRAILS', unit: 'points' },
  { id: 'cleaner', name: 'CLEAN PLANE', unit: 'points' },
  { id: 'missions', name: 'MISSIONS', unit: '' },
];
const PERIODS = [{ id: 'today', name: 'TODAY' }, { id: 'week', name: 'WEEK' }, { id: 'month', name: 'MONTH' }, { id: 'all', name: 'EVER' }];

export class PilotScreens {
  constructor(save) {
    this.save = save;
    this.board = 'ultimate';
    this.period = 'today';
    $('pilotBtn').onclick = () => this.showPilot();
    $('boardsBtn').onclick = () => this.showBoards();
    $('pBack').onclick = $('pBackTop').onclick = () => { $('pilot').hidden = true; };
    $('bBack').onclick = $('bBackTop').onclick = () => { $('boards').hidden = true; };
    $('bInfo').onclick = () => { $('scoreInfo').hidden = false; };
    $('siClose').onclick = () => { $('scoreInfo').hidden = true; };
    $('pChange').onclick = () => this.edit(true);
    $('pDice').onclick = () => { this.draft.tag = randomTag(); this.renderDraft(); };
    $('pFirst').oninput = () => {
      const el = $('pFirst'), clean = el.value.replace(/[^A-Za-z]/g, '').slice(0, 12);   // letters only
      if (clean !== el.value) el.value = clean;
      this.draft.first = clean ? clean[0].toUpperCase() + clean.slice(1).toLowerCase() : '';
      $('pMsg').textContent = '';
      this.renderDraft();
    };
    $('pSave').onclick = () => this.savePilot();
    $('pWords').innerHTML = NAME_WORDS.map(w => `<button class="btn" type="button" data-word="${w}">${w}</button>`).join('');
    $('pWords').querySelectorAll('[data-word]').forEach(b => b.onclick = () => { this.draft.word = b.dataset.word; this.renderDraft(); });
    $('bBoards').innerHTML = BOARDS.map(b => `<button class="btn" type="button" data-board="${b.id}">${b.name}</button>`).join('');
    $('bBoards').querySelectorAll('[data-board]').forEach(b => b.onclick = () => { this.board = b.dataset.board; this.renderBoard(); });
    $('bPeriods').innerHTML = PERIODS.map(p => `<button class="btn" type="button" data-period="${p.id}">${p.name}</button>`).join('');
    $('bPeriods').querySelectorAll('[data-period]').forEach(b => b.onclick = () => { this.period = b.dataset.period; this.renderBoard(); });
    this.renderButton();
  }

  renderButton() {
    const p = getPilot();
    $('pilotBtn').textContent = p ? p.first.toUpperCase() : 'MY PILOT';
  }

  // ---------- my pilot ----------
  showPilot() {
    this.edit(!getPilot());
    this.renderStats();
    $('pilot').hidden = false;
  }

  edit(on) {
    const p = getPilot();
    this.draft = p ? { ...p } : { first: '', word: '', tag: randomTag() };
    $('pFirst').value = this.draft.first;
    $('pMsg').textContent = '';
    $('pEdit').hidden = !on;
    $('pChange').hidden = on || !p;
    this.renderDraft();
  }

  renderDraft() {
    const d = this.draft, editing = !$('pEdit').hidden;
    $('pTag').textContent = d.tag;
    $('pWords').querySelectorAll('[data-word]').forEach(b => b.classList.toggle('on', b.dataset.word === d.word));
    const ready = firstNameShapeOk(d.first) && d.word;
    $('pName').textContent = editing ? (ready ? pilotName(d) : (d.first || '...') + ' the ' + (d.word || '...') + ' ' + d.tag) : pilotName(getPilot());
    $('pSave').disabled = !ready;
  }

  async savePilot() {
    $('pSave').disabled = true;
    $('pMsg').textContent = 'Saving...';
    const r = await savePilot(this.draft);
    if (r.ok) {
      this.edit(false);
      this.renderButton();
      this.renderStats();
      return;
    }
    $('pMsg').textContent = r.why === 'rude' ? 'Try a different name, please.' : 'No internet right now. Try again soon!';
    $('pSave').disabled = false;
  }

  async renderStats() {
    const s = this.save, kinds = Object.values(s.planted || {}).filter(n => n > 0).length;
    const row = (k, v) => `<span>${k}</span><b>${v}</b>`;
    const local = row('Longest landed flight', km(s.bestDistance)) + row('Safe landings', s.landings || 0)
      + row('Kinds of tree planted', kinds) + row('Missions done', `${Math.min(s.mission || 0, MISSIONS.length)} / ${MISSIONS.length}`);
    $('pStats').innerHTML = local;
    if (!getPilot()) return;
    // Where am I today? Only boards I am on.
    const places = (await Promise.all(BOARDS.map(async b => {
      const rows = await leaderboard(b.id, 'today'), me = rows && rows.find(r => r.is_me);
      return me ? row(`Today: ${b.name.toLowerCase()}`, `#${me.place}`) : '';
    }))).join('');
    if (!$('pilot').hidden) $('pStats').innerHTML = local + places;
  }

  // ---------- leaderboards ----------
  showBoards() {
    $('boards').hidden = false;
    this.renderBoard();
  }

  async renderBoard() {
    const board = BOARDS.find(b => b.id === this.board), period = this.period;
    $('bBoards').querySelectorAll('[data-board]').forEach(b => b.classList.toggle('on', b.dataset.board === board.id));
    $('bPeriods').querySelectorAll('[data-period]').forEach(b => b.classList.toggle('on', b.dataset.period === period));
    $('bMsg').textContent = 'Loading...';
    $('bList').innerHTML = '';
    const rows = await leaderboard(board.id, period);
    if (this.board !== board.id || this.period !== period) return;   // tapped another tab meanwhile
    if (!rows) { $('bMsg').textContent = 'No internet right now. Try again soon!'; return; }
    $('bMsg').textContent = rows.length ? '' : 'Nobody yet. Land a flight to be first!';
    $('bList').innerHTML = rows.map(r => `<li class="${r.is_me ? 'me' : ''}"><span>#${r.place}</span><span>${esc(r.name)}</span><b>${board.fmt ? board.fmt(Number(r.score)) : `${Number(r.score).toLocaleString('en-GB')} ${board.unit}`}</b></li>`).join('');
  }
}
