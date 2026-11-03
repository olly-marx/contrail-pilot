// The RESULTS card as DATA (research/UX-MASTER-PLAN.md C1; R1). Pure: no DOM, no images, no clock. src/ui.js showResults renders it and the Node
// test (tests/resultscard.cjs) holds every line to its budget at the 320 px phone (8 px Pixel font = 1 em a character, 264 px of text = 33 characters).
// The engine's result object `r` is UNCHANGED (src/sim/rules.js bankFlight): everything here is derived from it, the save and nextUp.
import { km } from './config.js';
import { eraProgress } from './eras.js';
import { FIRSTS } from './missions2.js';
import { clip } from './nextup.js';
import { WILDLIFE } from './wildlife.js';

export const LINE_MAX = 33;      // a muted/maths/missions/earth line at 8 px, 320 px phone
export const CHIPS_MAX = 3;      // chips on the card; more become "+N more"
export const NEXT_ROWS = 2;      // UP NEXT rows on the results (HOME shows 3)

// Why a flight ended, said short: the title is the thing hit (16 px: <= 16 characters at 320).
const CRASH = [[/hot/i, 'Too hot'], [/ground/i, 'The ground'], [/Restricted/i, 'No-fly zone'], [/Storm/i, 'A storm'], [/Bird/i, 'A bird']];
export const crashTitle = reason => { const first = String(reason || '').split('\n')[0].replace(/!$/, ''); const hit = CRASH.find(([re]) => re.test(first)); return hit ? hit[1] : clip(first || 'Flight over', 16); };

