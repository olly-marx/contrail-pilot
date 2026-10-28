// Crash catcher (art session, 2026-10-22): when something breaks, say so instead of freezing.
// Players on iPhones saw the game freeze with no message (since the regions update). Any script
// error, unhandled promise rejection, or the browser taking away the WebGL graphics (it does that
// to free memory) now shows a card with what broke and where the plane was, and a RESTART button
// that writes the save first. A screenshot of the card is enough to find the bug.

import { VERSION } from './version.js';

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// A sound that could not start is never a crash (live bug 2026-10-28, iPhone CriOS 156 on REOPENING the app: "Promise: Failed to start the audio device" showed this card on
// a healthy game). The browser rejects AudioContext.resume() when the app was backgrounded; Phaser's own unlock/focus code (vendor/phaser.min.js: `resume().then(...)`, no
// catch) lets it escape. Anything that looks like an audio-start/playback refusal is ignored here, and sound.js retries quietly on the next sound.
export const isBenignAudioRejection = r => /audio device|audiocontext|NotAllowedError|AbortError|play\(\) request was interrupted/i.test(`${(r && r.name) || ''} ${(r && r.message) || r || ''}`);

// where(): a short line about the game's state (distance, region, leg), for the card.
export function catchCrashes(where, beforeReload) {
  let shown = false;
  const show = (title, detail) => {
    if (shown) return;
    shown = true;
    let at = '';
    try { at = where(); } catch (e) { at = '(state unknown)'; }
    const v = new URL(import.meta.url).searchParams.get('v') || 'local';
    const c = document.createElement('div');
    c.id = 'crashCard';
    c.style.cssText = 'position:fixed;inset:0;z-index:99;background:rgba(10,12,30,.75);display:flex;align-items:center;justify-content:center';
    c.innerHTML = `<div style="background:#fffbe8;border:3px solid #1a1a22;box-shadow:0 4px 0 #1a1a22;padding:12px 14px;max-width:340px;width:calc(100% - 28px);font:10px/1.5 Pixel,monospace;color:#1a1a22">
      <h2 style="font-size:14px;margin:0 0 6px;color:#c0392b">Oops, the game got stuck</h2>
      <p style="margin:0 0 6px">Please take a screenshot of this card and send it to us. Then tap RESTART: your progress is saved.</p>
      <pre style="white-space:pre-wrap;word-break:break-word;font:9px/1.4 monospace;background:#f0ead2;padding:6px;margin:0 0 8px;max-height:40vh;overflow:auto">${esc(title)}
${esc(detail)}
${esc(at)}
version ${esc(VERSION)} (${esc(v)}) | ${esc(navigator.userAgent)}</pre>
      <button type="button" style="font:10px Pixel,monospace;background:#4caf50;color:#fff;border:3px solid #1a1a22;padding:6px 10px">RESTART</button></div>`;
    c.querySelector('button').onclick = () => { try { beforeReload(); } catch (e) { /* reload anyway */ } location.reload(); };
    document.body.appendChild(c);
  };
  const stack = e => (e && e.stack ? String(e.stack).split('\n').slice(0, 6).join('\n') : '');
  window.addEventListener('error', ev => {
    if (!ev.error && ev.target && ev.target !== window) return;   // a missing image or sound: not a crash
    show(`Error: ${ev.message}`, `${ev.filename || ''}:${ev.lineno || ''}:${ev.colno || ''}\n${stack(ev.error)}`);
  }, true);
  window.addEventListener('unhandledrejection', ev => {
    const r = ev.reason;
    if (r && /fetch|network|load failed|supabase/i.test(String(r.message || r))) return;   // offline: not a crash
    if (isBenignAudioRejection(r)) return;   // a sound that would not start: never a stuck game (see above)
    show(`Promise: ${r && r.message ? r.message : r}`, stack(r));
  });
  return {
    // The canvas's WebGL graphics taken away by the browser: everything stops drawing.
    watchCanvas(canvas) {
      canvas.addEventListener('webglcontextlost', () => show('Graphics lost (WebGL context lost)', 'The browser took the game\'s graphics away, often to save memory. Closing other tabs can help.'));
    },
    show,
  };
}
