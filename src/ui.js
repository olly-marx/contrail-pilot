import { FEATURES, km, CLIMATE, FOREST } from './config.js';
import { VERSION } from './version.js';
import { choices, city, EARTH_KM, linksFor, schoolSave } from './route.js';
import { routeFor, toggleSkip, SKIP_TEXT } from './aim.js';
import { headingWord } from './network.js';
import { AREAS, unlockedAreas } from './areas.js';
import { needsStartChoice, chooseStart, applyStart } from './startchoice.js';
import { available as crossingsNow, readiness, moreToCome, laterEra } from './crossings.js';
import { SEASON } from './season.js';
// Season 2 debug (?s2unlock=1, preview only): every available crossing can be flown, skipping the offer gates (M3 tryout).
const S2_UNLOCK = typeof location !== 'undefined' && new URLSearchParams(location.search).get('s2unlock') === '1';
// Season 2: the crossings you can see from your areas, each with what it still needs (MASTER-PLAN B4).
// The capability estimate, this area's biodiversity and its contrail missions arrive in M4/M6; until then 0 / false.
// A crossing can open an AREA or the ocean stepping stones (Honolulu, Nadi: no area of their own, so no AREAS entry).
const opensName = id => (AREAS[id] ? AREAS[id].name : 'the Pacific');
const crossingsHTML = s => {
  if (!s.tutorialDone) return '';
  const list = crossingsNow(s);
  if (!list.length) { const le = laterEra(s); if (le !== null) return `<div id="jCross"><p class="small" id="jLater"><b>NEXT CROSSING</b><br>New crossings open in ${ERAS[le].name}. Keep flying to get there!</p></div>`; }
  if (!list.length) return moreToCome(s) ? '<div id="jCross"><p class="small" id="jMore"><b>MORE TO COME!</b><br>You have flown every crossing there is for now. Faster planes and the far oceans are on their way.</p></div>' : '';
  return `<div id="jCross">${list.map(c => { const rd = readiness(s, c), go = rd.ready || S2_UNLOCK;
    const needs = [!rd.era && 'a later era', !rd.plane && NEED_FAR, !rd.nature && `nature ${SEASON.offer.biodiversity} (now ${rd.natureHave})`].filter(Boolean);
    const head = c.kind === 'lap' ? `<b id="jLap">THE LAP OF THE EARTH</b>${routeLapRest(c)}`   // the final boss (M4)
      : `<b>CROSSING: ${c.from} &gt; ${c.to}</b>${routeCrossRest(c)}`;
    return `<p class="small">${head}<br>
      ${go ? `<button class="btn go" type="button" data-cross="${c.id}">FLY THE CROSSING</button>` : `Needs: ${needs.join(', ')}`}</p>`; }).join('')}</div>`;
};
// Season 2: which areas you fly in, and which are still locked (dim dots on the globe; crossings open them).
const areaLine = s => { const open = unlockedAreas(s), shut = Object.keys(AREAS).filter(k => !open.includes(k));
  return `<p class="small" id="jAreas">Your area: <b>${open.map(k => AREAS[k].name).join(', ')}</b>${shut.length ? `<br>&#128274; Locked: ${shut.map(k => AREAS[k].name).join(', ')}` : ''}</p>`; };
import { drawGlobe } from './globe.js';
import { rollWeek } from './records.js';
import { showRecords } from './recordsui.js';
import { hubView, revealed as hubRevealed } from './hub.js';
import { isSeason2, onSave as missionsOnSave, visible as missionsVisible, setDaily, dailyVisible, lessonsLeft, steadyVisible, streakBonus, saving } from './missions2.js';
import { REGION_NAMES } from './habitats.js';
import { missionReward, migrateClaims, sumPrizes } from './rewards.js';
import { medal, tierName, nearBadges } from './badges.js';
import { WILDLIFE } from './wildlife.js';
import { animalPortrait } from './animalart.js';
// HTML screens around the game: title, results, hangar (shop), info pop-ups, tips and flight school.
import { LINES, FUELS, level, nextLevel, canBuy, buyLevel, fuelChoices, unlocked, unlockText, needsMoreNature, tabOf, lineById, freeParcels } from './upgrades.js';
import { biodiversity, stage, STAGES, NATURE_FACTS, SPECIES } from './nature.js';
import { treesPlanted } from './treecount.js';
import { recordTouchdown } from './landlog.js';
import { current as currentMission, blocked as missionBlocked, allDone as missionsDone, indexOf as missionIndexOf, MISSIONS } from './missions.js';
import { LINKS } from './links.js';
import { writeSave, resetSave, listStashed, restoreStashed, releaseHold, heldReason, restoreFromBackup, progressOf } from './save.js';
import { copyText } from './pilot.js';
import { makeBackup, backupText, tooBigToShare, fileName, readBackup, refusalLines, compareLines, onlineWarns, ONLINE_WARNING, SHARE_TEXT } from './backup.js';
import { allowRoughUpload, getPilot, rememberFirst, setRecoverNext, takeOnlineNote, hasOnlineNote, onlineProgress } from './online.js';
import { askPersist, noteDue, noteText, PERSIST_TIP } from './persist.js';
import { eraBarHTML } from './eras.js';
import { FleetHangar } from './hangar.js';
import { dots, markSeen, migrateSeen, defaultLands, hangarScope } from './fresh.js';
import { showEraWelcome } from './welcome.js';
import { showSheet } from './sheet.js';
import { resultsView, NEXT_ROWS } from './resultscard.js';
import { nextUp } from './nextup.js';
import { endView } from './crossingend.js';
import { crossingState, crossingById, momentDue, markTold, sheetText, NEED_FAR, routeCrossRest, routeLapRest, endingBody, boxView, screenView } from './crossingview.js';
import { missionsView, missionsFreshKeys } from './missionsview.js';
import { ERAS } from './eras.js';
import { NATURE_LINES, partKeys, zoomBox, natureLevels } from './planeparts.js';
import { sfx, setMuted, unlockAudio } from './sound.js';
import { setMusicOff, setMusicLevel, armMusic, syncMusic } from './music.js';
import { musicStateOf, nextMusicState, musicChipText } from './musicplan.js';

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

// Lesson 5 is next and no tree parcels are owned: NATURE must open where they are sold (the audit, 2026-10-28).
export const parcelsWanted = s => isSeason2(s) && (s.missionsDone || []).includes('L4') && !(s.missionsDone || []).includes('L5') && !((s.levels || {}).trees > 0);

export class UI {
  constructor(save, { onStart, onSchool }) {
    this.fleet = new FleetHangar(this); this.sfx = sfx;   // the plane side's hangar (src/hangar.js)
    this.save = save; this.crossingAuto = new Set();   // (the crossing ids whose sheet has opened by itself this page load)
    this.migrated = migrateClaims(save); if (this.migrated) writeSave(save);   // R8: prizes an older save never claimed are paid once, then a toast on the first menu
    this.onStart = onStart;
    this.onSchool = onSchool;
    this.toastTimer = null;

    $('goBtn').onclick = () => this.start();
    $('againBtn').onclick = () => { const to = this.resultsLead(); return to ? this.go(to) : this.showTitle(); };   // FLY ON, or where the lesson leads
    $('schoolBtn').onclick = () => this.startSchool();
    document.querySelectorAll('#tabbar [data-go]').forEach(b => b.onclick = () => { sfx.tick(); this.go(b.dataset.go); });
    $('hGoBtn').onclick = () => this.startFromHangar();
    $('hGoTop').onclick = () => { if (this.fleet.paying) this.fleet.endPayoff(); this.startFromHangar(); };
    $('howBtn').onclick = () => { $('how').hidden = false; };
    $('howClose').onclick = () => { $('how').hidden = true; };
    $('aboutBtn').onclick = () => { $('aboutVersion').textContent = `Contrail Pilot v${VERSION}`; $('about').hidden = false; };
    $('aboutClose').onclick = () => { $('about').hidden = true; };
    // Tap anywhere on the results while it is revealing to skip to the end.
    $('results').addEventListener('pointerdown', () => { this.skipReveal = true; }, true);
    $('iClose').onclick = () => { $('info').hidden = true; };
    $('resetBtn').onclick = () => {
      if (!confirm('Delete all seeds, ice crystals, upgrades and badges on this device? You can get this game back from Settings: RECOVER AN EARLIER SAVE.')) return;
      Object.assign(this.save, resetSave());   // (resetSave keeps the current save first)
      allowRoughUpload();                       // a deliberate reset may replace the online copy
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
  // TAKE OFF in the hangar: when a rails step is due on HOME the player is taken to the FLY screen (it starts there) and the flight waits for HOME's button.
  startFromHangar() {
    if (this.tour && !this.save.freeUpgrade && this.tour.homeRailDue()) return this.go('fly');   // (the free part first: start() keeps the player in the hangar)
    return this.start();
  }

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

  // The journey on the FLY screen (2026-10-22): where you are, three ways to go (the next city each
  // way, and its land), a globe with the way ahead, and how many times round the Earth you have flown.
  renderJourney() {
    const s = this.save, first = !s.tutorialDone;
    const path = routeFor(first ? schoolSave(s) : s, 5), here = city(path[0]);
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
    const pick = name => { sfx.tick(); this.save.heading = name; writeSave(this.save); this.renderJourney(); };
    // Season 2: fly a crossing (the flight's rules read save.flyCrossing; GameScene clears it when the flight ends).
    document.querySelectorAll('#jCross [data-cross]').forEach(b => b.onclick = () => {
      sfx.tick(); const cs = crossingById(s, b.dataset.cross, { unlock: S2_UNLOCK }); if (cs) this.showCrossingSheet(cs); });   // (R-A: the sheet confirms before the flight)
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
    $('hubGear').onclick = () => this.openGear();   // R10 (research/UX-MASTER-PLAN.md C2): ONE gear sheet: how to play, flight school, sound, about, reset, the credit
    $('hubBack').onclick = () => { sfx.tick(); this.go('fly'); };
    $('hubSpinL').onclick = () => { this.globeUsed(); this.hubGlobe && this.hubGlobe.nudge(-24); };
    $('hubSpinR').onclick = () => { this.globeUsed(); this.hubGlobe && this.hubGlobe.nudge(24); };
    $('hubRoute').onclick = () => this.openRouteSheet();   // R-B: the route choice and the crossings open as a SHEET (no page push)
  }
  // 'Skip the mission route this trip' (src/aim.js): a button under HOME's route line, shown only while a city mission is open (v.skip).
  // It flies the normal tour for this trip; the mission stays open; a landing clears it (rules.js), a crash keeps it.
  renderSkip(skip) {
    let b = $('hubSkip');
    if (!b) { b = document.createElement('button'); b.id = 'hubSkip'; b.type = 'button'; b.className = 'chip hubonly hub-skip'; $('hubWorld').after(b);
      b.onclick = () => { sfx.tick(); toggleSkip(this.save); writeSave(this.save); this.renderHub(); }; }
    b.hidden = !skip; b.textContent = skip === 'on' ? SKIP_TEXT.undo : SKIP_TEXT.skip;
  }
  // R-B: the globe's caption goes away for good after the first spin, drag or dot tap (a save flag in `tours`, like the other one-time hints).
  globeUsed() { const s = this.save; if ((s.tours || []).some(t => t === 'globe-hint' || t === '*')) return; s.tours = [...(s.tours || []), 'globe-hint']; writeSave(s); const h = $('hubHint'); if (h) h.hidden = true; }
  // R-B: the route choice and the crossings (the old #tJourney panel behind the route line) as a SHEET: the panel's own node is moved into it (its handlers
  // come along) and handed back when the sheet closes or is replaced (showSheet's onClose), so nothing pushes the page down.
  openRouteSheet() {
    sfx.tick(); this.renderJourney();
    const j = $('tJourney'), home = j.parentNode, next = j.nextSibling;
    showSheet({ eyebrow: 'YOUR ROUTE', title: 'Which way?', ok: 'CLOSE', html: '<div id="routeSheetBody" class="route-sheet"></div>', onClose: () => { home.insertBefore(j, next); j.style.display = ''; this.renderHub(); } });   // (a way chosen in the sheet shows on HOME's chip and globe)
    $('routeSheetBody').appendChild(j); j.style.display = 'block';
  }

  // The gear sheet (R10): the four small buttons, reset and the credit behind one gear, as a sheet (src/sheet.js) with 40 px buttons. The old buttons
  // stay in the page (the classic screens use them, and their handlers are the ones the sheet calls), hidden on HOME.
  openGear() {
    sfx.tick();
    const s = this.save, credit = document.querySelector('#title .credit');
    const close = showSheet({ eyebrow: 'MENU', title: 'Settings', ok: 'CLOSE',
      html: `<div class="gear-list"><button class="chip" type="button" data-gear="how">HOW TO PLAY</button><button class="chip" type="button" data-gear="school">FLIGHT SCHOOL</button>`
        + `<button class="chip" type="button" data-gear="sound">SOUND: ${s.muted ? 'OFF' : 'ON'}</button><button class="chip" type="button" data-gear="music">${musicChipText(s)}</button><button class="chip" type="button" data-gear="soundtest">TEST SOUND</button><button class="chip" type="button" data-gear="about">ABOUT US</button>`
        + `<button class="chip" type="button" data-gear="saved">YOUR SAVED GAME</button></div><p class="small gear-soundmsg" id="gearSoundMsg"></p>${credit ? `<p class="small gear-credit">${credit.innerHTML}</p>` : ''}` });
    this.wireGear(close);
  }
  // The second page of Settings (0.37.x: the one sheet had 8 buttons and its CLOSE ran off a 320x568 screen): everything about the saved game.
  openSaved() {
    sfx.tick();
    const s = this.save;
    const close = showSheet({ eyebrow: 'SETTINGS', title: 'Your saved game', ok: 'CLOSE',
      html: `<div class="gear-list"><button class="chip" type="button" data-gear="recover">RECOVER AN EARLIER SAVE</button><button class="chip" type="button" data-gear="backup">BACK UP MY GAME</button><button class="chip" type="button" data-gear="restore">RESTORE A BACKUP</button><button class="chip warn" type="button" data-gear="reset">RESET PROGRESS</button></div><p class="small gear-last">${s.lastBackup ? `Last backup: ${s.lastBackup}` : 'Last backup: never'}</p>` });
    this.wireGear(close);
  }
  // The taps of both Settings pages (the old buttons stay in the page: the classic screens use them, and their handlers are the ones called here).
  wireGear(close) {
    const act = { how: () => $('howBtn').click(), school: () => $('schoolBtn').click(), about: () => $('aboutBtn').click(), saved: () => this.openSaved(), recover: () => this.openRecover(), backup: () => this.openBackup(), restore: () => this.openRestore(), reset: () => $('resetBtn').click() };
    document.querySelectorAll('#sheet [data-gear]').forEach(b => b.onclick = () => {
      if (b.dataset.gear === 'sound') { $('muteBtn').click(); b.textContent = `SOUND: ${this.save.muted ? 'OFF' : 'ON'}`; return; }   // the sheet stays open: you hear the change
      if (b.dataset.gear === 'music') { const nx = nextMusicState(musicStateOf(this.save)); this.save.musicOff = nx === 'off'; if (nx !== 'off') this.save.musicLevel = nx; writeSave(this.save); setMusicLevel(this.save.musicLevel); setMusicOff(this.save.musicOff); b.textContent = musicChipText(this.save); return; }   // OFF -> SOFT -> MIDDLE -> LOUD -> OFF; the sheet stays open: you hear the change
      if (b.dataset.gear === 'soundtest') return this.testSound();
      close(); act[b.dataset.gear](); });
  }

  // ---- BACK UP MY GAME (research/BACKUP-MY-GAME.md; src/backup.js holds the format and the words) ----
  markBackup() { this.save.lastBackup = new Date().toISOString().slice(0, 10); writeSave(this.save); }
  openBackup() {
    const s = this.save, pilot = (getPilot() || {}).first || '', text = backupText(makeBackup(s, { game: window.__CP_VERSION || 'unknown', pilot }));
    const canShare = typeof navigator !== 'undefined' && !!navigator.share;
    showSheet({ eyebrow: 'KEEP IT SAFE', title: 'Back up my game', ok: 'CLOSE',
      html: `<p class="small">Your game lives in this browser only. A backup is a small file only you keep.</p>${tooBigToShare(text) ? '<p class="small">This backup is big.</p>' : ''}<div class="gear-list">${canShare ? '<button class="chip" type="button" data-bk="share">SHARE MY BACKUP</button>' : ''}<button class="chip" type="button" data-bk="download">DOWNLOAD A FILE</button><button class="chip" type="button" data-bk="copy">COPY AS TEXT</button></div><p id="bkNote" class="small"></p>` });
    const note = t => { const e = $('bkNote'); if (e) e.textContent = t; };
    const done = t => { this.markBackup(); note(t); };
    const act = {
      share: async () => {
        try {
          const file = typeof File !== 'undefined' ? new File([text], fileName(pilot), { type: 'application/json' }) : null;
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], ...SHARE_TEXT }); else await navigator.share({ ...SHARE_TEXT, text });
          done('Shared. Keep it safe!');
        } catch (e) { if (!e || e.name !== 'AbortError') note('That did not work. Try COPY.'); }
      },
      download: () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = fileName(pilot); document.body.appendChild(a); a.click(); a.remove(); done('Saved. Keep the file safe!'); } catch (e) { note('That did not work. Try COPY.'); } },
      copy: async () => { if (await copyText(text)) done('Copied! Paste it in a note.'); else note('That did not work.'); },
    };
    document.querySelectorAll('#sheet [data-bk]').forEach(b => b.onclick = () => act[b.dataset.bk]());
  }
  openRestore() {
    showSheet({ eyebrow: 'SETTINGS', title: 'Restore a backup', ok: 'CLOSE',
      html: `<p class="small">Paste your backup here, or choose the file.</p><textarea id="bkText" class="bk-text" rows="4" spellcheck="false" aria-label="Paste your backup here"></textarea><input id="bkFile" type="file" accept=".json,.txt,application/json,text/plain" hidden><div class="gear-list"><button class="chip" type="button" data-bk="file">CHOOSE A FILE</button><button class="chip" type="button" data-bk="check">CHECK IT</button></div><p id="bkNote" class="small"></p>` });
    const note = lines => { const e = $('bkNote'); if (e) e.innerHTML = lines.map(l => String(l).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))).join('<br>'); };
    const check = () => {
      const r = readBackup($('bkText').value);
      if (!r.ok) return note(refusalLines(r.reason));
      const when = r.made ? new Date(r.made).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
      const warn = onlineWarns({ pilot: getPilot(), onlineProgress: onlineProgress(), backupProgress: r.summary.progress });
      showSheet({ eyebrow: 'GO BACK?', title: 'Found a backup', ok: 'CANCEL',
        html: `${compareLines(r.summary, { flights: this.save.flights || 0, seeds: Math.round(this.save.seeds || 0), progress: progressOf(this.save) }, when).map(l => `<p class="small bk-line">${l}</p>`).join('')}<p class="small">Your game now is kept too.</p>${warn ? `<p class="small bk-warn">${ONLINE_WARNING}</p>` : ''}`,
        action: { label: 'GO BACK TO IT', onTap: () => this.applyBackup(r) } });
    };
    $('bkFile').onchange = () => { const f = $('bkFile').files && $('bkFile').files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { $('bkText').value = String(rd.result || ''); check(); }; rd.onerror = () => note(['That did not work.']); rd.readAsText(f); };
    document.querySelectorAll('#sheet [data-bk]').forEach(b => b.onclick = () => (b.dataset.bk === 'file' ? $('bkFile').click() : check()));
  }
  applyBackup(r) {
    const res = restoreFromBackup(r.save);
    if (res === 'ok') { if (!getPilot() && r.save && r.save.pilotNamed === true) { rememberFirst(r.pilot); setRecoverNext(); }   /* a restore keeps the save, never the pilot: ask for the old pilot first */ return location.reload(); }
    this.toast('NOT CHANGED', res === 'not-kept' ? 'Your game now could not be kept first, so nothing was replaced.' : 'That did not work. Nothing was changed.', 'bad', 6);
  }

  // TEST SOUND (Settings): a tick, then a bell, at the real volume, so a player who hears nothing can tell the game from the tab or the device (research/SOUND-DESIGN.md; the user heard
  // nothing after 0.35.0). Lines are <= 28 characters (the 320 px sheet). The third line says which build this page is running.
  testSound() {
    const m = $('gearSoundMsg'); if (!m) return;
    if (this.save.muted) m.innerHTML = 'Sound is OFF. Tap SOUND.';
    else { sfx.tick(); setTimeout(() => sfx.medal(), 350); m.innerHTML = 'Did you hear it? No?<br>Turn up your device, or<br>unmute this tab.'; }
    m.innerHTML += `<br>This game is ${VERSION}`;
  }

  // ---- keeping the save safe (the user lost a 260-flight save, 2026-11-05; src/save.js, src/online.js) ----
  // Settings > RECOVER AN EARLIER SAVE: the last three games the game kept before something replaced them (the online copy, another pilot, a reset).
  openRecover() {
    const list = listStashed(), when = at => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    const rows = list.map(e => `<button class="chip" type="button" data-restore="${e.n}">${when(e.at)}: ${e.flights} flights, ${e.landings} landings</button>`).join('');
    showSheet({ eyebrow: 'SETTINGS', title: 'Earlier saves', ok: 'CLOSE',
      html: rows ? `<p class="small">Pick one to go back to it. Your game now is kept too.</p><div class="gear-list">${rows}</div>` : '<p class="small">Nothing here yet. The game keeps your last three games when something is about to replace one.</p>' });
    document.querySelectorAll('#sheet [data-restore]').forEach(b => b.onclick = () => {
      const e = list.find(x => x.n === +b.dataset.restore);
      showSheet({ eyebrow: 'GO BACK?', title: `${e.flights} flights, ${e.landings} landings`, body: 'Go back to this save? Your game now is kept too, so you can come back to it.', ok: 'CANCEL',
        action: { label: 'GO BACK TO IT', onTap: () => { if (restoreStashed(e.n)) location.reload(); } } });
    });
  }

  // The save was there but could not be read: nothing is written until the player chooses (src/save.js HELD). START A NEW GAME needs a second tap.
  showHeldCard() {
    if (!heldReason() || $('heldCard')) return;
    const el = document.createElement('section');
    el.id = 'heldCard'; el.className = 'overlay top sheet-wrap';
    el.innerHTML = '<div class="sheet card" role="dialog"><p class="eyebrow">YOUR SAVE</p><h2 class="sheet-title">We could not read your save</h2>'
      + '<p class="sheet-body">It is kept safe on this device. Try again first. If it still does not work, you can start a new game: the old save stays kept.</p>'
      + '<div class="sheet-buttons"><button id="heldRetry" class="btn go" type="button">TRY AGAIN</button><button id="heldNew" class="btn" type="button">START A NEW GAME</button></div></div>';
    document.body.appendChild(el);
    $('heldRetry').onclick = () => location.reload();
    $('heldNew').onclick = () => {
      if (!$('heldNew').dataset.sure) { $('heldNew').dataset.sure = '1'; $('heldNew').textContent = 'TAP AGAIN: START A NEW GAME'; return; }
      releaseHold(); writeSave(this.save, { allowBlank: true }); el.remove();
    };
  }

  // The online copy replaced a game on this device at the last load (src/online.js syncDown): say so ONCE, in plain words, with where the other game is.
  noteOnlineReplaced() {
    if (!hasOnlineNote() || !$('coach').hidden || (this.save.seenTips || []).includes('*')) return;   // (the coach is talking: try again at the next title)
    takeOnlineNote();
    this.toast('YOUR ONLINE GAME WAS NEWER', 'We kept it. Your other game is in Settings: RECOVER AN EARLIER SAVE.', 'good', 8);
  }

  // From landing 8 (after the name, the map and the records have each had their own landing), if the browser would not promise to keep the game's storage: ONE plain note (src/persist.js).
  noteStorage() {
    askPersist().then(persisted => {
      if (this.storageNoted || !noteDue(this.save, persisted) || !$('coach').hidden) return;
      this.storageNoted = true;
      this.save.seenTips = [...(this.save.seenTips || []), PERSIST_TIP]; writeSave(this.save);
      this.toast('KEEP YOUR GAME SAFE', noteText(!!getPilot()), 'bad', 9);
    });
  }

  renderHub() {
    const s = this.save;
    const cs = crossingState(s, { unlock: S2_UNLOCK }), ready = cs && cs.ready ? cs : null;   // (R-A: src/crossingview.js: the state, the 3 conditions, told once)
    const v = hubView(s, { crossingReady: ready ? `${ready.from} to ${ready.to}` : null, crossing: cs });
    $('hubSeeds').textContent = s.seeds; $('hubCrystals').textContent = s.crystals || 0;
    // UP NEXT (R3, research/UX-MASTER-PLAN.md C2): the SAME rows as the results card (src/nextup.js is the one source). A lead row (the free part,
    // NATURE's tree parcels) carries its lesson picture and leads where it says; a city mission says how many stops away it is. The tiles are gone:
    // the bottom bar is the navigation (its dots and the FREE! tag come from fresh.js and refreshDots).
    const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // THE HOME BOX (CROSSINGS V2): the next crossing with its three ticks; not while lessons remain (the same rule as the quiet line it replaces).
    const box = cs && s.tutorialDone && !lessonsLeft(s).length ? boxView(cs) : null, hc = $('hubCross');
    hc.hidden = !box; hc.classList.toggle('ready', !!(box && box.ready));
    if (box) { hc.innerHTML = `<p class="rc-label">${esc(box.title)}</p><div class="hc-route"><span>${esc(box.route)}</span><b>${esc(box.word)}</b></div><div class="hc-ticks">${box.ticks.map(t => `<span class="hc-tick${t.done ? ' on' : ''}">${esc(t.label)}</span>`).join('')}</div><p class="hc-line">${esc(box.line)}</p>`; hc.onclick = () => this.openCrossings(cs); }
    $('hubNext').hidden = !v.up.length || !s.tutorialDone;
    $('hubNext').classList.toggle('crossing', !!(v.next && v.next.crossing));
    const rows = box ? v.up.slice(0, window.innerHeight <= 600 ? 1 : 2) : v.up[0] && v.up[0].pic ? v.up.slice(0, 2) : v.up;   // (the box takes the room of two rows: a short phone keeps one)   // a lead row with its lesson picture takes the room of a row: two rows then (HOME must keep TAKE OFF above the bar at 320x568)
    $('hubNext').innerHTML = `<p class="rc-label">UP NEXT</p><div id="hubUpRows">${rows.map((n, i) => `<button class="rc-row${n.lead ? ' must' : ''}" type="button" data-i="${i}"><span>${esc(n.short)}</span><b>${esc(n.right)}</b>${n.pic ? `<img class="next-pic" src="${n.pic}" alt="">` : ''}</button>`).join('')}</div>`;
    const act = n => { sfx.tick();
      if (n.key === 'lead:cross' && ready) this.showCrossingSheet(ready);   // (R-A: a 6,500 km flight never starts from a row tap: the sheet is the confirm)
      else if (n.where === 'hangar' || n.where === 'nature' || n.where === 'missions' || n.where === 'pilot') this.go(n.where);
      else showSheet({ eyebrow: n.daily ? 'TODAY' : 'UP NEXT', title: n.short, body: n.full }); };
    $('hubNext').querySelectorAll('.rc-row').forEach(b => b.onclick = e => { e.stopPropagation(); act(v.up[+b.dataset.i]); });
    $('hubNext').onclick = () => { if (v.up[0]) act(v.up[0]); };   // a tap on the strip's label or gap = its top row (the old NEXT card was one tap target)
    const toHangar = v.next && v.next.hangar;   // a free upgrade LEADS into the hangar (the user, 2026-10-27)
    // The user, 2026-10-27: TAKE OFF is LOCKED until the free part is picked (nothing else made them find the hangar).
    $('goBtn').classList.toggle('locked', !!toHangar); $('goBtn').disabled = !!toHangar;
    $('goBtn').textContent = toHangar ? 'PICK YOUR FREE PART FIRST' : s.tutorialDone ? 'TAKE OFF' : 'START';
    this.renderSkip(v.skip);
    $('hubRoute').innerHTML = v.route.join(' &#9654; ') + (v.aim ? ' <span class="small">(mission)</span>' : '') + ' &#8250;';   // (R-B: a chip: the arrow says it opens something)   // the next stops (to the mission's city when aimed: src/aim.js)
    // The world: big, draggable and spinnable; once the route choice is revealed, tapping a way's dot picks it.
    const path = routeFor(s, 5), here = city(path[0]), opts = v.worldChoice ? choices(path[0], linksFor(s)) : [];
    const pick = name => { this.globeUsed(); sfx.tick(); s.heading = name; writeSave(s); this.renderJourney(); this.renderHub(); };
    const hint = $('hubHint'); hint.hidden = !s.tutorialDone || (s.tours || []).some(t => t === 'globe-hint' || t === '*');   // R-B: say the globe is a thing you can use, until you have used it
    hint.textContent = v.worldChoice ? 'Drag to spin. Tap a dot to choose.' : 'Drag the world to spin it.';
    this.hubGlobe = drawGlobe($('hubGlobe'), here, path.map(city), { ways: opts.map(o => city(o.name)), onPick: v.worldChoice ? pick : null, lit: linksFor(s),
      onUse: () => this.globeUsed(),
      cross: ready ? { from: city(ready.from), to: city(ready.to), onTap: () => this.showCrossingSheet(ready) } : null });   // R-A: the ready crossing's arc and its breathing ring (tap: the sheet)
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
    if (got.length) {   // R8: finish() paid them at this very moment
      const paid = sumPrizes(got.map(m => m.prize)); writeSave(this.save); this.renderBank(paid);
      this.toast('Mission done!', `${got.map(m => m.title).join(', ')}${paid.seeds ? `  +${paid.seeds} seeds` : ''}`, 'good', 3);
    }
  }
  // The MISSIONS screen: what you can do now (the area's open tiers, starred = the crossing trial), and prizes to claim.
  showMissions() {
    this.missionsAfterSave();   // an off-flight mission already met ticks now, not at the next purchase (sim chat's nit)
    const s = this.save;
    if (FEATURES.season2 && isSeason2(s)) setDaily(s, new Date().toISOString().slice(0, 10));   /* (the browser check: MISSIONS opened before the menu had set today) */
    // R4 (research/UX-MASTER-PLAN.md C3): NEXT pinned, then OPEN / TODAY / COMING UP / STEADY, DONE as a count. The data is src/missionsview.js.
    const v = this.missionsV = missionsView(s);
    const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const rowHTML = (r, cls = '') => `<div class="rowc goal ${cls}${r.star ? ' star' : ''}${r.aimed ? ' aimed' : ''}"><button class="rowc-tap" type="button" data-mrow="${esc(r.key)}"><span class="rowc-slot"><i class="mi ${r.icon}"></i></span><span class="rowc-top"><span class="rowc-name">${esc(r.short)}</span></span><span class="rowc-sub"><span class="m-how">${esc(r.aimed ? 'AIMED' : r.how)}</span>${r.prize ? `<b class="rowc-prize">+${r.prize}<i class="seedicon"></i></b>` : ''}</span></button></div>`;
    $('mArea').textContent = v.area; $('mTier').textContent = v.tierLine;
    $('mNext').innerHTML = v.next ? `<p class="label">NEXT</p>${rowHTML(v.next, 'next')}` : '';
    const group = (label, rows, extra = '') => rows.length ? `<p class="label">${label}${extra}</p>${rows.join('')}` : '';
    const empty = !v.next && !v.open.length;
    $('mList').innerHTML = (empty ? `<p>All done here!</p>${crossingsHTML(s).replace(/<button[^>]*data-cross[^>]*>.*?<\/button>/g, '<b>Ready!</b> Tap HOME, then UP NEXT.') || '<p class="small">Keep flying: new missions come with new eras.</p>'}` : '')
      + group('OPEN', v.open.map(r => rowHTML(r)))
      + group('TODAY', v.today.rows.map(r => rowHTML(r, 'daily')), v.today.streak ? ` <span class="small">(streak +${v.today.streak})</span>` : '')
      + (v.comingUp ? `<p class="label">COMING UP</p><p class="m-coming">${esc(v.comingUp)}</p>` : '')
      + (v.crossing ? `<p class="label">${esc(v.crossing.title.toUpperCase())}</p><div class="m-cross">${v.crossing.rows.map(r => `<p class="m-tick${r.done ? ' done' : ''}"><span>${esc(r.label)}</span><b>${esc(r.status)}</b></p>`).join('')}${v.crossing.ready ? '<button id="mCross" class="chip m-gold" type="button">FLY THE CROSSING</button>' : ''}</div>` : '')
      + group('STEADY', v.steady.map(r => rowHTML({ ...r, star: false }, 'steady')), saving(s) ? '' : ' <span class="small">(1 seed each)</span>')
      + (v.done.count ? `<button id="mDone" class="chip m-done" type="button">DONE ${v.done.count} ›</button>` : '');
    // Tap a row: its sheet (the full title, the how, the prize) with the one action it has: AIM HERE (a city mission), or the hop to HANGAR / NATURE.
    const all = [v.next, ...v.open, ...v.today.rows, ...v.steady].filter(Boolean);
    document.querySelectorAll('#mNext [data-mrow], #mList [data-mrow]').forEach(b => b.onclick = () => { const r = all.find(x => x.key === b.dataset.mrow); if (!r) return; sfx.tick();
      const hop = r.where === 'hangar' ? 'HANGAR' : r.where === 'nature' ? 'NATURE' : null;
      const action = r.city ? { label: r.aimed ? 'STOP AIMING' : 'AIM HERE', onTap: () => { s.aimKey = r.aimed ? null : r.key; writeSave(s); this.toast(r.aimed ? 'Back to the first mission' : `Aiming at: ${r.short}`, '', 'good', 3); this.showMissions(); } }
        : hop ? { label: `GO TO ${hop}`, onTap: () => this.go(r.where) } : null;
      showSheet({ eyebrow: r.daily ? 'TODAY' : r.star ? 'CROSSING TRIAL' : 'MISSION', title: r.full || r.short, body: `${r.tip || r.how}${r.prize ? ` Prize: +${r.prize} seeds.` : ''}`, action }); });
    $('mInfo').onclick = () => { sfx.tick(); showSheet({ eyebrow: v.area, title: v.info.title, body: v.info.body }); };
    if ($('mCross')) $('mCross').onclick = () => { const cs = crossingState(s, { unlock: S2_UNLOCK }); if (cs) this.openCrossings(cs); };
    if ($('mDone')) $('mDone').onclick = () => { sfx.tick(); const n = v.done.names, shown = n.slice(0, 12); showSheet({ eyebrow: 'DONE', title: `${v.done.count} missions done`, body: shown.join('. ') + (n.length > shown.length ? `. And ${n.length - shown.length} more.` : '') }); };
    this.showOnly('missions');
    if (markSeen(s, 'missions', this.freshOpts())) this.persist();   // MISSIONS is showing: its 'tier:<n>' and 'done:<key>' are seen (R2's hook)
  }

  // ---------- navigation ----------
  // One screen at a time, chosen from the bar along the bottom. Pop-ups (how to play, about,
  // info, points) close on any move. `this.pilot` (PilotScreens) renders PILOT and BOARDS.
  go(tab) {
    if (tab !== 'hangar' && this.fleet && this.fleet.paying) this.fleet.endPayoff();   // leaving mid-payoff: it ends (no parked payoff)
    if (tab === 'fly') return this.showTitle();
    if (tab === 'hangar') return this.showHangar();
    if (tab === 'missions') return this.showMissions();
    if (tab === 'nature') { if (this.tour) this.tour.markDone('nature-lead'); this.showOnly('nature');
      if (this.wild && parcelsWanted(this.save)) this.wild.region = this.wild.home() || 'woodland';   // L5 waits for parcels: open on the tab that sells them (the home land's)
      if (this.wild) { this.wild.rowNew = null; this.wild.hintOn = false; this.wild.render(); }   // a new visit: last visit's dots are gone; the land's own render marks it seen (R6)
      if (this.tour) this.tour.maybe('nature'); return; }
    if (tab === 'pilot') { this.showOnly('pilot'); return this.pilot && this.pilot.showPilot(); }
    if (tab === 'boards') { this.showOnly('boards'); if (FEATURES.season2) { showRecords(this.save, { onSeen: () => this.refreshDots(), toast: (t, b) => this.toast(t, b, 'good', 6) }); this.refreshDots(); return; }
      $('bSubtabs').hidden = true; $('bRecords').hidden = false; $('bBadges').hidden = true;   // (the online board: no sub-tabs)
      return this.pilot && this.pilot.showBoards(); }   // season 2: MY RECORDS (src/records.js), online is off
  }

  showOnly(id) {
    for (const s of ['title', 'results', 'hangar', 'nature', 'pilot', 'boards', 'missions']) $(s).hidden = s !== id;
    for (const s of ['how', 'about', 'info', 'scoreInfo', 'wInfo']) $(s).hidden = true;
    // The bottom bar on every menu screen (players missed it when the S2 hub removed it: Lola, 2026-10-27). Season 2:
    // HOME / MISSIONS / HANGAR / NATURE, each only once revealed; PILOT and BOARDS come with the 3rd landing. No bar while flying.
    $('tabbar').hidden = !id;
    $('hubBack').hidden = true;   // (the bar's HOME replaces the old floating button)
    if (FEATURES.season2) {
      const show = { fly: true, missions: hubRevealed(this.save, 'missions'), hangar: hubRevealed(this.save, 'hangar'), nature: hubRevealed(this.save, 'nature'), pilot: hubRevealed(this.save, 'pilot'), boards: hubRevealed(this.save, 'boards') };
      document.querySelectorAll('#tabbar [data-go]').forEach(b => { b.hidden = !show[b.dataset.go]; });
      $('tabFly').childNodes[$('tabFly').childNodes.length - 1].textContent = 'HOME';
    }
    if (id !== 'title') $('title').classList.remove('menu', 'world');
    const on = { title: 'fly', results: 'fly', hangar: 'hangar', nature: 'nature', pilot: 'pilot', boards: 'boards', missions: 'missions' }[id];
    document.querySelectorAll('#tabbar [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === on));
    this.refreshDots();
  }

  showTitle() {
    // Season 2: a save with no start area chooses it first, as a full screen (S3), before the hub ever shows.
    if (FEATURES.season2 && needsStartChoice(this.save)) { this.askStart().then(() => this.showTitle()); return; }
    if (this.migrated) { const m = this.migrated; this.migrated = null; this.toast('Prizes collected', `+${m.seeds} seeds${m.crystals ? ` and +${m.crystals} ice crystals` : ''} from your finished missions`, 'good', 5); }
    this.noteStorage();
    this.noteOnlineReplaced();
    $('tTrees').textContent = this.save.seeds;
    $('tCrystals').textContent = this.save.crystals || 0;
    $('tBest').textContent = km(this.save.bestDistance);
    $('goBtn').textContent = this.save.tutorialDone ? 'TAKE OFF' : 'START';
    this.refreshDots();
    // The meter of the land you take off from (each land has its own).
    const startRegion = (city(this.save.city) || {}).region || 'woodland', startBio = biodiversity(this.save, startRegion);
    const any = treesPlanted(this.save) > 0 || startBio > 0;
    $('tMeter').innerHTML = any && REGION_NAMES[startRegion] ? meterHTML(this.save, startBio, startRegion) : '';
    this.renderMission();
    $('tEra').innerHTML = this.save.tutorialDone ? eraBarHTML(this.save) : '';   // era progress (src/eras.js)
    this.renderJourney();
    if (FEATURES.season2 && isSeason2(this.save)) { const today = new Date().toISOString().slice(0, 10); setDaily(this.save, today); rollWeek(this.save, today); writeSave(this.save); this.missionsAfterSave(); }   // + off-flight missions already met (e.g. on entering a new area)   // the daily trio: the date comes from here, not the rules
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
  // The NEW dots come from ONE source (src/fresh.js). Lands are declared, HOME FIRST (the default is the UK + every land flown over).
  freshOpts() { const home = (this.wild && this.wild.home && this.wild.home()) || 'woodland'; return { lands: [home, ...defaultLands(this.save).filter(r => r !== home)], missions: missionsFreshKeys }; }   // (R4: the MISSIONS scope's keys, src/missionsview.js)
  // The bar's text tag (FREE! only: a must-do lead) and the 6 px dots on HANGAR / NATURE / BOARDS / MISSIONS (a tab is lit iff a sub-scope is).
  // (the first ask migrates, once per save, AFTER main.js has made this.wild so the home land is known: what is already buyable / open
  // counts as seen, no dot storm)
  freshDots() { if (migrateSeen(this.save, this.freshOpts())) writeSave(this.save); return dots(this.save, this.freshOpts()); }
  refreshDots() {
    const d = this.freshDots(), free = !!this.save.freeUpgrade;
    $('tNew').hidden = !free; $('tNew').textContent = 'FREE!';
    for (const [id, k] of [['dHangar', 'hangar'], ['dNature', 'nature'], ['dBoards', 'boards'], ['dMissions', 'missions']]) { const e = $(id); if (e) e.hidden = !(d[k] || (k === 'boards' && FEATURES.season2 && hubRevealed(this.save, 'boards') && !(this.save.tours || []).some(t => t === 'r-boards' || t === '*'))); }   // (BOARDS shows a dot from landing 5 until its tour has run)
    $('tabHangar').classList.toggle('glow', free || !!d.hangar);   // something to spend: the bar's HANGAR glows
    const cs = crossingState(this.save, { unlock: S2_UNLOCK }); if ($('dFly')) $('dFly').hidden = !(cs && cs.ready);   // R-A: HOME's dot while a crossing is ready to fly
    this.maybeCrossingSheet();   // and its one-time sheet, on whatever menu screen is showing (a save that completed the last condition)
  }
  hasNew() { return !!this.save.freeUpgrade || !!this.freshDots().hangar; }   // (the bar's HANGAR tag and glow)

  // The crossing moment (R-A, research/ROUTE-PLANNING.md "audit"): ONE calm sheet the first time a crossing is ready, on whatever screen the player sees next
  // (the results card after a flight, HOME or NATURE after a project). FLY THE CROSSING is also the confirm before any crossing flight starts.
  showCrossingSheet(cs) {
    if (this.inCrossingSheet) return;   // (refreshDots below can come back here: never inside itself)
    this.inCrossingSheet = true;
    try {
      const s = this.save, first = !(s.crossed || []).length && !(s.crossingTold || []).length, t = sheetText(cs, first);   // (the first crossing ever also says what a crossing is)
      if (!(s.crossingTold || []).includes(cs.id)) { markTold(s, cs.id); writeSave(s); this.refreshDots(); }
      showSheet({ eyebrow: t.eyebrow, title: t.title, body: t.body, ok: t.later, action: { label: t.go, onTap: () => this.flyCrossing(cs) } });
    } finally { this.inCrossingSheet = false; }
  }
  // The CROSSINGS screen (CROSSINGS V2): the same ticks as the HOME box, one plain line, one button (HANGAR / NATURE where the open tick is fixed, CROSS TO <city> when ready). The first time a crossing is ready the
  // moment sheet comes instead (it marks the crossing told). Step 2 keeps the old rule that the flight starts from anywhere; GO TO the departure airport is the next step.
  openCrossings(cs) {
    sfx.tick();
    if (cs.ready && !cs.told) return this.showCrossingSheet(cs);
    const v = screenView(cs), esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    showSheet({ eyebrow: v.eyebrow, title: v.route, ok: 'CLOSE', html: `<p><b>${esc(v.word)}</b></p><p class="hc-ticks">${v.ticks.map(t => `<span class="hc-tick${t.done ? ' on' : ''}">${esc(t.label)}</span>`).join('')}</p><p>${esc(v.line)}</p>`,
      action: v.button ? { label: v.button.label, onTap: () => (v.button.act === 'cross' ? this.flyCrossing(cs) : this.go(v.button.act)) } : null });
  }
  flyCrossing(cs) { const s = this.save; s.flyCrossing = cs.crossing; writeSave(s); this.start(); }
  maybeCrossingSheet() {
    const s = this.save;
    if (!FEATURES.season2 || !isSeason2(s) || !s.tutorialDone) return;
    const cs = crossingState(s, { unlock: S2_UNLOCK });
    if (!momentDue(cs) || this.crossingAuto.has(cs.id)) return;   // (crossingAuto: the sheet opens by itself at most once per page load, even if the told mark could not be saved)
    // Only on a menu screen that is showing and idle: not in flight, not mid-reveal, not under a sheet, a tour step, a payoff or an era welcome.
    const shown = document.querySelector('.overlay.screen:not([hidden])');
    if (!shown || ($('repriced') && !$('repriced').hidden) || ($('startChoice') && !$('startChoice').hidden) || $('sheet') || ($('results').classList.contains('revealing')) || (this.tour && this.tour.el && !this.tour.el.hidden) || (this.fleet && this.fleet.paying) || document.querySelector('.era-card, #payoff:not([hidden]), #ending')) return;
    this.crossingAuto.add(cs.id); this.showCrossingSheet(cs);
  }

  // The crossing that is ready to fly, as text ("LONDON to NEW YORK"), or null: the lead of the next-up rows (src/nextup.js).
  crossingReadyText() {
    const s = this.save, c = s.tutorialDone ? crossingsNow(s).find(x => readiness(s, x).ready || S2_UNLOCK) : null;
    return c ? `${c.from} to ${c.to}` : null;
  }

  // R1 (research/UX-MASTER-PLAN.md C1): the results are ONE card that fits the phone, no scrolling. The data is src/resultscard.js (budgets held by
  // tests/resultscard.cjs); this draws it, reveals it in a short beat (a tap skips) and wires the sheets behind its lines. The prizes were already PAID
  // at the bank (R8: RULES.bankFlight); the prize line shows what they were worth.
  async showResults(r) {
    if (r.touchdown && !r.school) recordTouchdown(r.touchdown);   // the real-flight landing log: this device only (src/landlog.js)
    this.lastPlanted = r.planted || 0;   // trees planted this flight (the first-tree rail's words)
    this.lastGrab = r.earned && r.earned[0] ? r.earned[0].n : 0;   // seeds grabbed this flight (the rails' R9a words depend on it)
    const lead = this.resultsLead();   // season 2: the one place the lesson leads next (research/FLOW-FIRST-HOUR.md)
    $('againBtn').textContent = lead === 'hangar' ? 'OPEN THE HANGAR' : lead === 'nature' ? 'OPEN NATURE' : 'FLY ON';
    this.hideCoach();   // nothing left open from the flight (the user saw a stray OK at the top after landing, 0.13.0)
    // Season 2: a crossing flown (src/crossings.js): the big news first.
    if (r.crossing && r.crossing.kind === 'lap' && r.crossing.landed) this.showEnding();   // the final boss: the game's ending
    else if (r.crossing) return this.showCrossingEnd(r);   // its OWN landing / crash screen (src/crossingend.js): no results card, no distance, no missions
    const s = this.save, paid = sumPrizes(r.rewards);   // R8: these were PAID at the bank (RULES.bankFlight); this is what the card shows
    if (paid.seeds || paid.crystals) this.renderBank(paid);
    const v = this.resultView = resultsView(r, s, { paid, lead, next: nextUp(s, { crossingReady: this.crossingReadyText(), crossing: crossingState(s, { unlock: S2_UNLOCK }), limit: NEXT_ROWS }) });
    const steps = [...document.querySelectorAll('#results .step')];
    steps.forEach(el => el.classList.remove('in'));
    this.skipReveal = false;
    const wait = ms => new Promise(res => (this.skipReveal ? res() : setTimeout(res, ms)));
    const show = el => el.classList.add('in');
    const count = async (el, to, ms, fmt = x => x) => {
      const t0 = performance.now();
      while (!this.skipReveal) {
        const f = Math.min(1, (performance.now() - t0) / ms);
        el.textContent = fmt(Math.round(to * f));
        if (f >= 1) break;
        await new Promise(res => requestAnimationFrame(res));
      }
      el.textContent = fmt(to);
    };
    const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // -- fill every line first; the reveal below only fades it in (a hidden line takes no room, so the card is never taller than what shows)
    $('rEyebrow').textContent = v.eyebrow; $('rTitle').textContent = v.title; $('rTitle').classList.toggle('crash', !v.landed && !v.school);
    $('rRecord').hidden = !v.record;
    $('rDist').textContent = km(0);
    $('rBank').classList.toggle('lost', !v.landed && !v.school && !v.bank.seeds);
    $('rGain').textContent = '+0'; $('rCrys').textContent = `+${v.bank.crystals}`; $('rCrysBox').hidden = !v.bank.crystals;
    $('rMaths').hidden = !v.maths || !v.landed; $('rMathsTxt').textContent = v.maths;
    $('rLost').hidden = !v.maths || v.landed; $('rLost').textContent = v.maths;
    const mi = v.missions; $('rMission').hidden = !mi;
    if (mi) { $('rMission').className = `step rc-line rc-mission ${mi.fail !== undefined ? 'notyet' : 'done'}`; $('rMissionTxt').textContent = mi.line; $('rMissionPrize').innerHTML = mi.seeds ? `+${mi.seeds}<i class="seedicon"></i>` : ''; }
    $('rNext').hidden = !v.next.length;
    $('rNextRows').innerHTML = v.next.map((n, i) => `<button class="rc-row${n.lead ? ' must' : ''}" type="button" data-i="${i}"><span>${esc(n.short)}</span><b>${esc(n.right)}</b></button>`).join('');
    $('rEarth').hidden = !v.earth;
    if (v.earth) { $('rWarm').textContent = v.earth.warm; $('rCool').textContent = v.earth.cool; this.drawEarthFace($('rFace'), v.earth.heat); }
    $('rEra').hidden = !v.era;
    $('rEra').innerHTML = v.era ? `<span class="era-badge">${esc(v.era.id)}</span><span class="era-track"><span class="era-fill" style="width:${(v.era.frac * 100).toFixed(1)}%"></span></span><span class="rc-erat">${esc(v.era.text)}</span>` : '';
    const chipHTML = (c, i) => `<button class="chip rc-chip" type="button" data-i="${i}" data-kind="${c.kind}">${c.kind === 'animal' ? `<img src="${animalPortrait(WILDLIFE.find(w => w.id === c.id))}" alt="">`
      : c.kind === 'badge' ? `<img src="${medal(c.id, c.tier)}" alt="">` : '<i class="rc-star">&#9733;</i>'}<span>${esc(c.label)}</span></button>`;
    $('rChips').hidden = !v.chips.length;
    $('rChips').innerHTML = v.chips.map(chipHTML).join('') + (v.moreChips ? `<button class="chip rc-chip more" type="button" data-more="1"><span>+${v.moreChips} more</span></button>` : '');
    // -- the sheets behind the lines (src/sheet.js): the old tally, the missions, the four Earth bars, a chip's story
    $('rMaths').onclick = () => showSheet({ eyebrow: 'THIS FLIGHT', title: 'Where it came from', html: `<div class="rc-rows">${v.tally.map(([a, b]) => `<p><span>${esc(a)}</span><b>${esc(b)}</b></p>`).join('')}</div>` });
    $('rMission').onclick = () => showSheet({ eyebrow: mi && mi.fail !== undefined ? 'NOT THIS TIME' : 'MISSIONS DONE', title: mi ? mi.line.replace(/^✓ /, '') : '', body: mi && mi.fail ? mi.fail : (mi ? mi.titles.join('. ') : '') });
    $('rEarth').onclick = () => showSheet({ eyebrow: 'THE EARTH', title: v.earth.warm.split(' ')[0] + ' and ' + v.earth.cool.split(' ')[0].toLowerCase(),
      html: `<div class="earth-bars rc-bars">${v.earth.bars.map(([name, n, sg]) => `<div class="ebar"><span class="elabel">${name}</span><span class="etrack"><span class="efill ${{ CO2: 'co2', Night: 'night', Shade: 'sun', Nature: 'trees' }[name]}" style="width:${Math.min(100, n / Math.max(30, ...v.earth.bars.map(b => b[1])) * 100)}%"></span></span><b>${sg}${n}</b></div>`).join('')}</div>` });
    $('rNextRows').querySelectorAll('.rc-row').forEach(b => b.onclick = () => { const n = v.next[+b.dataset.i]; sfx.tick();
      if (n.key === 'lead:cross') { const cs = crossingState(this.save, { unlock: S2_UNLOCK }); if (cs && cs.ready) return this.showCrossingSheet(cs); }
      if (n.where === 'hangar' || n.where === 'nature' || n.where === 'pilot' || (n.where === 'missions' && n.cross)) this.go(n.where); else showSheet({ eyebrow: n.daily ? 'TODAY' : n.cross ? 'CROSSING' : 'UP NEXT', title: n.short, body: n.full }); });
    const chipSheet = c => { const w = c.kind === 'animal' ? WILDLIFE.find(x => x.id === c.id) : null;
      showSheet({ eyebrow: c.kind === 'animal' ? 'NEW ANIMAL' : c.kind === 'badge' ? 'NEW BADGE' : 'A FIRST', title: c.full, pic: w ? animalPortrait(w) : c.kind === 'badge' ? medal(c.id, c.tier) : '', body: c.body,
        action: c.kind === 'animal' ? { label: 'SEE IT IN NATURE', onTap: () => this.go('nature') } : null }); };
    $('rChips').querySelectorAll('.rc-chip').forEach(b => b.onclick = () => { sfx.tick(); if (b.dataset.more) showSheet({ eyebrow: 'ALSO NEW', title: 'More to see', body: v.allChips.slice(v.chips.length).map(c => c.full).join('. ') }); else chipSheet(v.chips[+b.dataset.i]); });
    this.showOnly('results');
    $('results').scrollTop = 0;
    $('results').classList.add('revealing');   // while the card builds, its lines are inert: a tap to SKIP must not open a sheet (CSS: #results.revealing)
    // -- the reveal: a short beat (under two seconds); a tap skips to the end
    const [head, dist, bank, ...rest] = steps;
    show(head); await wait(300);
    show(dist); await count($('rDist'), r.distance, 500, km);
    if (v.record) sfx.buy();
    show(bank); await count($('rGain'), v.bank.seeds, 350, x => `+${x}`);
    if (v.bank.seeds || v.bank.crystals) sfx.coin(); else if (!v.landed) sfx.nope();
    await wait(200);
    for (const el of rest) { if (el.hidden) continue; show(el); if (el.id === 'rMission' && v.missions && v.missions.fail === undefined) sfx.done(); if (el.id === 'rChips' && (v.chips || []).some(c => c.kind === 'badge')) sfx.medal(); if (el.id === 'rEarth') v.earth && v.earth.bars[0][1] > v.earth.bars[2][1] ? sfx.warm() : sfx.cool(); await wait(110); }
    $('results').classList.remove('revealing');
    if (r.eraOpened) {   // a new era: the big welcome, then the hangar to see what it brings
      await wait(600);
      await showEraWelcome(ERAS.findIndex(e => e.name === r.eraOpened));
      return this.showHangar();
    }
    this.maybeCrossingSheet();   // R-A: the crossing moment, if this flight completed the last condition
    if (this.tour && (!r.school || FEATURES.season2)) this.tour.maybe('results');   // season 2: the rails start on the school-done card
  }

  // A crossing flight's own ending (src/crossingend.js): the payoff-style full screen. FLY ON / HOME go to HOME; TRY AGAIN flies the same crossing at once (the ending cleared save.flyCrossing).
  async showCrossingEnd(r) {
    const s = this.save, v = endView(r, s, { first: (s.crossed || []).length === 1 });
    let el = document.getElementById('crossEnd');
    if (!el) { el = document.createElement('div'); el.id = 'crossEnd'; el.className = 'payoff crossend'; document.body.appendChild(el); }
    const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    el.innerHTML = `<div class="payoff-card"><p class="cend-eyebrow">${esc(v.eyebrow)}</p><p class="ending-title">${esc(v.title)}</p>${v.pic ? `<img class="cend-pic" src="${esc(v.pic)}" alt="">` : ''}${v.lines.map(l => `<p>${esc(l)}</p>`).join('')}<div class="cend-btns">${v.buttons.map((b, i) => `<button class="btn ${i === 0 ? 'go ' : ''}big" type="button" data-end="${b.id}">${esc(b.label)}</button>`).join('')}</div></div>`;
    el.hidden = false; v.kind === 'landed' ? sfx.welcome() : sfx.softfail();
    const leave = async (again) => {
      el.hidden = true; sfx.tick();
      if (again) { const cs = crossingById(this.save, r.crossing.id, { unlock: true }); if (cs) return this.flyCrossing(cs); }
      if (r.eraOpened) { await showEraWelcome(ERAS.findIndex(e => e.name === r.eraOpened)); return this.showHangar(); }
      this.showTitle();
    };
    el.querySelectorAll('[data-end]').forEach(b => { b.onclick = () => leave(b.dataset.end === 'again'); });
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
  persist() { writeSave(this.save); this.refreshDots(); }   // (the bar's dots follow every save: a purchase, a markSeen)

  showHangar() {
    this.fleet.rowNew = null;   // a new visit: last visit's row dots are gone (src/hangar.js)
    this.renderHangar();
    this.showOnly('hangar');
    this.markHangarShown();   // (renderHangar ran while the screen was still hidden, so its own markSeen skipped: the screen is showing NOW)
    if (this.tour) this.tour.maybe('hangar');   // season 2: the free-part tour can start here (from OPEN THE HANGAR)
  }

  markHangarShown() {
    if (markSeen(this.save, hangarScope(this.fleet.tab), this.freshOpts())) this.persist();
  }

  renderHangar() {
    const s = this.save;
    $('hTrees').textContent = s.seeds; $('hCrystals').textContent = s.crystals || 0;
    const free = !!s.freeUpgrade;
    $('hHint').innerHTML = free ? '<b>Pick ONE upgrade for FREE!</b>' : ''; $('hHint').hidden = !free;   // (R5: no standing help sentence; the strip says what to tap)

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
    $('hUpgrades').innerHTML = '';
    this.fleet.render();

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
      const isFree = (free || freeParcels(s, line.id)) && next && have === 0 && !waitBio;   // (the first tree parcels: free in season 2)
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

  showSheet(opts) { return showSheet(opts); }   // the one pop-up (src/sheet.js; R10 moves #info / #wInfo onto it)

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
    const apply = () => { setMuted(this.save.muted); syncMusic(); btn.textContent = `sound: ${this.save.muted ? 'off' : 'on'}`; };   // (syncMusic: muted stops the music; before the first tap it creates nothing)
    btn.onclick = () => { this.save.muted = !this.save.muted; writeSave(this.save); apply(); };
    setMusicLevel(this.save.musicLevel); setMusicOff(this.save.musicOff);
    document.addEventListener('click', () => armMusic(), { once: true, capture: true });   // the FIRST tap arms the music: a context made before a tap starts suspended (src/music.js)
    apply();
  }

  // ---------- in-flight tips ----------
  // The game's ending (M4, the final boss = a lap of the Earth, home to home): one card, then on with the game.
  showEnding() {
    const s = this.save;
    let el = document.getElementById('ending');
    if (!el) { el = document.createElement('div'); el.id = 'ending'; el.className = 'payoff ending'; document.body.appendChild(el); }
    el.innerHTML = `<div class="payoff-card"><p class="ending-title">YOU FLEW AROUND THE WORLD!</p>
      <p>${endingBody(s.city)}</p>
      <p class="small">${(s.crossed || []).length} crossings flown. You finished Contrail Pilot!</p>
      <button id="endingOk" class="btn go big" type="button">OK</button></div>`;
    el.hidden = false; sfx.coin && sfx.coin();
    document.getElementById('endingOk').onclick = () => { sfx.tick(); el.hidden = true; };
  }
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
