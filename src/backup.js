// BACK UP MY GAME (research/BACKUP-MY-GAME.md, the user's concern: Chrome may clear site data on exit and players never change that). A backup is ONE plain text the player keeps
// outside the browser (a file, a message, a note). Pure: no DOM, no storage, no clock unless given, no random numbers; src/ui.js draws the sheets and does the sharing and the writing.
//   makeBackup(save, { game, now, pilot })  -> the object; backupText(obj) -> the text that is shared / downloaded / copied
//   readBackup(text)  -> { ok, reason, save, summary }   (parse, shape, checksum, sanity, migrate in memory: it WRITES NOTHING)
//   compareLines(summary, current) / refusalLines(reason) / onlineLines(...): the words of the cards, each line <= 26 characters (10 px at 320 px)
// The file holds the save and NOTHING else of the player's: no pilot code, no credentials (they live under their own keys). It is not encrypted. Nothing leaves the device unless the player shares it.
import { prepareSave, isBlank, progressOf } from './save.js';

export const FORMAT = 'contrail-pilot-backup', BACKUP_V = 1;
export const MAX_BYTES = 1000000, WARN_BYTES = 200000;   // refuse a restore text over 1 MB; warn at export over 200 KB (the biggest real save measured: 260 flights = 7 KB)

// A 53-bit string hash (cyrb53), 14 hex digits. It is a seal against a half-pasted or edited text, not a secret.
export function check(text) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

const NUM_FIELDS = ['seeds', 'crystals', 'flights', 'landings', 'bestDistance'];
const ARR_FIELDS = ['badges', 'seenTips', 'visited', 'areas', 'missionsDone'];
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

export function summaryOf(save) {
  return { flights: save.flights || 0, landings: save.landings || 0, seeds: Math.round(save.seeds || 0), crystals: save.crystals || 0, progress: progressOf(save) };
}

// The save as the game stores it, sealed. `pilot`: the first name only (never the tag or the code).
export function makeBackup(save, { game = 'unknown', now = Date.now(), pilot = '' } = {}) {
  const text = JSON.stringify(save);
  return { format: FORMAT, v: BACKUP_V, game: String(game), made: new Date(now).toISOString(), pilot: String(pilot || '').slice(0, 12), summary: summaryOf(save), save: JSON.parse(text), check: check(text) };
}
export const backupText = obj => JSON.stringify(obj);
// The size warning at export, and the file name: contrail-pilot-backup-<first name or player>-<yyyy-mm-dd>.json
export const tooBigToShare = text => text.length > WARN_BYTES;
export const fileName = (pilot, now = Date.now()) => `contrail-pilot-backup-${String(pilot || 'player').toLowerCase().replace(/[^a-z]/g, '') || 'player'}-${new Date(now).toISOString().slice(0, 10)}.json`;

// Read a backup text. NOTHING is written. reason: 'size' | 'json' | 'format' | 'newer' | 'check' | 'shape' | 'blank' | 'unreadable'.
export function readBackup(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, reason: 'json' };
  if (text.length > MAX_BYTES) return { ok: false, reason: 'size' };
  let o; try { o = JSON.parse(text.trim()); } catch (e) { return { ok: false, reason: 'json' }; }
  if (!isObj(o) || o.format !== FORMAT) return { ok: false, reason: 'format' };
  if (typeof o.v !== 'number' || o.v > BACKUP_V) return { ok: false, reason: 'newer' };
  if (!isObj(o.save) || typeof o.check !== 'string') return { ok: false, reason: 'shape' };
  if (check(JSON.stringify(o.save)) !== o.check) return { ok: false, reason: 'check' };
  for (const k of NUM_FIELDS) if (k in o.save && !(Number.isFinite(o.save[k]) && o.save[k] >= 0)) return { ok: false, reason: 'shape' };
  for (const k of ARR_FIELDS) if (k in o.save && !Array.isArray(o.save[k])) return { ok: false, reason: 'shape' };
  if ('levels' in o.save && !isObj(o.save.levels)) return { ok: false, reason: 'shape' };
  let save; try { save = prepareSave(JSON.parse(JSON.stringify(o.save))); } catch (e) { return { ok: false, reason: 'unreadable' }; }   // migrations in memory, as on every load
  if (isBlank(save)) return { ok: false, reason: 'blank' };
  return { ok: true, save, summary: summaryOf(save), made: o.made || '', pilot: o.pilot || '' };
}

const n = x => Math.round(x).toLocaleString('en-GB');
// The words (each line <= 26 characters).
export const refusalLines = reason => ({
  size: ['That is too big', 'to be a backup.'], json: ['That is not a backup.'], format: ['That is not a backup.'],
  newer: ['Made by a newer game.', 'Update the game first.'], check: ['This backup looks cut', 'short or changed.'],
  shape: ['This backup is not', 'in the right shape.'], blank: ['This backup is empty.'], unreadable: ['The game cannot read', 'this backup.'],
}[reason] || ['That did not work.']);
export const compareLines = (backup, now, madeDate) => [
  madeDate ? `Made ${madeDate}` : 'A backup', `Backup: ${n(backup.flights)} flights`, `Backup: ${n(backup.seeds)} seeds`,
  `Now: ${n(now.flights)} flights`, `Now: ${n(now.seeds)} seeds`, ...(backup.progress < now.progress ? ['This backup is older', 'than your game now.'] : []),
];
// The honest line for a pilot with an ONLINE copy that is richer than this backup (RESTORE-VS-ONLINE.md: the one-shot override needs the server history first).
export const ONLINE_WARNING = 'Your online copy is newer: going back will be undone the next time the game loads. Keep this backup as a separate file.';
export const onlineWarns = ({ pilot, onlineProgress, backupProgress }) => !!pilot && onlineProgress > 0 && onlineProgress > backupProgress;
export const SHARE_TEXT = { title: 'Contrail Pilot backup', text: 'My Contrail Pilot backup. Keep it safe.' };
