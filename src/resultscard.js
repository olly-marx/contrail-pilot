// The RESULTS card as DATA (research/UX-MASTER-PLAN.md C1; R1). Pure: no DOM, no images, no clock. src/ui.js showResults renders it and the Node
// test (tests/resultscard.cjs) holds every line to its budget at the 320 px phone (8 px Pixel font = 1 em a character, 264 px of text = 33 characters).
// The engine's result object `r` is UNCHANGED (src/sim/rules.js bankFlight): everything here is derived from it, the save and nextUp.
import { km } from './config.js';
import { eraProgress } from './eras.js';
import { FIRSTS } from './missions2.js';
import { clip, rightOf } from './nextup.js';
const chipLabel = name => (String(name).length <= 11 ? String(name) : String(name).split(' ')[0].length <= 11 ? String(name).split(' ')[0] : clip(name, 11));
import { WILDLIFE } from './wildlife.js';
import { natureFrom } from './treepen.js';
import { activeStory, storyShape } from './storyboard.js';
import { fundOf, fundValue } from './finance.js';

export const LINE_MAX = 28;      // a muted/maths/missions/earth line at 320 px: MEASURED in the browser (the pixel font is ~8.2 px a character at 8 px, so 33 wrapped; research/UX-MEASURE.md)
export const CHIPS_MAX = 3;      // chips on the card; more become "+N more"
export const NEXT_ROWS = 2;      // UP NEXT rows on the results (HOME shows 3)

// Why a flight ended, said short: the title is the thing hit (16 px: <= 16 characters at 320).
const CRASH = [[/hot/i, 'Too hot'], [/ground/i, 'The ground'], [/Restricted/i, 'No-fly zone'], [/Storm/i, 'A storm'], [/Bird/i, 'A bird']];
export const crashTitle = reason => { const first = String(reason || '').split('\n')[0].replace(/!$/, ''); const hit = CRASH.find(([re]) => re.test(first)); return hit ? hit[1] : clip(first || 'Flight over', 16); };

