// The tiny real-flight landing log (the sim chat's design, research/ICE-CRYSTALS-LANDING-SIM.md). The numbers of each real touchdown (src/sim/rules.js noteTouchdown -> result.touchdown), kept on THIS device only,
// in their own localStorage key OUTSIDE the save (so the progress sync, the backup and the outbox never carry them), the last 100. Nothing identifies the player. A grown-up can copy them as plain text from the
// PILOT screen to paste to the developers. Nothing is ever sent by the game.
export const LANDLOG_KEY = 'contrailPilot.landlog', LANDLOG_MAX = 100;
const read = () => { try { const v = JSON.parse(localStorage.getItem(LANDLOG_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
const num = x => (typeof x === 'number' && Number.isFinite(x) ? x : null);
export function recordTouchdown(td) {
  if (!td || typeof td !== 'object') return false;
  const row = [num(td.pos), num(td.sink), num(td.angle), num(td.gear), num(td.flare), td.landed ? 1 : 0];
  if (row[1] === null) return false;
  try { localStorage.setItem(LANDLOG_KEY, JSON.stringify([...read(), row].slice(-LANDLOG_MAX))); return true; } catch (e) { return false; }
}
export const landingCount = () => read().length;
// Plain text, one row per landing: pos sink angle gear flare landed (pos 0 = runway start, 1 = the last usable pixel; sink px/s; angle degrees; landed 1 = landed, 0 = hit the ground).
export const landingText = () => {
  const rows = read();
  return ['contrail pilot landing numbers v1: pos sink angle gear flare landed', ...rows.map(r => r.map(x => (x === null ? '-' : x)).join(' '))].join('\n');
};
