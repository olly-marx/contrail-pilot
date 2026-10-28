// The new hangar (eras build, stage 3b, 2026-10-23): the era timeline, then three tabs.
//   PLANE:   your fleet (choose which plane to fly; planes of eras not reached yet are silhouettes),
//            then the chosen plane's Engines / Wings & body / Cabin.
//   SYSTEMS: Forecasting, Air traffic control, Fuel & operations (fleet-wide).
//   GADGETS: Magnet, Cargo hold, Landing gear, Sensors, Autopilot (fleet-wide).
// Data and rules: src/fleet.js. Rendered into #hFleet by UI.renderHangar (src/ui.js).
import { ERAS, eraProgress } from './eras.js';
import { tip } from './tips.js';
import { LINE_INFO, levelCard } from './fleetfacts.js';
import { composedURL } from './planelook.js';
import { onSwipe } from './swipe.js';
import { lookFiles, hangarGadgets, previewBars, withNext } from './fleet.js';
import { statBarsHTML, animateBars } from './statbars.js';
import { capFor, estimate, estimating } from './capability.js';
import { areaOf } from './areas.js';
import { FINANCE, financeLevel, financeOpen, natureHealth, rate, rateAt, canTake, trade, buyFinance, bonds, canLock, lockBond, payBonds } from './finance.js';
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
    el.innerHTML = this.freePickHTML(s) + this.previewHTML(s) + this.capHTML(s) + this.previewCardHTML(s) + this.timelineHTML(s) + `<div class="ftabs">${[['plane', 'PLANE'], ['systems', 'SYSTEMS'], ['gadgets', 'GADGETS']].map(([k, n]) =>
      `<button class="btn ftab ${this.tab === k ? 'on' : ''}" data-ftab="${k}" type="button">${n}</button>`).join('')}</div>`
      + `<p class="small ftabhelp">${{ plane: 'Choose your plane, and upgrade the one you fly.', systems: 'Systems help every flight, whichever plane you fly.', gadgets: 'Gadgets are fitted to every plane in your fleet.' }[this.tab]}</p>`
      + (this.tab === 'plane' ? this.planeHTML(s) : this.groupHTML(s, this.tab === 'systems' ? SYSTEMS : GADGETS, this.tab === 'systems' ? 'system' : 'gadget'));
    // Matured biodiversity bonds pay out when you come to the hangar (src/finance.js).
    const paid = payBonds(s); if (paid) { this.ui.persist(); this.ui.toast && this.ui.toast('BONDS PAID!', `${paid.seeds.toLocaleString('en-GB')} seeds back + ${paid.crystals} crystals: healthy nature pays interest.`, 'good', 4); }
    // M4: how far this plane + nature can get (src/capability.js), worked out in the background after a purchase.
    estimate(s, () => { this.ui.persist(); const c = $('hCap'); if (c) c.outerHTML = this.capHTML(s); });
    const bb = $('hBond'); if (bb) bb.onclick = () => { if (lockBond(s)) { this.ui.persist(); this.ui.sfx.coin(); this.render(); } };
    const tb = $('hTrade'); if (tb) tb.onclick = () => { if (trade(s)) { this.ui.persist(); this.ui.sfx.coin(); this.render(); } };
    const fb2 = $('hFinBuy'); if (fb2) fb2.onclick = () => { if (buyFinance(s)) { this.ui.persist(); this.ui.sfx.buy(); this.render(); requestAnimationFrame(() => animateBars($('hFleet'))); } else this.ui.sfx.nope(); };
    el.querySelectorAll('[data-ftab]').forEach(b => b.onclick = () => { this.tab = b.dataset.ftab; this.ui.sfx.flap(); this.render(); });
    // Swipe sideways to change tab (0.11.0): PLANE <-> SYSTEMS <-> GADGETS (src/swipe.js).
    const goTab = d => { const tabs = ['plane', 'systems', 'gadgets'], i = tabs.indexOf(this.tab) + d; if (i < 0 || i >= tabs.length) return; this.tab = tabs[i]; this.ui.sfx.flap(); this.render(); };
    onSwipe(el, { next: () => goTab(1), prev: () => goTab(-1) });
    el.querySelectorAll('[data-finfo]').forEach(b => b.onclick = () => { const [kind, id] = b.dataset.finfo.split(':'); this.showInfo(s, kind, id); });
    el.querySelectorAll('[data-fly]').forEach(b => b.onclick = e => { e.stopPropagation(); if (choosePlane(s, b.dataset.fly)) { this.preview = b.dataset.fly; this.ui.persist(); this.ui.sfx.coin(); this.render(); } });
    // The big picture with the plane's bought parts layered on (src/planelook.js); drawn when ready.
    const pv = el.querySelector('.fpreview img'), f = fleetOf(s), pid = pv && pv.dataset.plane;
    if (pid && f.planes[pid]) { const files = lookFiles(pid, f.planes[pid], 'hangar'); composedURL(files.base, files.parts, hangarGadgets(s, pid)).then(u => { if (pv.isConnected) pv.src = u; }).catch(() => {}); }
    // Tap a row = preview it (the user, 2026-10-28: "tap on things and SEE THE EFFECT before purchasing"): the row is
    // marked, the card under the picture shows its bars, and the picture shows the new part ghosted.
    // (screenshots, 2026-10-28: a row tapped low in the list previewed OFF SCREEN at the top; bring the picture + card into view)
    el.querySelectorAll('[data-ftap]').forEach(b => b.onclick = () => { this.sel = b.dataset.ftap; this.ui.sfx.flap(); this.render();
      const pv = $('hFleet').querySelector('.fpreview'); if (pv && pv.scrollIntoView) pv.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    el.querySelectorAll('[data-pview]').forEach(c => c.onclick = () => { const p = c.dataset.pview; this.preview = p;
      this.sel = f.planes[p] && f.plane !== p ? `fly:${p}` : null; this.ui.sfx.flap(); this.render(); });
    el.querySelectorAll('[data-fbuy]').forEach(b => b.onclick = () => {
      const [kind, id] = b.dataset.fbuy.split(':'), free = !!s.freeUpgrade;
      const fb = fleetOf(s), before = lookFiles(fb.plane, JSON.parse(JSON.stringify(fb.planes[fb.plane] || {})), 'hangar');   // the plane BEFORE (the payoff shows it first)
      const bars = previewBars(s, kind, id), gadBefore = hangarGadgets(s, fb.plane), item = this.itemOf(s, kind, id);
      if (!buyFleet(s, kind, id, { free })) { this.ui.sfx.nope(); return; }
      this.ui.missionsAfterSave && this.ui.missionsAfterSave();   // season 2: off-flight missions (S3)
      if (free) s.freeUpgrade = false;
      s.sparkle = true;
      this.ui.persist(); this.ui.sfx.buy(); this.ui.renderHangar();
      // R6: the payoff - the plane as it was, then the new part arrives on it - now for EVERY purchase (the user, 2026-10-28),
      // with the stat bars moving to their new values. Every purchase stays in the hangar (the user, 2026-10-28); `rails` only picks the tutorial's words for the first free part.
      this.sel = null;
      this.payoff(before, { bars, gadBefore, name: item && item.name, toFly: false, rails: free && !!s.areas });   // stay in the hangar after EVERY purchase (the user); the rails' words for the first free part
    });
  }

  // The FREE part, made easy (the user, 2026-10-27: the hangar is confusing on the first visit): while a free upgrade waits,
  // three clear choices at the very top, each with what it does in a short sentence (src/tips.js); the full hangar below.
  freePickHTML(s) {
    if (!s.freeUpgrade) return '';
    const f = fleetOf(s), open = nextBuys(s).filter(b => b.open && b.level === 1);
    const rails = !(s.tours || []).includes('r-free') && !!s.areas;   // on rails (season 2's first free part): ONE choice
    const want = rails ? [['plane', `${f.plane}.engines`, 'free-engines']] : [['plane', `${f.plane}.engines`, 'free-engines'], ['gadget', 'magnet', 'free-magnet'], ['gadget', 'gear', 'free-gear']];
    const picks = want.map(([kind, id, t]) => ({ b: open.find(x => x.kind === kind && x.id === id), t })).filter(x => x.b);
    if (!picks.length) return '';
    return `<div class="freepick">${rails ? '' : `<p class="label">${tip('free-head')}</p>`}${picks.map(({ b, t }) =>
      `<div class="freerow"><span><b>${b.name}</b><br><small>${tip(t)}</small></span><button class="btn free" data-fbuy="${b.kind}:${b.id}" type="button">FREE!</button></div>`).join('')}
      ${rails ? '' : `<p class="small">${tip('free-more')}</p>`}</div>`;   // (on rails: one choice, the captain says what to do)
  }

  // R6 (the user, 2026-10-27: "tapping an upgrade did NOT show the plane looking cooler"): the plane, with the part just
  // fitted (src/planelook.js), zooms in over the hangar with one line and one OK.
  // R6, the payoff (the user, 2026-10-28: it "just pops up the upgraded plane, you never see it BEFORE"): the plane as it
  // was, then the new part fades and slides onto it with a sparkle, then "Your plane is cleaner now!" and OK.
  // Every purchase (the user, 2026-10-28): opts.bars = the stat bars it moves (fleet.js previewBars, taken BEFORE the buy),
  // opts.gadBefore = the gadget overlays before (a new gadget is a part too), opts.name = the item, opts.toFly = the rails'
  // first free part (the tutorial's words: rails); every purchase stays in the hangar, the rails' next step is TAKE OFF there. A system has no part: no zoom,
  // the bars are the payoff.
  payoff(before, { bars = [], gadBefore, name, toFly = true, rails = toFly } = {}) {
    const s = this.ui.save, f = fleetOf(s), id = f.plane, files = lookFiles(id, f.planes[id], 'hangar');
    const gadNow = hangarGadgets(s, id), gadOld = gadBefore || gadNow;
    const added = files.parts.filter(p => !(before ? before.parts : files.parts.slice(0, -1)).includes(p)).concat(gadNow.filter(g => !gadOld.includes(g)));
    let el = $('payoff');
    if (!el) { el = document.createElement('div'); el.id = 'payoff'; el.className = 'payoff'; document.body.appendChild(el); }
    el.innerHTML = `<div class="payoff-card"><div class="pay-frame"><div class="pay-plane"><img id="payBefore" alt="">${added.map(p => `<img class="pay-part" src="${p}" alt="">`).join('')}<i class="pay-spark"></i><b id="payMark" class="pay-mark"></b></div></div>
      <span id="payLabel" class="pay-label">${rails || !name ? tip('rail-payoff-label') : `NEW: ${name}!`}</span>
      ${bars.length ? `<div class="pay-bars">${statBarsHTML(bars)}</div>` : ''}
      <p id="payText" class="pay-later">${rails || !name ? tip('rail-payoff') : `${name}: fitted!`}</p><button id="payOk" class="btn go big pay-later" type="button">OK</button></div>`;
    el.hidden = false;
    el.classList.toggle('nopart', !added.length);
    const old = before ? before.parts : files.parts.filter(p => !added.includes(p));
    composedURL(files.base, old, gadOld).then(u => { const img = $('payBefore'); if (img) img.src = u; }).catch(() => {});
    // Where the new part is: each part layer is a whole repainted plane, so the part = the pixels that CHANGE when the
    // layer goes on (before vs after). Their box becomes a marker inside the picture (it zooms with it).
    const part = el.querySelector('.pay-part'), mark = $('payMark'), plane = el.querySelector('.pay-plane'), beforeImg = $('payBefore');
    const measure = () => { if (!part || !part.naturalWidth || !beforeImg.naturalWidth || mark.dataset.done) return; mark.dataset.done = '1';
      const w = part.naturalWidth, h = part.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(beforeImg, 0, 0, w, h); const A = g.getImageData(0, 0, w, h).data; g.drawImage(part, 0, 0); const B = g.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (y * w + x) * 4; if (Math.abs(A[k] - B[k]) + Math.abs(A[k + 1] - B[k + 1]) + Math.abs(A[k + 2] - B[k + 2]) + Math.abs(A[k + 3] - B[k + 3]) > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      if (x1 < 0) return;
      const pct = (v, n) => `${(100 * v / n).toFixed(2)}%`;
      Object.assign(mark.style, { left: pct(x0, w), top: pct(y0, h), width: pct(x1 - x0 + 1, w), height: pct(y1 - y0 + 1, h) });
      plane.style.transformOrigin = `${pct((x0 + x1) / 2, w)} ${pct((y0 + y1) / 2, h)}`; };
    const whenLoaded = img => new Promise(r => { if (img.complete && img.naturalWidth) r(); else img.addEventListener('load', r, { once: true }); });
    if (part) Promise.all([whenLoaded(part), whenLoaded(beforeImg)]).then(measure);
    // The label arrow, placed over the part once the zoom has settled (the user, 2026-10-28: the payoff must not be flat).
    const label = () => { const lab = $('payLabel'), card = el.querySelector('.payoff-card'); if (!lab || el.hidden) return;
      const m = mark.getBoundingClientRect(), c = card.getBoundingClientRect();
      const x = Math.max(lab.offsetWidth / 2 + 4, Math.min(c.width - lab.offsetWidth / 2 - 4, m.left + m.width / 2 - c.left));
      const above = m.top - c.top - 6 >= lab.offsetHeight + 4;   // room above the part inside the card? else below it, arrow up
      lab.classList.toggle('below', !above);
      lab.style.left = `${Math.round(x)}px`; lab.style.top = `${Math.round(above ? m.top - c.top - 6 : m.bottom - c.top + 6)}px`; el.classList.add('labelled'); };
    // No part (a system, or a level with no new look): the bars ARE the payoff - they move with the sparkle, then OK.
    const settle = () => { if (el.hidden) return; if (added.length) label(); else el.classList.add('labelled'); };
    setTimeout(() => { if (!el.hidden) { el.classList.add('arrive'); this.ui.sfx.buy && this.ui.sfx.buy(); animateBars(el); setTimeout(settle, 700); } }, 900);   // the part arrives, the camera zooms onto it, then the label
    $('payOk').onclick = () => { this.ui.sfx.flap(); el.hidden = true; el.classList.remove('arrive', 'labelled', 'nopart');
      if (toFly) this.ui.go('fly'); else { this.render(); if (this.ui.tour) setTimeout(() => this.ui.tour.maybe('hangar'), 300); } };   // stay: the rails' next step (TAKE OFF) is in the hangar
  }

  // The capability line under the picture (M4): the cached estimate, or "working it out" while it runs.
  capHTML(s) {
    const km = capFor(s, areaOf(s.city) || null);
    return km ? `<p id="hCap" class="small hcap">Your plane + nature can reach <b>~${km.toLocaleString('en-GB')} km</b></p>`
      : `<p id="hCap" class="small hcap working">${estimating() ? 'Working out how far your plane can go' : 'How far can your plane go?'}<i class="dots"></i></p>`;
  }
  // NATURE FINANCE (src/finance.js), from the 2010s: the desk's level, today's rate from your nature's health (a bar: fewer
  // seeds a crystal is better), the next level's rate previewed, and the TRADE button (once a landing, above the reserve).
  financeHTML(s) {
    if (!financeOpen(s)) return '';
    const lv = financeLevel(s), B = natureHealth(s), next = FINANCE.levels[lv], L = FINANCE.levels[lv - 1];
    const bar = lvTo => statBarsHTML([{ label: 'Seeds per crystal', now: lv ? rate(s) : 40, then: rateAt(lvTo, B), min: 0, max: 40, better: 'lower' }]);
    const n = canTake(s);
    return `<div class="line fline finance"><div><div class="name">Natural capital</div><div class="small">${L ? L.name : 'Not yet'}. Your nature: ${B} / 100</div></div>
      ${L ? `<p class="small">Today: <b>${rate(s)} seeds = 1 crystal</b>. You keep ${L.reserve.toLocaleString('en-GB')} seeds.</p>
        <button class="btn ${n ? 'go' : ''}" id="hTrade" type="button" ${n ? '' : 'disabled'}>${n ? `TRADE ${n * rate(s)} seeds for ${n} crystals` : 'Trade again after your next landing'}</button>` : '<p class="small">Healthier nature, a better rate.</p>'}
      ${L && L.bond ? `<p class="small">Bonds: ${bonds(s).map(b => `${Math.max(0, L.bond.landings - ((s.landings || 0) - b.at))} landings left`).join(', ') || 'none yet'}. Each pays back its seeds + about ${Math.floor(B / L.bond.perB)} crystals (your nature at payout).</p>
        <button class="btn ${canLock(s) ? 'go' : ''}" id="hBond" type="button" ${canLock(s) ? '' : 'disabled'}>LOCK ${L.bond.lock.toLocaleString('en-GB')} seeds for ${L.bond.landings} landings</button>` : ''}
      ${next ? `<div class="next"><span>Next: <b>${next.name}</b></span><button class="btn ${s.seeds >= next.cost ? 'go' : ''}" id="hFinBuy" type="button" ${s.seeds >= next.cost ? '' : 'disabled'}>${next.cost}<i class="seedicon"></i></button></div>${bar(lv + 1)}` : ''}</div>`;
  }

  // The item behind a selection ('plane:comet.engines', 'gadget:magnet', 'fly:jumbo').
  itemOf(s, kind, id) {
    if (kind === 'fly') { const p = planeById(id), f = fleetOf(s); return p && f.planes[id] && f.plane !== id && { kind, id, name: p.name, open: true, cost: 0 }; }
    return nextBuys(s).find(b => b.kind === kind && b.id === id);
  }
  // The new part's layers for the picture, drawn ghosted before you buy (only on the plane you fly).
  ghostParts(s, planeId) {
    if (!this.sel) return [];
    const [kind, id] = this.sel.split(/:(.*)/s), f = fleetOf(s);
    if (kind === 'fly' || planeId !== f.plane || !this.itemOf(s, kind, id)) return [];
    const n = withNext(s, kind, id), fn = fleetOf(n), a = lookFiles(planeId, f.planes[planeId], 'hangar'), b = lookFiles(planeId, fn.planes[planeId], 'hangar');
    const ga = hangarGadgets(s, planeId);
    return b.parts.filter(p => !a.parts.includes(p)).concat(hangarGadgets(n, planeId).filter(g => !ga.includes(g)));
  }
  // The card under the picture: the tapped item's bars, its price and BUY (#hPreviewBuy, the same buy path as the row).
  previewCardHTML(s) {
    const item = this.sel && this.itemOf(s, ...this.sel.split(/:(.*)/s));
    if (!item) { this.sel = null; return `<div id="hPreview" class="hpreview empty"><p class="small">${tip('hangar-tap')}</p></div>`; }
    const bars = previewBars(s, item.kind, item.id), free = item.kind !== 'fly' && !!s.freeUpgrade && item.level === 1 && item.open;
    const ok = item.kind === 'fly' || (item.open && (free || canAfford(s, item)));
    const btn = item.kind === 'fly' ? `<button id="hPreviewBuy" class="btn go" data-fly="${item.id}" type="button">FLY THIS</button>`
      : !item.open ? `<span class="small blocked">blocked until ${eraName(levelEra(item.level))}</span>`
      : `<button id="hPreviewBuy" class="btn ${free ? 'free' : ok ? 'go' : ''}" data-fbuy="${item.kind}:${item.id}" type="button" ${ok ? '' : 'disabled'}>${free ? 'FREE!' : cost(item)}</button>`;
    return `<div id="hPreview" class="hpreview"><p class="hp-name"><b>${item.name}</b>${item.level ? ` <span class="small">level ${item.level}</span>` : ''}</p>`
      + (bars.length ? statBarsHTML(bars) : `<p class="small">${tip('hangar-looks')}</p>`) + `<div class="hp-buy">${btn}</div></div>`;
  }

  // The big picture at the top (400 x 176, the art session's hangar portrait): the plane you fly, or
  // the one whose card you tapped. Planes of eras not reached yet show as a dark silhouette.
  previewHTML(s) {
    const f = fleetOf(s), id = this.preview && planeById(this.preview) ? this.preview : f.plane, pl = planeById(id), owned = !!f.planes[id];
    const tag = f.plane === id ? 'FLYING' : owned ? 'IN YOUR FLEET' : `OPENS IN ${ERAS[pl.era].id.toUpperCase()}`;
    const ghosts = this.ghostParts(s, id).map(g => `<img class="fghost" src="${g}" alt="">`).join('');
    return `<div class="fpreview ${owned ? '' : 'locked'}"><img src="${pl.portrait}" alt="${pl.name}" data-plane="${id}">${ghosts}<div class="fpcap"><b>${pl.name}</b><span>${tag}</span></div></div>`;
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
    return list.map(g => this.lineHTML(s, { kind, id: g.id, name: g.name, levels: g.levels, have: owned[g.id] || 0, eraOf: levelEra, now })).join('')
      + (kind === 'system' ? this.financeHTML(s) : '');
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
    const key = `${kind}:${id}`;
    return `<div class="line fline ${next ? '' : 'maxed'} ${this.sel === key ? 'sel' : ''}" data-fline="${key}"><button class="infobtn" data-finfo="${key}" type="button" aria-label="About ${name}">i</button>`
      + (next ? `<button class="frow-tap" data-ftap="${key}" type="button" aria-label="See what ${name} does">` : '<span class="frow-tap">')
      + `<span class="name">${name}</span><span class="small">${have ? levels[have - 1].name : 'Not yet'}</span><span class="pips">${pips}</span>${next ? '<span class="tapme">TAP TO SEE</span></button>' : '</span>'}${row}</div>`;
  }
}
