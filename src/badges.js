// Badges: achievements, not lessons (missions teach; see src/missions.js). Each badge measures one
// number, from this flight (`flight`) or from your whole history (`total`); passing a tier's goal
// earns that tier: bronze, silver, gold (a one-tier badge is just gold). Secret badges show as "???"
// until earned. Every tier earned goes into save.unclaimed and pays only when the player taps CLAIM
// (src/rewards.js). Art: assets/ui/badge-<id>-<tier>.png (tools/art/make_badges.py).
import { LAP_KM } from './route.js';

const sum = o => Object.values(o || {}).reduce((a, n) => a + n, 0);
const found = save => Object.keys(save.found || {}).length;   // Wild Area species found: save.found is id -> time (GameScene.seen)
const projects = save => Object.values(save.habitat || {}).reduce((a, l) => a + (l || []).length, 0);   // every region (2026-10-22)

// Prizes grow with the tier. Roughly what the old challenges paid, so the hangar stays affordable.
const T3 = (a, b, c) => [{ goal: a, seeds: 30, crystals: 2 }, { goal: b, seeds: 120, crystals: 6 }, { goal: c, seeds: 400, crystals: 15 }];
const ONE = (goal = 1, seeds = 80, crystals = 4) => [{ goal, seeds, crystals }];
const SECRET = ONE(1, 50, 3);

export const THEMES = { flying: 'Flying', climate: 'Climate', seeds: 'Seeds', nature: 'Nature', explorer: 'Explorer', secret: 'Secret' };

// measure(r, save) -> a number; r is the flight result from GameScene.finish(), save is AFTER this
// flight has been counted (landings, trees planted, cities visited...).
export const BADGES = [
  { id: 'longhaul', name: 'Long Haul', theme: 'flying', tiers: T3(2000, 8000, 20000), unit: 'km in one flight, then land',
    measure: r => (r.landed ? r.distance : 0) },
  { id: 'frequent', name: 'Frequent Flyer', theme: 'flying', tiers: T3(10, 50, 200), unit: 'landings',
    measure: (r, s) => s.landings || 0 },
  { id: 'hopper', name: 'Airport Hopper', theme: 'flying', tiers: T3(1, 4, 8), unit: 'airports passed in one flight, then land',
    measure: r => (r.landed ? r.airportsSkipped : 0) },
  { id: 'bumpy', name: 'Bumpy Ride', theme: 'flying', tiers: ONE(), unit: 'get bumped by turbulence, then land',
    measure: r => (r.landed && r.bumped ? 1 : 0) },
  { id: 'sunshield', name: 'Sun Shield', theme: 'climate', tiers: T3(15, 40, 100), unit: 'shade in one flight',
    measure: r => Math.floor(r.sunBlocked || 0) },
  { id: 'nightowl', name: 'Night Owl', theme: 'climate', tiers: T3(3, 10, 25), unit: 'icy air dodged at night, in one flight',
    measure: r => r.dodges || 0 },
  { id: 'coolplanet', name: 'Cool Planet', theme: 'climate', tiers: T3(1, 5, 20), unit: 'landings with the Earth cooler than at take-off',
    measure: (r, s) => s.coolLandings || 0 },
  { id: 'zerocarbon', name: 'Zero Carbon', theme: 'climate', tiers: ONE(), unit: 'fly with the hydrogen engine',
    measure: (r, s) => (((s.levels || {}).fuel || 0) >= 4 ? 1 : 0) },
  { id: 'seedhunter', name: 'Seed Hunter', theme: 'seeds', tiers: T3(15, 40, 100), unit: 'seeds on board when you land',
    measure: r => (r.landed ? r.cargo : 0) },
  { id: 'golden', name: 'Golden Touch', theme: 'seeds', tiers: T3(2, 5, 10), unit: 'golden seeds in one flight',
    measure: r => r.goldens || 0 },
  { id: 'forester', name: 'Forester', theme: 'nature', tiers: T3(5, 25, 100), unit: 'trees planted',
    measure: (r, s) => sum(s.planted) },
  { id: 'naturalist', name: 'Naturalist', theme: 'nature', tiers: T3(5, 12, 23), unit: 'kinds of wildlife found',
    measure: (r, s) => found(s) },
  { id: 'rewilder', name: 'Rewilder', theme: 'nature', tiers: T3(3, 7, 11), unit: 'habitat projects done',
    measure: (r, s) => projects(s) },
  { id: 'globetrotter', name: 'Globetrotter', theme: 'explorer', tiers: T3(4, 10, 16), unit: 'cities visited',
    measure: (r, s) => (s.visited || []).length },
  { id: 'worldflight', name: 'Round the World in One Flight', theme: 'explorer', tiers: ONE(1, 600, 30), unit: 'fly all the way round the world without landing, then land',
    measure: r => (r.landed && r.distance >= LAP_KM ? 1 : 0) },
  // Secret: each needs something the game really records (checked in tests/badges.cjs).
  { id: 'oops', name: 'Oops!', theme: 'secret', secret: true, tiers: SECRET, unit: 'crash for the first time',
    measure: (r, s) => (sum(s.crashes) > 0 ? 1 : 0) },
  { id: 'birdstrike', name: 'Bird Strike', theme: 'secret', secret: true, tiers: SECRET, unit: 'crash into a bird',
    measure: (r, s) => (((s.crashes || {}).bird || 0) > 0 ? 1 : 0) },
  { id: 'toldoff', name: 'Told Off', theme: 'secret', secret: true, tiers: SECRET, unit: 'fly into a no-fly zone',
    measure: (r, s) => (((s.crashes || {}).nofly || 0) > 0 ? 1 : 0) },
  { id: 'meltdown', name: 'Meltdown', theme: 'secret', secret: true, tiers: SECRET, unit: 'let the Earth overheat',
    measure: (r, s) => (((s.crashes || {}).overheat || 0) > 0 ? 1 : 0) },
  { id: 'closecall', name: 'Close Call', theme: 'secret', secret: true, tiers: SECRET, unit: 'land with the Earth bar over 90%',
    measure: r => (r.landed && r.heat > 90 ? 1 : 0) },
  { id: 'lucky7', name: 'Lucky 7', theme: 'secret', secret: true, tiers: SECRET, unit: 'land with exactly 7 seeds',
    measure: r => (r.landed && r.cargo === 7 ? 1 : 0) },
  { id: 'seeddodger', name: 'Seed Dodger', theme: 'secret', secret: true, tiers: SECRET, unit: 'fly 2,000 km and land with no seeds at all',
    measure: r => (r.landed && r.cargo === 0 && r.distance >= 2000 ? 1 : 0) },
];
export const badgeById = id => BADGES.find(b => b.id === id);
export const tierOf = (save, id) => (save.badgeTiers || {})[id] || 0;
export const medal = (id, tier) => `assets/ui/badge-${id}-${tier}.png`;
export const tierName = (b, t) => (b.tiers.length === 1 ? '' : ['', 'Bronze', 'Silver', 'Gold'][t]);