const sum = (a, f) => a.reduce((n, x) => n + f(x), 0);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// `paid` = what this flight's prizes were worth { seeds, crystals }: they were PAID at the bank (R8), the card only shows them.
// `next` = nextUp(save) rows (the caller asks for NEXT_ROWS), `lead` = 'hangar' | 'nature' | null (ui.resultsLead).
export function resultsView(r, save, { paid = { seeds: 0, crystals: 0 }, next = [], lead = null } = {}) {
  const earned = r.earned || [], kept = earned.filter(e => !(r.landed && e.lost)), total = sum(r.landed ? kept : earned, e => e.n), grab = earned[0] ? earned[0].n : 0;
  const rewards = r.rewards || [], done = (r.missions2 && r.missions2.done) || [];
  const isStory = u => u.kind === 'mission' && /^story:/.test(String(u.id || '')), storyTitles = rewards.filter(isStory).map(u => u.label);
  const firstTitles = done.filter(t => FIRSTS.some(f => f.title === t)), missionTitles = done.filter(t => !firstTitles.includes(t) && !storyTitles.includes(t));
  const prizeSeeds = sum(rewards.filter(u => u.kind === 'mission' && !isStory(u)), u => u.seeds), prizeCrystals = sum(rewards.filter(u => u.kind === 'mission'), u => u.crystals);
  const v = { school: !!r.school, landed: !!r.landed, lead };
  // 1. The head: eyebrow, the city or the thing hit, the distance, a record star.
  v.eyebrow = r.school ? 'FLIGHT SCHOOL' : r.landed ? (r.overran ? 'BAD LANDING IN' : 'LANDED IN') : 'CRASHED:';
  v.title = r.school ? 'Well done!' : r.landed ? r.landedAt : crashTitle(r.reason);
  v.dist = km(r.distance || 0); v.record = !!r.newRecord;
  // 2. The bank: what this flight ADDED to the bank, all sources (what you carried home, bonuses, fares, prizes). A crash loses the seeds you carried.
  v.bank = { seeds: (r.landed ? total : 0) + paid.seeds, crystals: (r.crystals || 0) + paid.crystals, lost: r.landed ? 0 : total };
  // The MONEY line (the results redo, 2026-11-24: fares pay most of a landing since 0.73.0 and were never named): the flight's own sources, biggest first, as many as
  // fit one row ('Fares 74 · Sky 46 · Bonus 46'). Story and mission prizes have their own lines below. 'Bonus' is the word the r-bonus rail says (tests/railwords.cjs).
  const SRC = [[/^Passenger fares/, 'Fares'], [/^Seeds grabbed/, 'Sky'], [/^Long flight bonus/, 'Bonus'], [/^Cool/, 'Cool'], [/^Water projects/, 'Water']];
  v.sources = r.landed ? earned.filter(e => !e.lost && e.n > 0).map(e => ({ word: (SRC.find(([re]) => re.test(e.label)) || [null, e.label.split(' ')[0]])[1], n: e.n })).sort((a, b) => b.n - a.n) : [];
  const moneyLine = () => { let out = ''; for (const x of v.sources) { const add = `${out ? ' · ' : ''}${x.word} ${x.n.toLocaleString('en-GB')}`; if ((out + add).length > LINE_MAX) break; out += add; } return out || `${grab} grabbed`; };
  v.maths = r.school ? '' : r.overran ? 'Off the runway: no fares' : r.landed ? moneyLine()
    : total ? (r.crystals ? `${total} seeds lost, crystals kept` : `${total} seeds lost`) : r.crystals ? 'Crash: your crystals are kept' : 'Crash: nothing was carried';   // (a crash keeps every crystal since 0.73.0)
  // The planting row (tutorial 1a; the user, 2026-11-11: two lines): 'Planted 2 of 3 trees' and under it the kinds, 'Spruce, Oak'; 'Missed 3 trees' (one line) when none landed on soil; nothing when no tree was dropped.
  // Water drops (0.73.0) are released like trees but land on blue targets: r.treesDropped counts both, r.waterDropped / r.waterDrops the water ones (dropped / on target).
  // The row keeps them apart ('Trees 1 of 2 · Water 2 of 2'); trees alone keep the tutorial's words; water alone says 'Water: 2 of 3 drops landed'.
  const wDropped = Math.max(0, r.waterDropped || 0), wHit = Math.min(r.waterDrops || 0, wDropped), dropped = Math.max(0, (r.treesDropped || 0) - wDropped), planted = Math.min(r.planted || 0, dropped), treeWord = dropped === 1 ? 'tree' : 'trees', names = (r.treeNames || []).join(', ');
  const treesBase = !dropped ? '' : planted ? `Planted ${planted} of ${dropped} ${treeWord}` : `Missed ${dropped} ${treeWord}`;
  const waterBase = !wDropped ? '' : `Water: ${wHit} of ${wDropped} ${wDropped === 1 ? 'drop' : 'drops'} landed`;
  v.trees = r.school ? '' : dropped && wDropped ? `Trees ${planted} of ${dropped} · Water ${wHit} of ${wDropped}` : treesBase || waterBase;
  v.water = r.school || !wDropped ? null : { dropped: wDropped, landed: wHit };
  v.treeNames = v.trees && planted && names ? clip(names, LINE_MAX) : '';   // the second line of the row: the kinds that landed ('Spruce, Oak'), clipped to the row
  // The sheet behind the maths line: every row of the old tally.
  const gains = r.natureGains || [];
  v.tally = [...earned.map(e => [e.label === 'Seeds' ? 'Seeds grabbed' : e.label, r.landed && !e.lost ? (e.n < 0 ? `${e.n}` : `+${e.n}`) : `${e.n} lost`]),
    ...gains.map(g => [g.name, `+${g.gain}`]), ...(r.kinds ? [[`${plural(r.kinds, 'tree kind')} today`, 'forest bonus']] : []),
    ...crystalRows(r), ...(r.crystalsLost ? [['Ice crystals lost', `-${r.crystalsLost}`]] : []), ...prizeRows(rewards), ...fundRows(r, save)];
  v.tally = v.tally.filter(Boolean);
  // 3. Missions: 1 -> its name, 2+ -> the count; the seeds they paid on the right. The sheet lists them. (Season 1: the one mission's outcome.)
  // 2b. THE STORY (the results redo, 2026-11-24): the active story's own block, apart from the other missions (a story stop pays most of a flight since 0.73.0).
  v.story = r.school || r.crossing ? null : storyView(r, save);
  if (r.missions2) {
    const n = missionTitles.length;
    // 'Row broken' (release B): a flight that broke a streak row (save.streakBroken, set by missions2.onFlight) says so when no mission was done on it; the 'notyet' style, no done sound.
    v.missions = n ? { line: n === 1 ? `✓ ${clip(missionTitles[0], 20)}` : `✓ ${n} missions done`, seeds: prizeSeeds, titles: missionTitles }
      : v.story ? null   // (the story's hearts and crates are the story block's now)
      : save && save.storyHurt && save.storyHurt.crate && !save.storyHurt.failed ? { line: `Crate missed: ${save.storyHurt.hearts} of ${save.storyHurt.of} hearts`, seeds: 0, titles: [`${save.storyHurt.title}: the crate missed ${save.storyHurt.crate}'s runway. Fly over it again.`], fail: 'story' }
      : save && save.storyHurt ? (save.storyHurt.failed ? { line: 'Story failed: no hearts left', seeds: 0, titles: [`${save.storyHurt.title}: out of hearts. Pick a new story in MISSIONS.`], fail: 'story' }
        : { line: `Story: ${save.storyHurt.hearts} of ${save.storyHurt.of} hearts left`, seeds: 0, titles: [`${save.storyHurt.title}: you lost a heart. ${save.storyHurt.hearts} left.`], fail: 'story' })   // (PLAN A: a crash on a story flight, src/storyboard.js crashed)
      : (save && save.streakBroken > 0 ? { line: 'Row broken: start again', seeds: 0, titles: ['Your row of long flights was broken. Start again!'], fail: 'row' } : null);
  } else if (r.mission) {
    v.missions = r.mission.done ? { line: `✓ ${clip(r.mission.title, 24)}`, seeds: prizeSeeds, titles: [r.mission.title] } : { line: `Not this time: ${clip(r.mission.title, 14)}`, seeds: 0, titles: [r.mission.title], fail: r.mission.fail || '' };
  } else v.missions = null;
  // 4. UP NEXT: nextUp rows; the right column is the hop, the stops, or "today", never a sentence.
  v.next = next.slice(0, NEXT_ROWS).map(n => ({ key: n.key, short: n.short, full: n.full, where: n.where, lead: !!n.lead,
    right: rightOf(n) }));
  // 5. The Earth, two lines and the face; the four numbers are also the sheet.
  const b = r.breakdown || { co2: 0, night: 0, sun: 0, trees: 0 }, R = Math.round;
  v.earth = r.school ? null : { heat: r.heat, warm: `Warmed CO2 ${R(b.co2)} · Night ${R(b.night)}`, cool: `Cooled Shade ${R(b.sun)} · Nature ${R(b.trees)}`,
    bars: [['CO2', R(b.co2), '+'], ['Night', R(b.night), '+'], ['Shade', R(b.sun), '-'], ['Nature', R(b.trees), '-']] };
  // 5b. Where 'Nature' came from (the tree UI, 2026-11-16): which land cooled, the trees dropped this flight, how much the saplings grew, the next one to grow up. For the Earth sheet only.
  if (v.earth) v.earth.nature = natureFrom(r, save);
  // 6. The era: one line (the badge, the bar, the minutes). "NEW ERA" is its own beat in ui.showResults, before the hangar.
  if (r.school) v.era = null;
  else { const p = eraProgress(save); v.era = { id: p.era.id === 'future' ? 'Far future' : p.era.id, frac: p.frac, text: p.next ? `${Math.floor(p.done)}/${Math.round(p.need)} min` : 'every era open', to: p.next ? p.next.name : '' }; }
  // 7. Chips: a new animal, a new badge, a first. Max CHIPS_MAX; the rest "+N more". Each opens a sheet (ui.showResults). `name`: the whole short name, under its picture in the "+N more" grid.
  const chips = [
    ...(r.foundIds || []).map(id => WILDLIFE.find(w => w.id === id)).filter(Boolean).map(w => ({ kind: 'animal', id: w.id, label: chipLabel(w.name), full: w.name, name: w.name, body: `A new animal! ${w.name} now lives in your Wild Area. See it in NATURE.` })),
    ...rewards.filter(u => u.kind === 'badge').map(u => ({ kind: 'badge', id: u.id, tier: u.tier, label: chipLabel(u.label), full: u.label, name: u.label, body: `New badge: ${u.label}. You earned +${u.seeds} seeds and +${u.crystals} crystals. All your badges are in BOARDS.` })),
    ...firstTitles.map(t => { const f = FIRSTS.find(x => x.title === t); return { kind: 'first', id: f.id, label: clip(f.short, 11), full: t, name: f.short, body: t }; }),
  ];
  v.chips = chips.slice(0, CHIPS_MAX); v.moreChips = Math.max(0, chips.length - CHIPS_MAX); v.allChips = chips;
  return v;
}

