// The new hangar (eras build, stage 3b, 2026-10-23): the era timeline, then three tabs.
//   PLANE:   your fleet (choose which plane to fly; planes of eras not reached yet are silhouettes),
//            then the chosen plane's Engines / Wings & body / Cabin.
//   SYSTEMS: Forecasting, Air traffic control, Fuel & operations (fleet-wide).
//   GADGETS: Magnet, Cargo hold, Landing gear, Sensors, Autopilot (fleet-wide).
// Data and rules: src/fleet.js. Rendered into #hFleet by UI.renderHangar (src/ui.js).
import { ERAS, eraProgress } from './eras.js';
import { LINE_INFO, levelCard } from './fleetfacts.js';
import { composedURL } from './planelook.js';
import { onSwipe } from './swipe.js';
import { lookFiles, hangarGadgets } from './fleet.js';
import { FARES, PLANES, PLANE_LINES, SYSTEMS, GADGETS, fleetOf, nextBuys, canAfford, buyFleet, choosePlane, effectText, levelEra, planeById } from './fleet.js';

const $ = id => document.getElementById(id);
// Effects whose mechanics are not built yet (stages 5-8): said honestly on the card.
const SOON = [];
const eraName = i => ERAS[i].name;
const cost = l => `${l.cost}<i class="seedicon"></i>${l.crystals ? ` ${l.crystals}<i class="crysicon"></i>` : ''}`;

// Things in the fleet you could buy right now, as keys ('gadget:magnet:3').
export const fleetBuyable = save => nextBuys(save).filter(b => b.open && canAfford(save, b)).map(b => `${b.kind}:${b.id}:${b.level}`);

export class FleetHangar {
  constructor(ui) { this.ui = ui; this.tab = 'plane'; }

  render() {
    const s = this.ui.save, el = $('hFleet');
    el.innerHTML = this.previewHTML(s) + this.timelineHTML(s) + `<div class="ftabs">${[['plane', 'PLANE'], ['systems', 'SYSTEMS'], ['gadgets', 'GADGETS']].map(([k, n]) =>
      `<button class="btn ftab ${this.tab === k ? 'on' : ''}" data-ftab="${k}" type="button">${n}</button>`).join('')}</div>`
      + `<p class="small ftabhelp">${{ plane: 'Choose your plane, and upgrade the one you fly.', systems: 'Systems help every flight, whichever plane you fly.', gadgets: 'Gadgets are fitted to every plane in your fleet.' }[this.tab]}</p>`
      + (this.tab === 'plane' ? this.planeHTML(s) : this.groupHTML(s, this.tab === 'systems' ? SYSTEMS : GADGETS, this.tab === 'systems' ? 'system' : 'gadget'));
    el.querySelectorAll('[data-ftab]').forEach(b => b.onclick = () => { this.tab = b.dataset.ftab; this.ui.sfx.flap(); this.render(); });
    // Swipe sideways to change tab (0.11.0): PLANE <-> SYSTEMS <-> GADGETS (src/swipe.js).
    const goTab = d => { const tabs = ['plane', 'systems', 'gadgets'], i = tabs.indexOf(this.tab) + d; if (i < 0 || i >= tabs.length) return; this.tab = tabs[i]; this.ui.sfx.flap(); this.render(); };
    onSwipe(el, { next: () => goTab(1), prev: () => goTab(-1) });
    el.querySelectorAll('[data-finfo]').forEach(b => b.onclick = () => { const [kind, id] = b.dataset.finfo.split(':'); this.showInfo(s, kind, id); });
    el.querySelectorAll('[data-fly]').forEach(b => b.onclick = e => { e.stopPropagation(); if (choosePlane(s, b.dataset.fly)) { this.preview = b.dataset.fly; this.ui.persist(); this.ui.sfx.coin(); this.render(); } });
    // The big picture with the plane's bought parts layered on (src/planelook.js); drawn when ready.
    const pv = el.querySelector('.fpreview img'), f = fleetOf(s), pid = pv && pv.dataset.plane;
    if (pid && f.planes[pid]) { const files = lookFiles(pid, f.planes[pid], 'hangar'); composedURL(files.base, files.parts, hangarGadgets(s, pid)).then(u => { if (pv.isConnected) pv.src = u; }).catch(() => {}); }
    el.querySelectorAll('[data-pview]').forEach(c => c.onclick = () => { this.preview = c.dataset.pview; this.ui.sfx.flap(); this.render(); });
    el.querySelectorAll('[data-fbuy]').forEach(b => b.onclick = () => {
      const [kind, id] = b.dataset.fbuy.split(':'), free = !!s.freeUpgrade;
      if (!buyFleet(s, kind, id, { free })) { this.ui.sfx.nope(); return; }
      if (free) s.freeUpgrade = false;
      s.sparkle = true;
      this.ui.persist(); this.ui.sfx.buy(); this.ui.renderHangar();
    });
  }

