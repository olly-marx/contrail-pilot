// The NATURE screen: the wild area (the user's design, 2026-10-21). Per region: a little scene of
// the land with the animals you have found, the habitat meter, habitat projects to buy (things
// people really do for nature, each with a knock-on chain and sources), the tree upgrades, and
// the collection of animals: found ones with their portrait and fact, the rest as silhouettes
// that say what they need. Animals are never bought: they appear on flights (GameScene.seen).
// Every region since 2026-10-22: a region's tab opens once you have been there (landed in one of
// its cities, or flown over it).
import { writeSave } from './save.js';
import { sfx } from './sound.js';
import { LINES, tabOf, level, nextLevel, unlocked, unlockText, needsMoreNature, canBuy, freeParcels } from './upgrades.js';
import { biodiversity, projectsDone, canAppear, regionSpecies, fundProject } from './nature.js';
import { TIERS, RARITY, REGION_NAMES, REGION_DATA, REGION_SOURCE } from './habitats.js';
import { CITIES, S2_CITIES } from './cities.js';
import { AREAS } from './areas.js';
import { animalDir, animalPortrait } from './animalart.js';
import { meterHTML } from './ui.js';
import { onSwipe } from './swipe.js';
import { landTrees, countText } from './landtrees.js';
import { broughtBack } from './weboflife.js';
import { isSeason2 } from './missions2.js';
import { nextHere } from './nexthere.js';
import { dots, markSeen, natureScope } from './fresh.js';
import { showSheet } from './sheet.js';
import { fresh } from './fresh.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const cost = p => `${p.cost}<i class="seedicon"></i>${p.crystals ? ` ${p.crystals}<i class="crysicon"></i>` : ''}`;
const links = src => (src || []).length
  ? `<p class="label">Find out more</p><div class="links">${src.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} &gt;</a>`).join('')}</div>`
  : '<p class="small">Our scientists are checking where this fact comes from.</p>';
// Regions with a drawn field (assets/ui/field-<region>.png); the others show a plain panel for now.
const FIELD_ART = ['woodland', 'mediterranean', 'desert', 'monsoon', 'eastasia', 'boreal', 'plains', 'tundra', 'savanna', 'rainforest', 'islandforest', 'bush', 'steppe', 'polynesia'];   // PixelLab backdrops, 2026-10-24

// The land a player started in (season 2: their home area's start city), so NATURE opens there (the regions run,
// 2026-10-28: a Punta Arenas or Auckland start opened NATURE on the UK's woodland).
export const homeRegion = save => { const a = save.homeArea && AREAS[save.homeArea], n = save.homeCity || (a && a.start) || save.city,   /* the CHOSEN home city's land (2026-10-30); old saves: the area start */ c = CITIES.find(x => x.name === n) || S2_CITIES.find(x => x.name === n); return (c && REGION_NAMES[c.region] && c.region) || null; };
// Been there: the UK always; the home land; other regions once flown over, or landed in one of their cities.
export function discovered(save, region) {
  if (region === 'woodland' && !(isSeason2(save) && homeRegion(save) && homeRegion(save) !== 'woodland')) return true;   // the UK: always, except for a season-2 player who started elsewhere
  if (homeRegion(save) === region) return true;
  if ((save.discovered || {})[region]) return true;   // flown over (GameScene.setRegion)
  return (save.visited || []).some(n => (CITIES.find(c => c.name === n) || {}).region === region);   // src/cities.js
}

export class WildScreen {
  constructor(ui) {
    this.ui = ui;
    this.save = ui.save;
    this.region = null;   // the home land until a tab is chosen (render)
    $('wInfoClose').onclick = () => { $('wInfo').hidden = true; };
  }

  home() { return homeRegion(this.save); }   // the player's home land (ui.js asks: no import cycle)
  get projects() { return REGION_DATA[this.region].projects; }
  get species() { return REGION_DATA[this.region].species; }
  animals() { return regionSpecies(this.region); }
  done() { return projectsDone(this.save, this.region).map(p => p.id); }
  bio() { return biodiversity(this.save, this.region); }

  render() {
    const s = this.save;
    if (!this.region) this.region = homeRegion(s) || 'woodland';
    if (!discovered(s, this.region)) this.region = homeRegion(s) || 'woodland';
    $('wSeeds').textContent = s.seeds; $('wCrystals').textContent = s.crystals || 0;
    // R6: what is NEW on each land, from src/fresh.js. Taken BEFORE this render marks the land seen, per scope, and kept for the rest of the
    // visit (ui.go('nature') empties it), so a dot on a row / an animal / a tree outlives the render that clears the land's tab dot.
    const fo = this.ui.freshOpts ? this.ui.freshOpts() : {}, fr = fresh(s, fo), dl = dots(s, fo);
    this.rowNew = this.rowNew || {};
    const sc = natureScope(this.region); this.rowNew[sc] = this.rowNew[sc] || new Set(); (fr[sc] || []).forEach(k => this.rowNew[sc].add(k));
    const isNew = key => !!(this.rowNew[sc] && this.rowNew[sc].has(key));
    this.isNew = isNew;
    // The land nav (the user, 2026-11-04: 'the tab row and swiping the picture were unclear'): a title row '‹  Temperate woodland  1 / 6  ›' with 40 px arrows and one
    // dot per land you have OPENED (the locked lands are not shown: the meter's (i) says how many more there are). The dots stay `[data-region]` buttons (tests and
    // tools address a land by them). A tap alternative to swiping; a dot on an arrow / a dot when another land has news (src/fresh.js).
    const ids = Object.keys(REGION_NAMES), openIds = ids.filter(id => discovered(s, id)), at = openIds.indexOf(this.region), many = openIds.length >= 2;
    const newDir = (from, to) => openIds.slice(from, to).some(id => id !== this.region && dl[natureScope(id)]);
    $('wLandName').innerHTML = `${esc(REGION_NAMES[this.region])}${many ? ` <span class="small wl-pos">${at + 1} / ${openIds.length}</span>` : ''}`;
    $('wRegions').classList.toggle('single', !many);
    $('wRegions').innerHTML = openIds.map(id => `<button class="wl-dot ${id === this.region ? 'on' : ''}" type="button" data-region="${id}" aria-label="${esc(REGION_NAMES[id])}" title="${esc(REGION_NAMES[id])}">${id !== this.region && dl[natureScope(id)] ? '<i class="dot"></i>' : ''}</button>`).join('');
    $('wPrevLand').hidden = !many; $('wNextLand').hidden = !many;
    $('wPrevLand').disabled = at <= 0; $('wNextLand').disabled = at >= openIds.length - 1;
    $('wPrevLand').innerHTML = `<i class="wl-chev prev"></i>${newDir(0, at) ? '<i class="dot"></i>' : ''}`; $('wNextLand').innerHTML = `<i class="wl-chev"></i>${newDir(at + 1, openIds.length) ? '<i class="dot"></i>' : ''}`;
    const goLand = to => { if (!to || to === this.region) return; sfx.tick(); this.region = to; this.openTiers = []; this.toolId = null; this.hintOn = false; this.render(); };
    $('wPrevLand').onclick = () => goLand(openIds[at - 1]); $('wNextLand').onclick = () => goLand(openIds[at + 1]);
    $('wRegions').querySelectorAll('[data-region]').forEach(b => b.onclick = () => goLand(b.dataset.region));
    // First visit ONLY (save.tours 'nature-swipe'; a save with tours ['*'] is past all hints): two beats of a ghost swipe on the picture and one line of words.
    const tours = s.tours || [], first = many && !tours.includes('*') && !tours.includes('nature-swipe');
    if (first) { s.tours = [...tours, 'nature-swipe']; writeSave(s); this.hintOn = true; }
    $('wLandHint').hidden = !(many && this.hintOn); $('wLandHint').textContent = 'Swipe the picture or tap the arrows to visit your other lands.';
    $('wScene').classList.toggle('hint-swipe', !!(many && this.hintOn));
    // Swipe sideways to change land (0.11.0): the next / previous open land (src/swipe.js).
    onSwipe($('nature'), { next: () => goLand(openIds[at + 1]), prev: () => goLand(openIds[at - 1]) });
    // The meter, with an (i) that holds what used to be the intro paragraph and the NEXT HERE box (R6: the page says one thing, NEXT).
    $('wMeter').innerHTML = meterHTML(s, this.bio(), this.region) + '<button class="btn hp-info w-i" type="button" data-minfo aria-label="How this land works">i</button>';
    $('wMeter').querySelector('[data-minfo]').onclick = () => this.landSheet();
    this.renderNext();
    this.renderScene();
    this.renderProjects(); this.renderStrip();
    // a planting card is previewed: its trees, ghosted in the land (field.ghostTrees)
    if (this.toolId && this.field) { const line = LINES.find(l => l.id === this.toolId), nx = line && nextLevel(s, line); if (nx) this.field.ghostTrees(nx.parcels || 2); else this.toolId = null; }
    // This land's 5 trees (research/PROPOSAL-TREES.md): open ones in colour with their count toward the cap
    // ("Oak 4/9"), shut ones as silhouettes with the one thing that opens them (src/landtrees.js).
    let row = $('wLandTrees');
    if (!row) { row = document.createElement('div'); row.id = 'wLandTrees'; row.className = 'w-landtrees'; $('wTrees').before(row); }
    const trees = landTrees(s, this.region);
    row.innerHTML = trees.map(t => `<figure class="w-tree ${t.open ? '' : 'shut'}${t.full ? ' full' : ''}" title="${esc(t.open ? t.fact || '' : t.rule)}">${t.open && isNew(`tree:${t.slot}`) ? '<i class="dot"></i>' : ''}
      <img src="assets/tree-${t.id}-2.png" alt="" class="${t.open ? '' : 'w-shadow'}"><figcaption>${t.open ? esc(countText(t)) : `${esc(t.name)}<br><small>${esc(t.rule)}</small>`}</figcaption></figure>`).join('');
    // The planting tools (parcels, soil, nursery): bought once, they work in every land, so they are on EVERY land's tab (the user, 2026-11-09: a player who started in Australia could only buy
    // them on the Australian tab). Before this they were on the HOME land's tab only (2026-10-28: a Melbourne or Lagos player had to visit the UK's tab).
    const uk = true;
    // Season 2: the planting tools wait for lesson 5 (trees), one new thing at a time (research/FLOW-FIRST-HOUR.md).
    const treesTime = !isSeason2(s) || (s.missionsDone || []).includes('L4');
    $('wTrees').hidden = !uk || !treesTime;
    row.hidden = !trees.length;
    $('wTrees').innerHTML = uk ? LINES.filter(l => tabOf(l) === 'nature').map(l => this.toolRowHTML(l)).join('') : '';
    $('wTrees').querySelectorAll('[data-buy]').forEach(b => b.onclick = e => { e.stopPropagation(); this.ui.buy(b.dataset.buy); });
    $('wTrees').querySelectorAll('[data-info]').forEach(b => b.onclick = e => { e.stopPropagation(); this.ui.showInfo(b.dataset.info); });   // the (i) = the line's info (the rails' new-line step taps it)
    // Tap a planting card to PREVIEW it (the user, 2026-11-03: 'the ghost preview can come back'): the trees it would add, ghosted in the land; tap again to put them away.
    $('wTrees').querySelectorAll('[data-tpreview]').forEach(b => b.onclick = () => { sfx.tick(); const id = b.dataset.tpreview; this.toolId = this.toolId === id ? null : id; this.previewId = null; this.render(); });
    $('wTrees').querySelectorAll('[data-buy]').forEach(b => { const go = b.onclick; b.onclick = e => { this.toolId = null; if (this.field) this.field.clearGhosts(); go(e); }; });   // a buy ends the preview
    this.renderFound();
    // This land is SHOWING (NATURE visible, not a refresh behind another screen): what it shows is now seen (src/fresh.js).
    if (!$('nature').hidden && markSeen(s, natureScope(this.region), fo)) this.ui.persist();
  }

  // The land as a 2D field you look across (2026-10-22): the habitat features of every project done,
  // the trees you have planted, and the animals you have found wandering about (see Field below).
  renderScene() {
    const s = this.save, done = this.done();
    if (this.field) this.field.stop();
    this.field = null;
    if (!FIELD_ART.includes(this.region)) {
      $('wScene').innerHTML = `<p class="w-empty">${esc(REGION_NAMES[this.region])}: a picture of this land is being drawn.</p>`;
      return;
    }
    const found = this.animals().filter(w => w.sprite && this.found(w.id));
    // Only trees that suit this land (the user, 2026-10-24): the UK shows its own plantings; another region shows
    // what parcels planted THERE (save.plantedIn[region], that region's trees: src/nature.js localTree).
    const mine = this.region === 'woodland' ? s.planted : (s.plantedIn || {})[this.region];
    const planted = Object.entries(mine || {}).filter(([, n]) => n > 0);
    this.field = new Field($('wScene'), this.region, done, planted, found, this.projects.map(p => p.id), id => { sfx.tick(); this.speciesInfo(id); });   // tap an animal: its card
    if (!found.length && !done.length) $('wScene').insertAdjacentHTML('beforeend', '<p class="w-empty">Bare land. Start a habitat project, and plant trees on your flights!</p>');
  }

  found(id) { return !!(this.save.found || {})[id]; }

  // R6: the ONE primary on NATURE. "Fund <project>" = the cheapest affordable project of an open tier; else the cheapest unaffordable one
  // with what it still needs; else the tree that opens next (src/nexthere.js); else nothing to do. One line, one button: the SAME buy path as
  // the row and the strip (this.buy).
  renderNext() {
    const el = $('wNextLine'); if (!el) return;
    const s = this.save, done = this.done(), bio = this.bio(), n = nextHere(s, this.region);
    const open = this.projects.filter(p => bio >= (TIERS.find(t => t.tier === p.tier) || { needs: 0 }).needs && !done.includes(p.id)).sort((a, b) => a.cost - b.cost || (a.crystals || 0) - (b.crystals || 0));
    const free = this.freeProjectId(), can = p => p.id === free || (s.seeds >= p.cost && (s.crystals || 0) >= (p.crystals || 0));
    const pick = open.find(can) || open[0];
    if (pick) {
      const ok = can(pick), short = [Math.max(0, pick.cost - s.seeds) && `${pick.cost - s.seeds}<i class="seedicon"></i>`, Math.max(0, (pick.crystals || 0) - (s.crystals || 0)) && `${(pick.crystals || 0) - (s.crystals || 0)}<i class="crysicon"></i>`].filter(Boolean).join(' ');
      el.innerHTML = `<div class="rowc lead" id="wNextRow"><span class="rowc-tap"><span class="rowc-slot"></span><span class="rowc-top"><span class="rowc-name">NEXT: ${esc(pick.row || pick.name)}</span></span>`
        + `<span class="rowc-sub">${ok ? 'Fund it now' : `need ${short} more`}</span></span>`
        + `<button class="rowc-price btn ${pick.id === free ? 'free' : ok ? 'go' : ''}" type="button" data-fund="${pick.id}" ${ok ? '' : 'disabled'}>${pick.id === free ? 'FREE!' : cost(pick)}</button></div>`;
      el.querySelector('[data-fund]').onclick = e => { e.stopPropagation(); this.buy(e.currentTarget.dataset.fund); };
    } else if (n.tree) {
      el.innerHTML = `<div class="rowc lead" id="wNextRow"><span class="rowc-tap"><span class="rowc-slot"></span><span class="rowc-top"><span class="rowc-name">NEXT: ${esc(n.tree.name)}</span></span><span class="rowc-sub">${esc(n.tree.rule.toLowerCase())}</span></span></div>`;
    } else el.innerHTML = '';
  }
  freeProjectId() {
    const s = this.save, done = this.done();
    return isSeason2(s) && (s.missionsDone || []).includes('L2') && !s.freeProjectGiven ? (this.projects.find(p => p.tier === 1 && !done.includes(p.id)) || {}).id : null;
  }
  // The (i) on the meter: what the intro paragraph and the NEXT HERE box said, now one short sheet.
  landSheet() {
    const n = nextHere(this.save, this.region), bar = (h, k) => `${Math.min(h, k)}/${k}`;
    showSheet({ eyebrow: 'NATURE', title: REGION_NAMES[this.region], html: `<p>Projects from ${esc(REGION_SOURCE[this.region])}. <b>Raise it:</b> plant this land's trees as you fly over it, and finish its projects. More life appears below you.</p>`
      + `<p class="small">${Object.keys(REGION_NAMES).filter(id => !discovered(this.save, id)).length} more lands: fly there to open them.</p>` + [n.tree && `<p><b>${esc(n.tree.name)}</b>: ${esc(n.tree.rule.toLowerCase())} ${bar(n.tree.have, n.tree.need)}</p>`,
        n.tier && `<p><b>Tier ${n.tier.tier}</b>: biodiversity ${bar(n.tier.have, n.tier.need)}</p>`,
        n.animal && `<p><b>${esc(n.animal.name)}</b>: ${n.animal.ready ? 'out there now, look out on your flights!' : 'not back yet: see the projects'}</p>`].filter(Boolean).join('') });
  }

  // R6: a planting tool (tree parcels, soil, nursery) as a shared `.rowc` row, under the trees on the home land. The rails' contract:
  // `[data-buy="<line id>"]` is the row's price button, `[data-info="<line id>"]` its tap area (tour.js points at both).
  toolRowHTML(line) {
    const s = this.save, cost = l => `${l.cost}<i class="seedicon"></i>${l.crystals ? ` ${l.crystals}<i class="crysicon"></i>` : ''}`;
    if (!unlocked(s, line)) {   // a branch shows its name and what it needs; other locked lines stay a surprise
      return `<div class="rowc locked" data-line="${line.id}"><span class="rowc-tap"><span class="rowc-slot"></span><span class="rowc-top"><span class="rowc-name">${line.requires ? esc(line.name) : '???'}</span></span><span class="rowc-sub">${esc(unlockText(line, s))}</span></span></div>`;
    }
    const have = level(s, line.id), next = nextLevel(s, line), waitBio = needsMoreNature(s, line);
    const isFree = (!!s.freeUpgrade || freeParcels(s, line.id)) && next && have === 0 && !waitBio, ok = isFree || canBuy(s, line);
    const short = next && !ok && !waitBio ? [Math.max(0, next.cost - s.seeds) && `${next.cost - s.seeds}<i class="seedicon"></i>`, Math.max(0, (next.crystals || 0) - (s.crystals || 0)) && `${next.crystals - (s.crystals || 0)}<i class="crysicon"></i>`].filter(Boolean).join(' ') : '';
    const pips = line.levels.map((_, i) => `<span class="pip ${i < have ? 'on' : ''}"></span>`).join('');
    const price = !next ? '<span class="rowc-price rowc-done">MAX</span>'
      : waitBio ? `<span class="rowc-price rowc-locked">bio ${next.needsBio}</span>`
      : `<button class="rowc-price btn ${isFree ? 'free' : ok ? 'go' : ''}" data-buy="${line.id}" type="button" ${ok ? '' : 'disabled'}>${isFree ? 'FREE!' : cost(next)}</button>`;
    const sub = !next ? 'All done!' : short ? `need ${short} more` : `Next: ${esc(next.name)}`;
    return `<div class="rowc price-top tool ${next ? '' : 'maxed'} ${isFree ? 'pick' : ''} ${this.toolId === line.id ? 'previewing sel' : ''}" data-line="${line.id}">`
      + `<button class="rowc-tap" data-tpreview="${line.id}" type="button" aria-label="See where ${esc(line.name)} would grow trees"><span class="rowc-slot"></span><span class="rowc-top"><span class="rowc-name">${esc(line.name)}</span>${this.isNew && this.isNew(`line:${line.id}:${have + 1}`) ? '<i class="dot row-new"></i>' : ''}<span class="rowc-pips">${pips}</span></span>`
      + `<span class="rowc-sub">${sub}</span></button>${price}<button class="rowc-info btn" data-info="${line.id}" type="button" aria-label="About ${esc(line.name)}">i</button></div>`;
  }

  renderProjects() {
    // In tiers (the user, 2026-10-22: all 11 at once was confusing): open tiers show their projects;
    // the next locked tier is one card saying what opens it; later tiers stay hidden.
    const s = this.save, done = this.done(), bio = this.bio(), P = this.projects;
    // R11b: season 2's first nature project is FREE (the user, 2026-10-27): the first tier-1 project, once lesson 2 is done.
    const freeId = this.freeProjectId();
    const card = p => {
      const have = done.includes(p.id), free = p.id === freeId, ok = !have && (free || (s.seeds >= p.cost && (s.crystals || 0) >= p.crystals));
      const btn = have ? '<span class="w-done">DONE</span>'
        : `<button class="btn ${free ? 'free' : ok ? 'go' : ''}" type="button" data-project="${p.id}" ${ok ? '' : 'disabled'}>${free ? 'FREE!' : cost(p)}</button>`;
      // The shared row (DESIGN-HANGAR-NATURE §5a): icon | short name / one line | price. The full story is in the strip.
      const sub = (() => { const w = broughtBack(s, this.region, p.id), f = w.filter(a => a.found); return !w.length ? (p.chain[0].length <= 22 ? p.chain[0] : 'Helps this land') : f.length === w.length && w.length === 1 ? `Brings back: ${f[0].name}` : `Brings back: ${w.length} animal${w.length > 1 ? 's' : ''}`; })();   /* (an unfound animal is not named: the surprise stays) */
      return `<div class="rowc project ${have ? 'maxed' : ''} ${free ? 'freeline' : ''} ${this.previewId === p.id ? 'previewing sel' : ''}" data-pline="${p.id}">`
        + `<button class="rowc-tap" type="button" data-preview="${p.id}"><img class="rowc-icon" src="assets/ui/proj-${p.id}.png" alt="">`
        + `<span class="rowc-top"><span class="rowc-name">${esc(p.row || p.name)}</span>${!have && this.isNew && this.isNew(`project:${p.id}`) ? '<i class="dot row-new"></i>' : ''}</span><span class="rowc-sub">${esc(sub)}</span></button>`
        + `${have ? '<span class="rowc-price w-done">DONE</span>' : btn.replace('class="btn ', 'class="rowc-price btn ')}</div>`;
    };
    const how = 'Plant trees and finish the projects above!';   // every land takes trees (plantedIn)
    const open = TIERS.filter(t => bio >= t.needs), next = TIERS.find(t => bio < t.needs);
    $('wProjects').innerHTML = open.map(t => {
      const ps = P.filter(p => p.tier === t.tier), n = ps.filter(p => done.includes(p.id)).length;
      const finished = n === ps.length, shown = !finished || (this.openTiers || []).includes(t.tier);   // a finished tier folds to one line
      return `<p class="w-tier">Tier ${t.tier}: ${esc(t.name)} <span class="small">${finished ? 'done ' : ''}${n}/${ps.length}</span>`
        + (finished ? ` <button class="btn tiny" type="button" data-tier-toggle="${t.tier}">${shown ? 'hide' : 'show'}</button>` : '') + '</p>'
        + (shown ? ps.map(card).join('') : '');
    }).join('') + (next ? `<p class="w-tier w-tier-lock" data-tier-locked="${next.tier}">Tier ${next.tier}: ${esc(next.name)} <span class="small">Biodiversity ${next.needs} to open (now ${Math.floor(bio)})</span></p>` : '');
    $('wProjects').querySelectorAll('[data-project]').forEach(b => b.onclick = e => { e.stopPropagation(); this.buy(b.dataset.project); });
    // Tap a card (not its buttons) to PREVIEW it: ghosted in the land, the bar's gain, the animals it brings highlighted.
    $('wProjects').querySelectorAll('.project[data-pline] .rowc-tap').forEach(   /* done ones too: their info (regions.cjs found it gone) */b => b.onclick = () => { sfx.tick(); this.preview(b.dataset.preview); });
    $('wProjects').querySelectorAll('.w-webpic[data-species]').forEach(b => b.onclick = () => { sfx.tick(); this.speciesInfo(b.dataset.species); });   // tap an animal: its card
    $('wProjects').querySelectorAll('[data-pinfo]').forEach(b => b.onclick = () => this.projectInfo(b.dataset.pinfo));
    $('wProjects').querySelectorAll('[data-tier-toggle]').forEach(b => b.onclick = () => {
      const t = Number(b.dataset.tierToggle), o = this.openTiers || [];
      this.openTiers = o.includes(t) ? o.filter(x => x !== t) : [...o, t]; this.renderProjects();
    });
  }

  // Web of life (MASTER-PLAN Part G): the animals this project helps bring back. Found ones show their picture; the
  // rest are silhouettes, with the other projects they still need ("also needs: Hedgerows"). Data: each animal's
  // `needs` list in src/habitats.js REGION_DATA (the same rule canAppear uses).
  webHTML(p) {
    const names = Object.fromEntries(this.projects.map(x => [x.id, x.name])), who = broughtBack(this.save, this.region, p.id);
    if (!who.length) return '';
    return `<div class="w-web"><span class="small">Brings back:</span>${who.map(a => {
      const more = a.more.map(n => names[n]).filter(Boolean);
      const tip = a.found ? a.name : `${a.name}?${more.length ? ` Also needs: ${more.join(', ')}` : ''}${a.bio ? ` (biodiversity ${a.bio})` : ''}`;
      return `<button class="w-webpic" type="button" data-species="${a.id}" title="${esc(tip)}">${picHTML(a.w, a.found ? '' : 'w-shadow')}</button>`;
    }).join('')}</div>`;
  }

  // The preview of one project (or null to clear): see what it does BEFORE paying.
  preview(id) {
    if (this.toolId) { this.toolId = null; document.querySelectorAll('#wTrees .rowc.previewing').forEach(r => r.classList.remove('previewing', 'sel')); }   // one preview at a time (the project's own ghost replaces the planting one)
    this.previewId = this.previewId === id ? null : id;
    document.querySelectorAll('#wProjects .project').forEach(c => { const on = c.dataset.pline === this.previewId; c.classList.toggle('previewing', on); c.classList.toggle('sel', on); });
    this.renderStrip();
    $('wScene').classList.toggle('previewing', !!this.previewId);   // the 'Bare land' note steps aside so the ghost shows
    const tr = document.querySelector('#wMeter .mtrack'); if (tr) tr.querySelectorAll('.mghost, .mgain').forEach(g => g.remove());
    if (!this.previewId) { this.field && this.field.clearGhosts(); return; }
    if (this.done().includes(this.previewId)) return;   // a done project: its strip (info, DONE), no ghost or gain
    this.field && this.field.ghost(this.previewId);
    const b0 = this.bio(), copy = JSON.parse(JSON.stringify(this.save)); copy.seeds = 1e9; copy.crystals = 1e9;
    const b1 = fundProject(copy, this.region, this.previewId) ? biodiversity(copy, this.region) : b0;
    if (tr && b1 > b0) tr.insertAdjacentHTML('beforeend', `<span class="mghost" style="left:${b0}%;width:${b1 - b0}%"></span><b class="mgain">+${Math.round(b1 - b0)}</b>`);
  }

  // The preview strip (DESIGN-HANGAR-NATURE §4), pinned under the land beside the ghost: the full name, what it does,
  // who it brings back (their pictures), More about it, and the same BUY as the row (data-project: one buy path).
  renderStrip() {
    const el = $('wStrip'); if (!el) return;
    const p = this.previewId && this.projects.find(x => x.id === this.previewId);
    el.hidden = !p; if (!p) { el.innerHTML = ''; return; }
    const row = document.querySelector(`#wProjects .project[data-pline="${p.id}"] .rowc-price`);
    const need = this.save.seeds < p.cost || (this.save.crystals || 0) < (p.crystals || 0) ? `<p class="small need">need ${[Math.max(0, p.cost - this.save.seeds) && `${p.cost - this.save.seeds}<i class="seedicon"></i>`, Math.max(0, (p.crystals || 0) - (this.save.crystals || 0)) && `${(p.crystals || 0) - (this.save.crystals || 0)}<i class="crysicon"></i>`].filter(Boolean).join(' ')} more</p>` : '';
    el.innerHTML = `<p class="ws-name"><b>${esc(p.name)}</b></p>${need}<p class="ws-chain">${p.chain.map(esc).join(' <b>&rarr;</b> ')}</p>${this.webHTML(p)}`
      + `<div class="ws-foot"><button class="linkbtn" type="button" data-pinfo="${p.id}">More about it &rsaquo;</button>${row ? row.outerHTML : ''}</div>`;
    el.querySelectorAll('[data-project]').forEach(b => b.onclick = e => { e.stopPropagation(); this.buy(b.dataset.project); });
    el.querySelectorAll('[data-pinfo]').forEach(b => b.onclick = () => this.projectInfo(b.dataset.pinfo));
    el.querySelectorAll('.w-webpic[data-species]').forEach(b => { b.classList.add('w-hi'); b.onclick = () => { sfx.tick(); this.speciesInfo(b.dataset.species); }; });   // the animals it brings, highlighted
  }

  buy(id) {
    const s = this.save, r = this.region, p = this.projects.find(x => x.id === id), b0 = this.bio();
    const freeOne = isSeason2(s) && (s.missionsDone || []).includes('L2') && !s.freeProjectGiven && p && p.tier === 1;
    if (freeOne) { s.seeds += p.cost; s.crystals = (s.crystals || 0) + (p.crystals || 0); }   // the free one: paid for by the game
    if (!fundProject(s, r, id)) { if (freeOne) { s.seeds -= p.cost; s.crystals -= p.crystals || 0; } sfx.nope(); return; }   // src/nature.js: the same rule the sim engine's player uses
    if (freeOne) s.freeProjectGiven = true;
    this.ui.missionsAfterSave && this.ui.missionsAfterSave();   // season 2: off-flight missions (S3)
    writeSave(s); sfx.grow();
    this.previewId = null;
    this.render();
    // It arrives: the feature drops into the land, the bar fills from where it was, the animals it brings flash.
    this.field && this.field.arrive(id);
    const fill = document.querySelector('#wMeter .mfill'), b1 = this.bio();
    if (fill && b1 > b0) { fill.style.transition = 'none'; fill.style.width = `${b0}%`; void fill.offsetWidth; fill.style.transition = 'width .9s ease-out'; fill.style.width = `${b1}%`; }
    document.querySelectorAll(`#wProjects [data-pline="${id}"] .w-webpic`).forEach(b => b.classList.add('w-flash'));
    // Who might come now? (only animals that are drawn can turn up in flight)
    const now = this.animals().filter(w => w.sprite && canAppear(s, w.id, r) && !this.found(w.id) && w.c.needs.includes(id));
    if (now.length) this.ui.toast(`${p.name}: done!`, `Look out on your flights for: ${now.map(w => w.name).join(', ')}!`, 'good', 4);
  }

  projectInfo(id) {
    const p = this.projects.find(x => x.id === id);
    const helps = this.animals().filter(w => w.c.needs.includes(id)).map(w => w.name);
    $('wInfoBody').innerHTML = `<p class="eyebrow">Habitat project</p><h2>${esc(p.name)}</h2><p>${esc(p.short)}</p>
      <div><p class="label">What happens next?</p><p class="w-chain">${p.chain.map(esc).join(' <b>&rarr;</b> ')}</p></div>
      <div class="fact"><p class="label">Did you know?</p><p>${esc(p.fact)}</p></div>
      ${helps.length ? `<p><b>Helps bring back:</b> ${helps.map(esc).join(', ')}</p>` : ''}${links(p.src)}${p.org ? orgHTML(p.org) : ''}`;
    $('wInfo').hidden = false;
    if (p.org) gate($('wInfoBody'));
  }

  // The collection: every animal of this region. Found: portrait + name. Not yet: a silhouette and a hint.
  renderFound() {
    const all = this.animals(), n = all.filter(w => this.found(w.id)).length;
    $('wFoundHead').textContent = `Wildlife found: ${n} / ${all.length}`;
    $('wFound').innerHTML = all.map(w => {
      const got = this.found(w.id), r = w.c.rarity || 'common';
      return `<button class="w-card ${got ? 'got' : ''} r-${r}" type="button" data-species="${w.id}">${got && this.isNew && this.isNew(`animal:${w.id}`) ? '<i class="dot"></i>' : ''}${picHTML(w)}<span>${got ? esc(w.name) : '???'}</span><small class="w-rarity">${RARITY[r].name}</small></button>`;
    }).join('');
    $('wFound').querySelectorAll('[data-species]').forEach(b => b.onclick = () => this.speciesInfo(b.dataset.species));
  }

  speciesInfo(id) {
    const w = this.animals().find(x => x.id === id), c = w.c, got = this.found(id);
    const names = c.needs.map(n => this.projects.find(p => p.id === n).name);
    const rr = RARITY[c.rarity || 'common'], far = rr.from ? ` ${rr.name} animals only show up ${rr.from.toLocaleString('en-GB')} km or more into a flight.` : '';
    const hint = !w.sprite ? 'Our artists are still drawing this animal. Soon you can find it on your flights!'
      : canAppear(this.save, id, this.region) ? `It can live here now! Look out for it on your flights.${far}`
      : `To bring it here: ${names.length ? names.map(esc).join(' + ') : 'a healthier land'}${c.bio ? `, and Biodiversity ${c.bio}` : ''}.`;
    $('wInfoBody').innerHTML = got
      ? `<p class="eyebrow">Found! ${rr.name}</p><h2>${esc(w.name)}</h2>${picHTML(w, 'w-portrait')}
        <div><p class="label">Why it lives here</p><p>${esc(c.why)}</p></div>
        ${c.fact ? `<div class="fact"><p class="label">Did you know?</p><p>${esc(c.fact)}</p></div>` : ''}${links(c.src)}`
      : `<p class="eyebrow">Not found yet: ${rr.name}</p><h2>???</h2>${picHTML(w, 'w-portrait w-shadow')}<p>${hint}</p>`;
    $('wInfo').hidden = false;
  }
}

