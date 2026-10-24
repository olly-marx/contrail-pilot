// RETIRED 2026-10-23: the eras reset (src/fleet.js migrateFleet) sets priceVersion 2 on every old
// save before this runs, so it no longer changes anything. Kept until the next cleanup; tests/reprice.cjs removed.
// One-time re-value of saves from before the 2026-10-21 price change (the user: prices were far
// too cheap; a full hangar went from 3,415 to ~20,000 seeds). What you earned is kept at full value:
// seeds in the bank + what you paid for each level at the OLD prices (crystals the same). Then the
// plane is rebuilt at the NEW prices, only re-buying levels you already had, cheapest next level
// first, keeping branches valid; what is left goes back in the bank. Missions, badges, cities,
// laps and records are things you DID, so they stay. A device with no save is left alone.
import { LINES, lineById, level, fuelChoices } from './upgrades.js';

export const PRICE_VERSION = 2;
// [seeds, crystals] per level before 2026-10-21, as bought then.
export const OLD_PRICES = {
  radar: [[10, 1], [30, 2], [70, 5], [150, 9]],
  fuel: [[15, 1], [40, 2], [75, 4], [155, 9]],
  engine: [[20, 1], [40, 2], [85, 5], [140, 7], [220, 12]],
  cabin: [[5, 1], [15, 1], [25, 1], [40, 2]],
  trees: [[20, 1], [35, 2], [65, 4], [105, 6]],
  soil: [[10, 1], [30, 2], [60, 3]],
  species: [[20, 1], [40, 2], [60, 3], [90, 5]],
  rewild: [[20, 2], [35, 3], [50, 4], [70, 5], [105, 6], [140, 8]],
  magnet: [[15, 1], [35, 2], [70, 4]],
  airframe: [[30, 2], [70, 4], [130, 7]],
  wings: [[45, 3], [110, 6]],
  gear: [[25, 1], [60, 3]],
  hold: [[40, 2], [90, 5], [160, 9]],
  lens: [[35, 3], [90, 6]],
  forecast: [[60, 4], [130, 8]],
  nursery: [[40, 2], [90, 5]],
};

export function repriceSave(save) {
  if ((save.priceVersion || 1) >= PRICE_VERSION) return null;
  save.priceVersion = PRICE_VERSION;
  if ((save.seenTips || []).includes('*') || (save.tours || []).includes('*')) return null;   // automated tests' saves
  const had = { ...(save.levels || {}) };
  if (!Object.values(had).some(n => n > 0)) return null;   // nothing bought: nothing to re-value
  let seeds = save.seeds || 0, crystals = save.crystals || 0;
  for (const [id, n] of Object.entries(had)) for (let i = 0; i < n && OLD_PRICES[id] && lineById(id) && i < OLD_PRICES[id].length; i++) { seeds += OLD_PRICES[id][i][0]; crystals += OLD_PRICES[id][i][1]; }
  const worth = { seeds, crystals };
  const levels = {}, lv = id => levels[id] || 0;
  for (;;) {
    const next = LINES.filter(l => lv(l.id) < (had[l.id] || 0) && lv(l.id) < l.levels.length
      && (!l.requires || lv(l.requires.line) >= l.requires.level))
      .map(l => ({ l, v: l.levels[lv(l.id)] }))
      .filter(({ v }) => v.cost <= seeds && (v.crystals || 0) <= crystals)
      .sort((a, b) => a.v.cost - b.v.cost)[0];
    if (!next) break;
    seeds -= next.v.cost; crystals -= next.v.crystals || 0; levels[next.l.id] = lv(next.l.id) + 1;
  }
  const lost = LINES.filter(l => (had[l.id] || 0) > lv(l.id)).map(l => ({ id: l.id, name: l.name, from: had[l.id], to: lv(l.id) }));
  save.levels = levels; save.seeds = seeds; save.crystals = crystals;
  if (!fuelChoices(save).includes(save.fuel)) save.fuel = fuelChoices(save).pop();   // e.g. hydrogen gone: best fuel still owned
  save.repriced = { worth, lost, seeds, crystals, shown: false };
  return save.repriced;
}
