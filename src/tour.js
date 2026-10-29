// "Tap here" tutorials, like proper games: the screen dims except one button, a finger points at
// it, a bubble says what to do, and nothing else can be tapped until you do it. Three tours:
//   name:   first time on the menu after flight school: choose a pilot name, then see the boards.
//   hangar: after the first real flight: seeds and crystals, the free upgrade, (i), NATURE, TAKE OFF.
//   new:    whenever an upgrade line opens that you have not been shown: HANGAR, its card, (i).
// Saves with seenTips ['*'] or tours ['*'] (automated tests) never see a tour. save.tours: tours done;
// save.shownLines: upgrade lines already pointed out.
import { tip } from './tips.js';
import { FEATURES } from './config.js';
import { revealed as s2Revealed } from './missions2.js';
// Tab-bar targets and what replaces them on the season 2 hub (the tiles; HOME goes back to the hub).
const HUB_TARGETS = {};   // (the bottom bar is back: tabs are real targets again)   // (HOME is the bar's #tabFly again)
import { writeSave } from './save.js';
import { LINES, unlocked, tabOf } from './upgrades.js';
import { getPilot } from './online.js';

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

export class Tour {
  constructor(ui) {
    this.ui = ui;
    this.save = ui.save;
    this.busy = false;
    const el = document.createElement('div');
    el.id = 'tour';
    el.hidden = true;
    // Four dark panels round a hole: they catch every tap that is not on the target.
    el.innerHTML = '<div class="tdim" data-d="t"></div><div class="tdim" data-d="b"></div><div class="tdim" data-d="l"></div><div class="tdim" data-d="r"></div>'
      + '<div class="tring"></div><div class="tfinger" hidden><i></i></div><div class="tbubble"><img class="tcaptain" src="assets/ui/captain-point.png" alt=""><div class="tbody"><p></p><button class="btn go" type="button">OK</button></div></div>';   // Captain Contrail points (the user, 2026-10-27)
    document.body.appendChild(el);
    this.el = el;
    el.querySelectorAll('.tdim').forEach(d => d.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.nudge(); }));
    // A drag or the wheel on the dim layer still SCROLLS the screen under it (taps stay blocked): the user's live report,
    // 2026-10-28, "I can't scroll down or click the bottom". The hole follows the target as it moves.
    const scroller = () => { let n = this.target; while (n && n !== document.body) { if (n.classList && n.classList.contains('overlay') && n.scrollHeight > n.clientHeight) return n; n = n.parentElement; } return null; };
    let lastY = null;
    el.querySelectorAll('.tdim, .tbubble').forEach(d => {   // (the bubble too: a finger often lands on it)
      d.addEventListener('touchstart', e => { lastY = e.touches[0].clientY; }, { passive: true });
      d.addEventListener('touchmove', e => { const sc = scroller(), y = e.touches[0].clientY; if (sc && lastY != null) { sc.scrollTop -= y - lastY; this.userScrollAt = Date.now(); this.place(); } lastY = y; e.preventDefault(); }, { passive: false });
      d.addEventListener('wheel', e => { const sc = scroller(); if (sc) { sc.scrollTop += e.deltaY; this.userScrollAt = Date.now(); this.place(); } e.preventDefault(); }, { passive: false });
    });
    window.addEventListener('resize', () => this.place());
    // Players from before tours existed: whatever is already open counts as shown.
    if (!this.save.shownLines) { this.save.shownLines = LINES.filter(l => unlocked(this.save, l)).map(l => l.id); if (this.save.flights > 1) this.markDone('hangar'); writeSave(this.save); }
  }

  off() { return this.save.seenTips.includes('*') || (this.save.tours || []).includes('*'); }   // '*': automated tests
  done(id) { return (this.save.tours || []).includes(id); }
  markDone(id) { this.save.tours = [...new Set([...(this.save.tours || []), id])]; writeSave(this.save); }

  // Called when the menu shows, and when the results have finished. Starts at most one tour.
  maybe(where) {
    if (this.busy || this.off() || !this.save.tutorialDone) return;
    if ($({ title: 'title', results: 'results', hangar: 'hangar', nature: 'nature' }[where] || 'results').hidden || !$('repriced').hidden) return;   // only on a screen that is showing: never in flight
    // Online is back (0.18.0): the name step comes with BOARDS, after the 3rd landing (season 1 and the preview: at once).
    if (where === 'title' && !this.done('name') && !getPilot() && (!FEATURES.season2 || window.CP_PREVIEW || (this.save.landings || 0) >= 3)) return this.run('name', this.nameSteps());
    if (where === 'results' && !FEATURES.season2 && !this.done('hangar') && (this.save.flights || 0) >= 1) return this.run('hangar', this.hangarSteps());
    // Season 2: the ON-RAILS onboarding (the user, 2026-10-27: "the ONLY thing they should be able to do is what you want
    // them to do"). Each step: one lit target (the dim layer catches every other tap), scrolled into view, one sentence.
    if (FEATURES.season2) { const r = this.railsFor(where); if (r) return this.run(r[0], r[1]); }
    if (where === 'title' && (this.done('name') || getPilot())) {
      // Several can open at once (3 at the 3rd landing): one walk-through for all of a hangar tab's.
      const fresh = LINES.filter(l => unlocked(this.save, l) && !this.save.shownLines.includes(l.id));
      if (fresh.length) return this.run(null, this.newSteps(fresh.filter(l => tabOf(l) === tabOf(fresh[0]))));
    }
  }

  // ---------- the rails (season 2; research/FLOW-FIRST-HOUR.md, the user-approved script R4-R13) ----------
  // Which rails step is due on this screen, from what has really happened (lessons done, the free part, flights), each
  // once (its tour id). Returns [id, steps] or null.
  railsFor(where) {
    const s = this.save, d = id => (s.missionsDone || []).includes(id), un = (s.unclaimed || []).length;
    const hub = where === 'title', res = where === 'results';
    // R4: the school-done card -> the hangar (the free part).
    if (res && s.freeUpgrade && !this.done('r-school')) return ['r-school', [{ target: '#againBtn', text: tip('rail-school'), tap: true }]];
    // R5: in the hangar, only the cleaner engines' FREE! (one target); R6's payoff comes from hangar.js after the buy.
    // R5 (the user via the plane build, 2026-10-28: "it's not obvious you can tap a row"): TAP the engines row to see them
    // (ghosted on the plane, the bars), THEN take them free from the preview card.
    if (where === 'hangar' && s.freeUpgrade && !this.done('r-free')) return ['r-free', [
      { target: '[data-ftap^="plane:"][data-ftap$=".engines"]', text: tip('rail-free-tap'), until: () => !!document.querySelector('[data-fline^="plane:"][data-fline$=".engines"].sel') && !!document.getElementById('hPreviewBuy') },
      { target: '#hPreviewBuy', text: tip('rail-free'), tap: true }]];
    // R7 in the hangar (the user: stay in the hangar after buying): its own TAKE OFF.
    if (where === 'hangar' && !s.freeUpgrade && s.freeGiven && !d('L1') && !this.done('r-takeoff1') && !(document.getElementById('payoff') && !document.getElementById('payoff').hidden)) /* (not under the payoff: its OK starts this step) */ return ['r-takeoff1', [{ target: '#hGoTop', text: tip('rail-takeoff-h'), tap: true }]];
    // R7: the hub, only TAKE OFF.
    if (hub && s.freeUpgrade) return ['r-hangar', [{ target: '#hubTiles [data-go="hangar"]', text: tip('rail-hangar'), tap: true }]];   // (every time: a reload with the part still waiting)
    if (hub && !s.freeUpgrade && !d('L1') && !this.done('r-takeoff1')) return ['r-takeoff1', [{ target: '#goBtn', text: tip('rail-takeoff'), tap: true }]];
    // R9: after flight 1: the seeds are yours; claim the mission's prize; another flight, watch for wildlife.
    if (res && d('L1') && !this.done('r-res1')) return ['r-res1', [
      { target: '#rGrab', text: tip('rail-seeds'), ok: true },
      ...(un ? [{ target: '#rRewards .claim', text: tip('rail-claim'), tap: true }] : []),
      { target: '#againBtn', text: tip('rail-wildlife'), tap: true }]];
    if (hub && d('L1') && !d('L2') && !this.done('r-takeoff2')) return ['r-takeoff2', [{ target: '#goBtn', text: tip('rail-takeoff2'), tap: true }]];
    // R11: after flight 2: NATURE opens; its first project is FREE; how nature works.
    // N0-N5, the NATURE introduction (the user approved, 2026-10-28): one idea per step, in the order a child asks - what is
    // this place, why animals, do this one thing, see the result - claim the prizes first, then open NATURE.
    if (res && d('L2') && !this.done('r-res2')) return ['r-res2', [
      { skipIf: () => !document.querySelector('#rRewards .btn.claim.all'), target: '#rRewards .btn.claim.all', text: tip('rail-claim-all'), tap: true },   // CLAIM ALL when there are several
      { skipIf: () => !!document.querySelector('#rRewards .btn.claim.all') || !document.querySelector('#rRewards .btn.claim'), target: '#rRewards .btn.claim', text: tip('rail-claim-all'), tap: true },
      { target: '#againBtn', text: tip('rail-nature'), tap: true }]];
    if (where === 'nature' && d('L2') && !this.done('r-nature')) return ['r-nature', [
      { target: '#wScene', text: tip('rail-nat-land'), ok: true },
      { target: '#wProjects .line.project.freeline .w-pname', text: tip('rail-nat-tap'), until: () => !!document.querySelector('#wProjects .line.project.previewing') },
      { target: '#wProjects [data-project].free', text: tip('rail-project'), tap: true },
      { target: '#wMeter', text: tip('rail-nat-bio'), ok: true },
      { target: '#tabFly', text: tip('rail-nat-home'), tap: true }]];
    // R12: a landing past an airport: the bonus payoff.
    if (res && d('L4') && !this.done('r-bonus')) return ['r-bonus', [{ target: '#rMultRow', text: tip('rail-bonus'), ok: true }]];
    // R13: once lesson L3 is done: the hangar's SYSTEMS.
    if (hub && d('L3') && !this.done('r-systems')) return ['r-systems', [
      { target: '#tabHangar', text: tip('rail-systems'), tap: true },
      { target: '#hFleet [data-ftab="systems"]', text: tip('rail-systems-tab'), tap: true },
      { target: '#hFleet .line .next', text: tip('rail-systems-line'), ok: true }]];
    // L5 needs tree parcels (free the first time): on NATURE, point at the FREE button (the audit, 2026-10-28).
    if (where === 'nature' && d('L4') && !d('L5') && !((s.levels || {}).trees > 0) && !this.done('r-parcels')) return ['r-parcels', [{ target: '#wTrees [data-buy="trees"]', text: tip('rail-parcels'), tap: true }]];
    // R14: MY RECORDS (src/recordsui.js) once BOARDS is revealed (landing 3): one target, the BOARDS tab (Coordinator, 2026-10-28).
    if (hub && s2Revealed(s, 'boards') && !this.done('r-boards')) return ['r-boards', [{ target: '#tabBoards', text: tip('rail-boards'), tap: true }]];
    return null;
  }

  // ---------- the tours ----------
  nameSteps() {
    return [
      { target: '#tabPilot', text: tip('tour-hello'), tap: true },
      { target: '#pFirst', text: tip('tour-first'), until: () => /^[A-Za-z]{2,12}$/.test($('pFirst').value), focus: true },
      { target: '#pWords', text: tip('tour-word'), until: () => !!(this.ui.pilot && this.ui.pilot.draft.word) },
      { target: '#pSave', text: tip('tour-save'), tap: true },
      { target: '#pName', text: tip('tour-saving'), until: () => !!getPilot() || /internet|different/.test($('pMsg').textContent), wait: true },
      { skipIf: () => !!getPilot() || !/different/.test($('pMsg').textContent), target: '#pEdit', text: tip('tour-retry'), until: () => !!getPilot() || /internet/.test($('pMsg').textContent) },
      { skipIf: () => !!getPilot(), target: '#pMsg', text: tip('tour-offline'), ok: true, end: true },
      { target: '#tabBoards', text: tip('tour-boards'), tap: true },
      { target: '#bList', text: tip('tour-best'), ok: true },
      { target: '#tabFly', text: tip('tour-fly'), tap: true },
    ];
  }

  hubHangarSteps() {
    return [
      { skipIf: () => !$('hangar').hidden, target: '#hubTiles [data-go="hangar"]', text: tip('tour-hangar'), tap: true },   // already inside (OPEN THE HANGAR)
      { area: '#hFleet', target: '#hFleet .btn.free', text: tip('tour-free'), tap: true, scroll: true },   // scrolled into view: the bubble was cut off at the top
      { target: '#tabFly', text: tip('tour-home'), tap: true },
    ];
  }

  hangarSteps() {
    const free = () => !!this.save.freeUpgrade;
    return [
      { target: '#tabHangar', text: tip('tour-hangar'), tap: true },
      { target: '.treebank', text: tip('tour-bank'), ok: true },
      { target: '#hFleet .ftimeline', text: tip('tour-eras'), ok: true },
      { target: '#hFleet .ftabs', text: tip('tour-tabs'), ok: true },
      { skipIf: () => !free(), area: '#hFleet', target: '#hFleet .btn.free', text: tip('tour-free'), tap: true },
      { target: '#tabNature', text: tip('tour-nature'), tap: true },
      { target: '#wProjects', text: tip('tour-projects'), ok: true },
      { target: '#tabFly', text: tip('tour-fly'), tap: true },
    ];
  }

  newSteps(lines) {
    const line = lines[0], tab = tabOf(line), card = `${tab === 'nature' ? '#wTrees' : '#hUpgrades'} [data-info="${line.id}"]`;
    const names = lines.map(l => `<b>${l.name}</b>`), list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    return [
      { target: tab === 'nature' ? '#tabNature' : '#tabHangar', text: tip('tour-new', tab === 'nature' ? 'NATURE' : 'HANGAR'), tap: true },
      { target: card, text: tip('tour-newline', list), tap: true, scroll: true },
      { target: '#iClose', text: tip('tour-ok'), tap: true, after: () => { this.save.shownLines.push(...lines.map(l => l.id)); writeSave(this.save); } },
    ];
  }

  // ---------- running a tour ----------
  async run(id, steps) {
    this.busy = true;
    this.el.hidden = false;
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i];
      if (st.skipIf && st.skipIf()) continue;
      if (!await this.step(st)) { id = null; break; }   // its button is gone (e.g. a flight started): stop; it runs again next time
      if (st.after) st.after();
      if (st.end) break;
    }
    this.el.hidden = true;
    this.target = null;
    if (id) this.markDone(id);
    this.busy = false;
    // Then whatever screen is showing NOW may have its own step (a rails tap often opens the next screen while this tour
    // is still finishing: the hangar's step was lost that way).
    setTimeout(() => this.maybe(['title', 'results', 'hangar', 'nature'].find(id => !$(id).hidden) || 'title'), 300);
  }

  async step(st) {
    let t = null;
    // Screens render as they open, so a target may appear a moment late: wait up to 300 ms for it to EXIST in the page.
    // If it never exists, give up at once (the audit, 2026-10-27: the dim layer caught every tap for 4 s, which felt frozen
    // on a phone); if it exists but is still hidden, wait up to 4 s for it to show, as before.
    const sel = st.area || st.target, inDom = () => !!document.querySelector(FEATURES.season2 ? HUB_TARGETS[sel] || sel : sel);
    for (let i = 0; i < 3 && !inDom(); i++) await sleep(100);
    if (!inDom()) return false;   // nothing to point at: never trap the player
    for (let i = 0; i < 40 && !(t = this.find(sel)); i++) await sleep(100);
    if (!t) return false;
    // The target fully on screen first, always (the user's screenshot: the hangar opened half-way down, the target off-screen).
    const vr = t.getBoundingClientRect();
    if (st.scroll || vr.top < 0 || vr.bottom > innerHeight) { t.scrollIntoView({ block: 'center' }); await sleep(300); }
    this.target = t; this.side = null;   // (a new step decides its bubble's side afresh)
    this.keepVisible();
    this.el.querySelector('.tbubble p').innerHTML = st.text;
    const ok = this.el.querySelector('.tbubble .btn');
    ok.hidden = !st.ok;
    this.el.classList.toggle('waiting', !!st.wait);
    this.place();
    if (st.focus) setTimeout(() => t.focus(), 50);
    await new Promise(resolve => {
      const finish = () => { clearInterval(poll); document.removeEventListener('click', onTap, true); ok.onclick = null; resolve(); };
      // A tap on the target (with `area`, on ANY element matching `target` inside the hole). Let the button do its job first.
      const want = FEATURES.season2 ? HUB_TARGETS[st.target] || st.target : st.target;
      const onTap = e => { if (e.target.closest && e.target.closest(want)) setTimeout(finish, 0); };
      if (st.tap) document.addEventListener('click', onTap, true);
      if (st.ok) ok.onclick = finish;
      const poll = setInterval(() => { if (Date.now() - (this.userScrollAt || 0) > 1500) this.keepVisible(); this.place(); if (st.until && st.until()) finish(); }, 150);
    });
    await sleep(150);
    return true;
  }

  find(sel) {
    if (FEATURES.season2) sel = HUB_TARGETS[sel] || sel;   // season 2 has no tab bar: the hub's tiles and HOME button (S2)
    const all = [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null);
    return all[0] || null;
  }

  // The target stays in the VISIBLE band: below the top, above the bottom tab bar (the user's live report, 2026-10-28: R9b's
  // CLAIM sat behind the bar on their phone, the rails blocked scrolling, they were stuck). Scrolls its screen if needed.
  keepVisible() {
    const t = this.target; if (!t) return;
    let sc = t.parentElement; while (sc && sc !== document.body && !(sc.classList.contains('overlay') && sc.scrollHeight > sc.clientHeight)) sc = sc.parentElement;
    if (!sc || sc === document.body) return;
    const bar = document.querySelector('.tabbar:not([hidden])'), barTop = bar && !bar.contains(t) ? bar.getBoundingClientRect().top : innerHeight;
    const r = t.getBoundingClientRect(), bottom = barTop - 12, top = 12;
    if (r.bottom > bottom) sc.scrollTop += Math.min(r.bottom - bottom, r.top - top);
    else if (r.top < top) sc.scrollTop -= top - r.top;
    else {   // in the band but COVERED (a pinned header, e.g. NATURE's scene: content scrolls under it): bring it to the middle
      const r2 = t.getBoundingClientRect(), top1 = document.elementsFromPoint(r2.left + r2.width / 2, r2.top + r2.height / 2).find(e => !e.closest('#tour'));
      if (top1 && top1 !== t && !t.contains(top1)) sc.scrollTop += r2.top + r2.height / 2 - (top + bottom) / 2;
    }
  }

  // Put the hole, ring, finger and bubble round the target.
  place() {
    if (!this.target || this.el.hidden) return;
    const r = this.target.getBoundingClientRect(), W = innerWidth, H = innerHeight, pad = 4;
    const bar = document.querySelector('.tabbar:not([hidden])'), barTop = bar && !bar.contains(this.target) ? bar.getBoundingClientRect().top : H;   // a target sliding behind the tab bar must not open a hole onto its tabs
    const x0 = Math.max(0, r.left - pad), y0 = Math.max(0, Math.min(r.top - pad, barTop - 8)), x1 = Math.min(W, r.right + pad), y1 = Math.min(H, barTop, r.bottom + pad);
    const set = (el, s) => Object.assign(el.style, s);
    const d = k => this.el.querySelector(`[data-d="${k}"]`);
    set(d('t'), { left: '0', top: '0', width: `${W}px`, height: `${y0}px` });
    set(d('b'), { left: '0', top: `${y1}px`, width: `${W}px`, height: `${H - y1}px` });
    set(d('l'), { left: '0', top: `${y0}px`, width: `${x0}px`, height: `${y1 - y0}px` });
    set(d('r'), { left: `${x1}px`, top: `${y0}px`, width: `${W - x1}px`, height: `${y1 - y0}px` });
    set(this.el.querySelector('.tring'), { left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
    // The bubble (Captain Contrail + the sentence) goes on the side with more room, then is CLAMPED inside the screen and
    // kept off the target (the user's screenshot, 2026-10-27: the bubble's text was cut off above the page).
    // Measured WITHOUT the target's pulse (a transform: scale), and the side is decided ONCE per step: the user's live bug,
    // 2026-10-28, the bubble jumped above/below the pulsing FREE button as its box grew and shrank.
    const cy = r.top + r.height / 2, hh = (this.target.offsetHeight || r.height) / 2;
    const u0 = Math.max(0, cy - hh - pad), u1 = Math.min(H, barTop, cy + hh + pad), b = this.el.querySelector('.tbubble');
    set(b, { top: '0px', bottom: 'auto' });
    const bh = b.getBoundingClientRect().height, gap = 10;
    if (this.side == null) {
      let below = cy < H / 2;
      const t0 = below ? u1 + gap : u0 - gap - bh;
      if (t0 < 4 || t0 + bh > H - 4) below = !below;   // no room on that side: the other side (decided once)
      this.side = below ? 'below' : 'above';
    }
    let top = this.side === 'below' ? u1 + gap : u0 - gap - bh;
    top = Math.max(4, Math.min(H - 4 - bh, top));
    set(b, { top: `${top}px` });
    // The captain points AT the target: mirrored when the target is to the left of the bubble's middle.
    const cap = this.el.querySelector('.tcaptain'), br = b.getBoundingClientRect();
    cap.classList.toggle('left', (x0 + x1) / 2 < br.left + br.width / 2);
  }

  nudge() { const b = this.el.querySelector('.tbubble'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
}