// Where an animal's in-flight frames are: the PixelLab preview set if it is on and has this one.
const artDir = animalDir;   // (src/animalart.js)

// An animal's picture: its portrait, its sprite, or (not drawn yet) a question mark.
function picHTML(w, cls = '') {
  const pic = animalPortrait(w);   // (src/animalart.js)
  return pic ? `<img class="${cls}" src="${esc(pic)}" alt="">` : `<span class="w-nopic ${cls}">?</span>`;
}

// Who runs a project, and links to them (the user's goal, 2026-10-22: a knowledge base of real
// projects people can support). The game takes no payments: the links sit behind the grown-up gate.
function orgHTML(o) {
  return `<div class="w-org"><p class="label">Who does this?</p><p><b>${esc(o.name)}</b></p>
    <button class="btn green gate w-gate" type="button"><span class="gate-fill"></span><span class="gate-label">ASK A GROWN-UP</span></button>
    <div class="links w-orglinks" hidden><a href="${esc(o.learn)}" target="_blank" rel="noopener">Learn about them &gt;</a>${o.donate ? `<a href="${esc(o.donate)}" target="_blank" rel="noopener">${esc(o.donateLabel || 'Help them (donate)')} &gt;</a>` : ''}</div>
    <p class="small w-gatemsg">Grown-ups: press and HOLD the button for 2 seconds.</p></div>`;
}
// Hold 2 s to show the links (as the Citizen Zoo gate in ui.js; links hide again after 10 s).
function gate(root) {
  const btn = root.querySelector('.w-gate'), box = root.querySelector('.w-orglinks'), msg = root.querySelector('.w-gatemsg');
  if (!btn) return;
  let timer = null, back = null;
  const cancel = () => { clearTimeout(timer); timer = null; btn.classList.remove('holding'); };
  const reset = () => { clearTimeout(back); box.hidden = true; btn.hidden = false; msg.hidden = false; };
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    btn.classList.add('holding');
    timer = setTimeout(() => { cancel(); btn.hidden = true; msg.hidden = true; box.hidden = false; back = setTimeout(reset, 10000); }, 2000);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, cancel));
  btn.addEventListener('contextmenu', e => e.preventDefault());
  box.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setTimeout(reset, 500)));
}

