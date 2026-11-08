# Contrail Pilot: sound audit and design brief (desk, 2026-11-08, nothing built)

Scope: part A (audit and brief) and part B (tools) of the Coordinator's request. Part C is in CELEBRATION-KIT.md.
Basis: `src/sound.js` and the call sites on branch presence-x2 (b801708, x2 d4f4b96 on 0.33.0). Counts below were taken by grep, not recalled.

## 1. What exists (measured)

- `src/sound.js`, 69 lines, Web Audio only: `tone()` (one oscillator, exponential ramp, square by default) and `noise()` (white noise burst). No sound files, no music, no ambience.
- 14 effects: flap, coin, buy, nope, plant, land, crash, overheat, issr, cool, warm, heartbeat, dusk, dawn, fanfare.
- Call sites (grep `sfx.<name>` in src): flap 28, coin 13, buy 9, nope 7, one each for warm, plant, land, issr, heartbeat, fanfare, dusk, dawn, cool. `crash` and `overheat` are called as `sfx[sound]()` (GameScene.js:1544, `sound` comes from `finish()` in sim/rules.js:716, default `crash`). Other call sites: hangar.js:170 (`sfx.buy` when the payoff card arrives), wild.js:288 (`sfx.buy` on funding a project), welcome.js:44 (`sfx.fanfare` on the era card), ui.js showCrossingEnd (`sfx.buy` on landing, `sfx.nope` on a crash).
- `sfx.flap` is the UI click as well (28 sites): tabs, rows, back buttons, the tour.
- Mute: `save.muted` (src/save.js:46), toggled in the gear menu (ui.js:241) and `setMuted()`; vibration (`buzz`, 6 call sites) is off when muted. `unlockAudio()` is called from the first tap (ui.js:139, 146).
- Waveforms in use: square (flap, plant, coin, buy, nope, land at 0.04-0.06 gain), sawtooth (warm, overheat, crash, 0.03-0.06), triangle (issr, dusk, dawn, fanfare), sine (heartbeat, cool). `crash` is noise plus a falling sawtooth.
- Nothing plays for: unlocks, the new plane (it arrives with the era card, not by purchase), era card beyond the fanfare, nature project completion (only the generic `buy`), mission done, badges, the crossing screens beyond buy/nope, crash kinds (storm, ground, bird, restricted airspace all play the same `crash`; overheat has its own), the payoff zoom, the title screen, the hub.
- Weight: the site assets are 13 MB (2,949 png files in assets/), the whole site is about 17 MB per the Coordinator; the service worker precaches the shell and diffs assets-manifest.json by sha1 (sw.js). A new audio file therefore costs download size, loading time on first visit, and a manifest entry.

## 2. Events that should have a sound, with priority

P1 = the player misses it today and it carries meaning; P2 = polish; P3 = optional.

