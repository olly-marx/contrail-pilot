// "Tap here" tutorials, like proper games: the screen dims except one button, a finger points at
// it, a bubble says what to do, and nothing else can be tapped until you do it. Three tours:
//   name:   first time on the menu after flight school: choose a pilot name, then see the boards.
//   hangar: after the first real flight: seeds and crystals, the free upgrade, (i), NATURE, TAKE OFF.
//   new:    whenever an upgrade line opens that you have not been shown: HANGAR, its card, (i).
// Saves with seenTips ['*'] or tours ['*'] (automated tests) never see a tour. save.tours: tours done;
// save.shownLines: upgrade lines already pointed out.
import { tip } from './tips.js';
import { FEATURES } from './config.js';
// Tab-bar targets and what replaces them on the season 2 hub (the tiles; HOME goes back to the hub).
const HUB_TARGETS = { '#tabHangar': '#hubTiles [data-go="hangar"]', '#tabNature': '#hubTiles [data-go="nature"]', '#tabFly': '#hubBack' };
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
      + '<div class="tring"></div><div class="tfinger"><i></i></div><div class="tbubble"><p></p><button class="btn go" type="button">OK</button></div>';
    document.body.appendChild(el);
    this.el = el;
    el.querySelectorAll('.tdim').forEach(d => d.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.nudge(); }));
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
    if ($(where === 'title' ? 'title' : 'results').hidden || !$('repriced').hidden) return;   // only on a screen that is showing: never in flight
    if (FEATURES.season2 && !this.done('name')) this.markDone('name');   // season 2 plays offline: no pilot name yet
    if (where === 'title' && !this.done('name') && !getPilot()) return this.run('name', this.nameSteps());
    if (where === 'results' && !FEATURES.season2 && !this.done('hangar') && (this.save.flights || 0) >= 1) return this.run('hangar', this.hangarSteps());
    // Season 2 (S3; the user: a free upgrade must LEAD you into the hangar): from the HUB, where the tile is, 3 bubbles.
    if (where === 'title' && FEATURES.season2 && !this.done('hangar') && this.save.freeUpgrade && $('hubTiles').querySelector('[data-go="hangar"]')) return this.run('hangar', this.hubHangarSteps());
    if (where === 'title' && (this.done('name') || getPilot())) {
      // Several can open at once (3 at the 3rd landing): one walk-through for all of a hangar tab's.
      const fresh = LINES.filter(l => unlocked(this.save, l) && !this.save.shownLines.includes(l.id));
      if (fresh.length) return this.run(null, this.newSteps(fresh.filter(l => tabOf(l) === tabOf(fresh[0]))));
    }
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
      { target: '#hubTiles [data-go="hangar"]', text: tip('tour-hangar'), tap: true },
      { area: '#hFleet', target: '#hFleet .btn.free', text: tip('tour-free'), tap: true },
      { target: '#hubBack', text: tip('tour-home'), tap: true },
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
    setTimeout(() => this.maybe('title'), 300);   // e.g. a new line right after the name tour
  }

  async step(st) {
    let t = null;
    for (let i = 0; i < 40 && !(t = this.find(st.area || st.target)); i++) await sleep(100);   // screens render as they open
    if (!t) return false;   // nothing to point at: never trap the player
    if (st.scroll) { t.scrollIntoView({ block: 'center' }); await sleep(300); }
    this.target = t;
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
      const poll = setInterval(() => { this.place(); if (st.until && st.until()) finish(); }, 150);
    });
    await sleep(150);
    return true;
  }

  find(sel) {
    if (FEATURES.season2) sel = HUB_TARGETS[sel] || sel;   // season 2 has no tab bar: the hub's tiles and HOME button (S2)
    const all = [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null);
    return all[0] || null;
  }

  // Put the hole, ring, finger and bubble round the target.
  place() {
    if (!this.target || this.el.hidden) return;
    const r = this.target.getBoundingClientRect(), W = innerWidth, H = innerHeight, pad = 4;
    const x0 = Math.max(0, r.left - pad), y0 = Math.max(0, r.top - pad), x1 = Math.min(W, r.right + pad), y1 = Math.min(H, r.bottom + pad);
    const set = (el, s) => Object.assign(el.style, s);
    const d = k => this.el.querySelector(`[data-d="${k}"]`);
    set(d('t'), { left: '0', top: '0', width: `${W}px`, height: `${y0}px` });
    set(d('b'), { left: '0', top: `${y1}px`, width: `${W}px`, height: `${H - y1}px` });
    set(d('l'), { left: '0', top: `${y0}px`, width: `${x0}px`, height: `${y1 - y0}px` });
    set(d('r'), { left: `${x1}px`, top: `${y0}px`, width: `${W - x1}px`, height: `${y1 - y0}px` });
    set(this.el.querySelector('.tring'), { left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
    // The bubble goes on whichever side has more room; the finger points from that side.
    const below = r.top + r.height / 2 < H / 2, b = this.el.querySelector('.tbubble'), f = this.el.querySelector('.tfinger');
    set(b, below ? { top: `${y1 + 46}px`, bottom: 'auto' } : { bottom: `${H - y0 + 46}px`, top: 'auto' });
    // assets/ui/tour-finger.png (32 px, points down): the fingertip is at x 14, y 31. Below a target it is flipped to point up.
    set(f, { left: `${Math.min(W - 34, Math.max(2, (x0 + x1) / 2 - 14))}px`, top: below ? `${y1 + 2}px` : `${y0 - 34}px` });
    f.classList.toggle('up', below);
  }

  nudge() { const b = this.el.querySelector('.tbubble'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
}
