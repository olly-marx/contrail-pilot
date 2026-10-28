// "Back online!" banner (0.10.0): after the connection returns, tell the player their offline progress is
// being uploaded, then that it is saved. Listens to src/online.js (onUpload). Never during a flight
// (like the update banner): a message that arrives mid-flight waits for the menu. Makes its own DOM and CSS.
const CSS = `
#upload { position: fixed; left: 50%; top: 10px; transform: translateX(-50%); z-index: 61; max-width: 340px; width: calc(100% - 24px);
  background: #fffbe8; border: 3px solid #1a1a22; box-shadow: 0 4px 0 #1a1a22; padding: 8px 10px; font: 10px/1.5 Pixel, monospace; color: #1a1a22;
  display: flex; gap: 8px; align-items: center; }
#upload p { margin: 0; flex: 1; }
#upload .spin { width: 10px; height: 10px; background: #4caf50; box-shadow: 0 0 0 2px #1a1a22; animation: upspin 0.8s steps(4) infinite; }
#upload.done .spin { animation: none; background: #ffe15a; }
@keyframes upspin { to { transform: rotate(360deg); } }
`;

export class UploadBanner {
  constructor(inFlight) {
    this.inFlight = inFlight;
    this.state = null;   // null | 'uploading' | 'done' | 'update'
    this.note = '';
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    setInterval(() => this.render(), 500);
  }

  // The events of src/online.js onUpload: { type: 'start', flights, save } | { type: 'done' } | { type: 'stalled' } | { type: 'update' }
  handle(ev) {
    clearTimeout(this.doneTimer);
    if (this.state === 'update') return;   // the database wants a newer game: that message stays until the player updates
    if (ev.type === 'update') this.state = 'update';
    else if (ev.type === 'start') {
      this.state = 'uploading';
      this.note = ev.flights > 1 ? ` (${ev.flights} flights)` : '';
    } else if (ev.type === 'done') {
      if (this.state !== 'uploading') return;   // never saw it start (it was mid-flight): say nothing
      this.state = 'done';
      this.doneTimer = setTimeout(() => { this.state = null; this.render(); }, 2500);
    } else this.state = null;   // stalled: the retry is quiet
    this.render();
  }

  render() {
    let el = document.getElementById('upload');
    if (!this.state || this.inFlight()) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'upload'; document.body.appendChild(el); }
    const text = this.state === 'update'
      ? '<b>Update to keep playing!</b><br>A new season has started. <u id="upload-update">UPDATE NOW</u>'
      : this.state === 'uploading'
      ? `<b>Back online!</b><br>Uploading your progress from offline play${this.note}...`
      : '<b>All saved!</b><br>Your offline progress is safe online.';
    el.className = this.state === 'done' ? 'done' : '';
    const html = `<i class="spin"></i><p>${text}</p>`;
    if (el.innerHTML !== html) {
      el.innerHTML = html;
      const u = document.getElementById('upload-update');
      if (u) { u.style.cursor = 'pointer'; u.onclick = () => location.reload(); }
    }
  }
}
