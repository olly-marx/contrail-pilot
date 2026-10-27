// The season 2 home hub (S2 of research/PROPOSAL-HOME-MISSIONS.md, approved by the user 2026-10-27): ONE thing to do
// next, TAKE OFF, the WORLD as the hero (a big globe you can spin: "it's the hero of progression"), and tiles for the
// rest. What the hub shows is decided here, without the DOM, so tests/hub.cjs can check it: at most HUB_WORDS words,
// tiles only once their reveal is earned, the NEXT card = the mission on top.
import { current as currentMission, MISSIONS } from './missions.js';
import { flightPath } from './route.js';
import { wordCount } from './tips.js';
import * as M2 from './missions2.js';
import { lineById } from './upgrades.js';
// The first Tree Planting level (lesson 5 needs it): affordable with the seeds and crystals in the bank?
const canAffordParcels = save => { const l = lineById('trees').levels[0]; return (save.seeds || 0) >= l.cost && (save.crystals || 0) >= (l.crystals || 0); };

export const HUB_WORDS = 25;
// Which finished mission reveals each tile (PROPOSAL-12/HOME-MISSIONS reveal order: HANGAR after lesson 1, NATURE after
// lesson 2, the world map's route choice after lesson 4). Declared, not inferred; S3's lessons replace these ids.
export const REVEALS = { hangar: 'land', nature: 'seeds-5', missions: 'land', world: 'clean-night' };
const done = save => new Set(save.missionsDone || []);
export const revealed = (save, tile) => (M2.isSeason2(save) ? M2.revealed(save, tile) : done(save).has(REVEALS[tile]));   // season 2: the lessons (S3)
export const FREE_NEXT = 'Open the hangar: free upgrade!';   // the user: a free upgrade must LEAD you into the hangar

// What the hub shows: { next, route, tiles, crossing, words }.
//   next:  { title } the top mission (or a crossing that is ready replaces it); null when all done
//   route: [from, to] this flight's first hop
//   tiles: [{ id, label, badge }] only the revealed ones, in a fixed order
export function hubView(save, { badges = {}, crossingReady = null } = {}) {
  const s2 = M2.isSeason2(save), path = flightPath(save, 2);
  const m = s2 ? M2.next(save) : currentMission(save), mid = m && (m.key || m.id);
  const next = crossingReady ? { title: `Crossing ready: ${crossingReady}`, crossing: true }
    : s2 && save.freeUpgrade && revealed(save, 'hangar') ? { title: FREE_NEXT, hangar: true }   // must-do: TAKE OFF is locked meanwhile
    : s2 && mid === 'L5' && !((save.levels || {}).trees) && !canAffordParcels(save) && (save.unclaimed || []).length ? { title: 'Claim your prizes first', id: mid, claims: true }   // can't buy parcels until the prizes are paid (the audit, 2026-10-27)
    : s2 && mid === 'L5' && !((save.levels || {}).trees) ? { title: 'Buy tree parcels in NATURE first', id: mid, nature: true }   // the lesson needs parcels
    : m ? { title: m.title, id: mid } : null;
  const tiles = [['missions', 'MISSIONS'], ['hangar', 'HANGAR'], ['nature', 'NATURE']]
    .filter(([id]) => revealed(save, id)).map(([id, label]) => ({ id, label, badge: badges[id] || '' }));
  const route = path.slice(0, 2);
  const words = wordCount(next ? next.title : '') + wordCount(route.join(' ')) + tiles.reduce((a, t) => a + wordCount(`${t.label} ${t.badge}`), 0) + wordCount('TAKE OFF');
  return { next, route, tiles, worldChoice: revealed(save, 'world'), words, missionsLeft: s2 ? M2.visible(save).length : MISSIONS.length - done(save).size };
}
