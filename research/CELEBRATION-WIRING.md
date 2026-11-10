# Celebration kit: how to wire it (a 5-minute change per site; src/ui.js and src/globe.js are the game chat's until they say)

`src/celebrate.js` is written and tested (tests/celebrate.cjs) but wired NOWHERE yet. `celebrateEvent(host, event)` is the only call; it plays the event's cue itself, so the site's own `sfx.<cue>()` line is REMOVED, never kept (a kept line would sound twice).

## 1. Crossing landing (the first one: the user's complaint that the crossing screens are static) - src/ui.js, showCrossingEnd (about line 600)
Add to the imports: `import { celebrateEvent } from './celebrate.js';`
The line now: `el.hidden = false; v.kind === 'landed' ? sfx.welcome() : sfx.softfail();`
Replace with (the two lines): 
```
el.hidden = false;
if (v.kind === 'landed') celebrateEvent(el.querySelector('.payoff-card'), 'crossing-landed'); else sfx.softfail();   // (a lost crossing gets NO burst: it is not in the kit's table, only its soft sound)
```
`.payoff-card` is `position: relative` (style.css), so the sparkle layer fills the card; the buttons stay tappable (the layer has pointer-events none). Re-test: tests/crossingscreens.cjs (cue counts: welcome 1, softfail 1; the cuecount script), tests/audiolive.cjs, and a screenshot at 390 and 320 mid-burst.

## 2. Other sites (outside src/ui.js: can be done now; each replaces the line shown)
- Nature project funded: src/wild.js `writeSave(s); sfx.grow();` -> `writeSave(s); celebrateEvent(document.querySelector('#wProjects [data-pline="' + id + '"]'), 'nature-funded');` (host must be position: relative; check .rowc).
- A part arrives (hangar payoff): src/hangar.js at the arrival `this.ui.sfx.reveal && this.ui.sfx.reveal();` -> `celebrateEvent(el.querySelector('.pay-frame'), 'part-arrives');` (.pay-frame is the wrapper the game chat's spotlight keeps; the sparkles live inside it).
- Era welcome: src/welcome.js `sfx.era();` -> `celebrateEvent(el.querySelector('.ec-body'), 'era-opens');` AND remove the era card's looping confetti? (it now stops after two falls; the kit's burst can replace it: a decision for the user).

## 3. In src/ui.js too (wait): mission done and badge chips on the results card (`sfx.done()` / `sfx.medal()` in the reveal loop) -> `celebrateEvent($('rMission'), 'mission-done')` and `celebrateEvent($('rChips'), 'badge-earned')`.

## Rules the kit enforces
Once per host (a re-render does not replay); at most 24 sparkles; reduced motion = no sparkles, no push, the cue still plays, a still gold outline for a second; a crash, a lost crossing or an overheat has no entry in CELEBRATIONS (tests/celebrate.cjs holds that); nothing loops.
