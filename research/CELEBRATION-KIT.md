# Contrail Pilot: out-of-flight celebrations, audit and one reusable kit (desk, 2026-11-08, nothing built)

Part C of the Coordinator's request. Companion: SOUND-DESIGN.md (cue names used below are from its section 2).
Basis: style.css, src/ui.js, hangar.js, wild.js, welcome.js, crossingend.js on branch presence-x2 (b801708). "Now" means what the code does; I did not watch each screen in this session.

## 1. What exists today (read from code)

| Event | What happens now | Where | Sound now |
|---|---|---|---|
| New part (payoff card) | card appears; the plane picture fades in from above (`.pay-part`, .6 s); one yellow diamond (`.pay-spark`, `paysparkle` .9 s); after it the plane picture zooms 1.8x onto the changed part (`.payoff.arrive .pay-plane`, by design); bars animate | style.css:765-773, hangar.js:115-173 | `buy` (once, 170 ms in) |
| New plane | arrives with the era welcome card (a plane is an era event, not a purchase: `buyFleet` sells parts) | welcome.js | `era` (was `fanfare`) |
| Buy (row) | the row re-renders; a button glow | hangar.js:80-85 | `buy` |
| Era opens | full card: kicker fades in, title stamps in with overshoot (`ec-stamp`), a small plane taxis across (`ec-taxi` 2.2 s), tag and notes fade in on a 0.1-2.6 s timeline, confetti pieces fall in an INFINITE loop (`ec-confetti i`, `ec-fall` 2.6 s linear infinite) | style.css:637-647, welcome.js | `fanfare`, then `coin` on OK |
| Crossing landed / crash | the payoff-style card, static: eyebrow, title, a landmark or portrait picture, lines, buttons (`showCrossingEnd`); no animation of its own | ui.js:594, crossingend.js | `buy` / `nope` |
| Nature project funded | the cost chip flashes (`w-flash`, 3 pulses) and the new feature image in the scene drops in (`arrivefeat` .7 s); the NEXT line re-renders | wild.js:288-295, 476 | `buy` |
| Nature project done / tier done | the project row shows a check; nothing else | wild.js | none beyond the buy |
| Animal found | the tile appears; first-visit dots | wild.js, fresh.js | none |
| Mission done | on the results card: `slam` and `stamp` (steps timing); coin if paid | ui.js:171, style.css:299-301 | `coin` |
| Badge earned | a chip on the results card with the medal picture (ui.js:556); no motion of its own | ui.js:556, badges.js | none |
| New best | text blinks (`blink` .6 s, steps) | style.css:82 | none |
| Claim / hub | `claimGlow`, `hubpulse` pulses on buttons | style.css:552, 737 | `coin` |
| In flight (for reference) | `GameScene.burst(x, y, colour, n)` square particles, 8 call sites; camera shake and flash on a crash | GameScene.js:1452 | per event |

Reduced motion today: only three places honour `prefers-reduced-motion` (style.css:245 `.newbest`, style.css:1013 the NATURE swipe hint, loader.js:52). Every animation in the table above ignores it, including the infinite confetti loop and the plane zoom.

Observations:
- Each celebration is bespoke CSS: five different timelines, no shared look, no shared sound.
- The three big moments (era, new plane/part, crossing landed) differ a lot in effort: the era card has a 3 s authored sequence; the crossing screens, which the user just asked to be like "when you get a new plane", are static.
- Nothing celebrates a finished nature project or a badge, which are the game's core climate rewards.

## 2. Proposal: one celebration kit

Principle: one function, three sizes, the same four beats everywhere: BURST (sparkles), PUSH (the card or picture scales in), STINGER (one cue), SETTLE (everything stops and the buttons are usable).

`src/celebrate.js` (new, about 80 lines of JS plus about 40 lines of CSS):

```
celebrate(host, { size: 'small' | 'medium' | 'large', cue: 'reveal' | 'era' | ..., colour })
```
- BURST: a layer `div.cel-layer` appended to `host` (position absolute, inset 0, `pointer-events: none`, overflow hidden). It holds N `i` elements (small 8, medium 16, large 24, hard cap 24) styled as 4-6 px squares in the game's palette (gold #ffe15a, white, the game's cool blue), each animated once with `transform` and `opacity` only (`cel-pop`, steps(6) timing to match the other pixel animations), randomised by index with fixed CSS custom properties so it needs no per-frame JS. It is removed on `animationend`.
- PUSH: the host gets `.cel-push` once: scale .94 to 1.04 to 1 over .35 s. The payoff's existing 1.8x zoom stays as a separate, by-design effect.
- STINGER: one call to `sfx[cue]()`. The kit is the only place that plays the sound of a celebration, so the sound and the picture cannot drift apart.
- SETTLE: after the burst (large 1.4 s, medium 0.9 s, small 0.5 s) the layer is gone and `host.dataset.celebrated = '1'`; it fires once per event (a re-render does not replay it).
- A DOM particle layer fits all the screens in the table because they are all DOM cards, not Phaser scenes. In flight keep `GameScene.burst`.

