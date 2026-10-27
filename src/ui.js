import { FEATURES, km, CLIMATE, FOREST } from './config.js';
import { VERSION } from './version.js';
import { flightPath, choices, city, EARTH_KM, linksFor, schoolSave } from './route.js';
import { headingWord } from './network.js';
import { AREAS, unlockedAreas } from './areas.js';
import { needsStartChoice, chooseStart, applyStart } from './startchoice.js';
import { available as crossingsNow, offerCheck, offerCtx, moreToCome, laterEra } from './crossings.js';
import { SEASON } from './season.js';
// Season 2 debug (?s2unlock=1, preview only): every available crossing can be flown, skipping the offer gates (M3 tryout).
const S2_UNLOCK = typeof location !== 'undefined' && new URLSearchParams(location.search).get('s2unlock') === '1';
// Season 2: the crossings you can see from your areas, each with what it still needs (MASTER-PLAN B4).
// The capability estimate, this area's biodiversity and its contrail missions arrive in M4/M6; until then 0 / false.
const crossingsHTML = s => {
  if (!s.tutorialDone) return '';
  const list = crossingsNow(s);
  if (!list.length) { const le = laterEra(s); if (le !== null) return `<div id="jCross"><p class="small" id="jLater"><b>NEXT CROSSING</b><br>New crossings open in ${ERAS[le].name}. Keep flying to get there!</p></div>`; }
  if (!list.length) return moreToCome(s) ? '<div id="jCross"><p class="small" id="jMore"><b>MORE TO COME!</b><br>You have flown every crossing there is for now. Faster planes and the far oceans are on their way.</p></div>' : '';
  return `<div id="jCross">${list.map(c => { const ctx = offerCtx(s, c), o = offerCheck(c, ctx), go = o.offered || S2_UNLOCK;
    const needs = Object.entries(o.need).filter(([, v]) => !v).map(([k]) => ({ capability: `a landed flight of ${km(Math.round(SEASON.offer.distanceShare * c.km))} from here (best so far ${km(ctx.capabilityKm)})`, nature: `biodiversity ${SEASON.offer.biodiversity} here (now ${ctx.bio})`, contrails: 'the 3 starred missions here' })[k]);
    return `<p class="small"><b>CROSSING: ${c.from} &gt; ${c.to}</b>, ${km(c.km)} non-stop${c.opens ? ` (opens ${AREAS[c.opens].name})` : ''}<br>
      ${go ? `<button class="btn go" type="button" data-cross="${c.id}">FLY THE CROSSING</button>` : `Needs: ${needs.join(', ')}`}</p>`; }).join('')}</div>`;
};
// Season 2: which areas you fly in, and which are still locked (dim dots on the globe; crossings open them).
const areaLine = s => { const open = unlockedAreas(s), shut = Object.keys(AREAS).filter(k => !open.includes(k));
  return `<p class="small" id="jAreas">Your area: <b>${open.map(k => AREAS[k].name).join(', ')}</b>${shut.length ? `<br>&#128274; Locked: ${shut.map(k => AREAS[k].name).join(', ')}` : ''}</p>`; };
import { drawGlobe } from './globe.js';
import { hubView, revealed as hubRevealed } from './hub.js';
import { isSeason2, onSave as missionsOnSave, visible as missionsVisible, setDaily, dailyVisible } from './missions2.js';
import { REGION_NAMES } from './habitats.js';
import { missionReward, claim, unclaimedCount } from './rewards.js';
import { BADGES, THEMES, tierOf, medal, progressOf, tierName } from './badges.js';
import { WILDLIFE } from './wildlife.js';
import { animalPortrait } from './animalart.js';
// HTML screens around the game: title, results, hangar (shop), info pop-ups, tips and flight school.
import { LINES, FUELS, level, nextLevel, canBuy, buyLevel, fuelChoices, unlocked, unlockText, needsMoreNature, tabOf, lineById } from './upgrades.js';
import { biodiversity, stage, STAGES, NATURE_FACTS, SPECIES } from './nature.js';
import { current as currentMission, blocked as missionBlocked, allDone as missionsDone, indexOf as missionIndexOf, MISSIONS } from './missions.js';
import { LINKS } from './links.js';
import { writeSave, resetSave } from './save.js';
import { eraBarHTML } from './eras.js';
import { FleetHangar, fleetBuyable } from './hangar.js';
import { showEraWelcome } from './welcome.js';
import { ERAS } from './eras.js';
import { NATURE_LINES, partKeys, zoomBox, natureLevels } from './planeparts.js';
import { sfx, setMuted, unlockAudio } from './sound.js';

export const FACTS_BASE = [
  'Contrail means "condensation trail". It is made of tiny bits of ice.',
  'Where planes fly, the air is colder than -40 C. Much colder than your freezer!',
  'In dry air a contrail is gone in seconds. In icy air it can stay for hours.',
  'In the day, contrails bounce some sunlight back to space. At night they only keep heat in.',
  'Scientists think contrails warm the Earth overall. Night contrails are a big part of that.',
  'Only a few flights make most of the warming contrails. Changing their height could help a lot!',
  'Icy air is often thin. Flying a little higher or lower can be enough to miss it.',
  'SAF can be made from old cooking oil, like the oil used to fry chips!',
  'SAF makes less soot. Less soot means fewer ice bits, so its contrails are thinner and fade sooner.',
  'Some daytime contrails can cool the Earth a little. Night contrails always warm it.',
  'Hydrogen planes make no CO2, but they make lots of water. So they can still make contrails.',
  'Taking off burns lots of fuel. That is why short flights make the most CO2 for each km.',
  'Trees take CO2 out of the air, but it takes many years. Not making CO2 works faster.',
];

export const FACTS = [...FACTS_BASE, ...NATURE_FACTS];
const TOAST_MIN = 3, TOAST_END_MIN = 2.5;   // s a toast stays before another may replace it / before a flight's end may close it
const $ = id => document.getElementById(id);
// A prize as icons: "+40 [seed] +3 [crystal]".
const prize = x => `<span class="prize">+${x.seeds}<i class="seedicon"></i>${x.crystals ? ` +${x.crystals}<i class="crysicon"></i>` : ''}</span>`;

// The Biodiversity meter as HTML: a bar plus the stage name.
// region: whose meter it is (each land has its own, 0.11.1: the bar used to say only "Biodiversity").
export function meterHTML(save, b = biodiversity(save), region = 'woodland') {   // b: a region's meter (NATURE tabs)
  const st = stage(b);
  return `<div class="meter"><span class="mlabel">${REGION_NAMES[region] || 'Biodiversity'}</span><span class="mtrack"><span class="mfill" style="width:${b}%"></span>${STAGES.slice(1).map(x => `<i style="left:${x.at}%"></i>`).join('')}</span><b>${st.name}</b></div>`;
}
const sign = v => (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(v);

export class UI {
  constructor(save, { onStart, onSchool }) {
    this.fleet = new FleetHangar(this); this.sfx = sfx;   // the plane side's hangar (src/hangar.js)
    this.save = save;
    this.onStart = onStart;
    this.onSchool = onSchool;
    this.toastTimer = null;

    $('goBtn').onclick = () => this.start();
    $('againBtn').onclick = () => { const to = this.resultsLead(); return to ? this.go(to) : this.showTitle(); };   // FLY ON, or where the lesson leads
    $('schoolBtn').onclick = () => this.startSchool();
    document.querySelectorAll('#tabbar [data-go]').forEach(b => b.onclick = () => { sfx.flap(); this.go(b.dataset.go); });
    $('hGoBtn').onclick = () => this.start();
    $('hGoTop').onclick = () => this.start();
    $('howBtn').onclick = () => { $('how').hidden = false; };
    $('howClose').onclick = () => { $('how').hidden = true; };
    $('aboutBtn').onclick = () => { $('aboutVersion').textContent = `Contrail Pilot v${VERSION}`; $('about').hidden = false; };
    $('aboutClose').onclick = () => { $('about').hidden = true; };
    // Tap anywhere on the results while it is revealing to skip to the end.
    $('results').addEventListener('pointerdown', () => { this.skipReveal = true; }, true);
    $('iClose').onclick = () => { $('info').hidden = true; };
    $('resetBtn').onclick = () => {
      if (!confirm('Delete all seeds, ice crystals, upgrades and badges on this device?')) return;
      Object.assign(this.save, resetSave());
      this.renderHangar();
    };
    this.setupMute();
    // Feature switches: hide whole sections whose feature is off (see FEATURES in config.js).
    document.querySelectorAll('[data-feature]').forEach(el => { if (!FEATURES[el.dataset.feature]) el.hidden = true; });
    if (FEATURES.citizenZoo) this.setupRealTree();
    if (FEATURES.season2) this.setupHub();
    window.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !$('title').hidden) { e.preventDefault(); this.start(); }
    });
  }

  // First play goes through flight school.
  start() {
    if (FEATURES.season2 && this.save.freeUpgrade && hubRevealed(this.save, 'hangar') && this.save.tutorialDone) return this.go('hangar');   // locked: the free part first
    if (FEATURES.season2 && needsStartChoice(this.save)) return this.askStart().then(() => this.start());   // season 2: choose your start first
    if (!this.save.tutorialDone) return this.startSchool();
    unlockAudio();
    this.showOnly(null);
    this.onStart();
  }

  // How to play comes first, so the lessons have something to hang on. Then flight school.
  startSchool() {
    unlockAudio();
    this.showOnly(null);
    $('how').hidden = false;
    $('howClose').onclick = () => { $('how').hidden = true; $('howClose').onclick = () => { $('how').hidden = true; }; this.onSchool(); };
  }

  // The mission card on the title screen: this flight's goal, and what you need for it.
  renderMission() {
    const s = this.save, m = currentMission(s), el = $('tMission');
    if (!s.tutorialDone) { el.hidden = true; return; }
    el.hidden = false;
    if (!m) { el.innerHTML = `<div class="mis-head">ALL MISSIONS DONE!</div><p>You are a real Contrail Pilot. Now go for the badges!</p>`; return; }
    const i = missionIndexOf(m), lock = missionBlocked(s, m);
    el.innerHTML = `<div class="mis-head"><span class="mis-no">MISSION ${i + 1}/${MISSIONS.length}</span>${prize(missionReward(i))}</div>
      <div class="mis-body"><i class="mi ${m.icon}"></i><div><b>${m.title}</b><p>${m.sub}</p>
      ${lock ? `<p class="mis-need">Needs: <b>${m.needs.text}</b></p>` : m.tip ? `<p class="mis-tip">${m.tip}</p>` : ''}</div></div>`;
  }

  // Every seed and crystal counter on screen, after a CLAIM; a quick +N pops up too.
  renderBank(paid) {
    const s = this.save;
    for (const [a, b] of [['tTrees', 'tCrystals'], ['hTrees', 'hCrystals'], ['wSeeds', 'wCrystals']]) {
      if ($(a)) $(a).textContent = s.seeds;
      if ($(b)) $(b).textContent = s.crystals || 0;
    }
    if (paid && (paid.seeds || paid.crystals)) sfx.coin();
  }

  // Prizes waiting to be claimed: each with a CLAIM button, plus CLAIM ALL. Missions and badges
  // never pay themselves; the player taps to collect (src/rewards.js).
  renderPrizes(el = $('tChallenges'), after = () => {}) {
    const s = this.save, list = s.unclaimed || [];
    el.hidden = !s.tutorialDone || !list.length;
    if (el.hidden) { el.innerHTML = ''; return; }
    const pic = u => (u.kind === 'badge' ? `<img class="prize-medal" src="${medal(u.id, u.tier)}" alt="">` : '<i class="mi mi-seed"></i>');
    el.innerHTML = `<p class="label">Prizes to claim</p>` + list.map(u => `<div class="claim-row"><span>${pic(u)}${u.label}</span>${prize(u)}<button class="btn claim" data-key="${u.key}" type="button">CLAIM</button></div>`).join('')
      + (list.length > 1 ? '<button class="btn claim all" data-key="" type="button">CLAIM ALL</button>' : '');
    el.querySelectorAll('.claim').forEach(btn => btn.onclick = () => {
      const paid = claim(s, btn.dataset.key || null);
      writeSave(s);
      sfx.buy();
      btn.closest('.claim-row, .claim-panel, p, div')?.classList.add('claimed');
      this.renderPrizes(el, after);
      this.renderBank(paid);
      after();
    });
  }

  // The journey on the FLY screen (2026-10-22): where you are, three ways to go (the next city each
  // way, and its land), a globe with the way ahead, and how many times round the Earth you have flown.
  renderJourney() {
    const s = this.save, first = !s.tutorialDone;
    const path = flightPath(first ? schoolSave(s) : s, 5), here = city(path[0]);
    const opts = first ? [] : choices(path[0], linksFor(s));
    const land = n => REGION_NAMES[city(n).region] || 'the sea';
    const trips = (s.flownKm || 0) / EARTH_KM;
    $('tJourney').innerHTML = `<p>You are in <b>${here.name}</b>.${first ? ` Your first flight: towards <b>${path[1]}</b>.` : ' Which way?'}</p>
      ${opts.length ? `<div class="jways">${opts.map(o => `<button class="btn jway ${o.name === path[1] ? 'on' : ''}" type="button" data-way="${o.name}">
        <b>${headingWord(o.deg)}</b><span>to ${o.name}</span><small>${land(o.name)}</small></button>`).join('')}</div>` : ''}
      <canvas id="jGlobe" class="jglobe" width="160" height="160"></canvas>
      <p class="small">On the way: ${path.slice(1).join(' &gt; ')}</p>
      ${FEATURES.season2 ? areaLine(s) + crossingsHTML(s) : ''}
      <p class="small">Times round the Earth: <b>${trips.toFixed(1)}</b> (${km(Math.round(s.flownKm || 0))})</p>`;
    // The way buttons and a tap on a way's dot on the globe do the same thing (the globe also turns when dragged: src/globe.js).
    const pick = name => { sfx.flap(); this.save.heading = name; writeSave(this.save); this.renderJourney(); };
    // Season 2: fly a crossing (the flight's rules read save.flyCrossing; GameScene clears it when the flight ends).
    document.querySelectorAll('#jCross [data-cross]').forEach(b => b.onclick = () => {
      sfx.flap(); s.flyCrossing = crossingsNow(s).find(c => c.id === b.dataset.cross); writeSave(s); this.start(); });
    drawGlobe($('jGlobe'), here, path.map(city), { ways: opts.map(o => city(o.name)), onPick: pick, lit: FEATURES.season2 ? linksFor(s) : null });
    $('tJourney').querySelectorAll('[data-way]').forEach(b => b.onclick = () => pick(b.dataset.way));
  }

  // ONE start choice at a time (src/startchoice.js): the menu and START may both ask; they share the same screen.
  askStart() {
    return this.startAsked || (this.startAsked = chooseStart().then(c => { applyStart(this.save, c); writeSave(this.save); this.startAsked = null; this.renderJourney();
      // The menu's backdrop was built before the choice (it showed LONDON behind a Johannesburg start): rebuild it at the new home.
      const g = typeof window !== 'undefined' && window.game && window.game.scene && window.game.scene.getScene('game');
      if (g && g.sys && g.sys.isActive() && g.state === 'idle') g.scene.restart(); }));
  }

  // ---------- the season 2 hub (S2 of research/PROPOSAL-HOME-MISSIONS.md; what shows: src/hub.js) ----------
  setupHub() {
    $('title').classList.add('hub');
    $('hubGear').onclick = () => { sfx.flap(); $('title').classList.toggle('menu'); };
    $('hubBack').onclick = () => { sfx.flap(); this.go('fly'); };
    $('hubSpinL').onclick = () => this.hubGlobe && this.hubGlobe.nudge(-24);
    $('hubSpinR').onclick = () => this.hubGlobe && this.hubGlobe.nudge(24);
    $('hubRoute').onclick = () => { sfx.flap(); $('title').classList.toggle('world'); };   // the route choice and crossings, on demand
  }
  renderHub() {
    const s = this.save;
    const ready = s.tutorialDone ? crossingsNow(s).find(c => offerCheck(c, offerCtx(s, c)).offered || S2_UNLOCK) : null;
    const v = hubView(s, { badges: { hangar: this.hasNew() ? (s.freeUpgrade ? 'FREE' : 'NEW') : '', missions: unclaimedCount(s) ? String(unclaimedCount(s)) : '' }, crossingReady: ready ? `${ready.from} to ${ready.to}` : null });
    $('hubSeeds').textContent = s.seeds; $('hubCrystals').textContent = s.crystals || 0;
    $('hubNext').hidden = !v.next || !s.tutorialDone;
    $('hubNext').classList.toggle('crossing', !!(v.next && v.next.crossing));
    $('hubNext').innerHTML = v.next ? `<p class="label">NEXT</p><b>${v.next.title}</b>${v.next.hangar ? '<img class="next-pic" src="assets/ui/lesson-hangar.png" alt="">' : ''}` : '';   // the free part: a picture of where to go
    const toHangar = v.next && v.next.hangar;   // a free upgrade LEADS into the hangar (the user, 2026-10-27)
    $('hubNext').onclick = ready ? () => { sfx.flap(); s.flyCrossing = ready; writeSave(s); this.start(); } : toHangar ? () => { sfx.flap(); this.go('hangar'); } : v.next && v.next.nature ? () => { sfx.flap(); this.go('nature'); } : null;
    // The user, 2026-10-27: TAKE OFF is LOCKED until the free part is picked (nothing else made them find the hangar).
    $('goBtn').classList.toggle('locked', !!toHangar); $('goBtn').disabled = !!toHangar;
    $('goBtn').textContent = toHangar ? 'PICK YOUR FREE PART FIRST' : s.tutorialDone ? 'TAKE OFF' : 'START';
    $('hubRoute').innerHTML = `${v.route[0] || ''} &#9654; ${v.route[1] || ''}`;
    $('hubTiles').innerHTML = v.tiles
      .map(t => `<button class="btn hub-tile ${t.id === 'hangar' && toHangar ? 'pulse' : ''}" type="button" data-go="${t.id}">${t.label}${t.badge ? `<span class="badge">${t.badge}</span>` : ''}</button>`).join('');
    $('hubTiles').querySelectorAll('[data-go]').forEach(b => b.onclick = () => { sfx.flap(); this.go(b.dataset.go); });
    // The world: big, draggable and spinnable; once the route choice is revealed, tapping a way's dot picks it.
    const path = flightPath(s, 5), here = city(path[0]), opts = v.worldChoice ? choices(path[0], linksFor(s)) : [];
    const pick = name => { sfx.flap(); s.heading = name; writeSave(s); this.renderJourney(); this.renderHub(); };
    this.hubGlobe = drawGlobe($('hubGlobe'), here, path.map(city), { ways: opts.map(o => city(o.name)), onPick: v.worldChoice ? pick : null, lit: linksFor(s) });
    this.hubWords = v.words;
  }

  // Where the results lead (season 2): a free part waiting → the HANGAR; NATURE just opened and not yet seen → NATURE.
  resultsLead() {
    const s = this.save;
    if (!FEATURES.season2 || !isSeason2(s) || !s.tutorialDone) return null;
    if (s.freeUpgrade && hubRevealed(s, 'hangar')) return 'hangar';
    if (hubRevealed(s, 'nature') && !(s.tours || []).includes('nature-lead')) return 'nature';
    return null;
  }

  // Season 2 (S3): off-flight missions complete the moment the save changes (a purchase, a project): src/missions2.js.
  missionsAfterSave() {
    if (!isSeason2(this.save)) return;
    const got = missionsOnSave(this.save);
    if (got.length) { writeSave(this.save); this.toast('Mission done!', got.map(m => m.title).join(', '), 'good', 3); }
  }
  // The MISSIONS screen: what you can do now (the area's open tiers, starred = the crossing trial), and prizes to claim.
  showMissions() {
    this.missionsAfterSave();   // an off-flight mission already met ticks now, not at the next purchase (sim chat's nit)
    const s = this.save, list = missionsVisible(s);
    const row = m => `<div class="mrow ${m.star ? 'star' : ''} ${m.daily ? 'daily' : ''}"><span>${m.star ? '&#9733; ' : ''}${m.title}</span><span class="prize">+${m.prize.seeds}<i class="seedicon"></i></span></div>`;
    const daily = dailyVisible(s);
    $('mList').innerHTML = (list.map(row).join('') || '<p>All done here. Fly a crossing to a new area!</p>')
      + (daily.length ? '<p class="label">Today</p>' + daily.map(row).join('') : '');
    $('mTier').textContent = list.length && list[0].tier ? `Tier ${Math.max(...list.map(m => m.tier))} of 3` : 'Chapter 1';
    this.showOnly('missions');
    this.renderPrizes($('mPrizes'), () => this.showMissions());
  }

  // ---------- navigation ----------
  // One screen at a time, chosen from the bar along the bottom. Pop-ups (how to play, about,
  // info, points) close on any move. `this.pilot` (PilotScreens) renders PILOT and BOARDS.
  go(tab) {
    if (tab === 'fly') return this.showTitle();
    if (tab === 'hangar') return this.showHangar();
    if (tab === 'missions') return this.showMissions();
    if (tab === 'nature') { this.markShopSeen(); if (this.tour) this.tour.markDone('nature-lead'); this.showOnly('nature'); this.wild && this.wild.render(); if (this.tour) this.tour.maybe('nature'); return; }
    if (tab === 'pilot') { this.showOnly('pilot'); return this.pilot && this.pilot.showPilot(); }
    if (tab === 'boards') { this.showOnly('boards'); return this.pilot && this.pilot.showBoards(); }
  }

  showOnly(id) {
    for (const s of ['title', 'results', 'hangar', 'nature', 'pilot', 'boards', 'missions']) $(s).hidden = s !== id;
    for (const s of ['how', 'about', 'info', 'scoreInfo', 'wInfo']) $(s).hidden = true;
    $('tabbar').hidden = !id || FEATURES.season2;   // no bar while flying; season 2: the hub's tiles instead (S2)
    $('hubBack').hidden = !FEATURES.season2 || !['hangar', 'nature', 'pilot', 'boards', 'missions'].includes(id);
    if (id !== 'title') $('title').classList.remove('menu', 'world');
    const on = { title: 'fly', results: 'fly', hangar: 'hangar', nature: 'nature', pilot: 'pilot', boards: 'boards' }[id];
    document.querySelectorAll('#tabbar [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === on));
    $('tNew').hidden = !this.hasNew();
    $('tNew').textContent = this.save.freeUpgrade ? 'FREE!' : 'NEW!';
  }

  showTitle() {
    // Season 2: a save with no start area chooses it first, as a full screen (S3), before the hub ever shows.
    if (FEATURES.season2 && needsStartChoice(this.save)) { this.askStart().then(() => this.showTitle()); return; }
    $('tTrees').textContent = this.save.seeds;
    $('tCrystals').textContent = this.save.crystals || 0;
    $('tBest').textContent = km(this.save.bestDistance);
    $('goBtn').textContent = this.save.tutorialDone ? 'TAKE OFF' : 'START';
    $('tNew').hidden = !this.hasNew();
    // The meter of the land you take off from (each land has its own).
    const startRegion = (city(this.save.city) || {}).region || 'woodland', startBio = biodiversity(this.save, startRegion);
    const any = Object.values(this.save.planted || {}).some(n => n > 0) || startBio > 0;
    $('tMeter').innerHTML = any && REGION_NAMES[startRegion] ? meterHTML(this.save, startBio, startRegion) : '';
    this.renderMission();
    this.renderPrizes();
    $('tEra').innerHTML = this.save.tutorialDone ? eraBarHTML(this.save) : '';   // era progress (src/eras.js)
    this.renderJourney();
    if (FEATURES.season2 && isSeason2(this.save)) { setDaily(this.save, new Date().toISOString().slice(0, 10)); writeSave(this.save); this.missionsAfterSave(); }   // + off-flight missions already met (e.g. on entering a new area)   // the daily trio: the date comes from here, not the rules
    if (FEATURES.season2) this.renderHub();
    this.showOnly('title');
    if (this.showRepriced()) return;
    if (this.showResetWelcome()) return;
    if (this.tour) this.tour.maybe('title');
  }

  // Once, after the eras reset (src/fleet.js migrateFleet): "Welcome to the 1950s" and the gift.
  showResetWelcome() {
    const w = this.save.eraWelcome;
    if (!w || w.shown || (this.save.seenTips || []).includes('*')) return false;   // '*': automated tests' saves
    showEraWelcome(0, { reset: true, bonus: w.bonus }).then(() => { w.shown = true; writeSave(this.save); this.showTitle(); });
    return true;
  }

  // Once, after an old save was re-valued at the new prices (src/reprice.js).
  showRepriced() {
    const r = this.save.repriced;
    if (!r || r.shown) return false;
    const names = r.lost.map(l => `<b>${l.name}</b>`), list = names.length > 4 ? `${names.slice(0, 4).join(', ')} and more` : names.join(', ');
    $('rpBody').innerHTML = `<p>Upgrades now cost more, so the best ones take real saving up.</p>`
      + `<p>We rebuilt your plane with <b>everything you earned</b>: ${r.worth.seeds} seeds and ${r.worth.crystals} ice crystals.</p>`
      + (names.length ? `<p>Save up again for: ${list}.</p>` : '<p>You keep every upgrade!</p>')
      + `<p>Left in your bank: <b>${r.seeds}</b> seeds and <b>${r.crystals}</b> ice crystals.</p>`;
    $('repriced').hidden = false;
    $('rpOk').onclick = () => { $('repriced').hidden = true; r.shown = true; writeSave(this.save); if (this.tour) this.tour.maybe('title'); };
    return true;
  }

  // ---------- results ----------
  // Something to spend in the hangar? Drives the NEW! tags and the glowing button.
  // Something NEW to spend on: a free upgrade, or something that has become affordable or opened since
  // the hangar / NATURE was last looked at (0.10.2: it used to glow whenever ANYTHING was affordable).
  buyableKeys() { return [...LINES.filter(l => canBuy(this.save, l)).map(l => `line:${l.id}:${level(this.save, l.id) + 1}`), ...fleetBuyable(this.save)]; }
  hasNew() { const seen = this.save.shopSeen || []; return !!this.save.freeUpgrade || this.buyableKeys().some(k => !seen.includes(k)); }
  markShopSeen() { this.save.shopSeen = [...new Set([...(this.save.shopSeen || []), ...this.buyableKeys()])]; writeSave(this.save); }   // canBuy checks unlocks

  // Arcade-style reveal: title slams in, distance counts up, trees tally, the total stamps down,
  // then the Earth bars grow one by one. A tap skips to the end.
  async showResults(r) {
    const lead = this.resultsLead();   // season 2: the one place the lesson leads next (research/FLOW-FIRST-HOUR.md)
    $('againBtn').textContent = lead === 'hangar' ? 'OPEN THE HANGAR' : lead === 'nature' ? 'OPEN NATURE' : 'FLY ON';
    this.hideCoach();   // nothing left open from the flight (the user saw a stray OK at the top after landing, 0.13.0)
    // Season 2: a crossing flown (src/crossings.js): the big news first.
    if (r.crossing) this.toast(r.crossing.landed ? (r.crossing.opens ? `NEW AREA: ${AREAS[r.crossing.opens].name.toUpperCase()}!` : 'YOU MADE IT!') : 'Crossing not made',
      r.crossing.landed ? 'Your crossing is done. Fly on from here!' : 'Improve your plane, your nature and your contrail skill, and try again.', r.crossing.landed ? 'good' : '', 6);
    // NEW ANIMALS this flight (landed or crashed): made once, next to the new badges, before the
    // reveal below collects its steps.
    if (!$('rAnimals')) $('rBadges').insertAdjacentHTML('afterend', '<div id="rAnimals" class="step animals-new" hidden></div>');

    const steps = [...document.querySelectorAll('#results .step')];
    steps.forEach(el => el.classList.remove('in'));
    this.skipReveal = false;
    const wait = ms => new Promise(res => (this.skipReveal ? res() : setTimeout(res, ms)));
    const show = el => el.classList.add('in');
    const count = async (el, to, ms, fmt = v => v) => {
      const t0 = performance.now();
      while (!this.skipReveal) {
        const f = Math.min(1, (performance.now() - t0) / ms);
        el.textContent = fmt(Math.round(to * f));
        if (f >= 1) break;
        await new Promise(res => requestAnimationFrame(res));
      }
      el.textContent = fmt(to);
    };

    $('rTitle').textContent = r.school ? 'Flight school done!' : r.landed ? `Landed in ${r.landedAt}!` : r.reason.replace('\n', ' ');
    const mb = $('rMission');
    mb.hidden = !r.mission && !r.missions2;
    if (r.missions2) {   // season 2 (S3): what this flight finished, then NEXT (the hub's goal)
      const d = r.missions2.done;
      mb.className = `step mission ${d.length ? 'done' : 'notyet'}`;
      mb.innerHTML = (d.length ? `<b>DONE!</b> ${d.join(', ')}` : '') + (r.missions2.next ? `${d.length ? '<br>' : ''}NEXT: <b>${r.missions2.next}</b>` : '')
        + ({ hangar: '<img class="next-pic" src="assets/ui/lesson-hangar.png" alt="">', nature: '<img class="next-pic" src="assets/ui/lesson-nature.png" alt="">' }[this.resultsLead()] || '');   // where the button leads
      mb.hidden = !mb.innerHTML;
    } else if (r.mission) {
      mb.className = `step mission ${r.mission.done ? 'done' : 'notyet'}`;
      mb.innerHTML = r.mission.done
        ? `<b>MISSION DONE!</b> ${r.mission.title}${r.mission.doneText ? `<span class="done-text">${r.mission.doneText}</span>` : ''}${r.mission.last ? '<br>You finished ALL the missions!' : r.mission.next ? `<br>Next: <b>${r.mission.next}</b>` : ''}`
        : `<b>Not this time:</b> ${r.mission.title}<br><span class="small">${r.mission.fail}</span>`;
    }
    $('rRecord').hidden = !r.newRecord;
    $('rDist').textContent = km(0);
    $('rGrab').textContent = '0';
    $('rMultRow').hidden = true; $('rCoolRow').hidden = true; $('rLost').hidden = true;
    $('rFareRow').hidden = true;
    $('rNatureRow').hidden = true;
    $('rCrysRow').hidden = true; $('rCrysRow').classList.remove('stamp');
    // One row per land whose biodiversity rose (each land has its own meter).
    const gains = r.natureGains || (r.natureGain > 0 ? [{ name: REGION_NAMES.woodland, gain: r.natureGain }] : []);
    // Kinds of tree this flight and the forest bonus they give long flights (PROPOSAL-TREES.md: the boost made visible).
    const kinds = r.kinds || 0, bonus = Math.pow(Math.min(1, kinds / FOREST.kinds), FOREST.power);
    $('rNatureRow').innerHTML = gains.map(g => `<div class="nrow"><span>${g.name}</span><b>+${g.gain}</b></div>`).join('') +
      (kinds ? `<div class="nrow"><span>${kinds} kind${kinds === 1 ? '' : 's'} of tree today: forest bonus</span><b>x${bonus.toFixed(2)}</b></div>` : '');
    $('rTotalRow').classList.remove('zero', 'stamp');
    $('rGain').textContent = '';
    for (const id of ['barCo2', 'barNight', 'barSun', 'barTrees']) $(id).style.width = '0';
    for (const id of ['rCo2', 'rNight', 'rSun', 'rTreesCool']) $(id).textContent = '';
    $('rFree').hidden = !this.save.freeUpgrade;
    $('rFree').onclick = lead === 'hangar' ? () => { sfx.flap(); this.go('hangar'); } : null;   // the banner leads there too
    $('rFree').classList.toggle('tappable', lead === 'hangar');
    $('rSkip').hidden = false;
    $('tabHangar').classList.toggle('glow', this.hasNew());   // something to spend: the bar's HANGAR glows
    const rw = (r.rewards || []).filter(u => (this.save.unclaimed || []).some(x => x.key === u.key));
    $('rRewards').hidden = !rw.length;
    if (rw.length) this.renderPrizes($('rRewards'));
    const na = (r.foundIds || []).map(id => WILDLIFE.find(w => w.id === id)).filter(Boolean);
    $('rAnimals').hidden = !na.length;
    $('rAnimals').innerHTML = na.length ? `<p class="label">New animal${na.length > 1 ? 's' : ''} discovered!</p><div class="na-list">${na.map(w =>
      `<span class="na"><img src="${animalPortrait(w)}" alt=""><b>${w.name}</b></span>`).join('')}</div><p class="small">See them in your Wild Area (NATURE).</p>` : '';
    // Flying time and era progress (src/eras.js): after every real flight, landed or crashed.
    $('rEra').hidden = !!r.school;
    $('rEra').innerHTML = r.school ? '' : `<p class="era-gain">+${(r.flyMinutes || 0).toFixed(1)} min flown</p>${eraBarHTML(this.save)}`
      + (r.eraOpened ? `<p class="era-open">NEW ERA! Welcome to ${r.eraOpened}!</p>` : '')
      + (r.newPlane ? `<p class="era-open">A new plane joins your fleet: the <b>${r.newPlane}</b>!</p>` : '');
    const nb = (r.rewards || []).filter(u => u.kind === 'badge');
    $('rBadges').hidden = !nb.length;
    $('rBadges').innerHTML = nb.map(u => `<span class="new-badge"><img src="${medal(u.id, u.tier)}" alt="">NEW BADGE: <b>${u.label}</b></span>`).join('');
    $('rFact').textContent = FACTS[Math.floor(Math.random() * FACTS.length)];
    $('rFact').hidden = !!lead;   // one idea per screen: no random fact when the card leads somewhere (the user, 2026-10-27)
    this.showOnly('results');

    const [title, missionStep, dist, record, tally, earth, ...rest] = steps;
    show(title);
    await wait(350);
    if (r.mission || (r.missions2 && !$('rMission').hidden)) { show(missionStep); if ((r.mission && r.mission.done) || (r.missions2 && r.missions2.done.length)) sfx.buy(); await wait(600); }
    show(dist); await count($('rDist'), r.distance, 600, km);
    if (r.newRecord) { show(record); sfx.buy(); }
    await wait(200);

    // Trees: tally what was grabbed, then the bonuses, then stamp the total.
    show(tally);
    const grab = r.earned[0] ? r.earned[0].n : 0;
    await count($('rGrab'), grab, 400);
    const mult = r.earned.find(e => e.label.startsWith('Long'));
    if (mult) { await wait(250); $('rMultRow').hidden = false; $('rMult').textContent = `x${r.mult}`; $('rMultRow').classList.add('stamp'); sfx.coin(); }
    if (r.earned.some(e => e.label.startsWith('Cool'))) { await wait(250); $('rCoolRow').hidden = false; $('rCoolRow').classList.add('stamp'); sfx.coin(); }
    const fare = r.earned.find(e => e.label === 'Passenger fares');
    if (fare) { await wait(250); $('rFareRow').hidden = false; $('rFare').textContent = `+${fare.n}`; $('rFareRow').classList.add('stamp'); sfx.coin(); }
    if (gains.length || kinds) { await wait(250); $('rNatureRow').hidden = false; $('rNatureRow').classList.add('stamp'); sfx.plant(); }
    await wait(300);
    const total = r.earned.reduce((a, e) => a + e.n, 0);
    if (r.landed) {
      $('rTotalRow').classList.add('stamp');
      await count($('rGain'), total, 300, v => `+${v}`);
      if (total) sfx.buy();
    } else {
      $('rGain').textContent = `+${total}`;
      await wait(300);
      $('rTotalRow').classList.add('zero', 'stamp');
      $('rLost').hidden = false;
      sfx.nope();
    }
    if (r.crystals) { await wait(250); $('rCrysRow').hidden = false; $('rCrys').textContent = `+${r.crystals}`; $('rCrysRow').classList.add('stamp'); sfx.coin(); }
    await wait(450);

    // The Earth: each cause grows in turn.
    show(earth);
    this.drawEarthFace($('rFace'), r.heat);
    const b = r.breakdown;
    const scale = Math.max(30, b.co2, b.night, b.sun, b.trees);
    const bars = [['barCo2', 'rCo2', b.co2, '+'], ['barNight', 'rNight', b.night, '+'], ['barSun', 'rSun', b.sun, '-'], ['barTrees', 'rTreesCool', b.trees, '-']];
    for (const [bar, label, v, sg] of bars) {
      $(bar).style.width = `${Math.min(100, (v / scale) * 100)}%`;
      $(label).textContent = `${sg}${Math.round(v)}`;
      if (v >= 0.5) { sg === '+' ? sfx.warm() : sfx.cool(); await wait(380); }
    }
    await wait(200);
    for (const el of rest) { if (!el.hidden) show(el); }
    $('rSkip').hidden = true;
    if (r.eraOpened) {   // a new era: the big welcome, then the hangar to see what it brings
      await wait(600);
      await showEraWelcome(ERAS.findIndex(e => e.name === r.eraOpened));
      return this.showHangar();
    }
    if (this.tour && !r.school) this.tour.maybe('results');
  }

  // Small pixel Earth for the results, matching the in-game face.
  drawEarthFace(el, heat) {
    const pc = heat * 100 / CLIMATE.dangerLine, mood = heat < 0 ? 0 : pc < 50 ? 1 : pc < 80 ? 2 : 3;   // % of the danger line
    const body = ['3fa8e0', '5fb860', 'e8a33c', 'e0483c'][mood];
    const mouth = ["<rect x='6' y='11' width='1' height='1'/><rect x='7' y='12' width='4' height='1'/><rect x='11' y='11' width='1' height='1'/>",
      "<rect x='7' y='12' width='4' height='1'/>",
      "<rect x='7' y='11' width='4' height='1'/><rect x='6' y='12' width='1' height='1'/><rect x='11' y='12' width='1' height='1'/>",
      "<rect x='7' y='11' width='4' height='1'/><rect x='6' y='12' width='1' height='1'/><rect x='11' y='12' width='1' height='1'/>"][mood];
    const sweat = mood >= 2 ? "<rect x='14' y='3' width='2' height='3' fill='%239fe0ff'/>" + (mood === 3 ? "<rect x='1' y='6' width='2' height='3' fill='%239fe0ff'/>" : '') : '';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18' shape-rendering='crispEdges'><rect x='4' y='0' width='10' height='18'/><rect x='0' y='4' width='18' height='10'/><rect x='2' y='2' width='14' height='14'/><g fill='%23${body}'><rect x='5' y='1' width='8' height='16'/><rect x='1' y='5' width='16' height='8'/><rect x='3' y='3' width='12' height='12'/></g><rect x='4' y='5' width='3' height='3' fill='%232f7a2f'/><rect x='12' y='10' width='3' height='2' fill='%232f7a2f'/><rect x='6' y='7' width='2' height='2'/><rect x='10' y='7' width='2' height='2'/>${mouth}${sweat}</svg>`;
    el.style.backgroundImage = `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
  }

  // ---------- hangar ----------
  persist() { writeSave(this.save); }

  showHangar() {
    this.renderHangar();
    this.showOnly('hangar');
    if (this.tour) this.tour.maybe('hangar');   // season 2: the free-part tour can start here (from OPEN THE HANGAR)
  }

  renderHangar() {
    const s = this.save;
    $('hTrees').textContent = s.seeds; $('hCrystals').textContent = s.crystals || 0;
    const free = !!s.freeUpgrade;
    $('hHint').innerHTML = free ? '<b>Pick ONE upgrade for FREE!</b>' : 'Spend your seeds and ice crystals. New eras open as you fly.';

    const choices = fuelChoices(s);
    const current = choices.includes(s.fuel) ? s.fuel : choices[choices.length - 1];
    $('hFuel').innerHTML = choices.length > 1
      ? 'Fuel: ' + choices.map(f => `<button class="btn ${current === f ? 'on' : ''}" data-fuel="${f}" type="button">${FUELS[f].name}</button>`).join('')
      : '';
    $('hFuel').querySelectorAll('[data-fuel]').forEach(btn => btn.onclick = () => {
      s.fuel = btn.dataset.fuel; writeSave(s); sfx.coin(); this.renderHangar();
    });

    // Since the eras (2026-10-23) the hangar is the fleet: planes, systems, gadgets (src/hangar.js).
    // The old plane lines are retired (upgrades.js); trees and habitat are on NATURE (src/wild.js).
    document.querySelector('#hangar .hp-dock').hidden = true;
    this.markShopSeen();   // looking at the hangar: what is affordable now is no longer NEW
    $('hUpgrades').innerHTML = '';
    this.fleet.render();

    $('hBadges').innerHTML = this.badgeGridHTML();
  }

  // Every badge, by theme: medal (or locked / ??? for secrets), name, what it needs, next tier.
  badgeGridHTML() {
    const s = this.save;
    return Object.entries(THEMES).map(([th, name]) => `<p class="label">${name}</p><div class="badge-grid">` + BADGES.filter(b => b.theme === th).map(b => {
      const t = tierOf(s, b.id), pr = progressOf(s, b), hidden = b.secret && !t;
      const img = t ? medal(b.id, t) : hidden ? 'assets/ui/badge-secret.png' : 'assets/ui/badge-locked.png';
      const say = x => x.charAt(0).toUpperCase() + x.slice(1);   // one-tier badges: just what to do, no "1 ..."
      const next = pr.goal === null ? 'Done!' : b.tiers.length === 1 ? `${say(b.unit)}.`
        : `${tierName(b, t + 1)}: ${pr.goal.toLocaleString()} ${b.unit}${pr.value !== null ? ` (${pr.value.toLocaleString()} so far)` : ''}`;
      return `<div class="badge2 ${t ? 'got' : ''}"><img src="${img}" alt=""><b>${hidden ? '???' : b.name}</b><span>${hidden ? 'A secret badge. Keep flying!' : next}</span></div>`;
    }).join('') + '</div>').join('');
  }

  // One upgrade line's card (hangar and NATURE screen): name, level pips, (i), next level + BUY.
  lineCardHTML(line, depth = 0) {
    const cost = l => `${l.cost}<i class="seedicon"></i>${l.crystals ? ` ${l.crystals}<i class="crysicon"></i>` : ''}`;
      const s = this.save, free = !!s.freeUpgrade, head = '', indent = depth ? ` branch d${Math.min(depth, 3)}` : '';
      if (!unlocked(s, line)) {   // a branch shows its name and what it needs; other locked lines stay a surprise
        return `<div class="line locked${indent}"><div><div class="group">${line.group}</div><div class="name">${line.requires ? line.name : '???'}</div><div class="small">${unlockText(line, s)}</div></div></div>`;
      }
      const have = level(s, line.id), next = nextLevel(s, line);
      const pips = line.levels.map((_, i) => `<span class="pip ${i < have ? 'on' : ''}"></span>`).join('');
      const nowName = have ? line.levels[have - 1].name : 'Not yet';
      const waitBio = needsMoreNature(s, line);
      const isFree = free && next && have === 0 && !waitBio;
      const ok = isFree || canBuy(s, line);
      // What is missing, so a grey button is never a mystery.
      const short = next && !ok && !waitBio ? [Math.max(0, next.cost - s.seeds) && `${next.cost - s.seeds}<i class="seedicon"></i>`,
        Math.max(0, (next.crystals || 0) - (s.crystals || 0)) && `${next.crystals - (s.crystals || 0)}<i class="crysicon"></i>`].filter(Boolean).join(' ') : '';
      const btn = !next ? ''   // maxed: nothing to buy (cost(null) used to crash the redraw, so buying the last level looked like it did nothing)
        : waitBio ? `<span class="small">needs Biodiversity ${next.needsBio}</span>`
        : `<span class="buywrap"><button class="btn ${isFree ? 'free' : ok ? 'go' : ''}" data-buy="${line.id}" type="button" ${ok ? '' : 'disabled'}>${isFree ? 'FREE!' : cost(next)}</button>${short ? `<span class="small need">need ${short} more</span>` : ''}</span>`;
      const nextRow = next
        ? `<div class="next"><span>Next: <b>${next.name}</b>. ${next.short}</span>${btn}</div>`
        : '<div class="next"><span><b>All done!</b></span></div>';
      return head + `<div class="line ${next ? '' : 'maxed'} ${isFree ? 'pick' : ''}${indent}${this.hFocus === line.id ? ' focus' : ''}" data-line="${line.id}">
        <div><div class="group">${line.group}</div><div class="name">${line.name}</div><div class="small">${nowName}</div><div class="pips">${pips}</div></div>
        <button class="infobtn" data-info="${line.id}" type="button" aria-label="About ${line.name}">i</button>
        ${nextRow}</div>`;
  }

  // The hangar model: the plane as it looks now (gear down: it is parked), 3x. With a line in
  // focus it zooms to that part (planeparts.js ZOOM) and shows the NEXT level, pulsing.
  renderPlaneModel() {
    const s = this.save, id = this.hFocus, line = id && LINES.find(l => l.id === id);
    const levels = natureLevels(s);
    let preview = null;
    if (line && nextLevel(s, line)) {
      levels[id] = level(s, id) + 1;
      const now = new Set(partKeys(natureLevels(s)));
      preview = partKeys(levels).find(k => !now.has(k)) || null;   // the part that changes (none for lines with no look)
    }
    const img = (k, cls = '') => `<img class="hp-part ${cls}" src="assets/${k}.png" alt="">`;
    const stage = $('hPlane').querySelector('.hp-stage');
    // This line's part: 'plane-<line>-N', or the tail badge for nature lines. HIDE takes it off.
    const mine = k => line && (NATURE_LINES.includes(id) ? k.startsWith('plane-nature-') : k.startsWith(`plane-${id}-`));
    const keys = partKeys(levels).filter(k => !(this.hHide && mine(k)));
    const box = id && !['fuel', 'airframe'].includes(id) ? zoomBox(id) : null;
    const corners = box ? [[0, 0, 0], [1, 0, 90], [1, 1, 180], [0, 1, 270]].map(([cx, cy, r]) =>
      `<img class="hp-corner" src="assets/ui/focus-corner.png" alt="" style="left:${box[0] + 6 + cx * (box[2] - 5)}px;top:${box[1] + 6 + cy * (box[3] - 5)}px;transform:rotate(${r}deg)">`).join('') : '';
    stage.innerHTML = '<img class="hp-bg" src="assets/ui/hangar-bg.png" alt=""><img class="hp-bg" src="assets/ui/hangar-spot.png" alt="">'
      + '<img class="hp-base" src="assets/plane.png" alt="">' + keys.map(k => img(k, k === preview ? 'hp-preview' : '')).join('')
      + corners + '<img class="hp-part hp-sparkle" alt="" hidden>';
    // The part panel: what it is and what the next level does; HIDE / SHOW; the full (i) page.
    $('hPart').hidden = !line;
    if (line) {
      const next = nextLevel(s, line), have = level(s, id);
      $('hpText').innerHTML = `<b>${line.name}</b>${have ? ` <span class="small">(now: ${line.levels[have - 1].name})</span>` : ''}<br>`
        + (next ? `Next: <b>${next.name}</b>. ${next.short}` : '<b>All done!</b>') + `<br><span class="small">${line.info.why}</span>`;
      $('hpToggle').textContent = this.hHide ? 'SHOW PART' : 'HIDE PART';
    }
    // Zoom: fit the part's box (base pixels; overlays have a 6 px margin) in the 222 x 117 window.
    let t = 'translate(0px, 0px) scale(3)';
    if (box) {
      const [x, y, w, h] = box, z = Math.min(9, 0.7 * Math.min(222 / w, 117 / h));
      const clamp = (v, lo) => Math.min(0, Math.max(lo, v));   // never show past the edge of the hangar picture
      t = `translate(${clamp(111 - (x + 6 + w / 2) * z, 222 - 74 * z)}px, ${clamp(58.5 - (y + 6 + h / 2) * z, 117 - 39 * z)}px) scale(${z})`;
    }
    stage.style.transform = t;
    $('hPlane').classList.toggle('zoomed', !!id);
    if (this.sparkleModel) {
      this.sparkleModel = false;
      const sp = stage.querySelector('.hp-sparkle');
      [0, 1, 2, 3].forEach(f => setTimeout(() => { sp.hidden = false; sp.src = `assets/plane-sparkle-${f}.png`; }, f * 70));
      setTimeout(() => { sp.hidden = true; }, 280);
    }
  }

  buy(id) {
    const s = this.save;
    if (!buyLevel(s, id)) { sfx.nope(); return; }   // src/upgrades.js: the same rule the sim engine's player uses
    this.missionsAfterSave();
    this.sparkleModel = true;
    writeSave(s);
    sfx.buy();
    this.refresh();
  }

  // Redraw whichever shop screen is open (the hangar, or NATURE: src/wild.js).
  refresh() { if (!$('nature').hidden && this.wild) this.wild.render(); else this.renderHangar(); }

  showInfo(id) {
    const line = LINES.find(l => l.id === id), have = level(this.save, id);
    $('iGroup').textContent = line.group;
    $('iName').textContent = line.name;
    $('iLevels').innerHTML = line.levels.map((l, i) =>
      `<li class="${i < have ? 'have' : ''}"><b>${l.name}</b> (${l.cost} seeds${l.crystals ? ` + ${l.crystals} ice crystals` : ''}${l.needsBio ? `, Biodiversity ${l.needsBio}` : ''}): ${l.short}${i < have ? ' - yours!' : ''}` +
      (l.species ? `<br><span class="small">${SPECIES[l.species].fact}</span>` : '') + '</li>').join('');
    $('iWhat').textContent = line.info.what;
    $('iWhy').textContent = line.info.why;
    $('iFact').textContent = line.info.fact;
    $('iLinks').innerHTML = line.info.links.filter(k => k !== 'citizenzoo' || FEATURES.citizenZoo).map(k => {
      const l = LINKS[k];
      return l.url ? `<a href="${l.url}" target="_blank" rel="noopener">${l.label} &gt;</a>` : `<span>${l.label} (coming soon)</span>`;
    }).join('');
    $('info').hidden = false;
  }

  // Grown-up gate: hold the button for 2 s (a bar fills). Then it turns into a real link, which
  // the grown-up taps. Opening the site straight from a tap means no browser blocks it (a link
  // opened from a timer is blocked on phones, Safari especially). The link hides again after 10 s.
  setupRealTree() {
    const btn = $('realTreeBtn'), link = $('realTreeLink');
    link.href = LINKS.citizenzoo.url;
    let timer = null, back = null;
    const cancel = () => { clearTimeout(timer); timer = null; btn.classList.remove('holding'); };
    const reset = () => { clearTimeout(back); link.hidden = true; btn.hidden = false; $('gateMsg').hidden = false; };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);   // keep the hold even if the finger wobbles off the button
      btn.classList.add('holding');
      timer = setTimeout(() => { cancel(); btn.hidden = true; $('gateMsg').hidden = true; link.hidden = false; back = setTimeout(reset, 10000); }, 2000);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, cancel));
    btn.addEventListener('contextmenu', e => e.preventDefault());   // no long-press menu
    link.addEventListener('click', () => setTimeout(reset, 500));
  }

  setupMute() {
    const btn = $('muteBtn');
    const apply = () => { setMuted(this.save.muted); btn.textContent = `sound: ${this.save.muted ? 'off' : 'on'}`; };
    btn.onclick = () => { this.save.muted = !this.save.muted; writeSave(this.save); apply(); };
    apply();
  }

  // ---------- in-flight tips ----------
  toast(title, body, kind = '', secs = 3.5) {
    if (!$('coach').hidden) return;   // flight school talks instead
    // A toast is never replaced before TOAST_MIN s (the user, 2026-10-27: one vanished "in literally a microsecond"): it queues.
    const now = Date.now();
    if (!$('toast').hidden && now - (this.toastAt || 0) < TOAST_MIN * 1000) {
      (this.toastQueue = this.toastQueue || []).push([title, body, kind, secs]);
      clearTimeout(this.toastNext); this.toastNext = setTimeout(() => this.toastNow(), TOAST_MIN * 1000 - (now - this.toastAt));
      return;
    }
    this.toastAt = now;
    const t = $('toast');
    t.className = `toast ${kind}`;
    t.innerHTML = `<b>${title}</b>${body}`;
    t.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (t.hidden = true), secs * 1000);
  }
  toastNow() { const q = (this.toastQueue || []).shift(); if (q) { $('toast').hidden = true; this.toast(...q); } }
  hideToast() { clearTimeout(this.toastTimer); clearTimeout(this.toastNext); this.toastQueue = []; $('toast').hidden = true; }
  // At the end of a flight: drop queued toasts; one up for under TOAST_END_MIN s finishes that much first (never cut at once).
  endToasts() {
    clearTimeout(this.toastNext); this.toastQueue = [];
    const left = TOAST_END_MIN * 1000 - (Date.now() - (this.toastAt || 0));
    if ($('toast').hidden || left <= 0) return this.hideToast();
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => ($('toast').hidden = true), left);
  }

  // Show a tip only the first time on this device.
  tipOnce(id, title, body, kind, secs) {
    if (this.save.seenTips.includes(id)) return false;
    this.save.seenTips.push(id);
    writeSave(this.save);
    this.toast(title, body, kind, secs);
    return true;
  }

  // ---------- flight school ----------
  // waiting=true: the game is frozen until the player continues. button=true (the default): only
  // the OK button continues, enabled after a short pause so a tap meant for the plane can't hit it.
  // button=false: a tap anywhere continues (the "tap the screen" lesson in flight school).
  coach(text, waiting, school = true, button = true, pic = null) {
    $('coachText').innerHTML = text;
    const img = $('coachPic');
    img.hidden = !pic;
    // pic: a lesson picture key (assets/ui/<key>.png), or a full path (a tree's portrait: src/animalart.js).
    if (pic) { img.onerror = () => { img.hidden = true; }; img.src = pic.includes('/') ? pic : `assets/ui/${pic}.png`; }   // no drawing yet: words only
    $('coachDim').hidden = !(pic && waiting);           // a lesson: the game is frozen and dimmed behind it
    $('coach').classList.toggle('lesson', !!(pic && waiting));
    const ok = $('coachOk');
    this.coachButton = !!waiting && button;
    $('coachTap').hidden = !waiting || this.coachButton;
    ok.hidden = !this.coachButton;
    if (this.coachButton) { ok.disabled = true; clearTimeout(this.okTimer); this.okTimer = setTimeout(() => { ok.disabled = false; }, 700); }
    $('coach').classList.toggle('waiting', !!waiting);
    $('coach').classList.toggle('tappable', !waiting && !school);   // an in-flight tip: a tap ON it may close it (after 2 s: GameScene.onCoachTap)
    $('coach').hidden = false;
    $('coach').classList.toggle('high', !school);   // explanations sit high, so the ground stays visible
    $('skipSchool').hidden = !school;
  }
  hideCoach() { $('coach').hidden = true; $('coachDim').hidden = true; $('skipSchool').hidden = true; this.coachButton = false; }
}