// After a flight: which new tiers did it earn? Records them in save.badgeTiers (and save.badges,
// the list of badge ids with at least one tier, kept for restore.js and the online save) and returns
// [{ id, tier, name, seeds, crystals }]. Paying is separate (src/rewards.js: claimable).
export function earnBadges(save, r) {
  save.badgeTiers = save.badgeTiers || {};
  const won = [];
  for (const b of BADGES) {
    const v = b.measure(r, save);
    let t = tierOf(save, b.id);
    while (t < b.tiers.length && v >= b.tiers[t].goal) {
      t++;
      const tier = b.tiers[t - 1];
      won.push({ id: b.id, tier: t, name: `${b.name}${tierName(b, t) ? ` (${tierName(b, t)})` : ''}`, seeds: tier.seeds, crystals: tier.crystals });
    }
    if (t > tierOf(save, b.id)) save.badgeTiers[b.id] = t;
  }
  save.badges = BADGES.filter(b => tierOf(save, b.id) > 0).map(b => b.id);
  return won;
}

// Progress towards the next tier, for the badge grid: { tier, next goal or null, value }.
export function progressOf(save, b) {
  const t = tierOf(save, b.id), next = b.tiers[t];
  const totals = { frequent: save.landings || 0, coolplanet: save.coolLandings || 0, forester: sum(save.planted), naturalist: found(save),
    rewilder: projects(save), globetrotter: (save.visited || []).length };
  return { tier: t, goal: next ? next.goal : null, value: b.id in totals ? totals[b.id] : null };
}

// Old saves (before 2026-10-22) had 9 one-off badges and no tiers. Give the matching new tiers,
// already claimed (no surprise prizes), and recount the history-based badges silently.
const OLD = { zeroCarbon: ['zerocarbon', 1], sunShield: ['sunshield', 1], nightOwl: ['nightowl', 1], coolPlanet: ['coolplanet', 1],
  treeHunter: ['seedhunter', 1], longHaul: ['hopper', 2], firstLanding: null, forester: null, roundTheWorld: null };
export function migrateBadges(save) {
  if (save.badgeTiers) return;
  save.badgeTiers = {};
  for (const id of save.badges || []) {
    const m = OLD[id];
    if (m) save.badgeTiers[m[0]] = Math.max(save.badgeTiers[m[0]] || 0, m[1]);
  }
  if ((save.coolLandings || 0) < (save.badgeTiers.coolplanet ? 1 : 0)) save.coolLandings = 1;
  earnBadges(save, { landed: false, distance: 0, cargo: -1 });   // history badges (landings, trees, cities...) at their tiers, unpaid
}