// ---------- the Wild Area field (art session, 2026-10-22) ----------
// A 288 x 170 field (assets/ui/field-<region>.png, horizon at y=60) drawn in game pixels inside a
// box scaled to the screen. Features are at 2x (their art is 1x); trees (2 px/unit) and animals
// (1.5 px/unit) at 1x, so a fox is about as wide as a tree. Things lower
// down the field are nearer, so they are drawn in front. Animals walk to a spot, pause, pick
// another, and face the way they go; flying birds cross the sky and come round again.
const FW = 288, FH = 170, HORIZON = 60, GROUND = [HORIZON + 8, FH - 2];
// Where each project's feature goes: [x, y] of its bottom-left corner, in field pixels (at 2x).
const SLOTS = { hedgerow: [[0, 72], [96, 72], [192, 72]], woodland: [[4, 98]], martens: [[96, 124]], storks: [[150, 108]],
  deadwood: [[60, 118]], margins: [[206, 96]], pond: [[118, 150]], voles: [[236, 170]], beavers: [[214, 142]],
  rewet: [[2, 168]], meadow: [[176, 132], [40, 146]] };
// Planted trees: up to 12, in spots clear of the features, by how many of each kind you planted.
// Regions' projects (PixelLab features, 2026-10-24): the n-th project of the region (in its PROJECTS order) goes in
// the n-th spot, bottom-left corner, 1x art up to 64 x 32; spread round the field and clear of TREE_SPOTS.
const REGION_SPOTS = [[2, 98], [100, 92], [212, 96], [30, 136], [128, 128], [216, 140], [64, 162], [160, 156], [232, 170], [2, 170], [112, 170], [180, 112], [252, 118]];   // 13: rainforest has the most projects
const TREE_SPOTS = [[200, 84], [176, 90], [266, 88], [126, 92], [100, 96], [84, 132], [226, 120], [190, 160], [24, 124], [150, 166], [270, 156], [56, 164]];
// Each other land gets its OWN tree layout (the user, 2026-10-25: "all of the wild areas have the same trees in the
// same arrangement"): spots from a grid on the ground, shuffled by a generator seeded with the land's name (same land,
// same order every visit): 12 spots at least 26 px apart, chosen once; a tree whose base would stand on a feature BUILT
// there (`feats`: bottom-left corners) moves to the next free spot in that order, and the others stay put. (All 13 spots together cover nearly the whole field, so trees avoid only built ones; a new
// feature moves just the trees standing on it.) The UK keeps TREE_SPOTS (placed clear of its SLOTS by hand).
const FEAT_W = 64, FEAT_H = 32;
const orders = {};
function treeSpots(region, feats = []) {
  if (region === 'woodland') return TREE_SPOTS;
  let h = 2166136261; for (const c of region) h = Math.imul(h ^ c.charCodeAt(0), 16777619);   // FNV-1a seed
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  // A tree may stand behind a feature (lower down is drawn in front), but its base never stands ON one (4 px margin).
  const clear = (x, y) => feats.every(([fx, fy]) => x < fx - 4 || x > fx + FEAT_W + 4 || y < fy - FEAT_H - 4 || y > fy + 4);
  let grid = orders[region];
  if (!grid) {
    grid = [];
    for (let y = GROUND[0] + 16; y <= FH - 4; y += 12) for (let x = 18; x <= FW - 18; x += 16) grid.push([x, y]);
    for (let i = grid.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [grid[i], grid[k]] = [grid[k], grid[i]]; }
    orders[region] = grid;
  }
  const apart = (p, list) => list.every(q => q === p || Math.hypot(p[0] - q[0], p[1] - q[1]) >= 26);
  const base = [];   // the land's own 12 spots, chosen once with nothing built
  for (const p of grid) if (base.length < TREE_SPOTS.length && apart(p, base)) base.push(p);
  // Only trees standing on a built feature move, to the next free spot in the land's order; the others stay put.
  const out = base.filter(p => clear(p[0], p[1]));
  for (const p of grid) if (out.length < base.length && !out.includes(p) && clear(p[0], p[1]) && apart(p, out)) out.push(p);
  return out;
}

