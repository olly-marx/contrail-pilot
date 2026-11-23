// The new hangar (eras build, stage 3b, 2026-10-23): the era timeline, then three tabs.
//   PLANE:   your fleet (choose which plane to fly; planes of eras not reached yet are silhouettes),
//            then the chosen plane's Engines / Wings & body / Cabin.
//   SYSTEMS: Forecasting, Air traffic control, Fuel & operations (fleet-wide).
//   GADGETS: Magnet, Cargo hold, Landing gear, Sensors, Autopilot (fleet-wide).
// Data and rules: src/fleet.js. Rendered into #hFleet by UI.renderHangar (src/ui.js).
import { kNum } from './config.js';
import { ERAS, eraProgress } from './eras.js';
import { tip } from './tips.js';
import { LINE_INFO, LEVEL_FACTS, levelCard } from './fleetfacts.js';
import { PART_RESEARCH, learnHTML } from './learnmore.js';
const esc = t => String(t).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
import { composedURL } from './planelook.js';
import { liveryOn } from './livery.js';
import { onSwipe } from './swipe.js';
import { lookFiles, hangarGadgets, previewBars, withNext, shortName } from './fleet.js';
import { upgradeCard, ALL_DONE, showsNow } from './upgradetext.js';
import { statBarsHTML, animateBars } from './statbars.js';
import { capFor, estimate, estimating } from './capability.js';
import { areaOf } from './areas.js';
import { markSeen, hangarScope, dots, fresh } from './fresh.js';
import { showSheet } from './sheet.js';
import { FINANCE, FUND, financeLevel, financeOpen, financeBio, natureHealth, bondCrystals, rate, buyAt, sellRate, trueRate, gameDay, marketSeries, fundSeries, maxBuy, maxSell, buyBlock, sellBlock, trade, sell, buyFinance, bonds, canLock, lockBond, payBonds, payDividend, fundOf, fundValue, cashValue, canInvest, investBlock, invest, cashOut, newsToday } from './finance.js';

import { rowIcon } from './rowicons.js';
import { FARES, PLANES, PLANE_LINES, SYSTEMS, GADGETS, fleetOf, nextBuys, canAfford, buyFleet, choosePlane, effectText, levelEra, planeById } from './fleet.js';

const $ = id => document.getElementById(id);
// Effects whose mechanics are not built yet (stages 5-8): said honestly on the card.
const SOON = [];
const eraName = i => ERAS[i].name;
// What is still missing to buy it ('need 12 seeds and 7 crystals more'): in the strip now (the rows are one line).
const needText = (s, l) => `need ${[Math.max(0, l.cost - s.seeds) && `${l.cost - s.seeds}<i class="seedicon"></i>`, Math.max(0, (l.crystals || 0) - (s.crystals || 0)) && `${(l.crystals || 0) - (s.crystals || 0)}<i class="crysicon"></i>`].filter(Boolean).join(' ')} more`;
const cost = l => `${kNum(l.cost)}<i class="seedicon"></i>${l.crystals ? ` ${kNum(l.crystals, 1000)}<i class="crysicon"></i>` : ''}`;

// Things in the fleet you could buy right now, as keys ('gadget:magnet:3'): src/fresh.js owns it (pure); re-exported for ui.js.
export { fleetBuyable } from './fresh.js';

export class FleetHangar {
  constructor(ui) { this.ui = ui; this.tab = 'plane'; }

  endPayoff() {}   // (replaced while a payoff shows: see payoff())

