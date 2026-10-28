// "My pilot" (name + profile) and "Leaderboard" screens. Pop-ups over the title, like About.
import { NAME_WORDS, pilotName, firstNameShapeOk, randomTag, getPilot, savePilot, leaderboard, getCode, ensureCode, pilotLogin, outboxSize, onlineOff } from './online.js';
import { writeSave } from './save.js';
import { MISSIONS } from './missions.js';
import { km } from './config.js';
import { BOARDS as RECORD_BOARDS } from './records.js';

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
  { id: 'laps', name: 'LAPS', what: 'Times round the Earth: every 40,075 km you fly is one.', fmt: v => `${n(v)} lap${v == 1 ? '' : 's'}` },
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
    this.setupCode();
  }

  // ---------- pilot code + "I already have a pilot" (online save, 2026-10-22) ----------
  setupCode() {
    $('lWord').innerHTML = '<option value="">word</option>' + NAME_WORDS.map(w => `<option>${w}</option>`).join('');
    $('pHave').onclick = () => { $('pLogin').hidden = !$('pLogin').hidden; };
    $('pNewCode').onclick = async () => {
      if (!confirm('Get a new pilot code? Your old code will stop working.')) return;
      $('pCode').textContent = '...'; await ensureCode(true); this.renderCode();
    };
    $('lGo').onclick = () => this.login();
  }

  async renderCode() {
    const has = !!getPilot();
    $('pCodeBox').hidden = !has;
    if (!has) return;
    $('pCode').textContent = getCode() || '...';
    if (!getCode()) { await ensureCode(); $('pCode').textContent = getCode() || 'No internet: your code will appear here.'; }
  }

  async login() {
    const p = { first: $('lFirst').value.trim(), word: $('lWord').value, tag: Number($('lTag').value) };
    p.first = p.first ? p.first[0].toUpperCase() + p.first.slice(1).toLowerCase() : '';
    if (!firstNameShapeOk(p.first) || !p.word || !(p.tag >= 10 && p.tag <= 99) || $('lCode').value.trim().length < 8) { $('lMsg').textContent = 'Fill in your name, word, number and code.'; return; }
    $('lMsg').textContent = 'Looking for your pilot...';
    const r = await pilotLogin(p, $('lCode').value);
    if (!r.ok) { $('lMsg').textContent = { 'no such pilot': 'No pilot with that name and number.', 'wrong code': 'That code is not right. Check your photo!', 'too many tries': 'Too many tries. Wait an hour and try again.' }[r.why] || 'No internet right now. Try again soon!'; return; }
    if (r.save) {
      const keep = { muted: this.save.muted };
      for (const k of Object.keys(this.save)) delete this.save[k];
      Object.assign(this.save, r.save, keep);
      writeSave(this.save);
    }
    alert(`Welcome back, ${pilotName(p)}!${r.save ? ' Your progress is here.' : ''}`);
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
    this.renderCode();
    // Season 2 is offline by design: no name form, no code, no login (they would only say 'No internet right now').
    const off = onlineOff();
    $('pOffNote').hidden = !off;
    if (off) for (const id of ['pName', 'pEdit', 'pChange', 'pCodeBox', 'pHave', 'pLogin']) $(id).hidden = true;
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
    // Where am I this week? Only the good boards I am on (not the Oops boards): the 8 boards of src/records.js.
    const places = (await Promise.all(RECORD_BOARDS.filter(b => !b.oops).map(async b => {
      const rows = await leaderboard(b.id, 'week'), me = rows && rows.find(r => r.is_me);
      return me ? row(`This week: ${b.name.toLowerCase()}`, place(Number(me.place))) : '';
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
    $('bList').innerHTML = '';
    if (onlineOff()) { $('bMsg').textContent = 'The leaderboards are resting while season 2 starts. They come back later!'; return; }
    $('bMsg').textContent = 'Loading...';
    const rows = await leaderboard(board.id, period);
    if (this.board !== board.id || this.period !== period) return;   // tapped another tab meanwhile
    if (!rows) {
      const n = outboxSize();   // flights waiting on this device (offline play)
      $('bMsg').textContent = 'No internet right now. Try again soon!' + (n ? ` Your ${n === 1 ? 'flight is' : n + ' flights are'} saved on this device and will upload when you are back online.` : '');
      return;
    }
    $('bMsg').textContent = rows.length ? '' : board.oops ? 'Nobody yet. Phew!' : 'Nobody yet. Land a flight to be first!';
    $('bList').innerHTML = rows.map(r => `<li class="${r.is_me ? 'me' : ''} p${Math.min(r.place, 4)}"><span class="place">${place(Number(r.place))}</span>`
      + `<span class="who"><b>${esc(r.name)}</b><small>#${esc(r.tag)}${r.is_me ? ' (you)' : ''}</small></span><span class="score">${board.fmt(Number(r.score))}</span></li>`).join('');
  }
}