class Field {
  constructor(el, region, done, planted, found, order = [], onPick = null) {
    this.el = el; this.onPick = onPick;   // onPick(id): an animal in the picture was tapped
    this.region = region; this.order = order;
    el.innerHTML = '';
    el.classList.add('wfield-box');
    const f = this.f = document.createElement('div');
    f.className = 'wfield';
    f.style.backgroundImage = `url('assets/ui/field-${region}.png')`;
    el.appendChild(f);
    const put = (src, x, y, k, cls = '') => {   // bottom-left at (x, y), scaled k
      const img = document.createElement('img');
      img.src = src; img.alt = ''; img.className = `wf ${cls}`;
      img.style.left = `${x}px`; img.style.top = `${y}px`; img.style.zIndex = Math.round(y);
      img.style.transform = `translateY(-100%) scale(${k})`;
      f.appendChild(img);
      return img;
    };
    this.put = put;
    // Features are PixelLab art at 1x (2026-10-24; the hand-drawn ones were 1x art shown at 2x).
    for (const id of done) {
      const spots = region === 'woodland' ? SLOTS[id] || [] : [REGION_SPOTS[order.indexOf(id)]].filter(Boolean);
      for (const [x, y] of spots) put(`assets/ui/wild-${id}.png`, x, y, 1, 'feat');
    }
    const total = planted.reduce((a, [, n]) => a + n, 0);
    const kinds = planted.flatMap(([id, n]) => Array(n).fill(id));
    const spots = treeSpots(region, done.map(id => REGION_SPOTS[order.indexOf(id)]).filter(Boolean));
    const nTrees = Math.min(spots.length, Math.ceil(total / 2));
    this.freeSpots = spots.slice(nTrees); this.treeKind = kinds[0] || 'oak';
    for (let i = 0; i < nTrees; i++) {
      const kind = kinds[Math.floor((i + 0.5) / nTrees * kinds.length)];
      const [x, y] = spots[i];
      put(`assets/tree-${kind}-2.png`, x, y, 1, 'tree').style.transform = 'translate(-50%, -100%)';   // 1x (drawn at 2 px/unit), centred on x
    }
    // Animals: start at random spots; birds that fly take the sky.
    this.critters = found.map((w, i) => {
      const fly = w.kind === 'bird' && w.pose !== 'standing';
      const c = { w, fly, img: put(`${artDir(w.sprite)}/${w.sprite}-0.png`, 0, 0, 1, 'critter'), frame: 0, t: Math.random(), pause: Math.random() * 2,
        x: 20 + Math.random() * (FW - 40), y: fly ? 14 + Math.random() * 30 : GROUND[0] + Math.random() * (GROUND[1] - GROUND[0]),
        speed: fly ? 22 + Math.random() * 10 : 6 + Math.random() * 6, dir: Math.random() < 0.5 ? -1 : 1 };
      if (!fly) this.pick(c);
      // Tap an animal in the picture to see it close up (the user, 2026-10-27): the same card as the collection's.
      c.img.style.pointerEvents = 'auto'; c.img.style.cursor = 'pointer'; c.img.dataset.critter = w.id;   // (not data-species: the collection cards use that)
      c.img.addEventListener('click', e => { e.stopPropagation(); if (this.onPick) this.onPick(w.id); });
      return c;
    });
    this.fit();
    this.last = performance.now();
    this.raf = requestAnimationFrame(t => this.step(t));
  }

