// "Tap here" tutorials, like proper games: the screen dims except one button, a finger points at
// it, a bubble says what to do, and nothing else can be tapped until you do it. Three tours:
//   name:   first time on the menu after flight school: choose a pilot name, then see the boards.
//   hangar: after the first real flight: seeds and crystals, the free upgrade, (i), NATURE, TAKE OFF.
//   new:    whenever an upgrade line opens that you have not been shown: HANGAR, its card, (i).
// Saves with seenTips ['*'] or tours ['*'] (automated tests) never see a tour. save.tours: tours done;
// save.shownLines: upgrade lines already pointed out.
import { tip } from './tips.js';
import { FEATURES } from './config.js';
import { revealed as s2Revealed, lessonsLeft as s2LessonsLeft } from './missions2.js';
import { SUBJECTS } from './railsubjects.js';
// Tab-bar targets and what replaces them on the season 2 hub (nothing: since R3 the tiles are gone and the bar's tabs are the targets; HOME goes back to the hub).
const HUB_TARGETS = {};   // (the bottom bar is back: tabs are real targets again)   // (HOME is the bar's #tabFly again)
import { writeSave } from './save.js';
import { LINES, unlocked, tabOf } from './upgrades.js';
import { getPilot, namesOpen } from './online.js';
// Rails rule (the user's playtest, 2026-10-29): a step that taps a bottom-bar tab must DECLARE whether the screen it opens has
// something to act on (ready); run() stops before such a step when it is false. tests/tourready.cjs checks every tab step declares it.
const always = () => true;

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
    el.innerHTML = '<svg class="tvis" aria-hidden="true"><path fill-rule="evenodd"></path></svg><div class="tsubjs"></div><div class="tdim" data-d="t"></div><div class="tdim" data-d="b"></div><div class="tdim" data-d="l"></div><div class="tdim" data-d="r"></div>'
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
  // The rails' first payoff happens in the page (stage 2), so the rest of the hangar stays live: on the rails, one step
  // rings OK and dims the rest, so a child sees ONE thing to tap (the one-target rule; onrails R6).
  payoffOk() { if (this.busy || this.done('r-payoff') || !document.getElementById('payOk')) return; this.run('r-payoff', [{ target: '#payOk', text: tip('rail-payoff-ok'), tap: true }]); }

  // ONE ANNOUNCEMENT PER LANDING (the user, 2026-11-06: nature, pilot, boards and the new lines all arrived at the 3rd landing). The queued announcements (the hangar's new lines, the name,
  // the map, the records tour) each wait for a landing nobody has been told something at: save.tourToday = the landing number one of them last ran at. The lesson rails are not queued.
  slot() { return (this.save.tourToday || 0) < (this.save.landings || 0); }
  stamp() { this.save.tourToday = this.save.landings || 0; writeSave(this.save); }
  nameDue() { return FEATURES.season2 && !window.CP_PREVIEW && !this.done('name') && !getPilot() && namesOpen() && (this.save.landings || 0) >= 5 && this.slot(); }

  maybe(where) {
    if (this.busy || this.off() || !this.save.tutorialDone) return;
    if ($({ title: 'title', results: 'results', hangar: 'hangar', nature: 'nature' }[where] || 'results').hidden || !$('repriced').hidden) return;   // only on a screen that is showing: never in flight
    // Season 1 and the preview: the name step at once. Season 2 (online is back, 0.20.0): it comes with BOARDS after the 3rd landing, and only when no
    // rails step is due (below), so it never cuts across the hangar rails.
    const s2name = FEATURES.season2 && !window.CP_PREVIEW, wantName = !this.done('name') && !getPilot() && namesOpen();
    if (where === 'title' && wantName && !s2name) return this.run('name', this.nameSteps());
    if (where === 'results' && !FEATURES.season2 && !this.done('hangar') && (this.save.flights || 0) >= 1) return this.run('hangar', this.hangarSteps());
    // Season 2: the ON-RAILS onboarding (the user, 2026-10-27: "the ONLY thing they should be able to do is what you want
    // them to do"). Each step: one lit target (the dim layer catches every other tap), scrolled into view, one sentence.
    if (FEATURES.season2) { const r = this.railsFor(where); if (r) { if (r[0] === 'r-map' || r[0] === 'r-boards') this.stamp(); return this.run(r[0], r[1]); } }
    const nameDue = s2name && wantName && this.nameDue();
    if (where === 'title' && nameDue) { this.stamp(); return this.run('name', this.nameSteps()); }
    if (where === 'title' && (this.done('name') || getPilot() || (s2name && !nameDue))) {
      // Several can open at once (3 at the 3rd landing): one walk-through for all of a hangar tab's.
      const fresh = LINES.filter(l => unlocked(this.save, l) && !this.save.shownLines.includes(l.id));
      if (fresh.length && (!s2name || ((this.save.landings || 0) >= 4 && this.slot()))) { if (s2name) this.stamp(); return this.run(null, this.newSteps(fresh.filter(l => tabOf(l) === tabOf(fresh[0])))); }
    }
  }

  // ---------- the rails (season 2; research/FLOW-FIRST-HOUR.md, the user-approved script R4-R13) ----------
  // Which rails step is due on this screen, from what has really happened (lessons done, the free part, flights), each
  // once (its tour id). Returns [id, steps] or null.
  railsFor(where) {
    const s = this.save, d = id => (s.missionsDone || []).includes(id);
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
    if (hub && s.freeUpgrade) return ['r-hangar', [{ target: '#tabHangar', text: tip('rail-hangar'), tap: true, ready: always }]];   // (R3: the tiles are gone: the bar's HANGAR tab)   // (every time: a reload with the part still waiting)
    if (hub && !s.freeUpgrade && !d('L1') && !this.done('r-takeoff1')) return ['r-takeoff1', [{ target: '#goBtn', text: tip('rail-takeoff'), tap: true }]];
    // R9: after flight 1: the seeds are yours; claim the mission's prize; another flight, watch for wildlife.
    if (res && d('L1') && !this.done('r-res1')) return ['r-res1', [
      { target: '#rBank', text: tip(this.ui.lastGrab > 0 ? 'rail-seeds' : 'rail-seeds-none'), ok: true },   // (playtest 2026-10-29: 0 seeds read 'your seeds')
      { skipIf: () => { const m = document.getElementById('rMission'); return !m || m.hidden; }, target: '#rMission', text: tip('rail-mission'), ok: true },   // R1/R8: the prize is paid already (at the bank); the line says so
      { target: '#againBtn', text: tip('rail-wildlife'), tap: true }]];
    if (hub && d('L1') && !d('L2') && !this.done('r-takeoff2')) return ['r-takeoff2', [{ target: '#goBtn', text: tip('rail-takeoff2'), tap: true }]];
    // R11: after flight 2: NATURE opens; its first project is FREE; how nature works.
    // N0-N5, the NATURE introduction (the user approved, 2026-10-28): one idea per step, in the order a child asks - what is
    // this place, why animals, do this one thing, see the result - claim the prizes first, then open NATURE.
    if (res && d('L2') && !this.done('r-res2')) return ['r-res2', [
      { target: '#againBtn', text: tip('rail-nature'), tap: true }]];
    if (where === 'nature' && d('L2') && !this.done('r-nature')) return ['r-nature', [
      { target: '#wScene', text: tip('rail-nat-land'), ok: true },
      { target: '#wProjects .project.freeline .rowc-tap', text: tip('rail-nat-tap'), until: () => !!document.querySelector('#wProjects .project.previewing') },
      { target: '#wProjects [data-project].free', text: tip('rail-project'), tap: true },
      { target: '#wMeter', text: tip('rail-nat-bio'), ok: true },
      { target: '#tabFly', text: tip('rail-nat-home'), tap: true, ready: always }]];
    // R12: a landing past an airport: the bonus payoff.
    if (res && d('L4') && !this.done('r-bonus')) return ['r-bonus', [{ target: '#rMaths', text: tip('rail-bonus'), ok: true }]];
    // R13: once lesson L3 is done: the hangar's SYSTEMS.
    if (hub && d('L3') && !this.done('r-systems')) return ['r-systems', [
      { target: '#tabHangar', text: tip('rail-systems'), tap: true, ready: always },
      { target: '#hFleet [data-ftab="systems"]', text: tip('rail-systems-tab'), tap: true },
      { target: '#hFleet .rowc .rowc-sub', text: tip('rail-systems-line'), ok: true }]];
    // L5 needs tree parcels (free the first time): on NATURE, point at the FREE button (the audit, 2026-10-28).
    if (where === 'nature' && d('L4') && !d('L5') && !((s.levels || {}).trees > 0) && !this.done('r-parcels')) return ['r-parcels', [{ target: '#wTrees [data-buy="trees"]', text: tip('rail-parcels'), tap: true }]];
    // R14: MY RECORDS (src/recordsui.js) once BOARDS is revealed (landing 3): one target, the BOARDS tab (Coordinator, 2026-10-28).
    // R-map (the user, 2026-11-06: nothing told them the globe is a map): once the world is revealed (L4) and NO LESSON LEAD is on HOME (the bubble would hide the very row the player must tap: the free tree at L5), from landing 5, one OK step on the globe; the NAME comes first if it is due.
    if (hub && s2Revealed(s, 'world') && (s.landings || 0) >= 5 && !s2LessonsLeft(s).length && !s.freeUpgrade && this.slot() && !this.nameDue() && !this.done('r-map')) return ['r-map', [{ target: '#hubGlobe', text: tip('rail-map'), ok: true }]];
    if (hub && s2Revealed(s, 'boards') && (s.landings || 0) >= 6 && this.slot() && !this.done('r-boards')) return ['r-boards', [{ target: '#tabBoards', text: tip('rail-boards'), tap: true, ready: always }]];
    return null;
  }

  // ---------- the tours ----------
  nameSteps() {
    return [
      { target: '#tabPilot', text: tip('tour-hello'), tap: true, ready: namesOpen },
      { target: '#pFirst', text: tip('tour-first'), until: () => /^[A-Za-z]{2,12}$/.test($('pFirst').value), focus: true },
      { target: '#pWords', text: tip('tour-word'), until: () => !!(this.ui.pilot && this.ui.pilot.draft.word) },
      { target: '#pSave', text: tip('tour-save'), tap: true },
      { target: '#pName', text: tip('tour-saving'), until: () => !!getPilot() || /internet|different/.test($('pMsg').textContent), wait: true },
      { skipIf: () => !!getPilot() || !/different/.test($('pMsg').textContent), target: '#pEdit', text: tip('tour-retry'), until: () => !!getPilot() || /internet/.test($('pMsg').textContent) },
      { skipIf: () => !!getPilot(), target: '#pMsg', text: tip('tour-offline'), ok: true, end: true },
      { target: '#tabBoards', text: tip('tour-boards'), tap: true, ready: always },
      { target: '#bList', text: tip('tour-best'), ok: true },
      { target: '#tabFly', text: tip('tour-fly'), tap: true, ready: always },
    ];
  }

  hubHangarSteps() {
    return [
      { skipIf: () => !$('hangar').hidden, target: '#tabHangar', text: tip('tour-hangar'), tap: true, ready: always },   // already inside (OPEN THE HANGAR)
      { area: '#hFleet', target: '#hFleet .btn.free', text: tip('tour-free'), tap: true, scroll: true },   // scrolled into view: the bubble was cut off at the top
      { target: '#tabFly', text: tip('tour-home'), tap: true, ready: always },
    ];
  }

  hangarSteps() {
    const free = () => !!this.save.freeUpgrade;
    return [
      { target: '#tabHangar', text: tip('tour-hangar'), tap: true, ready: always },
      { target: '.treebank', text: tip('tour-bank'), ok: true },
      { target: '#hFleet .ftimeline', text: tip('tour-eras'), ok: true },
      { target: '#hFleet .ftabs', text: tip('tour-tabs'), ok: true },
      { skipIf: () => !free(), area: '#hFleet', target: '#hFleet .btn.free', text: tip('tour-free'), tap: true },
      { target: '#tabNature', text: tip('tour-nature'), tap: true, ready: always },
      { target: '#wProjects', text: tip('tour-projects'), ok: true },
      { target: '#tabFly', text: tip('tour-fly'), tap: true, ready: always },
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
    const kid = id || 'new';
    this.busy = true;
    this.el.hidden = false;
    for (let i = 0; i < steps.length; i++) {
      const st = steps[i]; st.key = st.key || `${kid}#${i + 1}`;   // (the key the subject is declared under: src/railsubjects.js)
      if (st.skipIf && st.skipIf()) continue;
      if (st.ready && !st.ready()) { id = null; break; }   // its target screen has nothing to act on: do not start (it runs again later)
      if (!await this.step(st)) { id = null; break; }   // its button is gone (e.g. a flight started): stop; it runs again next time
      if (st.after) st.after();
      if (st.end) break;
    }
    this.el.hidden = true;
    this.target = null; this.clearSpot();
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
    if (!inDom()) { (window.__tourGaveUp = window.__tourGaveUp || []).push(sel); return false; }   // nothing to point at: never trap the player (recorded: tests fail on a target that should exist but never does)
    for (let i = 0; i < 40 && !(t = this.find(sel)); i++) await sleep(100);
    if (!t) { (window.__tourGaveUp = window.__tourGaveUp || []).push(`${sel} (never shown)`); return false; }
    // The target fully on screen first, always (the user's screenshot: the hangar opened half-way down, the target off-screen).
    const vr = t.getBoundingClientRect();
    if (st.scroll || vr.top < 0 || vr.bottom > innerHeight) { t.scrollIntoView({ block: 'center' }); await sleep(300); }
    this.target = t; this.side = null; this.curStep = st;   // (a new step decides its bubble's side afresh)
    // One action per step (the one-target audit): a row's own price/BUY sits inside the row's tap area (.rowc-price is
    // absolute over .rowc-tap), so while the step points at the row's tap, that price hides (DESIGN-HANGAR-NATURE).
    const solo = t.classList && t.classList.contains('rowc-tap') && t.closest('.rowc'); if (solo) solo.classList.add('tour-only');
    const soloP = t.classList && t.classList.contains('rowc-price') && t.closest('.rowc'); if (soloP) soloP.classList.add('tour-price');   // the mirror: a step on a row's PRICE (FREE!) makes the row's own tap area inert, so the lit hole has ONE tappable thing (onrails320 N3)
    const soloI = t.classList && t.classList.contains('rowc-info') && t.closest('.rowc'); if (soloI) soloI.classList.add('tour-info');   // R6: a step on a row's (i) makes that row's tap area and price inert (one target)
    if (st.ok && !st.tap) t.classList.add('tour-inert');   // an OK step points at something to READ: if it is a button (R1: the results lines) it must not also be tappable (the one-target rule)
    this.keepVisible();
    this.el.querySelector('.tbubble p').innerHTML = st.text;
    const ok = this.el.querySelector('.tbubble .btn');
    ok.hidden = !st.ok;
    this.el.classList.toggle('waiting', !!st.wait);
    this.place();
    if (st.focus) setTimeout(() => t.focus(), 50);
    await new Promise(resolve => {
      const finish = () => { clearInterval(poll); document.removeEventListener('click', onTap, true); ok.onclick = null; document.querySelectorAll('.rowc.tour-only').forEach(r => r.classList.remove('tour-only')); document.querySelectorAll('.rowc.tour-price').forEach(r => r.classList.remove('tour-price')); document.querySelectorAll('.rowc.tour-info').forEach(r => r.classList.remove('tour-info')); document.querySelectorAll('.tour-inert').forEach(r => r.classList.remove('tour-inert')); resolve(); };
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
    if (FEATURES.season2) sel = HUB_TARGETS[sel] || sel;   // (the bar is back on the hub: no remapping needed)
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
      if (top1 && top1 !== t && !t.contains(top1)) {
        // The target must end up BELOW what covers it (a pinned block: NATURE's land, the hangar dock), not merely at the middle of the screen: on a
        // 568 px phone the pinned block's bottom (~258) is past the middle (254), so "the middle" left the FREE! button under it (onrails320, N3-N5).
        // DIAGNOSED BY READING, NOT YET REPRODUCED (the browser turn proves it, 2026-11-03). A cover that is not above the target keeps the old aim.
        const pin = top1.closest('.wpin, .hp-dock') || top1, cr = pin.getBoundingClientRect(), floor = cr.top <= r2.top + 1 ? Math.max(top, cr.bottom + 8) : top;
        sc.scrollTop += r2.top + r2.height / 2 - (floor + bottom) / 2;
      }
    }
  }

  // The SUBJECT elements of the current step (src/railsubjects.js): visible ones only, never inside the tour itself.
  subjectEls() {
    const st = this.curStep; if (!st || !this.target) return [];
    const spec = 'subject' in st ? st.subject : SUBJECTS[st.key], list = spec == null ? [] : [].concat(spec), out = [];
    for (const sel of list) {
      const el = sel[0] === '^' ? this.target.closest(sel.slice(1)) : [...document.querySelectorAll(sel)].find(e => !e.closest('#tour') && e.getClientRects().length && e.offsetParent !== null);
      if (el && el !== this.target && !el.contains(this.target) && !out.includes(el)) out.push(el);
      else if (el && el.contains(this.target) && sel[0] === '^') out.push(el);   // the target's own row: the row is the subject (the row contains the target button)
    }
    return out;
  }
  clearSpot() { this.curStep = null; const s = this.el && this.el.querySelector('.tsubjs'); if (s) s.innerHTML = ''; const p = this.el && this.el.querySelector('.tvis path'); if (p) p.setAttribute('d', ''); const b = this.el && this.el.querySelector('.tbubble'); if (b) b.classList.remove('compact'); }
  // For the tests (tests/lib/spotlight.js): what is lit, where the bubble is.
  spot() {
    const r = e => { if (!e) return null; const x = e.getBoundingClientRect(); return { left: x.left, top: x.top, right: x.right, bottom: x.bottom }; };
    const st = this.curStep, spec = st ? ('subject' in st ? st.subject : SUBJECTS[st.key]) : null;
    return { key: st && st.key, declared: spec != null, target: r(this.target), subjects: this.subjectEls().map(r), holes: this.holes || [], bubble: r(this.el.querySelector('.tbubble')), compact: this.el.querySelector('.tbubble').classList.contains('compact'),
      bar: r(document.querySelector('.tabbar:not([hidden])')), W: innerWidth, H: innerHeight };
  }

  // Put the hole, ring, finger and bubble round the target.
  place() {
    if (!this.target || this.el.hidden) return;
    const r = this.target.getBoundingClientRect(), W = innerWidth, H = innerHeight, pad = this.target.closest('.tabbar') ? 1 : 4;   // (the bar's tabs are 2 px apart with 6 showing: a 4 px hole would open onto the next tab)
    const bar = document.querySelector('.tabbar:not([hidden])'), barTop = bar && !bar.contains(this.target) ? bar.getBoundingClientRect().top : H;   // a target sliding behind the tab bar must not open a hole onto its tabs
    const x0 = Math.max(0, r.left - pad), y0 = Math.max(0, Math.min(r.top - pad, barTop - 8)), x1 = Math.min(W, r.right + pad), y1 = Math.min(H, barTop, r.bottom + pad);
    const set = (el, s) => Object.assign(el.style, s);
    const d = k => this.el.querySelector(`[data-d="${k}"]`);
    set(d('t'), { left: '0', top: '0', width: `${W}px`, height: `${y0}px` });
    set(d('b'), { left: '0', top: `${y1}px`, width: `${W}px`, height: `${H - y1}px` });
    set(d('l'), { left: '0', top: `${y0}px`, width: `${x0}px`, height: `${y1 - y0}px` });
    set(d('r'), { left: `${x1}px`, top: `${y0}px`, width: `${W - x1}px`, height: `${y1 - y0}px` });
    set(this.el.querySelector('.tring'), { left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
    // The SUBJECT (src/railsubjects.js): lit too (a second, third ... hole in the visual dim), framed, NOT tappable (the four panels above still catch every tap that is not on the target).
    const subs = this.subjectEls(), holes = [{ x0, y0, x1, y1 }];
    for (const el of subs) { const q = el.getBoundingClientRect(), hx0 = Math.max(0, q.left - 4), hx1 = Math.min(W, q.right + 4), hy0 = Math.max(0, q.top - 4), hy1 = Math.min(barTop, q.bottom + 4); if (hx1 > hx0 && hy1 > hy0) holes.push({ x0: hx0, y0: hy0, x1: hx1, y1: hy1, subject: true }); }
    this.holes = holes;
    const vis = this.el.querySelector('.tvis'); vis.setAttribute('viewBox', `0 0 ${W} ${H}`);
    vis.querySelector('path').setAttribute('d', `M0 0H${W}V${H}H0Z` + holes.map(h => `M${h.x0} ${h.y0}H${h.x1}V${h.y1}H${h.x0}Z`).join(''));
    this.el.querySelector('.tsubjs').innerHTML = holes.filter(h => h.subject).map(h => `<i class="tsubj" style="left:${h.x0}px;top:${h.y0}px;width:${h.x1 - h.x0}px;height:${h.y1 - h.y0}px"></i>`).join('');
    // The bubble (Captain Contrail + the sentence) goes on the side with more room, then is CLAMPED inside the screen and
    // kept off the target (the user's screenshot, 2026-10-27: the bubble's text was cut off above the page).
    // Measured WITHOUT the target's pulse (a transform: scale), and the side is decided ONCE per step: the user's live bug,
    // 2026-10-28, the bubble jumped above/below the pulsing FREE button as its box grew and shrank.
    const cy = r.top + r.height / 2, hh = (this.target.offsetHeight || r.height) / 2;
    const u0 = Math.max(0, cy - hh - pad), u1 = Math.min(H, barTop, cy + hh + pad), b = this.el.querySelector('.tbubble');
    set(b, { top: '0px', bottom: 'auto' });
    const bh = b.getBoundingClientRect().height, gap = 10;
    if (subs.length) {   // a step with a SUBJECT: the bubble goes above ALL the lit holes or below ALL of them, compact (no Captain) if neither side has room, and covers none of them
      const lo = Math.min(...holes.map(h => h.y0)), hi = Math.max(...holes.map(h => h.y1)), roomA = lo - gap - 4, roomB = barTop - 4 - (hi + gap);
      b.classList.remove('compact');
      if (this.side == null) this.side = roomA >= bh && roomB >= bh ? (cy < H / 2 ? 'below' : 'above') : roomB >= bh ? 'below' : roomA >= bh ? 'above' : (roomB >= roomA ? 'below' : 'above');
      let h2 = bh; if ((this.side === 'below' ? roomB : roomA) < bh) { b.classList.add('compact'); h2 = b.getBoundingClientRect().height; }
      const tt = this.side === 'below' ? hi + gap : lo - gap - h2;
      set(b, { top: `${Math.max(4, Math.min(H - 4 - h2, tt))}px` });
      const cap2 = this.el.querySelector('.tcaptain'), br2 = b.getBoundingClientRect(); cap2.classList.toggle('left', (x0 + x1) / 2 < br2.left + br2.width / 2);
      return;
    }
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