  render() {
    if (this.paying) { this.renderLater = true; return; }   // a payoff is showing IN the box: nothing may rebuild it (stage 2)
    const s = this.ui.save, el = $('hFleet');
    // The seed and crystal counters at the top follow every redraw (Oliver, 2026-11-23: a BANK trade or INVEST left the old
    // balance on show until he left the hangar and came back; the BANK buttons redraw only this box, not UI.renderHangar).
    const ht = $('hTrees'), hc = $('hCrystals'); if (ht) ht.textContent = s.seeds; if (hc) hc.textContent = s.crystals || 0;
    // (No row dots since 2026-11-19, Oliver: the dots are on the bar and the PLANE / SYSTEMS / GADGETS sub-tabs only.)
    // R5 (UX plan C5): picture + caption (the range lives in the caption), the strip, THEN the sub-tabs directly under it, then the rows.
    // No era chips, no per-tab help sentence: the era is ONE line in PLANE (tap = a sheet), the plane paragraph is behind the (i).
    el.innerHTML = this.freePickHTML(s) + this.previewHTML(s) + this.previewCardHTML(s) + this.tabsHTML(s)
      + (this.tab === 'bank' ? this.financeHTML(s) : this.tab === 'plane' ? this.planeHTML(s) : this.groupHTML(s, this.tab === 'systems' ? SYSTEMS : GADGETS, this.tab === 'systems' ? 'system' : 'gadget'));
    // Matured biodiversity bonds pay out when you come to the hangar (src/finance.js).
    const div = payDividend(s); if (div) { this.ui.persist(); this.ui.toast && this.ui.toast('NATURE DIVIDEND!', `+${div} crystals: your land here is healthy.`, 'good', 4); }
    const paid = payBonds(s); if (paid) { this.ui.persist(); this.ui.toast && this.ui.toast('BONDS PAID!', `${paid.seeds.toLocaleString('en-GB')} seeds back + ${paid.crystals} crystals: healthy nature pays interest.`, 'good', 4); }
    // The NEW dots (src/fresh.js): this sub-tab is on screen, so what it shows is now seen. Only while the hangar is VISIBLE (refresh() also renders it behind NATURE).
    if (!$('hangar').hidden && markSeen(s, hangarScope(this.tab))) this.ui.persist();
    // M4: how far this plane + nature can get (src/capability.js), worked out in the background after a purchase.
    estimate(s, () => { this.ui.persist(); const c = $('hCap'); if (c) c.outerHTML = this.capHTML(s); });
    const bb = $('hBond'); if (bb) bb.onclick = () => { if (lockBond(s)) { this.ui.persist(); this.ui.sfx.coin(); this.render(); } };
    // THE BANK (2026-11-23): amounts picked with - / + / MAX (data-fstep="buy:-1" etc.), then BUY / SELL / INVEST / TAKE OUT.
    const done = () => { this.ui.persist(); this.ui.sfx.coin(); this.render(); };
    const tb = $('hTrade'); if (tb) tb.onclick = () => { if (trade(s, this.finAmt(s, 'buy'))) done(); };
    const sb = $('hSell'); if (sb) sb.onclick = () => { if (sell(s, this.finAmt(s, 'sell'))) done(); };
    const ib = $('hInvest'); if (ib) ib.onclick = () => { if (invest(s, this.finAmt(s, 'fund'))) done(); };
    el.querySelectorAll('[data-fstep]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.fstep.split(':'); this.finStep(s, k, d); this.ui.sfx.tick(); this.render(); });
    const ob = $('hCashOut'); if (ob) ob.onclick = () => { const p = cashOut(s); if (p) { this.ui.persist(); this.ui.sfx.coin(); this.ui.toast && this.ui.toast('MONEY TAKEN OUT', `+${p.toLocaleString('en-GB')} seeds`, 'good', 3); this.render(); } };
    const fb2 = $('hFinBuy'); if (fb2) fb2.onclick = () => { if (buyFinance(s)) { this.ui.persist(); this.ui.sfx.buy(); this.render(); requestAnimationFrame(() => animateBars($('hFleet'))); } else this.ui.sfx.nope(); };
    el.querySelectorAll('[data-ftab]').forEach(b => b.onclick = () => { this.tab = b.dataset.ftab; this.ui.sfx.tick(); this.render(); });
    // Swipe sideways to change tab (0.11.0): PLANE <-> SYSTEMS <-> GADGETS <-> BANK (src/swipe.js).
    const goTab = d => { const tabs = this.tabList(s).map(t => t[0]), i = tabs.indexOf(this.tab) + d; if (i < 0 || i >= tabs.length) return; this.tab = tabs[i]; this.ui.sfx.tick(); this.render(); };
    onSwipe($('hangar'), { next: () => goTab(1), prev: () => goTab(-1) });   // the WHOLE screen (the list is short now: #hFleet alone left a dead area below it on a tall phone)
    const era = $('hNextPlane'); if (era) era.onclick = () => this.eraSheet(s);
    const pinfo = el.querySelector('[data-planeinfo]'); if (pinfo) pinfo.onclick = () => this.planeSheet(s);
    el.querySelectorAll('[data-fininfo]').forEach(b => b.onclick = () => this.financeSheet(s, b.dataset.fininfo));
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
    const fleetEl = $('hFleet'); if (fleetEl) fleetEl.classList.add('paying');
    $('hangar').classList.add('paying');   // the bottom TAKE OFF / reset row is hidden too (Oliver, 2026-11-16: a TAKE OFF under 'fitted!' does not belong on that card; OK is its one action)   // the upgrade list below the display is HIDDEN until OK (the user, 2026-11-09: it stayed visible, some rows looked buyable); OK shows it from a fresh render
    // One line on what the part is (its checked fact, src/fleetfacts.js; never a 'guess'), and for the 2030s and far-future parts
    // LEARN MORE: the real research behind it (src/learnmore.js). Oliver, 2026-11-19. Not on the tutorial's first part.
    const fact = !rails && name && LEVEL_FACTS[name] && LEVEL_FACTS[name].status !== 'guess' ? LEVEL_FACTS[name].fact : '', research = !rails && name && PART_RESEARCH[name];
    const extra = `${fact ? `<p class="pay-fact pay-later">${esc(fact)}</p>` : ''}${research ? `<p class="pay-later pay-learn">${learnHTML(research.name, research.url)}</p>` : ''}`;
    el.innerHTML = `<div class="payoff-card"><div class="pay-frame"><div class="pay-plane"><img id="payBefore" alt="">${added.map(p => `<img class="pay-part" src="${p}" alt="">`).join('')}<i class="pay-spark"></i><b id="payMark" class="pay-mark"></b></div></div>
      <span id="payLabel" class="pay-label">${rails || !name ? tip('rail-payoff-label') : `NEW: ${shortName({ name })}!`}</span>
      ${bars.length ? `<div class="pay-bars">${statBarsHTML(bars)}</div>` : ''}
      <p id="payText" class="pay-later">${rails || !name ? tip('rail-payoff') : `${name}: fitted!`}</p>${extra}<button id="payOk" class="btn go big pay-later" type="button">OK</button></div>`;
    el.classList.toggle('nopart', !added.length);
    if (box) el.scrollIntoView({ block: 'start', behavior: 'instant' });   // (instant: a smooth scroll still running moved the picture)
    const old = before ? before.parts : files.parts.filter(p => !added.includes(p));
    composedURL(files.base, old, gadOld).then(u => { const img = $('payBefore'); if (img) img.src = u; }).catch(() => {});
    // Where the new part is: each part layer is a whole repainted plane, so the part = the pixels that CHANGE when the
    // layer goes on (before vs after). Their box becomes a RING inside the picture (#payMark; the plane is never zoomed or cropped).
    const part = el.querySelector('.pay-part'), mark = $('payMark'), plane = el.querySelector('.pay-plane'), beforeImg = $('payBefore');
    // The ring is measured against the BARE plane (files.base), not the picture before: a part layer is the whole plane with one part changed,
    // so against a 'before' that already wears other parts and gadgets every one of them counted as changed and the ring went round the whole plane
    // (measured 2026-11-16 on a Comet with engines and gadgets fitted: the Pinion ring covered the fuselage).
    const bareImg = new Image(); bareImg.src = files.base;
    const measure = () => { if (!part || !part.naturalWidth || !bareImg.naturalWidth || mark.dataset.done) return; mark.dataset.done = '1';
      const w = part.naturalWidth, h = part.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(bareImg, 0, 0, w, h); const A = g.getImageData(0, 0, w, h).data; g.drawImage(part, 0, 0); const B = g.getImageData(0, 0, w, h).data;
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (y * w + x) * 4; if (Math.abs(A[k] - B[k]) + Math.abs(A[k + 1] - B[k + 1]) + Math.abs(A[k + 2] - B[k + 2]) + Math.abs(A[k + 3] - B[k + 3]) > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      if (x1 < 0) return;
      mark.dataset.part = [x0, y0, x1, y1, w, h].join(',');   // the changed pixels' box (tests/payoffcard.cjs: the ring must clear it)
      // A margin round the part (Oliver, 2026-11-17: the highlight often covered the part itself): the ring's 2 px border sits OUTSIDE the
      // changed pixels, by about 4 % of the picture (at least 4 art pixels), kept inside the picture.
      const pad = Math.max(4, Math.round(0.04 * Math.max(w, h)));
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
      const pct = (v, n) => `${(100 * v / n).toFixed(2)}%`;
      Object.assign(mark.style, { left: pct(x0, w), top: pct(y0, h), width: pct(x1 - x0 + 1, w), height: pct(y1 - y0 + 1, h) });
      const sp = el.querySelector('.pay-spark'); if (sp) { sp.style.left = pct((x0 + x1) / 2, w); sp.style.top = pct((y0 + y1) / 2, h); } };   // the sparkle sits ON the part (there is no zoom any more: the whole plane stays in view)
    // A picture that FAILS to load (the user's iPhone, 2026-11-01: Safari's blue '?' icon on 'Tourist class: fitted!', the payoff
    // waiting out its 6 s and showing the broken layer) is hidden and counts as done: never a broken icon, no 6 s wait.
    const hideBroken = img => { if (!img.naturalWidth) { img.style.display = 'none'; img.dataset.broken = '1'; } };
    const whenLoaded = img => new Promise(r => { if (img.complete && img.naturalWidth) return r();
      img.addEventListener('load', r, { once: true }); img.addEventListener('error', () => { hideBroken(img); r(); }, { once: true }); });
    if (part) Promise.all([whenLoaded(part), whenLoaded(bareImg)]).then(measure);
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
    const pics = [whenLoaded(beforeImg), ...(part ? [whenLoaded(part), whenLoaded(bareImg)] : [])];
    Promise.race([Promise.all(pics).then(() => part && measure()), new Promise(r => setTimeout(r, 6000))]).then(() => {
      el.querySelectorAll('.pay-part, #payBefore').forEach(img => { if (img.getAttribute('src')) hideBroken(img); });   // (the 6 s fallback too)
      if (part && !mark.dataset.done) el.classList.add('nopart');
      setTimeout(() => { if (el.isConnected) { el.classList.add('arrive'); this.ui.sfx.reveal && this.ui.sfx.reveal(); animateBars(el); setTimeout(settle, 700); } }, 600); });   // the part arrives (ringed, sparkle on it; no zoom), then the label
    // Ending the payoff: OK, or leaving the hangar mid-payoff (the plane build's review: it stayed parked until OK).
    this.endPayoff = () => { el.remove(); if (box) box.hidden = false; const fl = $('hFleet'); if (fl) fl.classList.remove('paying'); $('hangar').classList.remove('paying'); this.paying = false; this.renderLater = false; this.endPayoff = () => {}; };
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
  // THE BANK tab (src/finance.js; rework 2026-11-23): the wallet, the EXCHANGE (graph, rates, an amount, BUY / SELL), the NATURE
  // FUND (graph with its trend, value and gain, an amount, INVEST / TAKE OUT), bonds, and the desk's next level. A greyed button
  // says WHY (buyBlock / sellBlock / investBlock), never 'after your next landing'.
  // Amounts: this.fin = { buy, sell, fund }, clamped to what is possible now; the steps are 1 / 5 / 10 crystals and 100 / 500 / 1,000 seeds.
  finMax(s, k) { return k === 'buy' ? maxBuy(s) : k === 'sell' ? maxSell(s) : canInvest(s); }
  finAmt(s, k) {
    this.fin = this.fin || {}; const max = this.finMax(s, k), dflt = k === 'fund' ? 1000 : 10;
    return Math.max(max ? 1 : 0, Math.min(max, this.fin[k] ?? dflt));
  }
  finStep(s, k, d) {
    this.fin = this.fin || {}; const now = this.finAmt(s, k), max = this.finMax(s, k), big = k === 'fund' ? (now >= 1000 ? 1000 : 100) : (now >= 10 ? 5 : 1);
    this.fin[k] = d === 'max' ? max : Math.max(1, Math.min(max, d === '+' ? now + big : now - big));
  }
  stepperHTML(s, k, unit) {
    const n = this.finAmt(s, k), max = this.finMax(s, k);
    return `<div class="fin-amt"><button class="btn" data-fstep="${k}:-" type="button" ${n > 1 ? '' : 'disabled'} aria-label="Less">-</button><b>${n.toLocaleString('en-GB')}</b> ${unit}<button class="btn" data-fstep="${k}:+" type="button" ${n < max ? '' : 'disabled'} aria-label="More">+</button><button class="btn fin-max" data-fstep="${k}:max" type="button" ${n < max ? '' : 'disabled'}>MAX</button></div>`;
  }
  financeHTML(s) {
    if (!financeOpen(s)) return '';
    const lv = financeLevel(s), B = financeBio(s), next = FINANCE.levels[lv], L = FINANCE.levels[lv - 1];
    const T = trueRate(gameDay(s)), bar = lvTo => statBarsHTML([{ label: 'You pay a crystal', now: lv ? rate(s) : buyAt(1, B, T), then: buyAt(lvTo, B, T), min: 0, max: 50, better: 'lower' }]);
    const i = k => `<button class="btn hp-info" data-fininfo="${k}" type="button" aria-label="How it works">i</button>`;
    const adds = next && (next.dividend && !(L && L.dividend) ? 'Adds the nature dividend.' : next.bond && !(L && L.bond) ? 'Adds bonds.' : '');
    const nb = this.finAmt(s, 'buy'), ns = this.finAmt(s, 'sell'), bb = buyBlock(s), sbk = sellBlock(s);
    const nextLine = next ? `<div class="next"><span>${L ? 'Next' : 'Open the desk'}: <b>${next.name}</b></span><button class="btn ${s.seeds >= next.cost ? 'go' : ''}" id="hFinBuy" type="button" ${s.seeds >= next.cost ? '' : 'disabled'}>${next.cost.toLocaleString('en-GB')}<i class="seedicon"></i></button></div>${adds ? `<p class="small">${adds}</p>` : L ? bar(lv + 1) : ''}` : '';
    return `<div class="line fline finance"><div class="fin-head"><div class="name">Exchange ${i('market')}</div><div class="small">World nature ${B} / 100</div></div>
      <p class="fin-wallet">You have <b>${(s.seeds || 0).toLocaleString('en-GB')}</b><i class="seedicon"></i> <b>${(s.crystals || 0).toLocaleString('en-GB')}</b><i class="crysicon"></i></p>
      ${L ? `${this.chartSVG(marketSeries(s), [['pay', 'pay'], ['true', 'market'], ['get', 'get']])}
        <p class="small fin-rates">Pay <b>${rate(s)}</b> · get <b>${sellRate(s)}</b> seeds a crystal</p>
        <div class="fin-trade"><div>${this.stepperHTML(s, 'buy', 'to buy')}<button class="btn ${bb ? '' : 'go'}" id="hTrade" type="button" ${bb ? 'disabled' : ''}>${bb || `BUY ${nb}<i class="crysicon"></i> for ${(nb * rate(s)).toLocaleString('en-GB')}`}</button></div>
        <div>${this.stepperHTML(s, 'sell', 'to sell')}<button class="btn ${sbk ? '' : 'go'}" id="hSell" type="button" ${sbk ? 'disabled' : ''}>${sbk || `SELL ${ns}<i class="crysicon"></i> for ${(ns * sellRate(s)).toLocaleString('en-GB')}`}</button></div></div>` : '<p class="small">Swap seeds and crystals, and grow seeds in the nature fund.</p>'}
      ${L ? '' : nextLine}</div>
      ${L ? this.fundHTML(s, L, i) : ''}
      ${L && L.bond ? `<div class="line fline finance"><p class="small">Bonds ${i('bonds')}: ${bonds(s).map(b => `${Math.max(0, L.bond.landings - ((s.landings || 0) - b.at))} landings left`).join(', ') || 'none yet'}</p>
        <button class="btn ${canLock(s) ? 'go' : ''}" id="hBond" type="button" ${canLock(s) ? '' : 'disabled'}>LOCK ${L.bond.lock.toLocaleString('en-GB')} seeds for ${L.bond.landings} landings</button></div>` : ''}
      ${L && next ? `<div class="line fline finance">${nextLine}</div>` : ''}`;
  }

  // THE NATURE FUND (src/finance.js, rework 2026-11-23): value and gain on what you put in, the graph with its dashed trend,
  // today's story, an amount, INVEST and TAKE OUT (the 2% fee shown in the button's number).
  fundHTML(s, L, i) {
    const f = fundOf(s), v = fundValue(s), nf = this.finAmt(s, 'fund'), blk = investBlock(s), news = newsToday(s);
    const pct = f && f.paid ? Math.round(1000 * (v / f.paid - 1)) / 10 : 0;
    return `<div class="line fline finance"><div class="fin-sub"><span class="name">Nature fund ${i('fund')}</span><span class="small">${f ? `<b>${v.toLocaleString('en-GB')}</b><i class="seedicon"></i> <span class="${pct >= 0 ? 'fin-up' : 'fin-down'}">${pct >= 0 ? '+' : ''}${pct}%</span>` : 'empty'}</span></div>
      ${this.chartSVG(fundSeries(s), [['price', 'fund'], ['trend', 'trend']], f && f.day)}
      ${news ? `<p class="small fin-news ${news.up ? 'up' : 'down'}">${news.text} (${news.up ? '+' : ''}${Math.round(1000 * news.size) / 10}%)</p>` : ''}
      ${this.stepperHTML(s, 'fund', 'seeds')}
      <div class="fin-trade"><button class="btn ${blk ? '' : 'go'}" id="hInvest" type="button" ${blk ? 'disabled' : ''}>${blk || `INVEST ${nf.toLocaleString('en-GB')}`}</button>
      ${f ? `<button class="btn" id="hCashOut" type="button">TAKE OUT ${cashValue(s).toLocaleString('en-GB')}</button>` : ''}</div>
      <p class="small fin-note">Taking out costs ${Math.round(100 * FUND.fee)}%. Holds up to ${L.fund.toLocaleString('en-GB')}.</p></div>`;
  }
  // The (i) sheets of the finance desk: the explanations that used to sit on the desk.
  financeSheet(s, k) {
    const L = FINANCE.levels[financeLevel(s) - 1], B = financeBio(s);
    const body = {
      market: `Crystals have one market price, the same for every pilot. It moves a little every day and night you fly. You always pay more than the market and get less. The gap is set by the WHOLE WORLD's nature (now ${B} / 100): the greener the world, the smaller the gap, and each desk level trims it. Trade as much as you like, whenever you like.`,
      fund: `Put seeds in (up to ${L ? L.fund.toLocaleString('en-GB') : 'a limit'}). The fund's price is the same for every pilot: it climbs along the dashed trend line, wobbling above and below it as you fly, and news days give it a jolt. Your seeds also grow a little faster when the world's nature is healthier. Taking money out costs ${Math.round(100 * FUND.fee)}%, so leave it in for a while: after ten flights it is almost always ahead, but taking it out soon, or in a dip, can lose seeds. The dotted line is the day you last put seeds in.`,
    }[k];
    if (body) showSheet({ eyebrow: 'NATURAL CAPITAL', title: { market: 'Buying and selling crystals', fund: 'The nature fund', bonds: 'Bonds' }[k], body });
  }
  // A small line chart for the finance desk (2026-11-13: 'stock graphs ... a legend and axes'): rows = [{ d, key: number }],
  // lines = [[key, class]] on one scale; the y axis shows the top and bottom values, the x axis '20 days ago' to 'now', a
  // legend under it when there is more than one line; markDay draws a dashed line. Pure SVG, no library.
  chartSVG(rows, lines, markDay = null) {
    if (!rows.length) return '';
    const W = 280, H = 96, L0 = 26, B0 = 12, vals = rows.flatMap(r => lines.map(([k]) => r[k]));
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
    const x = i => rows.length > 1 ? L0 + (W - L0 - 6) * i / (rows.length - 1) : (W + L0) / 2, y = v => 4 + (H - B0 - 8) * (1 - (v - lo) / (hi - lo));
    const path = k => rows.map((r, i) => `${x(i).toFixed(1)},${y(r[k]).toFixed(1)}`).join(' '), last = rows.length - 1;
    const mi = markDay == null ? -1 : rows.findIndex(r => r.d === markDay), fmt = v => Math.round(v);
    const names = { pay: 'You pay', market: 'Market', get: 'You get', fund: 'Fund', trend: 'Trend' };
    const axes = `<line class="fc-axis" x1="${L0}" y1="2" x2="${L0}" y2="${H - B0}"/><line class="fc-axis" x1="${L0}" y1="${H - B0}" x2="${W - 2}" y2="${H - B0}"/>
      <text class="fc-tick" x="${L0 - 3}" y="${y(hi - pad) + 3}" text-anchor="end">${fmt(hi - pad)}</text><text class="fc-tick" x="${L0 - 3}" y="${y(lo + pad) + 3}" text-anchor="end">${fmt(lo + pad)}</text>
      <text class="fc-tick" x="${L0}" y="${H - 2}">${rows.length} days ago</text><text class="fc-tick" x="${W - 2}" y="${H - 2}" text-anchor="end">now</text>`;
    const legend = lines.length > 1 ? `<div class="fc-legend">${lines.map(([, c]) => `<span class="fc-${c}"><i></i>${names[c]}</span>`).join('')}</div>` : '';
    return `<figure class="fin-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${lines.map(([, c]) => names[c]).join(', ')}, last ${rows.length} game days">${axes}${mi >= 0 ? `<line class="fc-mark" x1="${x(mi)}" x2="${x(mi)}" y1="2" y2="${H - B0}"/>` : ''}${lines.map(([k, c]) => `<polyline class="fc-${c}" points="${path(k)}"/><circle class="fc-${c}" cx="${x(last)}" cy="${y(rows[last][k])}" r="2.5"/>`).join('')}</svg>${legend}</figure>`;
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
      + (item.kind === 'fly' ? '' : this.levelBarHTML(s, item))
      + (bars.length ? statBarsHTML(bars) : `<p class="small">${tip('hangar-looks')}</p>`)
      + (item.kind !== 'fly' && item.open && !ok ? `<p class="small need">${needText(s, item)}</p>` : '') + `<div class="hp-buy">${info}${btn}</div></div>`;
  }

  // THE UPGRADE BAR (BLOCK2-PLAN item 4, DESIGN-UPGRADE-BAR.md part B): one segment per level of the tapped line, filled up to yours, then 'Now: what your level does' and 'Next: the name and effect of the next level'.
  // The words come from src/upgradetext.js upgradeCard (one table for the shop, the bar and the tests). A line whose card is unknown falls back to the old one-line effect text.
  levelBarHTML(s, item) {
    const c = upgradeCard(s, item.kind, item.id);
    if (!c) return `<p class="small hp-what">${effectText(item)}</p>`;
    const segs = Array.from({ length: c.count }, (_, i) => `<i class="${i < c.have ? 'on' : ''}"></i>`).join('');
    return `<div class="lvbar" role="img" aria-label="level ${c.have} of ${c.count}">${segs}</div>`
      + (showsNow(item.kind, item.id) ? `<p class="small hp-now">Now: ${c.now}</p>` : '') + `<p class="small hp-next">${c.next ? `Next: ${c.next}` : ALL_DONE}</p>`;
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

  // The hangar's sub-tabs; BANK (the finance desk) joins in the 2010s (2026-11-23: it used to sit under the SYSTEMS rows).
  tabList(s) { return [['plane', 'PLANE'], ['systems', 'SYSTEMS'], ['gadgets', 'GADGETS'], ...(financeOpen(s) ? [['bank', 'BANK']] : [])]; }
  // The sub-tabs (>= 40 px each), a dot on the ones with something new that are NOT the one showing (src/fresh.js).
  tabsHTML(s) {
    const d = dots(s, this.ui.freshOpts());
    if (this.tab === 'bank' && !financeOpen(s)) this.tab = 'plane';
    return `<div class="ftabs">${this.tabList(s).map(([k, n]) =>
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
      ;
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
      + `${tap}${rowIcon(id)}<span class="rowc-top"><span class="rowc-name">${name}</span><span class="rowc-pips">${pips}</span></span>`
      + `<span class="rowc-sub">${sub}</span>${next ? '</button>' : '</span>'}${price}</div>`;
  }

}
