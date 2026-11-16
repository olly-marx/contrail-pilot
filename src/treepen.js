// THE TREE PEN and THE LAND'S COOLING (the user, 2026-11-16: "without the proper UI and design it's impossible to know what the effect of trees is"; the School proposal,
// mockups 3 and 4, approved the same day). What a tree does is slow and belongs to one land, so the NATURE page says the three facts in one card:
//   1. each sapling, with its growth in flying days and what it adds to this land's Nature bar once grown (a sapling counts for nothing until then: grown-only cooling);
//   2. the land's Nature bar (the biome meter) and the most it cools the Earth on one flight over it: BIOME_COOL.store x meter / 100 (src/sim/rules.js: the biome under the
//      plane cools at BIOME_COOL.rate x meter until the flight has soaked up that much);
//   3. what it is made of (grown trees, projects).
// Pure (no DOM): penView() returns numbers, penHTML() a string. tests/treepen.cjs checks the numbers against the rules.
import { BIOME_COOL } from './config.js';
import { biomeMeter, projectsDone } from './nature.js';
import { groveView, saplingsIn, needFromGrow } from './groves.js';
import { REGION_NAMES } from './habitats.js';
import { landTrees, growNeedTenths } from './landtrees.js';
import { loadout } from './upgrades.js';
import { GROW_DAYS } from './config.js';

const growOf = save => { const kit = save && save.levels ? loadout(save) : null; return (kit && kit.grow) || 1; };   // (a save with no levels yet: no nursery)
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// The most this land cools the Earth in one flight over it, for a meter value (0..100). Rounded as the results card rounds (whole numbers).
export const coolCap = meter => Math.round(BIOME_COOL.store * meter / 100);
// The meter of this land if ONE sapling of `id` were grown (a copy of the save: the save itself is not touched).
export function meterIfGrown(save, land, id) {
  const g = JSON.parse(JSON.stringify(groveView(save))), c = (g[land] || {})[id];
  if (!c) return biomeMeter(save, land);
  c.grown += 1; if (c.saplings.length) c.saplings.shift();
  return biomeMeter({ ...save, groves: g, planted: {}, plantedIn: {} }, land);   // (the old keys are folded into groveView already: blank them so they are not folded twice)
}

export function penView(save, land) {
  const grow = growOf(save);
  const needOf = GROW_DAYS.on ? (l, id) => growNeedTenths(l, id, grow) : null;
  const names = Object.fromEntries(landTrees(save, land).map(t => [t.id, t.name]));
  const meter = biomeMeter(save, land);
  const saps = saplingsIn(save, land, needFromGrow(grow), needOf).map(sp => {
    const after = meterIfGrown(save, land, sp.id);
    return { ...sp, name: names[sp.id] || sp.id, days: sp.unit === 'day' ? { have: Math.floor(sp.points / 10), need: Math.round(sp.need / 10) } : null, gain: Math.max(0, after - meter), coolAfter: coolCap(after) };
  });
  const grown = Object.values(groveView(save)[land] || {}).reduce((a, c) => a + c.grown, 0);
  return { land, meter, cool: coolCap(meter), saps, grown, projects: projectsDone(save, land).length, nursery: grow < 1 };
}