| Event | Exists now | Proposed | Pri |
|---|---|---|---|
| Menu tap / tab / back | flap (rising square blip, shared with flying) | separate `tap`: soft sine tick, 60 ms, quieter than flap; flap stays for flying | P2 |
| Flap (flying) | rising square blip, 28 sites | keep, but low-pass and lower gain; it fires up to ~4 times a second and is the harshest sound in the game | P1 |
| Coin / seed / crystal pick-up | coin | keep tone, soften to triangle/sine; pitch steps up on a chain of pick-ups | P2 |
| Buy a part | buy (4-note square arpeggio) | `buy` stays for small buys | P2 |
| New part / payoff card arrives | buy again at 170 ms | `reveal`: a rising 3-note bell figure plus a soft whoosh under the zoom; a larger version for a plane | P1 |
| New plane | arrives with the era card (a plane is an era event; `buyFleet` sells plane-LINE parts, systems and gadgets, never a whole plane) | covered by `era`; no separate cue (the earlier `newplane` was dropped, 2026-11-08) | - |
| Era opens | fanfare (7-note triangle run) | keep the idea; replace with `era` stinger (2 s): chord, rising shimmer; one per era, same melody shifted | P1 |
| Nature project funded | generic buy | `grow`: gentle rising bell plus a short wind/leaf noise swell | P1 |
| Nature project done / tier done | none | `bloom`: `grow` plus an extra high note; one per tier | P2 |
| Animal found | none | `chirp`: two short sine glides (species-agnostic) | P2 |
| Mission done | none | `done`: three-note up arpeggio | P1 |
| Badge earned / tier up | none | `medal`: bell strike with a long decay; tier 2/3 add partials | P1 |
| Records beaten (NEW BEST) | blink only | `best`: same as `done` plus a high ping | P2 |
| Crossing: take off | none | none (keep it a pure flight) | - |
| Crossing: sight of land | none | `landfall`: soft two-note horn, once | P2 |
| Crossing: landed (crossEnd, landed) | buy | `welcome`: era-like stinger, shorter (1.2 s) | P1 |
| Crossing: crash (crossEnd, crash) | nope (180 Hz square) | `softfail`: two descending sine notes, no noise; the card says "try again" | P1 |
| Crash kinds (flight): ground, storm, bird, no-fly | one `crash` | three: `thud` (ground, low sine plus brief filtered noise), `crack` (storm: filtered noise, no sawtooth), `flutter` (bird: three quick sine blips); overheat keeps its own | P2 |
| Overheat | 4 falling sawtooth notes | keep the falling shape, change to triangle with a low-pass | P2 |
| Land safely (flight) | land (4 square notes) | keep shape, triangle | P2 |
| Dusk / dawn | 3 triangle notes each | keep; add a 6 s ambience fade (see below) | P3 |
| Icy air in / out | issr, cool, warm | keep; soften | P3 |
| Heartbeat (danger) | heartbeat | keep (sine, already soft) | - |
| Plant a tree | plant | keep | - |
| Nope (cannot buy) | 180 Hz square, 150 ms | sine at 220 Hz, 120 ms; a square at 180 Hz buzzes | P2 |
| Title screen / hub / flight ambience | none | 6-10 s looped soft wind bed per place; off by default if the file costs more than the budget | P3 |
| Music | none | none recommended: kids 7-10 on phones, mute is common, cost is the largest item, and a loop becomes irritating by the tenth flight | P3 |

## 3. What it should feel like

Audience: children 7-10 on a phone, often in a room with other people; a climate-science game about cooling the planet.
- Calm and airy: sine and triangle, soft attacks (5-15 ms), long gentle decays, intervals from a major pentatonic scale (C D E G A) so any overlap is consonant.
- Never harsh: no square or sawtooth above about 0.03 gain, no sound longer than 2 s, no noise burst above 0.1 gain. A low-pass (about 3 kHz) on the master removes the buzz from the existing square tones. The present `crash` (noise 0.15 plus sawtooth) is the loudest and harshest sound; it is also the one that fires after the child's worst moment.
- Reward sounds go up, loss sounds go down and soften; failure never scolds ("try again" tone, not a buzz).
- One family: every stinger is a variation of one 3-5 note motif so the game sounds like one place.
- Loudness: master gain 0.5, a DynamicsCompressor at the end so nothing clips when a coin and a stinger overlap. Rate-limit each cue (a flap or tap not more than every 60 ms) and cap polyphony (about 6 voices).

## 4. Muted-by-default safety

- Audio starts only after the first tap (already true: `unlockAudio` from a gesture). Never autoplay a bed on the title screen before a tap.
- `save.muted` is honoured by every new path: all new cues go through the one `sfx` table and the one `muted` flag in sound.js. A test should assert that with `setMuted(true)` no `AudioContext` node is created (a counting stub; plant: a cue that bypasses the flag).
- No ambient loop plays while the tab is hidden (`document.hidden`; also stop on `visibilitychange`), and nothing plays at load.
- iPhone silent switch mutes Web Audio in some versions; do not rely on sound for any information. Every sound has a visual equal (true today: all cues accompany text or animation). Keep that rule as a design constraint.
- A first-visit hint is not needed; the gear menu already shows SOUND: ON/OFF. Consider default level 0.5 and a volume step only if a child complains.

## 5. Budget

| Option | Per sound | Cost to the site | Notes |
|---|---|---|---|
| Code synthesis (extend sound.js) | 0 bytes of files, 200-600 bytes of code | 0 | no licence, no loading, offline for free, tweakable; limited to tones, noise, simple filtered textures |
| Short ogg/m4a stinger (1-2 s, mono, 32-48 kbps) | about 5-20 KB | 5 stingers = about 50-100 KB, under 1 percent of the 17 MB | needs a manifest entry and decodeAudioData at first use; Safari iOS needs m4a/aac as ogg support is partial (verify), so ship both or ship wav-in-code; double the bytes |
| Ambience loop (8-10 s, mono, 48 kbps) | 50-80 KB each | 3 beds = 150-250 KB | only if the user wants beds; loop points must be seamless |
| Music track (60 s, 64 kbps stereo) | about 500 KB | one track 0.5 MB, a set of 4 about 2 MB | not recommended (section 2) |
Recommended cap for the first pass: 100 KB of audio files in total, loaded lazily after the first flight so the loading screen is unchanged.