  // Tap-to-preview (the user, 2026-10-28: "see the effect BEFORE purchasing"): a project's feature, or new trees, ghosted
  // in the land; clearGhosts() takes them away. arrive(id) animates a just-bought feature into the scene.
  spotsOf(id) { return this.region === 'woodland' ? SLOTS[id] || [] : [REGION_SPOTS[this.order.indexOf(id)]].filter(Boolean); }
  ghost(id) { this.clearGhosts(); for (const [x, y] of this.spotsOf(id)) this.put(`assets/ui/wild-${id}.png`, x, y, 1, 'feat ghost'); }
  ghostTrees(n) { this.clearGhosts(); for (const [x, y] of this.freeSpots.slice(0, n)) this.put(`assets/tree-${this.treeKind}-2.png`, x, y, 1, 'tree ghost').style.transform = 'translate(-50%, -100%)'; }
  clearGhosts() { this.f.querySelectorAll('.ghost').forEach(g => g.remove()); }
  arrive(id) { this.f.querySelectorAll(`img.feat[src$="wild-${id}.png"]`).forEach(g => g.classList.add('arrive')); }
  fit() { this.f.style.transform = `scale(${this.el.clientWidth / FW})`; }
  pick(c) { c.tx = 10 + Math.random() * (FW - 20); c.ty = GROUND[0] + Math.random() * (GROUND[1] - GROUND[0]); }
  stop() { cancelAnimationFrame(this.raf); this.raf = null; }