// ---------- the story block ----------
// TAGS: the level's word (ONE GO and SPECIAL DELIVERY are the hard level's two specials: src/storyboard.js ONE_GO, CRATE).
const TAG = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD', impossible: 'IMPOSSIBLE' };
export const STORY_TITLE_MAX = LINE_MAX;   // the story's name has its own row in the block
// r: the flight's result (its rewards carry each story event: src/sim/rules.js bankFlight, src/storyboard.js reach + storyShape); save: after the flight
// (save.storyHurt: a heart lost this flight, src/missions2.js onFlight). Null when this flight had no story.
// { tag, title, hearts: { left, of } | null, stops: [{ city, state: 'done'|'next'|'todo', crate }], line, mood: 'done'|'good'|'bad'|'info', seeds, crystals, body }
export function storyView(r, save) {
  const events = (r.rewards || []).filter(u => u.kind === 'mission' && /^story:/.test(String(u.id || '')) && u.story).map(u => ({ ...u.story, seeds: u.seeds || 0, crystals: u.crystals || 0 }));
  const hurt = save && save.storyHurt ? save.storyHurt : null, live = save ? activeStory(save) : null;
  const last = events[events.length - 1] || null;
  const shape = last && last.stops ? last : hurt && hurt.stops ? hurt : live ? { ...storyShape(live), title: live.title } : null;
  if (!shape || (!events.length && !hurt && !live)) return null;
  const title = (last && last.title) || (hurt && hurt.title) || (live && live.title) || '', id = (last && last.id) || (hurt && hurt.id) || (live && live.id), same = !!(live && live.id === id);
  const reached = Math.max(shape.reached || 0, same ? live.reached || 0 : 0), stops = shape.stops || [];
  const heartsLeft = hurt ? hurt.hearts : same ? storyShape(live).heartsLeft : last ? last.heartsLeft : null, heartsOf = shape.heartsOf || (hurt && hurt.of) || null;
  // (the tag: the words of HOME's story box, src/ui.js storyLevelHTML)
  const v = { tag: shape.crate ? 'SPECIAL DELIVERY' : `${TAG[shape.level] || 'STORY'}${shape.oneGo ? ': ONE GO' : ''}`, level: shape.level || null, title: clip(title, STORY_TITLE_MAX), full: title,
    hearts: heartsOf ? { left: Math.max(0, heartsLeft ?? heartsOf), of: heartsOf } : null,
    stops: stops.map((c, i) => ({ city: c, state: i < reached ? 'done' : i === reached ? 'next' : 'todo', crate: !!shape.crate && i > 0 && i < stops.length - 1 })),
    seeds: sum(events, e => e.seeds), crystals: sum(events, e => e.crystals) };
  const crates = events.filter(e => e.crate && e.n > 1 && e.n < e.of), done = events.find(e => e.done), stop = [...events].reverse().find(e => !(e.crate && e.n > 1 && e.n < e.of));
  if (hurt && hurt.failed) { v.mood = 'bad'; v.line = 'Out of hearts: story failed'; v.body = `${title}: no hearts left, so the story has ended. Pick a new story in MISSIONS.`; v.stops = v.stops.map(x => ({ ...x, state: x.state === 'next' ? 'failed' : x.state })); }
  else if (done) { v.mood = 'done'; v.line = 'Story complete!'; v.body = `${title}: every stop reached. ${done.line || ''}`.trim(); v.stops = v.stops.map(x => ({ ...x, state: 'done' })); }
  else if (hurt && hurt.missed) { v.mood = 'bad'; v.line = clip(hurt.hearts == null ? `Missed ${hurt.missed}: fly back` : `Missed ${hurt.missed}: lost a heart`, LINE_MAX); v.body = `${title}: you flew past ${hurt.missed} without landing${hurt.hearts == null ? '' : `, which costs a heart. ${hurt.hearts} of ${hurt.of} left`}. ${hurt.missed} is still your next stop: fly there from here.`; }
  else if (hurt && hurt.crate) { v.mood = 'bad'; v.line = clip(`Missed ${hurt.crate}: lost a heart`, LINE_MAX); v.body = `${title}: the crate missed ${hurt.crate}'s runway${crates.length ? ` after ${crates.length} on target` : ''}. Fly over it again. ${hurt.hearts} of ${hurt.of} hearts left.`; }
  else if (hurt) { v.mood = 'bad'; v.line = `Lost a heart: ${hurt.hearts} of ${hurt.of} left`; v.body = `${title}: a crash on a story flight costs a heart. ${hurt.hearts} left. The next stop is still ${stops[reached] || ''}.`; }
  else if (crates.length && !stop) { v.mood = 'good'; v.line = crates.length === 1 ? `Crate on ${crates[0].city}` : `${crates.length} crates delivered`; v.body = `${title}: ${crates.map(c => c.city).join(', ')}. ${crates[crates.length - 1].line || ''}`.trim(); }
  else if (stop) { v.mood = 'good'; v.line = `Reached ${stop.city}`; v.body = `${title}: ${stop.line || stop.city}`; }   // (a long city wraps the row: the prize stays on the right)
  else if (!r.landed) { v.mood = 'info'; v.line = 'Crashed: try again'; v.body = `${title}: an Easy story has as many tries as you like. Next stop: ${stops[reached] || ''}.`; }
  else { v.mood = 'info'; v.line = clip(`Next stop: ${stops[reached] || ''}`, LINE_MAX); v.body = `${title}: land at ${stops[reached] || ''} to reach the next stop.`; }
  return v;
}

