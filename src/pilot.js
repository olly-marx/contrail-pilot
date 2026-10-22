// "My pilot" (name + profile) and "Leaderboard" screens. Pop-ups over the title, like About.
import { NAME_WORDS, pilotName, firstNameShapeOk, randomTag, getPilot, savePilot, leaderboard, claimablePilots, claimPilot } from './online.js';
import { rebuildSave } from './restore.js';
import { writeSave } from './save.js';
import { MISSIONS } from './missions.js';
import { km } from './config.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

// Same ids as leaderboard() in supabase/migrations/. `what`: one plain line saying what is counted.
// Oops boards are for fun and never count towards Ultimate Flyer. (TODAY only until 2026-10-21;
// now every period, like the other boards: the user asked.)
const n = v => Number(v).toLocaleString('en-GB');
export const BOARDS = [
  { id: 'ultimate', name: 'ULTIMATE FLYER', what: 'Points for everything you do well. Tap "how points work".', fmt: v => `${n(v)} points` },
  { id: 'longest', name: 'LONGEST', what: 'Your longest flight that LANDED.', fmt: v => km(v) },
  { id: 'total', name: 'FURTHEST', what: 'All your landed flights added up.', fmt: v => km(v) },
  { id: 'laps', name: 'LAPS', what: 'Times round the world, back to LONDON.', fmt: v => `${n(v)} lap${v == 1 ? '' : 's'}` },
  { id: 'nature', name: 'TREE KINDS', what: 'Different kinds of tree planted on landed flights.', fmt: v => `${n(v)} kind${v == 1 ? '' : 's'}` },
  { id: 'cooler', name: 'COOL CONTRAILS', what: 'Shade made in the sun, minus heat trapped at night, plus icy air dodged.', fmt: v => `${n(v)} points` },
  { id: 'cleaner', name: 'CLEAN PLANE', what: 'How clean your plane is. Hydrogen gets 200.', fmt: v => `${n(v)} points` },
  { id: 'missions', name: 'MISSIONS', what: 'Missions done.', fmt: v => `${n(v)} done` },
  { id: 'crashes', name: 'CRASH CHAMPION', oops: true, what: 'Oops! Most crashes. Just for fun.', fmt: v => `${n(v)} crash${v == 1 ? '' : 'es'}` },
  { id: 'trapped', name: 'HEAT TRAPPER', oops: true, what: 'Oops! Most heat trapped by night contrails.', fmt: v => `${n(v)} heat` },
  { id: 'co2', name: 'CO2 CLOUD', oops: true, what: 'Oops! Most CO2 made.', fmt: v => `${n(Math.round(v / 100))} CO2` },
  { id: 'longestCrash', name: 'LONGEST CRASH', oops: true, what: 'Oops! The furthest a flight got before it crashed.', fmt: v => km(v) },
  { id: 'avgCrash', name: 'AVERAGE CRASH', oops: true, what: 'Oops! How far your crashed flights got, on average.', fmt: v => km(v) },
];
const place = p => ['', '1st', '2nd', '3rd'][p] || `${p}th`;
const PERIODS = [{ id: 'today', name: 'TODAY' }, { id: 'week', name: 'WEEK' }, { id: 'month', name: 'MONTH' }, { id: 'all', name: 'EVER' }];

export class PilotScreens {
  constructor(save) {
    this.save = save;
    this.board = 'ultimate';
    this.period = 'today';
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
    $('bBoards').innerHTML = BOARDS.filter(b => !b.oops).map(b => `<button class="btn" type="button" data-board="${b.id}">${b.name}</button>`).join('')
      + '<p class="oops-head">OOPS!</p>' + BOARDS.filter(b => b.oops).map(b => `<button class="btn oops" type="button" data-board="${b.id}">${b.name}</button>`).join('');
    $('bBoards').querySelectorAll('[data-board]').forEach(b => b.onclick = () => { this.board = b.dataset.board; this.renderBoard(); });
    $('bPeriods').innerHTML = PERIODS.map(p => `<button class="btn" type="button" data-period="${p.id}">${p.name}</button>`).join('');
    $('bPeriods').querySelectorAll('[data-period]').forEach(b => b.onclick = () => { this.period = b.dataset.period; this.renderBoard(); });
    this.renderButton();
    this.setupRestore();
  }