  step(now) {
    if (!this.raf) return;
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    if (this.el.offsetParent !== null) {           // only while the NATURE screen is showing
      this.fit();
      for (const c of this.critters) this.move(c, dt);
    }
    this.raf = requestAnimationFrame(t => this.step(t));
  }

  move(c, dt) {
    let moving = true;
    if (c.fly) {                                    // across the sky, then round again
      c.x += c.dir * c.speed * dt;
      if (c.x > FW + 20) c.x = -20; if (c.x < -20) c.x = FW + 20;
      c.y += Math.sin(c.t * 2) * 4 * dt;
    } else if (c.pause > 0) {
      c.pause -= dt; moving = false;
    } else {
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d < 1) { c.pause = 1 + Math.random() * 3; this.pick(c); moving = false; }
      else { c.x += dx / d * c.speed * dt; c.y += dy / d * c.speed * 0.6 * dt; if (Math.abs(dx) > 0.5) c.dir = dx < 0 ? -1 : 1; }
    }
    c.t += dt;
    const frame = moving ? Math.floor(c.t / (c.fly ? 0.18 : 0.25)) % 2 : 0;   // 0 when standing still (not `false`)
    if (frame !== c.frame) { c.frame = frame; c.img.src = `${artDir(c.w.sprite)}/${c.w.sprite}-${frame}.png`; }
    const im = c.img;
    im.style.left = `${Math.round(c.x - im.naturalWidth / 2)}px`;
    im.style.top = `${Math.round(c.y)}px`;
    im.style.zIndex = c.fly ? 500 : Math.round(c.y);
    im.style.transform = `translateY(-100%) scaleX(${c.dir})`;   // sprites face right; flip to walk left
  }
}
