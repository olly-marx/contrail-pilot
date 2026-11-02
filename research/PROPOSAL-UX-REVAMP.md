# UX revamp: the results screen, HOME and MISSIONS (2026-11-02)

**Status: PROPOSAL (read-only desk work, no runs).** The user's playtest of live 0.25.x on a phone (~390 px). The game chat
leads the results screen, HOME and MISSIONS. The hangar (SYSTEMS / GADGETS) and NATURE's clipping belong to the plane build;
the shared rules (§3) are agreed through the Coordinator.

## 0. Decisions that are the USER's (top, as asked)

1. **Auto-claim seed prizes?** Recommended **YES**: mission and badge prizes are added straight to the bank and shown as ONE total ("+86 seeds from 7 missions"). The CLAIM ritual stays only for something you choose (a crystal trade, a free part). Today a 7-mission flight makes 7 CLAIM buttons plus CLAIM ALL. **If NO:** one CLAIM ALL card with the total, never a list.
2. **Finished missions: a count, or a count + names?** Recommended: **"You finished 7 missions!"** with the names behind a "see them" tap (MISSIONS shows them ticked). The user's own idea was not to list them.
3. **Results length: one fitted card (recommended) or a staged reveal** (beats you tap through)? One card that fits 390x667 and 320x568 with no scroll; extra beats (a NEW ANIMAL, a NEW BADGE, a new era) come as separate full-screen moments AFTER it, one at a time, each with one button.
4. **The random fact ("Right tree, right place: ...")**: keep on the results card (recommended **no**: it moves to the loading screen and NATURE), or drop?
5. **The Earth-bars block (CO2 / Night / Shade / Nature) on every results card**: recommended **collapsed to one line** ("Earth: a bit warmer +152 / cooler -42") with the bars behind a tap. It is the most text-heavy part and it repeats every flight.

## 1. FLOW TABLE (today, from the code and the user's screenshots)

**Heights are from the screenshots (390 px wide, scale 1179/390); the 320x568 numbers are ESTIMATED (text wraps more at 320, so it is taller) and get measured in the first build turn.** The results card is one scrolling panel (`#results .panel`), revealed step by step (`showResults`, src/ui.js:370), and it ends scrolled to the bottom.

| # | Card (element) | ~height at 390 | Tappable | Note |
|---|---|---|---|---|
| 1 | Title "Landed in MELBOURNE!" (`#rTitle`) | 40 | no | |
| 2 | Missions done + NEXT (`#rMission`, green box) | **160** (7 missions) | no | a wall of text: every mission's full name, then NEXT |
| 3 | Distance "9,990 km" (`#rDist`), record (`#rRecord`) | 70 | no | |
| 4 | Seed tally: grabbed, landing bonus, land, forest bonus, fares, nature, TOTAL, crystals (`.tally`) | **200** | no | 4-7 rows of maths |
| 5 | Earth bars CO2 / Night / Shade / Nature + face (`.earth`) | 110 | no | |
| 6 | Era: "+1.6 min flown", bar, "To the 1970s: 7/20 min" (`#rEra`) | 70 | no | |
| 7 | NEW BADGE (`#rBadges`) | 50 each | no | |
| 8 | CLAIMS: one row per prize + CLAIM ALL (`#rRewards`) | **45 x N** (7 = 360) | yes, N+1 buttons | the user: "may never see them" |
| 9 | NEW ANIMAL (`.new-animal`) | 120 | no | its own beat, buried here |
| 10 | FREE part / fact (`#rFree`, `#rFact`) | 60 | link | |
| 11 | FLY ON / NEXT button (`#againBtn`) | 50 | **the one primary** | at the very bottom |

**Total: ~900 px with a few missions, ~1,300 px with 7 claims, against 611 px of usable height at 390x667 (667 minus the tab bar). It scrolls 1.5-2 screens, and it opens scrolled to the bottom (the reveal scrolls each step into view), so the player first sees the claims and FLY ON, not what happened.**

How the screens relate today:
- **HOME** (`#title`): NEXT card, the route, TAKE OFF, and tiles.
- **MISSIONS:** a separate tab, a list per tier + Today + Steady + Badges. It is not linked from the results.
- **NATURE:** a tab; the results link to it only through "See them in your Wild Area".
- **HANGAR:** a tab; NEW on the tab, nothing on its SYSTEMS / GADGETS sub-tabs.
- **The post-flight path:** results, then FLY ON, then (sometimes) a rails detour (hangar / NATURE), then HOME, then TAKE OFF.