  // TEMPORARY (2026-10-22): bring back progress a browser wiped. Password from the game makers;
  // pick your old pilot; this device takes it over and the save is rebuilt from its flights.
  setupRestore() {
    $('rsOpen').onclick = () => { $('rsBox').hidden = !$('rsBox').hidden; };
    $('rsList').onclick = async () => {
      $('rsMsg').textContent = 'Looking...'; $('rsPilots').innerHTML = '';
      const pw = $('rsPw').value.trim(), r = await claimablePilots(pw);
      if (!r.ok) { $('rsMsg').textContent = r.why === 'password' ? 'That password is not right.' : 'No internet right now. Try again soon!'; return; }
      $('rsMsg').textContent = r.rows.length ? 'Which one is you? Tap your pilot.' : 'No pilots to restore.';
      $('rsPilots').innerHTML = r.rows.map(p => `<button class="btn" type="button" data-claim="${p.id}">${esc(p.name)} #${esc(p.tag)}<br><small>${p.flights} flights, best ${km(p.best)}</small></button>`).join('');
      $('rsPilots').querySelectorAll('[data-claim]').forEach(b => b.onclick = () => this.claim(pw, r.rows.find(p => p.id === b.dataset.claim)));
    };
  }

  async claim(pw, p) {
    if (!confirm(`Is ${p.name} #${p.tag} really you? Your progress on this device will be replaced by ${p.name}'s rebuilt progress.`)) return;
    $('rsMsg').textContent = 'Restoring...';
    const [first, , ...rest] = p.name.split(' '), word = rest.join(' ');
    const r = await claimPilot(pw, p.id, { first, word, tag: p.tag });
    if (!r.ok) { $('rsMsg').textContent = r.why === 'claimed' ? 'Someone has already restored that pilot.' : r.why === 'password' ? 'That password is not right.' : 'No internet right now. Try again soon!'; return; }
    const keep = { muted: this.save.muted, seenTips: this.save.seenTips, found: this.save.found, shownLines: this.save.shownLines };
    const { save } = rebuildSave(r.flights, keep);
    for (const k of Object.keys(this.save)) delete this.save[k];
    Object.assign(this.save, save);
    writeSave(this.save);
    $('rsBox').hidden = true;
    alert(`Welcome back, ${p.name}! Best flight ${km(save.bestDistance)}, ${save.mission} missions, ${Object.values(save.levels).reduce((a, n) => a + n, 0)} upgrade levels and ${save.seeds} seeds rebuilt from your flights.`);
    location.reload();
  }

  renderButton() {
    const p = getPilot();
    $('tabPilotName').textContent = p ? p.first.toUpperCase() : 'PILOT';   // the bar's PILOT tab shows your name
  }

  // ---------- my pilot ----------
  showPilot() {
    this.edit(!getPilot());
    this.renderStats();
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
    // Where am I today? Only the good boards I am on (not the Oops boards).
    const places = (await Promise.all(BOARDS.filter(b => !b.oops).map(async b => {
      const rows = await leaderboard(b.id, 'today'), me = rows && rows.find(r => r.is_me);
      return me ? row(`Today: ${b.name.toLowerCase()}`, place(Number(me.place))) : '';
    }))).join('');
    if (!$('pilot').hidden) $('pStats').innerHTML = local + places;
  }

  // ---------- leaderboards ----------
  showBoards() {
    this.renderBoard();
  }

  async renderBoard() {
    const board = BOARDS.find(b => b.id === this.board), period = this.period;
    $('bBoards').querySelectorAll('[data-board]').forEach(b => b.classList.toggle('on', b.dataset.board === board.id));
    $('bPeriods').querySelectorAll('[data-period]').forEach(b => b.classList.toggle('on', b.dataset.period === period));
    $('bWhat').textContent = board.what;
    $('bWhat').classList.toggle('oops', !!board.oops);
    $('bMsg').textContent = 'Loading...';
    $('bList').innerHTML = '';
    const rows = await leaderboard(board.id, period);
    if (this.board !== board.id || this.period !== period) return;   // tapped another tab meanwhile
    if (!rows) { $('bMsg').textContent = 'No internet right now. Try again soon!'; return; }
    $('bMsg').textContent = rows.length ? '' : board.oops ? 'Nobody yet. Phew!' : 'Nobody yet. Land a flight to be first!';
    $('bList').innerHTML = rows.map(r => `<li class="${r.is_me ? 'me' : ''} p${Math.min(r.place, 4)}"><span class="place">${place(Number(r.place))}</span>`
      + `<span class="who"><b>${esc(r.name)}</b><small>#${esc(r.tag)}${r.is_me ? ' (you)' : ''}</small></span><span class="score">${board.fmt(Number(r.score))}</span></li>`).join('');
  }
}