const sum = (a, f) => a.reduce((n, x) => n + f(x), 0);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// `paid` = what the silent claim just added { seeds, crystals } (R1 keeps claim() running behind the prize line; R8 removes it).
// `next` = nextUp(save) rows (the caller asks for NEXT_ROWS), `lead` = 'hangar' | 'nature' | null (ui.resultsLead).
export function resultsView(r, save, { paid = { seeds: 0, crystals: 0 }, next = [], lead = null } = {}) {
  const earned = r.earned || [], total = sum(earned, e => e.n), grab = earned[0] ? earned[0].n : 0;
  const rewards = r.rewards || [], done = (r.missions2 && r.missions2.done) || [];
  const firstTitles = done.filter(t => FIRSTS.some(f => f.title === t)), missionTitles = done.filter(t => !firstTitles.includes(t));
  const prizeSeeds = sum(rewards.filter(u => u.kind === 'mission'), u => u.seeds), prizeCrystals = sum(rewards.filter(u => u.kind === 'mission'), u => u.crystals);
  const v = { school: !!r.school, landed: !!r.landed, lead };
  // 1. The head: eyebrow, the city or the thing hit, the distance, a record star.
  v.eyebrow = r.school ? 'FLIGHT SCHOOL' : r.landed ? 'LANDED IN' : 'CRASHED:';
  v.title = r.school ? 'Well done!' : r.landed ? r.landedAt : crashTitle(r.reason);
  v.dist = km(r.distance || 0); v.record = !!r.newRecord;
  // 2. The bank: what this flight ADDED to the bank, all sources (what you carried home, bonuses, fares, prizes). A crash loses the seeds you carried.
  v.bank = { seeds: (r.landed ? total : 0) + paid.seeds, crystals: (r.crystals || 0) + paid.crystals, lost: r.landed ? 0 : total };
  const mult = Number(r.mult) > 1 && earned.some(e => /^Long/.test(e.label)) ? ` × ${r.mult} bonus` : '';   // the word the r-bonus rail says (tests/railwords.cjs)
  const kinds = r.kinds ? ` · ${r.kinds} ${r.kinds === 1 ? 'kind' : 'kinds'}` : '';
  v.maths = r.school ? '' : r.landed ? clip(`${grab} grabbed${mult}${kinds}`, LINE_MAX) : clip(`${total} seeds lost · ${v.bank.crystals} ❄ kept`, LINE_MAX);
  // The sheet behind the maths line: every row of the old tally.
  const gains = r.natureGains || [];
  v.tally = [...earned.map(e => [e.label === 'Seeds' ? 'Seeds grabbed' : e.label, r.landed ? `+${e.n}` : `${e.n} lost`]),
    ...gains.map(g => [g.name, `+${g.gain}`]), ...(r.kinds ? [[`${plural(r.kinds, 'tree kind')} today`, 'forest bonus']] : []),
    ...(r.crystals ? [['Ice crystals (kept)', `+${r.crystals}`]] : []), ...(paid.seeds ? [['Prizes', `+${paid.seeds}`]] : [])];
  // 3. Missions: 1 -> its name, 2+ -> the count; the seeds they paid on the right. The sheet lists them. (Season 1: the one mission's outcome.)
  if (r.missions2) {
    const n = missionTitles.length;
    v.missions = n ? { line: n === 1 ? `✓ ${clip(missionTitles[0], 20)}` : `✓ ${n} missions done`, seeds: prizeSeeds, titles: missionTitles } : null;
  } else if (r.mission) {
    v.missions = r.mission.done ? { line: `✓ ${clip(r.mission.title, 24)}`, seeds: prizeSeeds, titles: [r.mission.title] } : { line: `Not this time: ${clip(r.mission.title, 14)}`, seeds: 0, titles: [r.mission.title], fail: r.mission.fail || '' };
  } else v.missions = null;
  // 4. UP NEXT: nextUp rows; the right column is the hop, the stops, or "today", never a sentence.
  v.next = next.slice(0, NEXT_ROWS).map(n => ({ key: n.key, short: n.short, full: n.full, where: n.where, lead: !!n.lead,
    right: n.where === 'hangar' ? 'HANGAR ›' : n.where === 'nature' ? 'NATURE ›' : n.stops ? plural(n.stops, 'stop') : n.daily ? 'today' : '' }));
  // 5. The Earth, two lines and the face; the four numbers are also the sheet.
  const b = r.breakdown || { co2: 0, night: 0, sun: 0, trees: 0 }, R = Math.round;
  v.earth = r.school ? null : { heat: r.heat, warm: `Warmed: CO2 ${R(b.co2)} · Night ${R(b.night)}`, cool: `Cooled: Shade ${R(b.sun)} · Nature ${R(b.trees)}`,
    bars: [['CO2', R(b.co2), '+'], ['Night', R(b.night), '+'], ['Shade', R(b.sun), '-'], ['Nature', R(b.trees), '-']] };
  // 6. The era: one line (the badge, the bar, the minutes). "NEW ERA" is its own beat in ui.showResults, before the hangar.
  if (r.school) v.era = null;
  else { const p = eraProgress(save); v.era = { id: p.era.id === 'future' ? 'Far future' : p.era.id, frac: p.frac, text: p.next ? `${Math.floor(p.done)}/${Math.round(p.need)} min` : 'every era open', to: p.next ? p.next.name : '' }; }
  // 7. Chips: a new animal, a new badge, a first. Max CHIPS_MAX; the rest "+N more". Each opens a sheet (ui.showResults).
  const chips = [
    ...(r.foundIds || []).map(id => WILDLIFE.find(w => w.id === id)).filter(Boolean).map(w => ({ kind: 'animal', id: w.id, label: clip(w.name, 11), full: w.name, body: `A new animal! ${w.name} now lives in your Wild Area. See it in NATURE.` })),
    ...rewards.filter(u => u.kind === 'badge').map(u => ({ kind: 'badge', id: u.id, tier: u.tier, label: clip(u.label, 11), full: u.label, body: `New badge: ${u.label}. You earned +${u.seeds} seeds and +${u.crystals} crystals. All your badges are in BOARDS.` })),
    ...firstTitles.map(t => { const f = FIRSTS.find(x => x.title === t); return { kind: 'first', id: f.id, label: clip(f.short, 11), full: t, body: t }; }),
  ];
  v.chips = chips.slice(0, CHIPS_MAX); v.moreChips = Math.max(0, chips.length - CHIPS_MAX); v.allChips = chips;
  return v;
}
