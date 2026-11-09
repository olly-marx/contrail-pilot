// The season 2 home hub (S2 of research/PROPOSAL-HOME-MISSIONS.md, approved by the user 2026-10-27; R3 of the UX master plan, 2026-11-03): the WORLD as
// the hero (a big globe you can spin), the route line, UP NEXT (the SAME rows as the results: src/nextup.js is the one source), TAKE OFF. The tiles
// are gone: the bottom bar is the navigation (its tabs appear by `revealed`, below). What the hub shows is decided here, without the DOM, so
// tests/hub.cjs can check it: at most HUB_WORDS words, UP NEXT = nextUp, the route aimed at the mission's city.
import { current as currentMission, MISSIONS } from './missions.js';
import { routeFor, aimTarget, aimOpen } from './aim.js';
import { wordCount } from './tips.js';
import * as M2 from './missions2.js';
import { nextUp, rightOf } from './nextup.js';

export const HUB_WORDS = 25;
// Which finished mission reveals each bottom-bar tab (PROPOSAL-12/HOME-MISSIONS reveal order: HANGAR after lesson 1, NATURE after
// lesson 2, the world map's route choice after lesson 4). Declared, not inferred; S3's lessons replace these ids.
export const REVEALS = { hangar: 'land', nature: 'seeds-5', missions: 'land', world: 'clean-night' };
const done = save => new Set(save.missionsDone || []);
export const revealed = (save, tile) => (M2.isSeason2(save) ? M2.revealed(save, tile) : done(save).has(REVEALS[tile]));   // season 2: the lessons (S3)
export const FREE_NEXT = 'Open the hangar: free upgrade!';   // the user: a free upgrade must LEAD you into the hangar

// What the hub shows: { next, up, route, aim, skip, worldChoice, words, missionsLeft }.
//   up:    the UP NEXT rows (src/nextup.js: a must-do lead, the first open mission, the first undone daily; season 2 only): [{ key, short, full, where, stops?, daily?, lead?, pic?, right }]
//   next:  the TOP row as the hub's lock logic reads it: { title, id?, hangar?, nature?, claims?, crossing? } (a free part waiting locks TAKE OFF), or null
//   skip: null (no city mission to aim at) | 'off' (the route aims) | 'on' (the player skipped this trip: src/aim.js)
//   route: the next stops: [from, to] (the first hop), or up to the mission's city when the route aims at one (src/aim.js); aim: that city
export const UP_ROWS = 3;
export function hubView(save, { crossingReady = null, crossing = null, boxShown = false } = {}) {
  const s2 = M2.isSeason2(save), path = routeFor(save, 4), aim = aimTarget(save);
  const up = s2 ? nextUp(save, { crossingReady, crossing, limit: UP_ROWS, boxShown }).map(n => ({ ...n, right: rightOf(n) })) : [];
  const f = up[0], m = s2 ? null : currentMission(save);
  const next = s2
    ? (!f ? null : f.key === 'lead:cross' ? { title: `Crossing ready: ${crossingReady}`, crossing: true } : f.key === 'lead:free' ? { title: FREE_NEXT, hangar: true }
      : f.key === 'lead:parcels' ? { title: f.full, id: 'L5', nature: true } : { title: f.full, id: f.key })
    : crossingReady ? { title: `Crossing ready: ${crossingReady}`, crossing: true } : m ? { title: m.title, id: m.id } : null;
  // The next stops, up to the mission's city when the route aims at one ("LONDON > PARIS > BERLIN (mission)"), else the first hop.
  const at = aim ? path.indexOf(aim) : -1, route = path.slice(0, at > 0 ? Math.min(at + 1, 4) : 2);
  const words = (s2 ? up.reduce((a, r) => a + wordCount(`${r.short} ${r.right}`), 0) : wordCount(next ? next.title : '')) + wordCount(route.join(' ')) + wordCount('TAKE OFF');
  return { next, up, route, aim: at > 0 && at <= 3 ? aim : null, skip: aimOpen(save) ? (save.skipAim ? 'on' : 'off') : null, worldChoice: revealed(save, 'world'), words, missionsLeft: s2 ? M2.visible(save).length : MISSIONS.length - done(save).size };
}