## 2. Designs

### 2a. The results: ONE fitted card (390x667 and 320x568, no scroll)

```
+------------------------------------+
| Landed in MELBOURNE!   9,990 km    |  title + distance on one line (record: a star on it)
|                                    |
|   +78 🌰   +7 ❄                    |  the BANK change, big: seeds and crystals (all sources)
|   (23 grabbed x3.4 landing ...  ›) |  one muted line; the tally rows behind the tap
|                                    |
| ✓ You finished 7 missions! +86 🌰  |  ONE line (auto-claimed: decision 1)
|                                    |
| UP NEXT                            |  the next 1-3 open missions, short names,
|  • Buy a helper system             |  progress where it has one
|  • Land at PERTH        (2 stops)  |  (a city mission says how far: src/aim.js)
|  • Fly 4,500 km ▓▓▓░░ 3,100        |
|                                    |
| Earth: warmer +152 / cooler -42  › |  one line (decision 5)
| 1950s ▓▓▓▓░░░ 7/20 min to 1970s    |  the era on one line
|                                    |
|          [  FLY ON  ]              |  ONE primary, always visible (in the card, no scroll)
+------------------------------------+
```

- **Budget** (rule §3.1): at most 9 lines of text plus one button; every line fits one line at 320 px.
- **After the card, the BEATS:** each is a full-screen moment with one button, in this order, only when they happened:
  - a **NEW ANIMAL** (its card picture big, "Murray cod: a new animal! See it in NATURE ›", button OK);
  - a **NEW BADGE**;
  - a **new era**;
  - a **free part** (it leads to the hangar, as today's rails do).
- A crash uses the same card: "Crashed: the seeds on board are lost", the crystals kept, the missions finished (a crash can finish steady goals and dailies), UP NEXT, and FLY ON.
- The fact moves out (decision 4).

### 2b. HOME: a "next up" strip

```
+------------------------------------+
| MELBOURNE ▶ PERTH ▶ DARWIN         |  the route (aimed: src/aim.js)
| 🌰 229  ❄ 19                       |
| UP NEXT                            |  the SAME 1-3 lines as the results (one source: missions2.visible + dailies + steady)
|  • Land at PERTH        (2 stops)  |
|  • Today: pass 4 storm gaps        |
|  • Buy a helper system   [HANGAR›] |  a line can lead somewhere (one tap)
|          [ TAKE OFF ]              |
+------------------------------------+
```

- MISSIONS stays the full list. HOME's "UP NEXT" and the results' "UP NEXT" are the same component, so the player always sees the next things in the same words.
- **MISSIONS gets a "COMING UP" head:** the next tier's missions greyed with what opens them ("3 more in tier 2 → tier 3"), so what is coming is clear, not just what is open.

### 2c. MISSIONS (light): the same `.rowc` rows as the hangar and NATURE; ticked rows fold into "7 done today ›".

## 3. The SHARED rules (one set, the same text as the plane build's research/PROPOSAL-NATURE-HANGAR-UX.md; agreed via the Coordinator)

1. **One primary action per screen,** always on screen without scrolling. It is the big button; everything else is smaller, outlined, or behind an (i).
   - Results: FLY ON.
   - HOME: TAKE OFF.
   - NATURE: fund the next project you can afford, else the one thing that unlocks the next.
   - Hangar: the next affordable upgrade (the strip's BUY).
2. **Text budget:**
   - a screen's intro is ONE line, the rest behind an (i) (≤ 60 words);
   - a content card or row is a TITLE + ONE fact line (≤ 30 characters);
   - a results or HOME section is at most 3 lines at 320 px;
   - more always goes behind "›" or (i).
3. **Titles:**
   - a compact `.rowc` row (hangar, MISSIONS) keeps a ONE-line name;
   - a NATURE project card may WRAP its title to 2 lines, with its price on its own row.
   - In both cases: **never under a button.** This is gated as rect overlap: title ∩ price = ∅.
4. **Nothing clipped:** every text node fits its box, at 320 and 390. Tab rows (NATURE's lands) scroll sideways with an edge fade, the current land first, never cut mid-word.
5. **The NEW dot:**
   - It shows on the bottom tab AND its sub-tab AND the row.
   - An item is new when it became buyable or open since you last saw its sub-tab.
   - Seeing the sub-tab clears it, and the bottom tab clears when no sub-tab has a dot.
   - It is stored per save; at ship, everything already open counts as seen.
   - One hasNew() source.
6. **Tiers:** the current tier open; the others ONE line each ("Tier 1 · done ✓", "Tier 3 · needs biodiversity 30").
7. **No scroll for the main loop:** HOME, the results card, each beat, and the first screen of MISSIONS fit 390x667 and 320x568. On NATURE and the hangar, the first project card / first upgrade row is on the first screen at 320x568.
8. **Never a list of same-kind buttons** (CLAIM x7 is the anti-pattern).

**Where the two proposals differed, and how it is settled:**
- (a) Row titles: mine said "one line"; theirs lets NATURE titles wrap. Settled as rule 3, both.
- (b) Text budget: mine said "≤ 3 lines per card"; theirs said "title + 1 fact". Settled as rule 2: theirs for cards, mine for results/HOME sections.
- No other disagreement.

## 3b. NATURE (wild.js: the game chat builds it; the plane build reviews)

The plane build's §2a/2b, adopted:
- **Project card:** the title wraps (≤ 2 lines); one fact line ("Brings back 2 animals"); the price chip on its own row at the right. When unaffordable it is outlined, not greyed, and shows "need N more" on tap. A done project is a ✓ and one line.
- **The top fits one screen:**
  1. the land tabs (scrolling, yours first);
  2. the land picture;
  3. one meter line with an (i);
  4. **NEXT**: the one primary ("Fund Numbat helpers [300 🌰 38 ❄]" or "Plant 4 more trees here");
  5. the current tier open, the other tiers one line each.
- The NEXT HERE box and the two intro paragraphs go behind (i).
- The preview strip under the land (shipped in 0.23.0) stays the place the full story lives.

## 4. Releases (each one gate-testable)

| Release | What | Gate (real taps; plant that must FAIL) |
|---|---|---|
| R1 | Results: one fitted card; auto-claim or one CLAIM ALL (decision 1); missions as a count; UP NEXT | `resultsfit` at 390x667 + 320x568: no scroll (`scrollHeight <= clientHeight`), FLY ON on screen, no text clipped, missions shown as a count. Plants: the old mission list; CLAIM rows back; the card taller than the screen. |
| R2 | The beats after the card (animal, badge, era, free part), one at a time | `resultbeats`: a flight that finds an animal AND earns a badge shows 2 beats in order, one button each. Plant: the animal folded back into the card. |
| R3 | HOME's UP NEXT (the same component) + the MISSIONS "coming up" head | `homenext`: HOME fits with no scroll; its UP NEXT equals the results' after the same flight. Plant: different sources. |
| R4 (NATURE: the game chat; the NEW dot: the plane build) | NATURE cards (wrap, price row), tabs that scroll, NEXT line, tiers; the NEW dot | `newdot`: a new GADGET lights HANGAR and GADGETS. `rowfit` gains **an "under a button" check** (a row's name rect must not intersect its price rect; today's gap: rowfit passed the NATURE rows the user screenshotted). Plants: the sub-tab dot removed; a long name under the price. |
| R5 | Text-budget pass on NATURE / hangar copy (the plane build), MISSIONS rows | `textbudget`: card body <= 3 lines at 320. |

Each release is small, and the old screens keep working until replaced. The rails (onrails, postrails, firsthour-real) are updated in the same release as the screen they walk through.

## 5. Art: the code-drawn placeholders (read from tools/art/species.py + src/pixellab.js; NOTHING spent)

- **Australia (bush), animals still code-drawn: 7.** emu, kookaburra, echidna, cockatoo, wombat, wedge-tailed eagle, **Murray cod** (the user's screenshot). The other 16 bush animals have PixelLab art.
- **Australia, trees:** all 5 code-drawn (blue gum, wattle, banksia, red gum, grass tree). Trees are code-drawn in every land by design, so they are not counted as placeholders.
- **Polynesia, code-drawn animals:** 7 (flying fox, reef heron, white tern, imperial pigeon, coconut crab, malau, Tahiti monarch).
- **Cost:** 2 gens an animal (sprite + card) plus a test call per batch.
  - Australia's 7 = **15** (one test call).
  - Polynesia's 7 = another 15.
- **Left: ~24.** So: Australia's 7 now (15, leaving ~9 in reserve), Polynesia's after a top-up.
- **The user's call** (not spent).