## 6. Tools, honestly (nothing here is verified; each claim needs checking by the person who signs up)

My notes come from general knowledge and the Coordinator's thin search. I did not open any vendor page in this session. Do not trust prices or licences written here.

| Path | What it gives | Verify before use |
|---|---|---|
| Code synthesis in sound.js (current) | tones, noise, envelopes, filters, convolver reverb from a generated impulse; zero files | nothing to license; check iOS Safari behaviour with a real phone |
| Procedural retro generators: sfxr / jsfxr, Bfxr, ChipTone | parameter-driven short effects; jsfxr exports a small parameter list or wav that can be replayed in code | licence of the tool and of its output (sfxr is commonly described as free for any use; confirm per tool); output is 8-bit chip style, which fits the game's look but not the "airy" brief |
| CC0 libraries: freesound.org (CC0 filter), OpenGameArt (CC0 filter), Kenney.nl audio packs | real recorded or designed stingers, bells, whooshes | the licence of EACH file (CC0 vs CC-BY vs non-commercial: mixed in the same site); attribution requirement if not CC0; file format and length; keep a CREDITS file anyway |
| Phaser's web sfx generator and similar browser generators | quick one-shot effects | what the tool says about output ownership; whether it is hosted and for how long |
| AI text-to-sound services (ElevenLabs-style sound effects, Stable Audio / AudioCraft, other) | custom stingers, ambience and music from a text prompt | price per generation or subscription; commercial-use terms on the plan you buy; whether generated audio can be redistributed inside a shipped game; maximum length; output format (mp3/wav); whether the free tier forbids commercial use; if open weights (AudioCraft), the model licence (some are non-commercial) and the cost of running it |
| A human sound designer | the full set, consistent | quote and rights transfer in writing |

Recommended path for the first pass:
1. Extend code synthesis. Add a master chain (gain, low-pass, compressor), a convolver reverb built from a generated 0.4 s decaying-noise impulse (still 0 bytes of files), the 20 cues in section 2, and the tests. This covers every P1 and P2 event.
2. Use CC0 recordings only where synthesis sounds poor (probably a wind bed, a bell, a leaf rustle). Pick files by hand, record each licence in a CREDITS file, check file size before adding.
3. Paid AI audio only if the user approves a budget. What the user would have to do: pick one service, create an account, choose a plan, and confirm in writing the commercial and redistribution terms before any generated file enters the repo. I cannot sign up for anything and have no sound tool.

## 7. Build order (sizes are my estimates, not measurements)

1. Sound core and flight softening: master chain, `tap`, softened flap/coin/nope/land/overheat, per-cue rate limit, mute test with plant. About 0.5 day, one file plus a Node test of the cue table.
2. P1 events: reveal (part/plane), era, grow, done, medal, welcome, softfail, crash kinds. About 1 day plus placing about 12 call sites; browser check that each fires once per event.
3. Celebration kit (CELEBRATION-KIT.md) wired to the same cues. About 1.5 days.
4. P2/P3: chirp, landfall, bloom, best, ambience beds. About 1 day; beds depend on the file budget decision.
5. Optional: CC0 or AI-generated stingers behind the same cue names, so the swap costs no call-site change. Depends on the user's budget.

The user decides what ships. The cue names in section 2 are the stable interface: a cue can move from code synthesis to a file without touching any call site.

## 8. Not verified

- No sound was listened to in this session (no audio device); the descriptions of what the current effects sound like come from reading their waveforms and gains.
- Whether any event in section 2 already plays a sound through a path my grep missed (sounds started via other modules). The grep covered `sfx.` and `sfx[`; a `playSound(name)` wrapper exists in GameScene.js:1277.
- iOS Safari audio format support and the silent-switch behaviour.
- All tool prices and licences (section 6).

## 9. Status after release B (2026-11-08)

Built (releases A and B, on branches sound-a and sound-b): the sound core, `tick`, four death sounds, reduced motion, and the P1 cues reveal, era, grow, done, medal, welcome, softfail at seven sites. Dropped: `newplane` (a new plane is an era event). Listed, not built (P2, the user listens to A first): `bloom` (a nature tier done), `chirp` (an animal found), `landfall` (crossing sight of land), `best` (new best); the ambience beds (P3); the arcade song (research/ARCADE-SONG.md, no build until the user picks a sketch).
