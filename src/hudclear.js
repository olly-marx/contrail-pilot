// The flight's HUD text (the target banner 'Flying to PARIS' + its second line, and the next-airport line under it: Phaser text at game y 46 to about 87) must stay readable.
// The DOM cards that open during a flight (the toast, the coach strip) used to sit at 16 % of the page and at y 6 px: on a tall phone the toast landed on that text,
// on a small one the first-time coach strip covered it (tests/hudclear.cjs, 2026-11-11). Rule: those cards sit BELOW the HUD text.
// HUD_BOTTOM is in game pixels (WIDTH = 288 wide); the page position follows the canvas's size and place.
import { WIDTH } from './config.js';

export const HUD_BOTTOM = 90;   // the lowest HUD text ends at about game y 87 (a two-line banner + the next-airport line): 3 px of air

// Page y of the HUD's lower edge, from the game canvas (0 when there is no canvas).
export function hudBottomPx(canvas) {
  if (!canvas || !canvas.getBoundingClientRect) return 0;
  const r = canvas.getBoundingClientRect();
  return r.width > 0 ? Math.round(r.top + HUD_BOTTOM * r.width / WIDTH) : 0;
}

// True while a flight's HUD is on screen (take-off, flying, landing).
export function hudShowing() {
  try { const s = window.game && window.game.scene && window.game.scene.getScene('game'); return !!s && ['takeoff', 'playing', 'landing'].includes(s.state); } catch (e) { return false; }
}

// The CSS `top` for the toast: under the HUD during a flight, '' (the stylesheet's 16 %) otherwise.
export function toastTopCss() {
  if (!hudShowing()) return '';
  const y = hudBottomPx(window.game && window.game.canvas);
  return y > 0 ? `${y + 6}px` : '';
}

// The coach strip's CSS variable: the strip opens at --hud-bottom + 6 px (style.css .coach.tappable). Called each time a tip opens.
export function applyHudVar(canvas) {
  document.documentElement.style.setProperty('--hud-bottom', `${hudBottomPx(canvas)}px`);
}