const pic = sp => `assets/tree-${sp.id}-${sp.frac >= 0.5 ? 1 : 0}.png`;
export function penHTML(v, max = 6) {
  const rows = v.saps.slice(0, max).map(sp => `<div class="pen-row"><img class="pen-pic" src="${pic(sp)}" alt="">`
    + `<span class="pen-mid"><span class="pen-l"><b>${esc(sp.name)}</b><span>${sp.days ? `${sp.days.have} of ${sp.days.need} days` : `${sp.points} of ${sp.need} flights`}</span></span>`
    + `<span class="pen-bar"><i style="width:${Math.round(sp.frac * 100)}%"></i></span>`
    + `<span class="pen-l small"><span>When grown</span><span>${sp.gain > 0 ? `+${sp.gain} nature here` : 'this kind is full here'}</span></span></span></div>`).join('');
  const more = v.saps.length > max ? `<p class="small pen-more">and ${v.saps.length - max} more growing</p>` : '';
  const pen = v.saps.length ? `<div class="pen" id="wPen"><div class="pen-h">TREE NURSERY</div><p class="small pen-sub">Saplings grow as you fly. Only grown trees help the Earth.</p>${rows}${more}`
    + `<p class="small pen-sub">${v.nursery ? 'Your Tree Nursery makes them grow faster.' : 'A Tree Nursery in the hangar makes them grow faster.'}</p></div>` : '';
  const next = v.saps.length ? v.saps[0] : null;
  const made = [v.grown && `${v.grown} grown tree${v.grown === 1 ? '' : 's'}`, v.projects && `${v.projects} project${v.projects === 1 ? '' : 's'}`].filter(Boolean).join(', ');
  const cool = `<div class="landcool" id="wLandCool"><div class="pen-l"><b>Nature here</b><span>${v.meter} / 100</span></div><span class="pen-bar lc"><i style="width:${v.meter}%"></i></span>`
    + (v.cool > 0 ? `<p class="small">Each flight over this land cools the Earth by up to <b class="lc-n">-${v.cool}</b></p>` : '<p class="small">Grown trees and projects here will cool the Earth on every flight over this land.</p>')
    + (next && next.coolAfter > v.cool ? `<p class="small">When your ${esc(next.name)} is grown: up to -${next.coolAfter}</p>` : '')
    + (made ? `<p class="small pen-sub">Made of: ${made}. Saplings count once they are grown.</p>` : '') + '</div>';
  return cool + pen;
}

// The results card's Earth sheet: where this flight's 'Nature' came from. r = the banked flight (src/sim/rules.js natureBy, dropCool, grewDays); save = AFTER banking (saplings already grown).
export function natureFrom(r, save) {
  const R = Math.round, lands = Object.entries(r.natureBy || {}).map(([land, n]) => [REGION_NAMES[land] || land, R(n)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const grow = growOf(save), needOf = GROW_DAYS.on ? (l, id) => growNeedTenths(l, id, grow) : null;
  let next = null;
  for (const land of Object.keys(groveView(save))) for (const sp of saplingsIn(save, land, needFromGrow(grow), needOf)) if (!next || sp.left < next.left) {
    const names = Object.fromEntries(landTrees(save, land).map(t => [t.id, t.name])); next = { name: names[sp.id] || sp.id, left: sp.left, unit: sp.unit };
  }
  return { lands, drops: R(r.dropCool || 0), grewDays: Math.round((r.grewDays || 0) * 10) / 10, grown: r.treesGrown || 0, next };
}
export function natureSheetHTML(n) {
  if (!n) return '';
  const row = (a, b) => `<p><span>${esc(a)}</span><b>${esc(b)}</b></p>`, unit = (k, u) => `${k} ${u}${k === 1 ? '' : 's'}`;
  const rows = [...n.lands.map(([name, k]) => row(name, `-${k}`)), n.drops > 0 && row('Trees dropped this flight', `-${n.drops}`)].filter(Boolean);
  return `<div class="rc-rows nature-from"><p class="small"><b>Nature, from</b></p>${rows.length ? rows.join('') : '<p class="small">No grown trees or projects under your route yet. Grown trees cool the land they stand in.</p>'}`
    + (n.grewDays > 0 ? row('Your saplings grew', `+${n.grewDays} days`) : '')
    + (n.grown > 0 ? row('Trees grown up this flight', `${n.grown}`) : '')
    + (n.next ? row(`${n.next.name} is grown in`, `about ${unit(n.next.left, n.next.unit === 'day' ? 'flying day' : 'flight')}`) : '') + '</div>';
}