Use by event:

| Event | Size | Cue | Change |
|---|---|---|---|
| New plane (era card) | large | era | the era card carries it; no separate plane celebration |
| New part | medium | reveal | replaces `paysparkle` |
| Era opens | large | era | keep the existing timeline; swap the infinite confetti for the kit's one-shot burst, which ends |
| Crossing landed | large | welcome | add the burst around the landmark picture; the title can reuse `ec-stamp` |
| Crossing crash | none | softfail | no particles; a slow fade of the card only (do not celebrate a loss) |
| Nature project funded | small | grow | burst at the new feature image (green and gold) |
| Nature tier done | medium | bloom | burst over the tier header |
| Animal found | small | chirp | burst on the tile |
| Mission done | medium | done | burst on the stamp |
| Badge earned | medium | medal | burst on the medal chip; tier 3 large |
| New best | small | best | burst on the line instead of the blink |
| Buy (row) | none | buy | keep as is |

## 3. Reduced motion and small screens

- Reduced motion (`prefers-reduced-motion: reduce`): the kit adds no particles, no PUSH, and does no scaling; it still plays the cue and sets a static highlight (a 3 px gold outline for 1 s, opacity only). The era card's infinite confetti and the payoff zoom are also switched off under the same query as part of the work. A Node/CSS test can assert the media block lists every celebration class, with a plant that removes one.
- 320x568: the particle layer is `position: absolute` inside the card, so it adds nothing to layout; at most 24 elements, `transform` and `opacity` only. The hangar fit lesson applies: do not animate a transform on a row that `rowfit` measures; the layer sits on the card, not on the rows. The tests that measure fit (fitscreen, rowfit, overlap) must be run with the layer present in a mid-burst frame, and a plant that makes the layer a flow element should fail them.
- Touch: `pointer-events: none` on the layer; the buttons must be tappable during the burst (the beat is 0.5-1.4 s; never block OK).
- Battery: one short burst per event; nothing runs after SETTLE.

## 4. PixelLab for the VFX sprites

- Tools available in this environment: `vfx_workbench` (documented as free: "Animated effects (spells, hits, explosions, auras)") and `animate_image`. I have not called either in this session. Cost per call is NOT measured; the way to measure is to read `get_balance` before and after one call and log it in `tools/art/pixellab/era456/spend.jsonl`-style. From the earlier art work: pixflux 1 gen = $0.0073 and Pro Flash 64x28 = 5 gens, which is the only measured pricing and is not for animation.
- Plan: first try the free route: the kit's squares are code, so the first build needs no sprites. Use `vfx_workbench` only for a 2-3 frame star or ring sprite (about 16x16) if the squares look too plain; keep the $2 cap and measure the balance before and after each call.
- File budget: a 3-frame 16x16 sprite sheet is under 1 KB as png.

## 5. Build order and sizes (estimates)

1. `celebrate.js` plus CSS plus Node test of the pure parts (particle count caps, once-only, reduced-motion list) and a browser check at 320x568 and 390x844: about 1 day.
2. Wire the P1 events: payoff part/plane, era, crossing landed (the user's explicit complaint), nature funded: about 1 day with the sound cues from SOUND-DESIGN.md section 7 step 2.
3. Remaining events (nature tier, animal, mission, badge, best): about 0.5 day.
4. Reduced-motion switch-off of the existing animations (confetti loop, zoom, pulses): about 0.5 day.
5. Optional VFX sprite from `vfx_workbench` under the $2 cap.

Dependencies: the sound cues and the kit share names; build SOUND-DESIGN step 1 first so a cue exists before a screen calls it. The user decides what ships.

## 6. Not verified

- I did not view the current screens in motion in this session; the "now" column comes from CSS and JS.
- Per-call PixelLab VFX costs.
- Whether `ec-confetti`'s infinite loop is intended (it keeps animating until OK).