// ---------- the sheet behind the money line ----------
// Crystals by source (r.crystalsBy: src/sim/rules.js earnCrystals; distance crystals are already in r.crystals, so they are a row, never added twice).
function crystalRows(r) {
  const by = r.crystalsBy || {}, dist = r.distanceCrystals || by.distance || 0, dodge = by.dodge || 0, night = by.cleanNight || 0, rest = Math.max(0, (r.crystals || 0) - dist - dodge - night);
  return [dodge && ['Dodged icy air (crystals)', `+${dodge}`], night && ['Clean nights (crystals)', `+${night}`], dist && ['Distance crystals', `+${dist}`], rest && ['Ice crystals (kept)', `+${rest}`]];
}
// What the prizes paid (R8: paid at the bank): the story, the missions, the badges, each a row.
function prizeRows(rewards) {
  const isStory = u => u.kind === 'mission' && /^story:/.test(String(u.id || ''));
  const row = (name, list) => { const sd = sum(list, u => u.seeds || 0), cr = sum(list, u => u.crystals || 0); return sd || cr ? [name, [sd && `+${sd.toLocaleString('en-GB')}`, cr && `+${cr} crystals`].filter(Boolean).join(' ')] : null; };
  return [row('Story', rewards.filter(isStory)), row('Missions', rewards.filter(u => u.kind === 'mission' && !isStory(u))), row('Badges', rewards.filter(u => u.kind === 'badge'))];
}
// The nature fund (0.74.0) moves with the game days a flight takes: its value at take-off and now (src/finance.js fundValue at the save's flight seconds).
function fundRows(r, save) {
  if (!save || !fundOf(save) || !r.flyMinutes) return [];
  const now = fundValue(save), before = fundValue({ ...save, flightSeconds: Math.max(0, (save.flightSeconds || 0) - r.flyMinutes * 60) }), d = now - before;
  return [['Nature fund (in the BANK)', `${now.toLocaleString('en-GB')} (${d >= 0 ? '+' : ''}${d.toLocaleString('en-GB')})`]];
}
