// THE WORDS OF AN UPGRADE LEVEL, in one place (BLOCK2-PLAN item 4, DESIGN-UPGRADE-BAR.md part B; the user: "in the hangar there should be a way to see the progress of that upgrade, like a bar that tells you what it does at
// your level, how to upgrade it and what you'll get"). Pure: no DOM, no clock, no random numbers. The hangar strip (src/hangar.js previewCardHTML) calls upgradeCard; nothing else writes a level's words.
//   upgradeCard(save, kind, id) -> { title, have, count, max, now, next, price, locked } or null for an unknown line
//     kind 'plane' (id 'comet.engines'), 'system' (id 'forecast'), 'gadget' (id 'magnet'): the words are the level's effects (effectText), else its name
//     kind 'nature' (id 'trees', 'soil', 'nursery'): the words are the level's `short` text (src/upgrades.js)
//   have = levels bought, count = levels in the line, max = nothing left to buy; now = what the level you have does ('nothing yet' at 0); next = the name and effect of the next level (null at the end); price = the next level's { seeds, crystals }
import { fleetOf, PLANES, SYSTEMS, GADGETS, PLANE_LINES, planeById, effectText } from './fleet.js';
import { LINES, level as natureLevel } from './upgrades.js';

import { hintWords } from './hintwords.js';
export const HINT_LINE_IDS = ['forecast', 'atc', 'ops'];
export const NOTHING_YET = 'nothing yet';
export const ALL_DONE = 'All done: the best there is.';
// The level's effect in plain words, else its name (a level that only changes the picture has no effect text).
export const wordsOf = lv => effectText(lv) || lv.name || '';
// 'Name: effect' for the Next line (the name alone when it has no effect text; the effect alone when the name is the effect).
export const nextWords = lv => { const fx = effectText(lv); return fx ? `${lv.name}: ${fx}` : lv.name; };

function linesOf(save, kind, id) {
  if (kind === 'plane') { const [pid, line] = String(id).split('.'), p = planeById(pid); return p && p.lines[line] ? { levels: p.lines[line], have: ((fleetOf(save).planes[pid] || {})[line]) || 0, title: `${p.name} ${PLANE_LINES[line]}`, era: p.era } : null; }
  if (kind === 'system' || kind === 'gadget') { const g = (kind === 'system' ? SYSTEMS : GADGETS).find(x => x.id === id), f = fleetOf(save); return g ? { levels: g.levels, have: (kind === 'system' ? f.systems : f.gadgets)[id] || 0, title: g.name } : null; }
  if (kind === 'nature') { const l = LINES.find(x => x.id === id); return l && l.levels ? { levels: l.levels, have: natureLevel(save, id), title: l.name, nature: true } : null; }
  return null;
}

export function upgradeCard(save, kind, id) {
  const L = linesOf(save, kind, id); if (!L) return null;
  const { levels, have } = L, count = levels.length, max = have >= count, cur = have ? levels[have - 1] : null, nxt = max ? null : levels[have];
  const say = lv => (L.nature ? lv.short || lv.name || '' : wordsOf(lv)), sayNext = lv => (L.nature ? lv.short || lv.name || '' : nextWords(lv));
  const card = { title: L.title, have, count, max, now: cur ? say(cur) : NOTHING_YET, next: nxt ? sayNext(nxt) : null,
    price: nxt ? { seeds: nxt.cost || 0, crystals: nxt.crystals || 0 } : null };
  // THE THREE HINT LINES (forecast, atc, ops; the gap hint, one flavour per line): their levels carry no effect text for the hint, so the words come from src/hintwords.js (the sim chat's tables, 28 characters a line).
  const hw = kind === 'system' && HINT_LINE_IDS.includes(id) ? hintWords(id, have) : null;
  if (hw) { card.now = hw.now; card.next = max ? null : hw.next; }
  return card;
}

// Every line of the shop: [kind, id] pairs (for the Node test that checks every level has words).
export function allLines() {
  const out = [];
  for (const p of PLANES) for (const line of Object.keys(PLANE_LINES)) out.push(['plane', `${p.id}.${line}`]);
  for (const g of SYSTEMS) out.push(['system', g.id]);
  for (const g of GADGETS) out.push(['gadget', g.id]);
  for (const l of LINES) if (l.levels) out.push(['nature', l.id]);
  return out;
}
