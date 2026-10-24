// The new hangar (eras build, stage 3b, 2026-10-23): the era timeline, then three tabs.
//   PLANE:   your fleet (choose which plane to fly; planes of eras not reached yet are silhouettes),
//            then the chosen plane's Engines / Wings & body / Cabin.
//   SYSTEMS: Forecasting, Air traffic control, Fuel & operations (fleet-wide).
//   GADGETS: Magnet, Cargo hold, Landing gear, Sensors, Autopilot (fleet-wide).
// Data and rules: src/fleet.js. Rendered into #hFleet by UI.renderHangar (src/ui.js).
import { ERAS, eraProgress } from './eras.js';
import { LINE_INFO, levelCard, STATUS_LABEL } from './fleetfacts.js';
import { FARES, PLANES, PLANE_LINES, SYSTEMS, GADGETS, fleetOf, nextBuys, canAfford, buyFleet, choosePlane, effectText, levelEra, planeById } from './fleet.js';

const $ = id => document.getElementById(id);
// Effects whose mechanics are not built yet (stages 5-8): said honestly on the card.
const SOON = [];
const eraName = i => ERAS[i].name;
const cost = l => `${l.cost}<i class="seedicon"></i>${l.crystals ? ` ${l.crystals}<i class="crysicon"></i>` : ''}`;

// Can anything in the fleet be bought right now? (The NEW! tags and the glowing HANGAR tab.)
export const fleetHasNew = save => nextBuys(save).some(b => b.open && canAfford(save, b));

export class FleetHangar {
  constructor(ui) { this.ui = ui; this.tab = 'plane'; }

  render() {
    const s = this.ui.save, el = $('hFleet');
    el.innerHTML = this.timelineHTML(s) + `<div class="ftabs">${[['plane', 'PLANE'], ['systems', 'SYSTEMS'], ['gadgets', 'GADGETS']].map(([k, n]) =>
      `<button class="btn ftab ${this.tab === k ? 'on' : ''}" data-ftab="${k}" type="button">${n}</button>`).join('')}</div>`
      + (this.tab === 'plane' ? this.planeHTML(s) : this.groupHTML(s, this.tab === 'systems' ? SYSTEMS : GADGETS, this.tab === 'systems' ? 'system' : 'gadget'));
    el.querySelectorAll('[data-ftab]').forEach(b => b.onclick = () => { this.tab = b.dataset.ftab; this.ui.sfx.flap(); this.render(); });
    el.querySelectorAll('[data-finfo]').forEach(b => b.onclick = () => { const [kind, id] = b.dataset.finfo.split(':'); this.showInfo(s, kind, id); });
    el.querySelectorAll('[data-fly]').forEach(b => b.onclick = () => { if (choosePlane(s, b.dataset.fly)) { this.ui.persist(); this.ui.sfx.coin(); this.render(); } });
    el.querySelectorAll('[data-fbuy]').forEach(b => b.onclick = () => {
      const [kind, id] = b.dataset.fbuy.split(':'), free = !!s.freeUpgrade;
      if (!buyFleet(s, kind, id, { free })) { this.ui.sfx.nope(); return; }
      if (free) s.freeUpgrade = false;
      s.sparkle = true;
      this.ui.persist(); this.ui.sfx.buy(); this.ui.renderHangar();
    });
  }

  // 1950s ... far future: done eras lit, this one marked, the bar to the next and what it brings.
  timelineHTML(s) {
    const p = eraProgress(s);
    const dots = ERAS.map((e, i) => `<span class="fera ${i < p.index ? 'done' : i === p.index ? 'now' : ''}">${e.id === 'future' ? 'Future' : e.id}</span>`).join('');
    const brings = p.next ? PLANES.filter(pl => pl.era === p.index + 1).map(pl => `the <b>${pl.name}</b>`)
      .concat(p.index + 1 < 3 ? ['new systems and gadgets'] : []) : [];
    return `<div class="ftimeline">${dots}</div>`
      + (p.next ? `<div class="era-row"><span class="era-track"><span class="era-fill" style="width:${(p.frac * 100).toFixed(1)}%"></span></span></div>
        <p class="small">To ${p.next.name}: <b>${Math.floor(p.done)} / ${Math.round(p.need)} min</b> of flying${brings.length ? `. Next: ${brings.join(', ')}.` : ''}</p>` : '<p class="small">Every era open!</p>');
  }

  planeHTML(s) {
    const f = fleetOf(s), now = eraProgress(s).index;
    const cards = PLANES.map(pl => {
      const owned = !!f.planes[pl.id], flying = f.plane === pl.id;
      if (!owned) return `<div class="fplane locked"><img src="${pl.portrait}" alt=""><b>${pl.name}</b><span class="small">Opens in ${eraName(pl.era)}</span></div>`;
      return `<div class="fplane ${flying ? 'flying' : ''}"><img src="${pl.portrait}" alt=""><b>${pl.name}</b><span class="small">${ERAS[pl.era].id}. CO2 x${pl.co2.toFixed(2)}. Fares ${FARES[pl.id]} per 1,000 km</span>
        ${flying ? '<span class="fbadge">FLYING</span>' : `<button class="btn go" data-fly="${pl.id}" type="button">FLY THIS</button>`}</div>`;
    }).join('');
    const pl = planeById(f.plane), mine = f.planes[pl.id] || {};
    const lines = Object.entries(PLANE_LINES).map(([line, name]) =>
      this.lineHTML(s, { kind: 'plane', id: `${pl.id}.${line}`, name, levels: pl.lines[line], have: mine[line] || 0, eraOf: () => pl.era, now })).join('');
    return `<div class="fplanes">${cards}</div><p class="small">Every plane flies the same way. Upgrades change what happens around it. A fuller plane makes less CO2 per passenger: that is why airlines fill every seat.</p>
      <h3 class="tree-head">${pl.name.toUpperCase()}</h3>${lines}`;
  }

