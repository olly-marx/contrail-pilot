// Updates (art session, 2026-10-22): tell players a new version is out, at a moment that can't hurt.
//
// Each deploy writes version.json next to the game: { commit, changes } (changes from CHANGES.json,
// newest first: { id, level: 'minor' | 'major', notes: [...] }). This page knows its own commit from
// its script address (the deploy stamps every import with ?v=<commit>). Every few minutes, and when
// you come back to the tab, it fetches version.json. If the commit differs, an update is waiting:
//   - never during a flight: only when no flight is running (menu, hangar, results);
//   - on an IDLE menu (the title showing and nothing open on top: no info card, coach bubble, tour or toast)
//     it updates BY ITSELF (0.11.0, the user: "update on the menu"): a short "Updating..." note, then the save is
//     written and the page reloads, a second or two after the check finds a newer version;
//   - a loop guard: each target version is auto-tried once with a plain reload and, if the page comes back still
//     old (a browser that serves the old page from its cache), once more through a fresh address (?u=<commit>,
//     removed at once); after that it stays quiet, and only the banner remains;
//   - anywhere else (a card open, the hangar): a banner "New version ready! UPDATE" (and the newest note);
//     UPDATE reloads (the save is kept);
//   - ignored for over a day, it updates by itself on an idle menu even after both tries failed;
//   - the save is written just before any reload, so a purchase in the last second is kept;
//   - after an update that has a 'major' change you haven't seen, a one-time "What's new" card.
// Local copies (no ?v stamp) don't check, so development is never interrupted.

const KEY = 'contrailPilot.updates';
const CHECK_MS = 60 * 1000;          // (3 minutes until 0.11.0)
const AUTO_WAIT_MS = 1500;           // "Updating..." shows this long before the reload, so a tap in that moment cancels it
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
#upAuto { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 60; max-width: 340px; width: calc(100% - 24px);
  background: #fffbe8; border: 3px solid #1a1a22; box-shadow: 0 4px 0 #1a1a22; padding: 8px 10px; font: 10px/1.5 Pixel, monospace; color: #1a1a22; }
#upAuto p { margin: 0; }
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
export const idleMenu = () => shown('title') && !shown('toast') && !shown('coach') && !shown('tour') && !shown('repriced') && !document.getElementById('upCard')
  && ![...document.querySelectorAll('.overlay.top')].some(e => !e.hidden);

export class Updates {
  // inFlight(): true while a flight (take-off, flying, landing) is running.
  // beforeReload(): write the save.
  constructor(inFlight, beforeReload) {
    this.inFlight = inFlight;
    this.beforeReload = beforeReload;
    this.own = ownCommit();
    this.pending = null;
    try {   // the forced-fresh address (?u=<commit>) is tidied away at once; every OTHER parameter stays (?newplayer=1...)
      const a = new URL(location.href); if (a.searchParams.has('u')) { a.searchParams.delete('u'); history.replaceState(null, '', a.pathname + a.search + a.hash); }
    } catch (e) { /* no history to tidy */ }
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
    s.seen = ids[0]; delete s.waitingFor; delete s.waitingSince; delete s.autoTried; delete s.freshTried; store(s);
  }

  maybeShow() {
    const banner = document.getElementById('upBanner');
    if (!this.pending || this.inFlight()) { if (banner) banner.remove(); this.cancelAuto(); return; }
    const s = load(), c = this.pending.commit;
    if (s.waitingSince && Date.now() - s.waitingSince > AUTO_AFTER_MS && idleMenu()) { this.update(); return; }   // ignored a day: update now, on an idle menu
    // On an idle menu, update by itself, each way once per target version (the loop guard).
    const way = s.autoTried !== c ? 'plain' : s.freshTried !== c ? 'fresh' : null;
    if (way && idleMenu()) {
      if (!this.autoAt) { this.autoAt = Date.now() + AUTO_WAIT_MS; this.showAuto(); return; }
      if (Date.now() >= this.autoAt) {
        const t = load(); this.cancelAuto();
        if (way === 'plain') t.autoTried = c; else t.freshTried = c;
        store(t);   // remembered BEFORE the reload: a page that comes back old must not try the same way again
        this.update(way === 'fresh' ? c : null);
      }
      return;
    }
    this.cancelAuto();
    if (banner || this.snoozed) return;
    const note = ((this.pending.changes || [])[0] || {}).notes;
    const b = document.createElement('div');
    b.id = 'upBanner';
    b.innerHTML = `<p><b>New version ready!</b>${note && note.length ? `<br>${esc(note[0])}` : ''}</p><button type="button" class="go">UPDATE</button><button type="button" class="later">LATER</button>`;
    b.querySelector('.go').onclick = () => this.update();
    b.querySelector('.later').onclick = () => { this.snoozed = true; b.remove(); setTimeout(() => { this.snoozed = false; }, 10 * 60 * 1000); };
    document.body.appendChild(b);
  }

  // fresh: a commit -> load the page again through a new address (?u=<commit>), which no cache has seen.
  update(fresh = null) {
    if (this.inFlight()) return;
    try { this.beforeReload && this.beforeReload(); } catch (e) { /* reload anyway: the save was written as you played */ }
    this.reloading = true;
    if (fresh) { const a = new URL(location.href); a.searchParams.set('u', fresh); (window.__CP_FRESH || (u => location.replace(u)))(a.pathname + a.search + a.hash); }   // other parameters kept
    else (window.__CP_RELOAD || (() => location.reload()))();
  }

  showAuto() {
    if (document.getElementById('upAuto')) return;
    const b = document.createElement('div');
    b.id = 'upAuto';
    b.innerHTML = '<p><b>Updating...</b><br>Getting the newest version!</p>';
    document.body.appendChild(b);
  }
  cancelAuto() { this.autoAt = 0; const b = document.getElementById('upAuto'); if (b) b.remove(); }

  showCard(changes) {
    const c = document.createElement('div');
    c.id = 'upCard';
    const notes = changes.flatMap(x => x.notes || []).slice(0, 8);
    c.innerHTML = `<div><h2>What's new!</h2><ul>${notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul><button type="button">OK!</button></div>`;
    c.querySelector('button').onclick = () => c.remove();
    document.body.appendChild(c);
  }
}
