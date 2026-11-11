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
import { liveryOn } from './livery.js';
import { onSwipe } from './swipe.js';
import { lookFiles, hangarGadgets, previewBars, withNext, shortName } from './fleet.js';
import { statBarsHTML, animateBars } from './statbars.js';
import { capFor, estimate, estimating } from './capability.js';
import { areaOf } from './areas.js';
import { markSeen, hangarScope, dots, fresh } from './fresh.js';
import { showSheet } from './sheet.js';
import { FINANCE, financeLevel, financeOpen, natureHealth, rate, rateAt, canTake, trade, buyFinance, bonds, canLock, lockBond, payBonds, payDividend } from './finance.js';
import { FARES, PLANES, PLANE_LINES, SYSTEMS, GADGETS, fleetOf, nextBuys, canAfford, buyFleet, choosePlane, effectText, levelEra, planeById } from './fleet.js';

const $ = id => document.getElementById(id);
// Effects whose mechanics are not built yet (stages 5-8): said honestly on the card.
const SOON = [];
const eraName = i => ERAS[i].name;
// What is still missing to buy it ('need 12 seeds and 7 crystals more'): in the strip now (the rows are one line).
const needText = (s, l) => `need ${[Math.max(0, l.cost - s.seeds) && `${l.cost - s.seeds}<i class="seedicon"></i>`, Math.max(0, (l.crystals || 0) - (s.crystals || 0)) && `${(l.crystals || 0) - (s.crystals || 0)}<i class="crysicon"></i>`].filter(Boolean).join(' ')} more`;
const cost = l => `${l.cost}<i class="seedicon"></i>${l.crystals ? ` ${l.crystals}<i class="crysicon"></i>` : ''}`;

// Things in the fleet you could buy right now, as keys ('gadget:magnet:3'): src/fresh.js owns it (pure); re-exported for ui.js.
export { fleetBuyable } from './fresh.js';

export class FleetHangar {
  constructor(ui) { this.ui = ui; this.tab = 'plane'; }

  endPayoff() {}   // (replaced while a payoff shows: see payoff())