  // The big picture at the top (400 x 176, the art session's hangar portrait): the plane you fly, or
  // the one whose card you tapped. Planes of eras not reached yet show as a dark silhouette.
  previewHTML(s) {
    const f = fleetOf(s), id = this.preview && planeById(this.preview) ? this.preview : f.plane, pl = planeById(id), owned = !!f.planes[id];
    const tag = f.plane === id ? 'FLYING' : owned ? 'IN YOUR FLEET' : `OPENS IN ${ERAS[pl.era].id.toUpperCase()}`;
    return `<div class="fpreview ${owned ? '' : 'locked'}"><img src="${pl.portrait}" alt="${pl.name}" data-plane="${id}"><div class="fpcap"><b>${pl.name}</b><span>${tag}</span></div></div>`;
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
      if (!owned) return `<div class="fplane locked" data-pview="${pl.id}"><img src="${pl.portrait}" alt=""><b>${pl.name}</b><span class="small">Opens in ${eraName(pl.era)}</span></div>`;
      return `<div class="fplane ${flying ? 'flying' : ''}" data-pview="${pl.id}"><img src="${pl.portrait}" alt=""><b>${pl.name}</b><span class="small">${ERAS[pl.era].id}. CO2 x${pl.co2.toFixed(2)}. Fares ${FARES[pl.id]} per 1,000 km</span>
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
    // How well each fact is sourced (fleetfacts.js status/src) is for us, not shown to players (user, 0.10.2).
    const card = (l, i) => levelCard(key, l.name, i ? levels[i - 1].name : '');
    $('iGroup').textContent = group;
    $('iName').textContent = name;
    $('iLevels').innerHTML = levels.map((l, i) => { const c = card(l, i);
      return `<li class="${i < have ? 'have' : ''}"><b>${l.name}</b> <span class="small">(${ERAS[eraOf(i + 1)].id}, ${l.cost} seeds + ${l.crystals} ice crystals)</span>: ${effectText(l)}${i < have ? ' - yours!' : ''}`
        + `<br><span class="small">${c.fact}</span></li>`; }).join('');
    const info = LINE_INFO[key], pick = levels[Math.min(have, levels.length - 1)], c = card(pick, Math.min(have, levels.length - 1));
    $('iWhat').textContent = info.what;
    $('iWhy').textContent = info.why;
    $('iFact').textContent = c.fact;
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
      const short = open && !ok ? [Math.max(0, next.cost - s.seeds) && `${next.cost - s.seeds}<i class="seedicon"></i>`,
        Math.max(0, (next.crystals || 0) - (s.crystals || 0)) && `${next.crystals - (s.crystals || 0)}<i class="crysicon"></i>`].filter(Boolean).join(' ') : '';
      const btn = !open ? `<span class="small blocked">blocked until ${eraName(era)}</span>`
        : `<span class="buywrap"><button class="btn ${free ? 'free' : ok ? 'go' : ''}" data-fbuy="${kind}:${id}" type="button" ${ok ? '' : 'disabled'}>${free ? 'FREE!' : cost(next)}</button>${short ? `<span class="small need">need ${short} more</span>` : ''}</span>`;
      row = `<div class="next"><span>Next: <b>${next.name}</b>. ${effectText(next)}${soon}</span>${btn}</div>`;
    }
    return `<div class="line fline ${next ? '' : 'maxed'}" data-fline="${kind}:${id}"><button class="infobtn" data-finfo="${kind}:${id}" type="button" aria-label="About ${name}">i</button><div><div class="name">${name}</div>
      <div class="small">${have ? levels[have - 1].name : 'Not yet'}</div><div class="pips">${pips}</div></div>${row}</div>`;
  }
}
