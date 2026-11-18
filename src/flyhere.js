// FLY HERE on a land's NATURE page (the owner, 2026-11-18: 'in nature you should be able to select fly here, so that you can fly to a natural area if you're not
// already there, and then fly around it if you want'; he had opened the desert land and could not find how to fly there). Pure: what the button offers for a land.
//   { kind: 'here' }                         the player is in this land (save.city's land): FLY AROUND HERE (save.stayLand, src/aim.js stayLandLeft / steerOf)
//   { kind: 'go', city, hops }               the land's nearest city by hops (fewest airports from save.city over the open network; ties: the network's order)
//   { kind: 'closed', from, to }             no city of the land is in the open network: the crossing (from > to) that opens the region holding one, if one is on offer
//   { kind: 'closed', from: null, to: null } ... and no crossing on offer opens it yet (more crossings first)
import { linksFor, pathTo, city } from './route.js';
import { upcoming } from './crossings.js';
import { areaOf, REGIONS } from './areas.js';
import { CITIES } from './cities.js';

const landOf = name => { const c = city(name); return c ? c.region : null; };

export function flyHereChoice(save, land) {
  if (!save || !land) return null;
  if (landOf(save.city) === land) return { kind: 'here' };
  const L = linksFor(save);
  let best = null;
  if (L[save.city]) for (const c of Object.keys(L)) {
    if (landOf(c) !== land) continue;
    const way = pathTo(save.city, c, L);
    if (way && (!best || way.length - 1 < best.hops)) best = { kind: 'go', city: c, hops: way.length - 1 };
  }
  if (best) return best;
  const areas = new Set(CITIES.filter(c => c.region === land).map(c => areaOf(c.name)).filter(Boolean));
  const x = upcoming(save).find(r => r.region && REGIONS[r.region] && REGIONS[r.region].areas.some(a => areas.has(a)));
  return { kind: 'closed', from: x ? x.from : null, to: x ? x.to : null };
}