  render() {
    if (this.paying) { this.renderLater = true; return; }   // a payoff is showing IN the box: nothing may rebuild it (stage 2)
    const s = this.ui.save, el = $('hFleet');
    // R7: a row with a NEW item carries a dot beside its name for the rest of this visit. The set is taken BEFORE this render marks the
    // tab seen (and keeps what earlier renders of this visit found); ui.showHangar() empties it when the hangar is opened again.
    this.rowNew = this.rowNew || new Set(); (fresh(s, this.ui.freshOpts())[hangarScope(this.tab)] || []).forEach(k => this.rowNew.add(k));
    // R5 (UX plan C5): picture + caption (the range lives in the caption), the strip, THEN the sub-tabs directly under it, then the rows.
    // No era chips, no per-tab help sentence: the era is ONE line in PLANE (tap = a sheet), the plane paragraph is behind the (i).
    el.innerHTML = this.freePickHTML(s) + this.previewHTML(s) + this.previewCardHTML(s) + this.tabsHTML(s)
      + (this.tab === 'plane' ? this.planeHTML(s) : this.groupHTML(s, this.tab === 'systems' ? SYSTEMS : GADGETS, this.tab === 'systems' ? 'system' : 'gadget'));
    // Matured biodiversity bonds pay out when you come to the hangar (src/finance.js).
    const div = payDividend(s); if (div) { this.ui.persist(); this.ui.toast && this.ui.toast('NATURE DIVIDEND!', `+${div} crystals: your land here is healthy.`, 'good', 4); }
    const paid = payBonds(s); if (paid) { this.ui.persist(); this.ui.toast && this.ui.toast('BONDS PAID!', `${paid.seeds.toLocaleString('en-GB')} seeds back + ${paid.crystals} crystals: healthy nature pays interest.`, 'good', 4); }
    // The NEW dots (src/fresh.js): this sub-tab is on screen, so what it shows is now seen. Only while the hangar is VISIBLE (refresh() also renders it behind NATURE).
    if (!$('hangar').hidden && markSeen(s, hangarScope(this.tab))) this.ui.persist();
    // M4: how far this plane + nature can get (src/capability.js), worked out in the background after a purchase.
    estimate(s, () => { this.ui.persist(); const c = $('hCap'); if (c) c.outerHTML = this.capHTML(s); });
    const bb = $('hBond'); if (bb) bb.onclick = () => { if (lockBond(s)) { this.ui.persist(); this.ui.sfx.coin(); this.render(); } };
    const tb = $('hTrade'); if (tb) tb.onclick = () => { if (trade(s)) { this.ui.persist(); this.ui.sfx.coin(); this.render(); } };
    const fb2 = $('hFinBuy'); if (fb2) fb2.onclick = () => { if (buyFinance(s)) { this.ui.persist(); this.ui.sfx.buy(); this.render(); requestAnimationFrame(() => animateBars($('hFleet'))); } else this.ui.sfx.nope(); };
    el.querySelectorAll('[data-ftab]').forEach(b => b.onclick = () => { this.tab = b.dataset.ftab; this.ui.sfx.tick(); this.render(); });
    // Swipe sideways to change tab (0.11.0): PLANE <-> SYSTEMS <-> GADGETS (src/swipe.js).
    const goTab = d => { const tabs = ['plane', 'systems', 'gadgets'], i = tabs.indexOf(this.tab) + d; if (i < 0 || i >= tabs.length) return; this.tab = tabs[i]; this.ui.sfx.tick(); this.render(); };
    onSwipe($('hangar'), { next: () => goTab(1), prev: () => goTab(-1) });   // the WHOLE screen (the list is short now: #hFleet alone left a dead area below it on a tall phone)
    const era = $('hNextPlane'); if (era) era.onclick = () => this.eraSheet(s);
    const pinfo = el.querySelector('[data-planeinfo]'); if (pinfo) pinfo.onclick = () => this.planeSheet(s);
    if (!this.sel) { const first = el.querySelector('.rowc-price.btn.go:not([disabled]), .rowc-price.btn.free:not([disabled])'); if (first) first.classList.add('pulse1'); }   // the ONE primary, shown once: no strip item is picked, so the first affordable price pulses
    el.querySelectorAll('[data-finfo]').forEach(b => b.onclick = () => { const [kind, id] = b.dataset.finfo.split(':'); this.showInfo(s, kind, id); });
    el.querySelectorAll('[data-fly]').forEach(b => b.onclick = e => { e.stopPropagation(); if (choosePlane(s, b.dataset.fly)) { this.preview = b.dataset.fly; this.ui.persist(); this.ui.sfx.coin(); this.render(); } });
    // The big picture with the plane's bought parts layered on (src/planelook.js); drawn when ready.
    const pv = el.querySelector('.fpreview img'), f = fleetOf(s), pid = pv && pv.dataset.plane;
    if (pid && f.planes[pid]) { const files = lookFiles(pid, f.planes[pid], 'hangar', liveryOn(s)); composedURL(files.base, files.parts, hangarGadgets(s, pid)).then(u => { if (pv.isConnected) pv.src = u; }).catch(() => {}); }
    // Tap a row = preview it (the user, 2026-10-28: "tap on things and SEE THE EFFECT before purchasing"): the row is
    // marked, the card under the picture shows its bars, and the picture shows the new part ghosted.
    // (screenshots, 2026-10-28: a row tapped low in the list previewed OFF SCREEN at the top; bring the picture + card into view)
    el.querySelectorAll('[data-ftap]').forEach(b => b.onclick = () => { this.sel = b.dataset.ftap; this.ui.sfx.tick(); this.render();
      const pv = $('hFleet').querySelector('.fpreview'); if (pv && pv.scrollIntoView) pv.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    el.querySelectorAll('[data-pview]').forEach(c => c.onclick = () => { const p = c.dataset.pview; this.preview = p;
      this.sel = f.planes[p] && f.plane !== p ? `fly:${p}` : null; this.ui.sfx.tick(); this.render(); });
    el.querySelectorAll('[data-fbuy]').forEach(b => b.onclick = () => {
      const [kind, id] = b.dataset.fbuy.split(':'), free = !!s.freeUpgrade;
      const fb = fleetOf(s), before = lookFiles(fb.plane, JSON.parse(JSON.stringify(fb.planes[fb.plane] || {})), 'hangar', liveryOn(s));   // the plane BEFORE (the payoff shows it first)
      const bars = previewBars(s, kind, id), gadBefore = hangarGadgets(s, fb.plane), item = this.itemOf(s, kind, id);
      if (!buyFleet(s, kind, id, { free })) { this.ui.sfx.nope(); return; }
      this.ui.missionsAfterSave && this.ui.missionsAfterSave();   // season 2: off-flight missions (S3)
      if (free) s.freeUpgrade = false;
      s.sparkle = true;
      this.sel = null;   // (before the render: the strip must not show the NEXT item under the payoff: the 375 screenshot)
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
  // was, then the new part fades and slides onto it with a sparkle, then "Look: shiny new jet engines!" and OK.
  // Every purchase (the user, 2026-10-28): opts.bars = the stat bars it moves (fleet.js previewBars, taken BEFORE the buy),
  // opts.gadBefore = the gadget overlays before (a new gadget is a part too), opts.name = the item, opts.toFly = the rails'
  // first free part (the tutorial's words: rails); every purchase stays in the hangar, the rails' next step is TAKE OFF there. A system has no part: no zoom,
  // the bars are the payoff.
  payoff(before, { bars = [], gadBefore, name, toFly = true, rails = toFly } = {}) {
    const s = this.ui.save, f = fleetOf(s), id = f.plane, files = lookFiles(id, f.planes[id], 'hangar', liveryOn(s));
    const gadNow = hangarGadgets(s, id), gadOld = gadBefore || gadNow;
    const added = files.parts.filter(p => !(before ? before.parts : files.parts.slice(0, -1)).includes(p)).concat(gadNow.filter(g => !gadOld.includes(g)));
    // Stage 2 (DESIGN-HANGAR-NATURE, the user's pick): the payoff happens IN the plane box. The box (.fpreview) steps aside and
    // #payoff takes its exact place in the page: a frame of the same size and border (the picture), then the strip under it
    // (the bars, the words, OK). No overlay, no card: the box you were looking at is what changes.
    const box = $('hFleet') && $('hFleet').querySelector('.fpreview');
    const stale = $('payoff'); if (stale) stale.remove();
    const el = document.createElement('div'); el.id = 'payoff'; el.className = 'payoff inbox';
    if (box) { box.hidden = true; box.insertAdjacentElement('afterend', el); } else document.body.appendChild(el);
    this.paying = true;
    const fleetEl = $('hFleet'); if (fleetEl) fleetEl.classList.add('paying');   // the upgrade list below the display is HIDDEN until OK (the user, 2026-11-09: it stayed visible, some rows looked buyable); OK shows it from a fresh render
    el.innerHTML = `<div class="payoff-card"><div class="pay-frame"><div class="pay-plane"><img id="payBefore" alt="">${added.map(p => `<img class="pay-part" src="${p}" alt="">`).join('')}<i class="pay-spark"></i><b id="payMark" class="pay-mark"></b></div></div>
      <span id="payLabel" class="pay-label">${rails || !name ? tip('rail-payoff-label') : `NEW: ${name}!`}</span>
      ${bars.length ? `<div class="pay-bars">${statBarsHTML(bars)}</div>` : ''}
      <p id="payText" class="pay-later">${rails || !name ? tip('rail-payoff') : `${name}: fitted!`}</p><button id="payOk" class="btn go big pay-later" type="button">OK</button></div>`;
    el.classList.toggle('nopart', !added.length);
    if (box) el.scrollIntoView({ block: 'start', behavior: 'instant' });   // (instant: a smooth scroll still running moved the picture)
    const old = before ? before.parts : files.parts.filter(p => !added.includes(p));
    composedURL(files.base, old, gadOld).then(u => { const img = $('payBefore'); if (img) img.src = u; }).catch(() => {});
    // Where the new part is: each part layer is a whole repainted plane, so the part = the pixels that CHANGE when the
    // layer goes on (before vs after). Their box becomes a RING inside the picture (#payMark; the plane is never zoomed or cropped).
    const part = el.querySelector('.pay-part'), mark = $('payMark'), plane = el.querySelector('.pay-plane'), beforeImg = $('payBefore');
    const measure = () => { if (!part || !part.naturalWidth || !beforeImg.naturalWidth || mark.dataset.done) return; mark.dataset.done = '1';
      const w = part.naturalWidth, h = part.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(beforeImg, 0, 0, w, h); const A = g.getImageData(0, 0, w, h).data; g.drawImage(part, 0, 0); const B = g.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (y * w + x) * 4; if (Math.abs(A[k] - B[k]) + Math.abs(A[k + 1] - B[k + 1]) + Math.abs(A[k + 2] - B[k + 2]) + Math.abs(A[k + 3] - B[k + 3]) > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      if (x1 < 0) return;
      const pct = (v, n) => `${(100 * v / n).toFixed(2)}%`;
      Object.assign(mark.style, { left: pct(x0, w), top: pct(y0, h), width: pct(x1 - x0 + 1, w), height: pct(y1 - y0 + 1, h) });
      const sp = el.querySelector('.pay-spark'); if (sp) { sp.style.left = pct((x0 + x1) / 2, w); sp.style.top = pct((y0 + y1) / 2, h); } };   // the sparkle sits ON the part (there is no zoom any more: the whole plane stays in view)
    // A picture that FAILS to load (the user's iPhone, 2026-11-01: Safari's blue '?' icon on 'Tourist class: fitted!', the payoff
    // waiting out its 6 s and showing the broken layer) is hidden and counts as done: never a broken icon, no 6 s wait.
    const hideBroken = img => { if (!img.naturalWidth) { img.style.display = 'none'; img.dataset.broken = '1'; } };
    const whenLoaded = img => new Promise(r => { if (img.complete && img.naturalWidth) return r();
      img.addEventListener('load', r, { once: true }); img.addEventListener('error', () => { hideBroken(img); r(); }, { once: true }); });
    if (part) Promise.all([whenLoaded(part), whenLoaded(beforeImg)]).then(measure);
    // The label arrow, placed over the part once the zoom has settled (the user, 2026-10-28: the payoff must not be flat).
    // The label sits in its own row BELOW the picture frame, under the ring (the user: at 320 the label lay over the middle of the plane's body). The row is reserved in CSS (.payoff.inbox:not(.nopart) .pay-frame margin-bottom).
    const label = () => { const lab = $('payLabel'), card = el.querySelector('.pay-frame'); if (!lab || !el.isConnected) return;
      const m = mark.getBoundingClientRect(), c = card.getBoundingClientRect();
      const x = Math.max(lab.offsetWidth / 2 + 4, Math.min(c.width - lab.offsetWidth / 2 - 4, m.left + m.width / 2 - c.left));
      lab.classList.add('below');   // the arrow points up at the picture, where the ring is
      lab.style.left = `${Math.round(x)}px`; lab.style.top = `${Math.round(c.height + 6)}px`; el.classList.add('labelled'); };
    // No part (a system, or a level with no new look): the bars ARE the payoff - they move with the sparkle, then OK.
    // (the user's playtest, 2026-10-29, live on a phone: the pictures were still loading when the timeline ran, so the frame
    // stayed EMPTY and the label, placed on an unmeasured marker, floated above the card.) Now the show starts only once both
    // pictures are in (6 s at most), and the zoom + label need the measured part; without it, the plane shows flat (no zoom).
    const settle = () => { if (!el.isConnected) return; if (added.length && mark.dataset.done) label(); else { el.classList.add('nopart'); el.classList.add('labelled'); }
      if (rails && this.ui.tour) this.ui.tour.payoffOk(); };   // the rails: ring OK (the rest of the page is live)
    const pics = [whenLoaded(beforeImg), ...(part ? [whenLoaded(part)] : [])];
    Promise.race([Promise.all(pics).then(() => part && measure()), new Promise(r => setTimeout(r, 6000))]).then(() => {
      el.querySelectorAll('.pay-part, #payBefore').forEach(img => { if (img.getAttribute('src')) hideBroken(img); });   // (the 6 s fallback too)
      if (part && !mark.dataset.done) el.classList.add('nopart');
      setTimeout(() => { if (el.isConnected) { el.classList.add('arrive'); this.ui.sfx.reveal && this.ui.sfx.reveal(); animateBars(el); setTimeout(settle, 700); } }, 600); });   // the part arrives (ringed, sparkle on it; no zoom), then the label
    // Ending the payoff: OK, or leaving the hangar mid-payoff (the plane build's review: it stayed parked until OK).
    this.endPayoff = () => { el.remove(); if (box) box.hidden = false; const fl = $('hFleet'); if (fl) fl.classList.remove('paying'); this.paying = false; this.renderLater = false; this.endPayoff = () => {}; };
    $('payOk').onclick = () => { this.ui.sfx.tick(); this.endPayoff();
      if (toFly) this.ui.go('fly'); else { this.render(); if (this.ui.tour) setTimeout(() => this.ui.tour.maybe('hangar'), 300); } };   // stay: the rails' next step (TAKE OFF) is in the hangar
  }

  // The capability line under the picture (M4): the cached estimate, or "working it out" while it runs.
  // The range in the picture caption (the flying plane only): a span so the background estimate can swap it (#hCap).
  capHTML(s) {
    const km = capFor(s, areaOf(s.city) || null);
    return km ? `<span id="hCap" class="hcap" title="How far your plane and nature can reach">~${Math.round(km / 1000)}k km</span>`
      : `<span id="hCap" class="hcap working" title="Working out how far your plane can go">${estimating() ? '~ km' : ''}<i class="dots"></i></span>`;
  }
  // NATURE FINANCE (src/finance.js), from the 2010s: the desk's level, today's rate from your nature's health (a bar: fewer
  // seeds a crystal is better), the next level's rate previewed, and the TRADE button (once a landing, above the reserve).
  financeHTML(s) {
    if (!financeOpen(s)) return '';
    const lv = financeLevel(s), B = natureHealth(s), next = FINANCE.levels[lv], L = FINANCE.levels[lv - 1];
    const bar = lvTo => statBarsHTML([{ label: 'Seeds per crystal', now: lv ? rate(s) : 40, then: rateAt(lvTo, B), min: 0, max: 40, better: 'lower' }]);
    const n = canTake(s);
    // (screenshot, 2026-10-28: a level that adds bonds / the dividend does not change the rate: say what it adds, no 0% bar)
    const adds = next && (next.dividend && !(L && L.dividend) ? 'Adds the nature dividend: crystals for landing where nature is healthy.' : next.bond && !(L && L.bond) ? 'Adds bonds: lock seeds, get them back with crystals.' : '');
    return `<div class="line fline finance"><div class="fin-head"><div class="name">Natural capital</div><div class="small">${L ? L.name : 'Not yet'}. Your nature: ${B} / 100</div></div>
      ${L ? `<p class="small">Today: <b>${rate(s)} seeds = 1 crystal</b>. You keep ${L.reserve.toLocaleString('en-GB')} seeds.</p>
        <button class="btn ${n ? 'go' : ''}" id="hTrade" type="button" ${n ? '' : 'disabled'}>${n ? `TRADE ${n * rate(s)} seeds for ${n} crystals` : 'Trade again after your next landing'}</button>` : '<p class="small">Healthier nature, a better rate.</p>'}
      ${L && L.bond ? `<p class="small">Bonds: ${bonds(s).map(b => `${Math.max(0, L.bond.landings - ((s.landings || 0) - b.at))} landings left`).join(', ') || 'none yet'}. Each pays back its seeds + about ${Math.floor(B / L.bond.perB)} crystals (your nature at payout).</p>
        <button class="btn ${canLock(s) ? 'go' : ''}" id="hBond" type="button" ${canLock(s) ? '' : 'disabled'}>LOCK ${L.bond.lock.toLocaleString('en-GB')} seeds for ${L.bond.landings} landings</button>` : ''}
      ${next ? `<div class="next"><span>Next: <b>${next.name}</b></span><button class="btn ${s.seeds >= next.cost ? 'go' : ''}" id="hFinBuy" type="button" ${s.seeds >= next.cost ? '' : 'disabled'}>${next.cost}<i class="seedicon"></i></button></div>${adds ? `<p class="small">${adds}</p>` : bar(lv + 1)}` : ''}</div>`;
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
    const n = withNext(s, kind, id), fn = fleetOf(n), a = lookFiles(planeId, f.planes[planeId], 'hangar', liveryOn(s)), b = lookFiles(planeId, fn.planes[planeId], 'hangar', liveryOn(s));
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
    // The strip (DESIGN-HANGAR-NATURE): the FULL name, what it does, the bars, and the (i) 'More about it' (moved off the rows).
    const info = item.kind === 'fly' ? '' : `<button class="btn hp-info" data-finfo="${item.kind}:${item.id}" type="button">i More about it</button>`;
    return `<div id="hPreview" class="hpreview"><p class="hp-name"><b>${item.name}</b>${item.level ? ` <span class="small">level ${item.level}</span>` : ''}</p>`
      + (item.kind === 'fly' ? '' : `<p class="small hp-what">${effectText(item)}</p>`)
      + (bars.length ? statBarsHTML(bars) : `<p class="small">${tip('hangar-looks')}</p>`)
      + (item.kind !== 'fly' && item.open && !ok ? `<p class="small need">${needText(s, item)}</p>` : '') + `<div class="hp-buy">${info}${btn}</div></div>`;
  }

  // The big picture at the top (400 x 176, the art session's hangar portrait): the plane you fly, or
  // the one whose card you tapped. Planes of eras not reached yet show as a dark silhouette.
  previewHTML(s) {
    const f = fleetOf(s), id = this.preview && planeById(this.preview) ? this.preview : f.plane, pl = planeById(id), owned = !!f.planes[id];
    const tag = f.plane === id ? 'FLYING' : owned ? 'IN YOUR FLEET' : `OPENS IN ${ERAS[pl.era].id.toUpperCase()}`;
    const ghosts = this.ghostParts(s, id).map(g => `<img class="fghost" src="${g}" alt="">`).join('');
    // .fpic: the PICTURE (400:176), base + ghost layers stacked inside it. The caption (.fpcap) is OUTSIDE it, so a ghost can never
    // be sized to the caption too (the user's screenshot, 2026-11-02: the ghost filled the whole box, stretched ~14% tall).
    return `<div class="fpreview ${owned ? '' : 'locked'}"><div class="fpic"><img src="${pl.portrait}" alt="${pl.name}" data-plane="${id}">${ghosts}</div><div class="fpcap"><b>${pl.name}</b><span>${tag}</span>${f.plane === id ? this.capHTML(s) : ''}</div></div>`;
  }

  // The sub-tabs (>= 40 px each), a dot on the ones with something new that are NOT the one showing (src/fresh.js).
  tabsHTML(s) {
    const d = dots(s, this.ui.freshOpts());
    return `<div class="ftabs">${[['plane', 'PLANE'], ['systems', 'SYSTEMS'], ['gadgets', 'GADGETS']].map(([k, n]) =>
      `<button class="btn ftab ${this.tab === k ? 'on' : ''}" data-ftab="${k}" type="button">${n}${k !== this.tab && d[hangarScope(k)] ? '<i class="dot"></i>' : ''}</button>`).join('')}</div>`;
  }

  // The era, ONE line (tap = the six eras and what the next one brings). It keeps the id #hNextPlane and the class .ftimeline
  // (tour.js and the tours test point at the era line by that class).
  eraLineHTML(s) {
    const f = fleetOf(s), p = eraProgress(s), nxt = PLANES.find(pl => !f.planes[pl.id]);
    const frac = p.next ? p.frac : 1, what = nxt ? `Next: <b>${nxt.name}</b>` : `Every era open`;   // (the era's name is in the sheet: this line must fit ONE row at 320)
    return `<button class="ftimeline era-line" id="hNextPlane" type="button" aria-label="The eras"><span class="small">${what}</span>`
      + `<span class="era-row"><span class="era-track"><span class="era-fill" style="width:${(frac * 100).toFixed(1)}%"></span></span></span>`
      + (p.next ? `<span class="small" title="minutes of flying">${Math.floor(p.done)}/${Math.round(p.need)}</span>` : '') + '</button>';
  }
  eraSheet(s) {
    const p = eraProgress(s), brings = p.next ? PLANES.filter(pl => pl.era === p.index + 1).map(pl => pl.name).concat(p.index + 1 < 3 ? ['new systems and gadgets'] : []) : [];
    const rows = ERAS.map((e, i) => `<p><b>${e.id === 'future' ? 'Far future' : e.id}</b> ${i < p.index ? 'done' : i === p.index ? 'now' : 'to come'}</p>`).join('');
    showSheet({ eyebrow: 'ERAS', title: 'Flying through time', html: rows + (p.next ? `<p>To ${p.next.name}: ${Math.floor(p.done)} of ${Math.round(p.need)} min of flying${brings.length ? `. Brings: ${brings.join(', ')}.` : ''}</p>` : '<p>Every era is open!</p>') });
  }
  planeSheet(s) {
    const pl = planeById(fleetOf(s).plane);
    showSheet({ eyebrow: pl.name.toUpperCase(), title: 'How planes work here', body: 'Every plane flies the same way. Upgrades change what happens around it. A fuller plane makes less CO2 per passenger: that is why airlines fill every seat.' });
  }

  planeHTML(s) {
    const f = fleetOf(s), now = eraProgress(s).index;
    const cards = PLANES.map(pl => {
      const owned = !!f.planes[pl.id], flying = f.plane === pl.id;
      if (!owned) return '';   // planes not reached yet: the one 'Next plane' line below (DESIGN-HANGAR-NATURE: no row of silhouettes)
      // An owned plane is a .rowc row too (Coordinator, 2026-11-01: one row component): tap = preview it in the box; the price
      // column = FLY THIS (data-fly) or FLYING. (CO2 and fares moved to the preview strip, via the 'fly' bars.)
      return `<div class="rowc price-top fplane-row ${flying ? 'sel flying' : ''}" data-row="fly:${pl.id}">`
        + `<button class="rowc-tap" type="button" data-pview="${pl.id}" aria-label="Show the ${pl.name}"><span class="rowc-slot"></span><span class="rowc-top"><span class="rowc-name">${pl.name}</span></span>`
        + `<span class="rowc-sub">${flying ? 'FLYING' : ERAS[pl.era].id}</span></button>`
        + (flying ? '<span class="rowc-price rowc-done">FLYING</span>' : '') + '</div>';   // (FLY THIS is the strip's button: tap the row, then it; one primary)
    }).join('');
    const pl = planeById(f.plane), mine = f.planes[pl.id] || {};
    const lines = Object.entries(PLANE_LINES).map(([line, name]) =>
      this.lineHTML(s, { kind: 'plane', id: `${pl.id}.${line}`, name, levels: pl.lines[line], have: mine[line] || 0, eraOf: () => pl.era, now })).join('');
    return `<div class="fplanes-rows">${cards}</div>${this.eraLineHTML(s)}
      <h3 class="tree-head">${pl.name.toUpperCase()} <button class="btn hp-info" data-planeinfo="1" type="button" aria-label="How planes work">i</button></h3>${lines}`;
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
  // One row (DESIGN-HANGAR-NATURE section 5a, the shared .rowc): ONE tap target (the whole left part, [data-ftap]) and the
  // price as a SIBLING button ([data-fbuy]); line 1 = name + pips, line 2 = 'Next: <short name>' (fits at 375, no ellipsis).
  // The full name, what it does and the (i) facts are in the preview strip (#hPreview) when the row is tapped.
  lineHTML(s, { kind, id, name, levels, have, eraOf, now }) {
    const next = levels[have], key = `${kind}:${id}`, pips = levels.map((_, i) => `<span class="pip ${i < have ? 'on' : ''}"></span>`).join('');
    let sub = 'All done!', price = '<span class="rowc-price rowc-done">MAX</span>', locked = false;
    if (next) {
      const era = eraOf(have + 1), open = era <= now, free = !!s.freeUpgrade && have === 0 && open, ok = open && (free || canAfford(s, next));
      locked = !open;
      sub = open ? `Next: ${shortName(next)}` : `Opens in ${ERAS[era].id}`;
      price = open ? `<button class="rowc-price btn ${free ? 'free' : ok ? 'go' : ''}" data-fbuy="${key}" type="button" ${ok ? '' : 'disabled'}>${free ? 'FREE!' : cost(next)}</button>`
        : `<span class="rowc-price rowc-locked">${ERAS[era].id}</span>`;
    }
    const tap = next ? `<button class="rowc-tap" data-ftap="${key}" type="button" aria-label="See what ${name} does">` : '<span class="rowc-tap">';
    return `<div class="rowc price-top ${next ? '' : 'maxed'} ${locked ? 'locked' : ''} ${this.sel === key ? 'sel' : ''}" data-row="${key}" data-fline="${key}">`
      + `${tap}<span class="rowc-slot"></span><span class="rowc-top"><span class="rowc-name">${name}</span>${next && this.rowNew && this.rowNew.has(`${key}:${have + 1}`) ? '<i class="dot row-new"></i>' : ''}<span class="rowc-pips">${pips}</span></span>`
      + `<span class="rowc-sub">${sub}</span>${next ? '</button>' : '</span>'}${price}</div>`;
  }

}
