// Updates (art session, 2026-10-22): tell players a new version is out, at a moment that can't hurt.
//
// Each deploy writes version.json next to the game: { commit, changes } (changes from CHANGES.json,
// newest first: { id, level: 'minor' | 'major', notes: [...] }). This page knows its own commit from
// its script address (the deploy stamps every import with ?v=<commit>). Every few minutes, and when
// you come back to the tab, it fetches version.json. If the commit differs, an update is waiting:
//   - never during a flight: only when no flight is running (menu, hangar, results);
//   - a banner "New version ready! UPDATE" (and the newest note); UPDATE reloads (the save is kept);
//   - ignored for over a day, it updates by itself, but only on an IDLE menu: the title showing and
//     nothing open on top (no info card, coach bubble or toast; the grown-up gate is in the hangar);
//   - the save is written just before any reload, so a purchase in the last second is kept;
//   - after an update that has a 'major' change you haven't seen, a one-time "What's new" card.
// Local copies (no ?v stamp) don't check, so development is never interrupted.

const KEY = 'contrailPilot.updates';
const CHECK_MS = 3 * 60 * 1000;
const AUTO_AFTER_MS = 24 * 3600 * 1000;

const ownCommit = () => window.__CP_VERSION || new URL(import.meta.url).searchParams.get('v');
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
const store = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode */ } };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const CSS = `
#upBanner { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 60; max-width: 340px; width: calc(100% - 24px);
  background: #fffbe8; border: 3px solid #1a1a22; box-shadow: 0 4px 0 #1a1a22; padding: 8px 10px; font: 10px/1.5 Pixel, monospace; color: #1a1a22;
  display: flex; gap: 8px; align-items: center; }
#upBanner p { margin: 0; flex: 1; }
#upBanner button, #upCard button { font: 10px Pixel, monospace; background: #4caf50; color: #fff; border: 3px solid #1a1a22; padding: 6px 8px; cursor: pointer; }
#upBanner .later { background: #9a9aa4; }
#upCard { position: fixed; inset: 0; z-index: 61; background: rgba(10, 12, 30, 0.6); display: flex; align-items: center; justify-content: center; }
#upCard > div { background: #fffbe8; border: 3px solid #1a1a22; box-shadow: 0 4px 0 #1a1a22; padding: 12px 14px; max-width: 320px; width: calc(100% - 32px);
  font: 10px/1.6 Pixel, monospace; color: #1a1a22; }
#upCard h2 { font-size: 14px; margin: 0 0 8px; color: #2c7a31; }
#upCard ul { margin: 0 0 10px; padding-left: 16px; }
`;

// The title screen showing, and nothing open on top of it.
const shown = id => { const e = document.getElementById(id); return !!e && !e.hidden; };
export const idleMenu = () => shown('title') && !shown('toast') && !shown('coach') && !document.getElementById('upCard')
  && ![...document.querySelectorAll('.overlay.top')].some(e => !e.hidden);

export class Updates {
  // inFlight(): true while a flight (take-off, flying, landing) is running.
  // beforeReload(): write the save.
  constructor(inFlight, beforeReload) {
    this.inFlight = inFlight;
    this.beforeReload = beforeReload;
    this.own = ownCommit();
    this.pending = null;
    if (!this.own) return;                       // a local copy: no checks
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    this.check(true);
    this.timer = setInterval(() => this.check(), CHECK_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.check(); });
    this.safeTimer = setInterval(() => this.maybeShow(), 1000);
  }

  async fetchVersion() {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`version.json ${r.status}`);
    return r.json();
  }

  async check(first = false) {
    let v;
    try { v = await this.fetchVersion(); } catch (e) { return; }   // offline, or no version.json: try later
    const s = load();
    if (first && v.commit === this.own) this.whatsNew(v, s);
    if (v.commit && v.commit !== this.own) {
      if (!this.pending || this.pending.commit !== v.commit) {
        this.pending = v;
        if (s.waitingFor !== v.commit) { s.waitingFor = v.commit; s.waitingSince = Date.now(); store(s); }
      }
    }
  }

  // Up to date: show the notes of any MAJOR change not seen yet, once. New players see nothing.
  whatsNew(v, s) {
    const ids = (v.changes || []).map(c => c.id);
    if (!ids.length) return;
    if (s.seen) {
      const unseen = (v.changes || []).slice(0, Math.max(0, ids.indexOf(s.seen) < 0 ? ids.length : ids.indexOf(s.seen)));
      if (unseen.some(c => c.level === 'major')) this.showCard(unseen);
    }
    s.seen = ids[0]; delete s.waitingFor; delete s.waitingSince; store(s);
  }

  maybeShow() {
    const banner = document.getElementById('upBanner');
    if (!this.pending || this.inFlight()) { if (banner) banner.remove(); return; }
    const s = load();
    if (s.waitingSince && Date.now() - s.waitingSince > AUTO_AFTER_MS && idleMenu()) { this.update(); return; }   // ignored a day: update now, on an idle menu
    if (banner || this.snoozed) return;
    const note = ((this.pending.changes || [])[0] || {}).notes;
    const b = document.createElement('div');
    b.id = 'upBanner';
    b.innerHTML = `<p><b>New version ready!</b>${note && note.length ? `<br>${esc(note[0])}` : ''}</p><button type="button" class="go">UPDATE</button><button type="button" class="later">LATER</button>`;
    b.querySelector('.go').onclick = () => this.update();
    b.querySelector('.later').onclick = () => { this.snoozed = true; b.remove(); setTimeout(() => { this.snoozed = false; }, 10 * 60 * 1000); };
    document.body.appendChild(b);
  }

  update() {
    if (this.inFlight()) return;
    try { this.beforeReload && this.beforeReload(); } catch (e) { /* reload anyway: the save was written as you played */ }
    this.reloading = true;
    (window.__CP_RELOAD || (() => location.reload()))();
  }

  showCard(changes) {
    const c = document.createElement('div');
    c.id = 'upCard';
    const notes = changes.flatMap(x => x.notes || []).slice(0, 8);
    c.innerHTML = `<div><h2>What's new!</h2><ul>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul><button type="button">OK!</button></div>`;
    c.querySelector('button').onclick = () => c.remove();
    document.body.appendChild(c);
  }
}
