// Ask the browser to keep this site's storage (the game's save lives in localStorage). A browser can still clear it: Chrome has a setting 'Clear cookies and
// site data when you close all windows', and Safari drops idle sites. The game cannot see those settings, but persist() says whether the browser promises to keep
// the data: if it does not (false), ONE plain note, from landing 5, tells the player the one thing that helps: the pilot code (the user lost a 260-flight save, 2026-11-05).
// Pure: the navigator comes in as an argument, so tests/persist.cjs can fake it.
let asked = null;
// Resolves true (kept), false (the browser would not promise) or null (not supported / failed). Asks once per page load.
export function askPersist(nav = typeof navigator !== 'undefined' ? navigator : null) {
  if (asked) return asked;
  asked = (async () => {
    try {
      const st = nav && nav.storage;
      if (!st || typeof st.persist !== 'function') return null;
      if (typeof st.persisted === 'function' && await st.persisted()) return true;
      return (await st.persist()) === true;
    } catch (e) { return null; }
  })();
  return asked;
}
export const resetAsked = () => { asked = null; };   // tests only

export const PERSIST_TIP = 'persist-note', PERSIST_FROM_LANDING = 5;
// Is the note due? persisted: the answer of askPersist(). `named`: this device has a pilot (so there is a code to write down).
export const noteDue = (save, persisted) => persisted === false && (save.landings || 0) >= PERSIST_FROM_LANDING
  && !(save.seenTips || []).includes(PERSIST_TIP) && !(save.seenTips || []).includes('*');
export const noteText = named => named
  ? 'Your browser may delete your game when it closes. Write your pilot code down (PILOT tab): it brings your game back.'
  : 'Your browser may delete your game when it closes. Pick a pilot name in PILOT: it gives you a code that brings your game back.';
