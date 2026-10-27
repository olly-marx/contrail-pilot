// The season 2 home hub (S2 of research/PROPOSAL-HOME-MISSIONS.md, approved by the user 2026-10-27): ONE thing to do
// next, TAKE OFF, the WORLD as the hero (a big globe you can spin: "it's the hero of progression"), and tiles for the
// rest. What the hub shows is decided here, without the DOM, so tests/hub.cjs can check it: at most HUB_WORDS words,
// tiles only once their reveal is earned, the NEXT card = the mission on top.
import { current as currentMission, MISSIONS } from './missions.js';
import { flightPath } from './route.js';
import { wordCount } from './tips.js';

export const HUB_WORDS = 25;
// Which finished mission reveals each tile (PROPOSAL-12/HOME-MISSIONS reveal order: HANGAR after lesson 1, NATURE after
// lesson 2, the world map's route choice after lesson 4). Declared, not inferred; S3's lessons replace these ids.
export const REVEALS = { hangar: 'land', nature: 'seeds-5', missions: 'land', world: 'clean-night' };
const done = save => new Set(save.missionsDone || []);
export const revealed = (save, tile) => done(save).has(REVEALS[tile]);

// What the hub shows: { next, route, tiles, crossing, words }.
//   next:  { title } the top mission (or a crossing that is ready replaces it); null when all done
//   route: [from, to] this flight's first hop
//   tiles: [{ id, label, badge }] only the revealed ones, in a fixed order
export function hubView(save, { badges = {}, crossingReady = null } = {}) {
  const m = currentMission(save), path = flightPath(save, 2);
  const next = crossingReady ? { title: `Crossing ready: ${crossingReady}`, crossing: true } : m ? { title: m.title, id: m.id } : null;
  const tiles = [['missions', 'MISSIONS'], ['hangar', 'HANGAR'], ['nature', 'NATURE']]
    .filter(([id]) => revealed(save, id)).map(([id, label]) => ({ id, label, badge: badges[id] || '' }));
  const route = path.slice(0, 2);
  const words = wordCount(next ? next.title : '') + wordCount(route.join(' ')) + tiles.reduce((a, t) => a + wordCount(`${t.label} ${t.badge}`), 0) + wordCount('TAKE OFF');
  return { next, route, tiles, worldChoice: revealed(save, 'world'), words, missionsLeft: MISSIONS.length - done(save).size };
}