  groupHTML(s, list, kind) {
    const f = fleetOf(s), owned = kind === 'system' ? f.systems : f.gadgets, now = eraProgress(s).index;
    return list.map(g => this.lineHTML(s, { kind, id: g.id, name: g.name, levels: g.levels, have: owned[g.id] || 0, eraOf: levelEra, now })).join('');
  }

  // The (i) card: what the line is, every level (era, price, what it does, how sure we are of the
  // history), and the fact for the level you'd buy next. Uses the shared #info pop-up.
  showInfo(s, kind, id) {
    const f = fleetOf(s);
    let name, levels, have, key, group, eraOf;
    if (kind === 'plane') {
      const [pid, line] = id.split('.'), pl = planeById(pid);
      name = `${PLANE_LINES[line]}: ${pl.name}`; levels = pl.lines[line]; have = (f.planes[pid] || {})[line] || 0; key = line; group = `Plane, ${ERAS[pl.era].id}`; eraOf = () => pl.era;
    } else {
      const g = (kind === 'system' ? SYSTEMS : GADGETS).find(x => x.id === id);
      name = g.name; levels = g.levels; have = (kind === 'system' ? f.systems : f.gadgets)[id] || 0; key = id; group = kind === 'system' ? 'System (every plane)' : 'Gadget (every plane)'; eraOf = levelEra;
    }
    const tidy = c => ({ ...c, src: c.src.replace(/\s*\[[^\]]*\]/g, '') });   // fact-check row numbers are for us, not players
    const card = (l, i) => tidy(levelCard(key, l.name, i ? levels[i - 1].name : ''));
    $('iGroup').textContent = group;
    $('iName').textContent = name;
    $('iLevels').innerHTML = levels.map((l, i) => { const c = card(l, i);
      return `<li class="${i < have ? 'have' : ''}"><b>${l.name}</b> <span class="small">(${ERAS[eraOf(i + 1)].id}, ${l.cost} seeds + ${l.crystals} ice crystals)</span>: ${effectText(l)}${i < have ? ' - yours!' : ''}`
        + `<br><span class="small">${c.fact} <span class="${c.status === 'guess' ? 'est' : 'srcok'}">${STATUS_LABEL[c.status]}</span>${c.status !== 'guess' ? ` <i>${c.src}</i>` : ''}</span></li>`; }).join('');
    const info = LINE_INFO[key], pick = levels[Math.min(have, levels.length - 1)], c = card(pick, Math.min(have, levels.length - 1));
    $('iWhat').textContent = info.what;
    $('iWhy').textContent = info.why;
    $('iFact').innerHTML = `${c.fact} <span class="${c.status === 'guess' ? 'est' : 'srcok'}">${STATUS_LABEL[c.status]}</span>`;
    $('iLinks').innerHTML = '';
    $('info').hidden = false;
  }

  // One line: name, pips, what you have, the next level (what it does, price, BUY) or why it is blocked.
  lineHTML(s, { kind, id, name, levels, have, eraOf, now }) {
    const next = levels[have], pips = levels.map((_, i) => `<span class="pip ${i < have ? 'on' : ''}"></span>`).join('');
    let row = '<div class="next"><span><b>All done!</b></span></div>';
    if (next) {
      const era = eraOf(have + 1), open = era <= now, free = !!s.freeUpgrade && have === 0 && open;
      const ok = open && (free || canAfford(s, next));
      const soon = Object.keys(next).some(k => SOON.includes(k)) ? ' <span class="soon">(coming soon)</span>' : '';
      const est = levelCard(kind === 'plane' ? id.split('.')[1] : id, next.name, have ? levels[have - 1].name : '').status === 'guess' ? ' <span class="est">game guess</span>' : '';
      const short = open && !ok ? [Math.max(0, next.cost - s.seeds) && `${next.cost - s.seeds}<i class="seedicon"></i>`,
        Math.max(0, (next.crystals || 0) - (s.crystals || 0)) && `${next.crystals - (s.crystals || 0)}<i class="crysicon"></i>`].filter(Boolean).join(' ') : '';
      const btn = !open ? `<span class="small blocked">blocked until ${eraName(era)}</span>`
        : `<span class="buywrap"><button class="btn ${free ? 'free' : ok ? 'go' : ''}" data-fbuy="${kind}:${id}" type="button" ${ok ? '' : 'disabled'}>${free ? 'FREE!' : cost(next)}</button>${short ? `<span class="small need">need ${short} more</span>` : ''}</span>`;
      row = `<div class="next"><span>Next: <b>${next.name}</b>${est}. ${effectText(next)}${soon}</span>${btn}</div>`;
    }
    return `<div class="line fline ${next ? '' : 'maxed'}" data-fline="${kind}:${id}"><button class="infobtn" data-finfo="${kind}:${id}" type="button" aria-label="About ${name}">i</button><div><div class="name">${name}</div>
      <div class="small">${have ? levels[have - 1].name : 'Not yet'}</div><div class="pips">${pips}</div></div>${row}</div>`;
  }
}
