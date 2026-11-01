# HANGAR and NATURE: one design (2026-11-01)

**Status: PROPOSAL, for the user's approval. Nothing is built yet.** Reviewed by the plane build (2026-11-01): rows, whole-row tap, strip and next-plane line are CHEAP; the in-box payoff is RISKY, so the overlay fallback is built first (§6).

The user, on live 0.22.0 (phone): "I still really don't like the hangar layout... it has elements that work but it's poorly
designed. The preview in nature leaves a lot to be desired too."

The design lead is the game chat. The plane build chat owns `src/hangar.js` and builds the hangar side with us.

## 1. What is wrong, measured (not guessed)

| What the user sees | Why it happens (in the code) |
|---|---|
| Row titles jump left, centre and far right ("Engines" left, "Wings & body" mid, "Cabin" right). | `.line` is a 2-column grid, `1fr auto` (style.css:144). The `i` button takes the wide 1fr column. The name block (`.frow-tap`) sits in the `auto` column, whose width = its own text. A long subtitle ("Rolls-Royce Avon turbojets, tuned") makes it wide, so the title starts far left. "Not yet" makes it narrow, so the title moves right. **One structural bug, not three styling slips.** |
| A blue `i` floats alone on the left. | Same cause: the `i` is the only thing in the 1fr column. |
| A tiny "TAP TO SEE" button. | A second, small target inside the row. The row itself is tappable but does not look it. |
| "Next: …" wraps beside the price. | `.next` is a flex row: a long sentence plus the price button. Nothing limits its length. |
| The preview plane is a different size from the plane in the hangar box. | There are **three** different pictures of the plane: the hangar box (`.fpreview`), the preview card (`#hPreview`), and the payoff (`.pay-plane`, a separate overlay with zoom). Each has its own size and place. |
| "Tourist class: fitted!" shows a blue "?" sticker on the plane. | It is not in the art: the tourist layer and the base are identical there. A blue "?" square is iPhone Safari's **broken-image icon**. One `<img>` in the payoff failed to load on the phone. Every hangar art path the code can produce exists on disk (checked for every plane, line, level and gadget). So this needs a WebKit reproduction in the browser turn, to name the exact file. The rule below catches it either way. |
| The plane tab shows grey silhouettes for future planes. | `timelineHTML` draws every future plane as a grey blob with "Opens in the 2010s". That is 6 boxes of "not yet" above the things you can actually do. |
| NATURE's preview is weak. | Tapping a project only outlines its row (`.previewing`). The land picture at the top does not change. |

## 2. Principles

1. **One plane box.** The hangar has exactly one picture of the plane, always the same size and place (full width, 400:176).
   - Preview = that box changing: the new part fades in, ghosted.
   - Buying = that box changing: the part arrives, then a sparkle.
   - There is no second card and no overlay picture.
2. **One row component**, the same everywhere: hangar plane parts, systems, gadgets, and NATURE projects. Fixed columns, nothing wraps, nothing jumps.
3. **The whole row is the button.** Tapping a row previews it in the box. BUY is the only other control. The `i` moves into the preview strip ("More about it").
4. **Real art or nothing.** A part with no art shows no sticker; its stat bar is the payoff. No `?`, ever.
5. **Show what you can do first.** Future planes become one line, not six silhouettes.
6. **NATURE works the same way.** One land box at the top. Tapping a project previews its feature IN that box, at its spot, ghosted, with the same strip below.

## 3. Hangar (390 x 844)

```
+--------------------------------------+
| HANGAR      🌰 87  ❄ 18   [TAKE OFF] |  header (as now)
+--------------------------------------+
| +----------------------------------+ |
| |                                  | |  THE PLANE BOX: 358 x 158 (400:176)
| |        (the plane, pixel art)    | |  preview: the part ghosts in here
| |                                  | |  buy: the part arrives here
| +----------------------------------+ |
| Comet 4 · 1950s            FLYING    |  caption (one line)
| ▸ Thrust reversers                   |  PREVIEW STRIP (only when a row is
|   Landing window  ▓▓▓▓░░░░  +15%     |  selected): name, its stat bars,
|   More about it ›         [70🌰 9❄]  |  info link, BUY (same as the row's)
+--------------------------------------+
| [ PLANE ] [ SYSTEMS ] [ GADGETS ]    |  tabs
+--------------------------------------+
| ⚙  Engines           ■■□   [70🌰 9❄] |  ROW: icon | name + pips | price
|    Next: thrust reversers            |       one-line effect (<= 30 chars)
|--------------------------------------|
| ✈  Wings & body      ■□□   [70🌰 9❄] |
|    Next: oval windows                |
|--------------------------------------|
| 💺  Cabin             □□□   [25🌰 3❄] |
|    Next: tourist class               |
+--------------------------------------+
| Next plane: 747 jumbo (the 1970s)    |  ONE line (replaces 6 silhouettes)
|   1 / 20 min of flying  ▓░░░░░░      |  + its progress bar
| More planes come in later eras.      |
+--------------------------------------+
```

The row component, at 375-390 px:
- Columns: `32px | 1fr | 92px`.
- Line 1: name (9 px, one line) and level pips.
- Line 2: the effect, "Next: <part name>" (7 px, one line, at most 30 characters, written to fit, never cut off).
- The price/BUY button is always the same width, so all prices line up.
- Locked rows: the same row dimmed, with "1970s" in the price column.
- Maxed rows: "Done ✓".
- The full sentence ("landing window x1.15") moves to the preview strip, where there is room and the bars show it.

The payoff after a purchase happens IN the plane box:
1. The part arrives in the box.
2. The strip shows "NEW: jet engines!" with the bars moving.
3. An OK button sits in the strip.

The rows stay visible below, so nothing pops up over the screen. The first-upgrade rails step targets the strip's OK.

## 4. NATURE (390 x 844)

```
+--------------------------------------+
| NATURE        🌰 500  ❄ 0            |
| ◂ Island forest | Polynesian islands ▸|  land tabs (as now)
| +----------------------------------+ |
| |   THE LAND BOX (the field, 288x120 scaled to full width)       |
| |   preview: the project's feature ghosts in at its own spot     |
| +----------------------------------+ |
| Polynesian islands   ▓▓▓░░░░  Barren |  meter (as now)
| ▸ Keep rats away from kakerori nests |  PREVIEW STRIP: what it does in one
|   Brings back: kakerori              |  line, what it brings back (with the
|   More about it ›           [FREE!]  |  animal's card picture), BUY
+--------------------------------------+
| Tier 1: First steps   0 / 2 done     |
| 🐀  Rat bait for kakerori   [20🌰]   |  ROW: the same component
|     Brings back: kakerori            |
| 🪸  Plant coral             [35🌰]   |
|     Brings back: reef fish           |
+--------------------------------------+
```

Project names that are too long for one line (e.g. "Keep rats away from kakerori nests", 34 characters) get a SHORT row name, a new `short` field on the project, such as "Rat bait for kakerori". The full name stays in the strip.

## 5. Rules, each with a gate (planted defect first)

1. **Text fits.** A browser test, `rowfit`, at 375x667 and 390x844, opens every hangar tab for every plane era and NATURE for every land.
   - It requires every row's name and effect: `scrollWidth <= clientWidth` and one line (`height <= line-height × 1.2`).
   - It also requires the preview strip's text to fit.
   - Plant: a 40-character name. It must FAIL.
2. **One plane box.**
   - In a browser, the preview and the payoff use the SAME element as the hangar box: the same `getBoundingClientRect`, no second plane `<img>` anywhere on the hangar screen.
   - Plant: render the old preview card. It must FAIL.
3. **No broken pictures.** Every `<img>` on the hangar and NATURE screens has `naturalWidth > 0` after load, for every tab, plane and land.
   - A Node check also confirms every art path the code can produce exists.
   - Plant: point one part at a missing file. It must FAIL. This catches the "?".
4. **Rows line up.** In every list, every row's name starts at the same x, and every price button has the same x and width.
   - Plant: the old `1fr auto` grid. It must FAIL.

## 5b. Hooks kept (the plane build's constraints, 2026-11-01)

Every hook stays. Where a hook moves, it keeps its id or selector, so the tests that click it (hangar, hangarnew, progression, onrails, payoffdraw) change only where noted.

| Hook | In the redesign |
|---|---|
| One tap target per row, `[data-ftap="kind:id"]` (rails R5) | **The whole row** carries `data-ftap`. One target, now big. |
| `#hPreview` (bars, price, `#hPreviewBuy` with `data-fbuy`) | Becomes **the preview strip** under the box: the same id and the same buy path. |
| Row BUY `[data-fbuy]` shortcut | Kept, in the fixed price column. |
| `.fghost` ghost layers | Kept, inside the one plane box. |
| Stat bars: `statBarsHTML`, `animateBars`, `previewBars` (1-3 per item; hangar-feedback.cjs) | Shown in the strip (room for 3). Rows show none, which keeps them one line. Every item still has a part OR a bar. |
| The payoff: `#payoff #payBefore .pay-part #payMark #payLabel #payOk #payText .pay-frame .pay-plane .arrive .labelled .nopart` | **The same ids, re-homed into the box and strip**: `#payoff` = the box in payoff mode, `.pay-plane` = the box's picture, `#payLabel` over the part, `#payText` and `#payOk` in the strip. If keeping the ids makes hangar.js riskier, the fallback is: keep the overlay, but make its `.pay-frame` exactly the box's size and position (rule 2 tests the rect). |
| `#hCap` estimate line (`.working`) | Kept, in the caption line under the box. |
| The finance desk `.fline.finance` (rate bar, `#hTrade`, `#hBond`, `#hFinBuy`) | **Exempt** from the one-line row: a bigger card in SYSTEMS, with its own fit rule (rowfit checks it at 375). |
| The 400x176 composed portrait (planelook.js) | It defines the box's aspect (400:176). Ghosts and `#payMark` measure on it unchanged. |
| 787 / truss / hydrogen: no part layers | Their upgrades show bars only, in the strip, with no sticker (rule 3: no broken image). |

## 6. Build plan (after approval)

**The plane build's review (2026-11-01), adopted:**
- **The payoff, stage 1, is the FALLBACK:** keep the `#payoff` overlay, but its `.pay-frame` takes exactly the plane box's rect, so to a player it looks the same as in-box.
  - In-box is RISKY: render() rebuilds the box before payoff(); the ghosts must hide; the zoom clip and onrails R6 need rewriting.
  - In-box comes only if the user wants it after seeing stage 1.
- **The `i` and BUY are SIBLINGS of the row's `data-ftap` element, not children.** That keeps one tap target per row (the R5 audit), and a BUY tap never also previews.
- **hangar.cjs reads "Next: <name>"**, so the row's second line keeps that wording. Tests are updated in the same change.
- **The "?":** confirmed as Safari's broken-image icon. The payoff waits for both pictures, so a `.pay-part` that fails in WebKit stalls it halfway. The plane build owns that fix (an onerror drop plus a test, in payoff()) in a short WebKit turn. Rule 3 (no broken images) still lands with the redesign.
- **Tapping a silhouette to preview a future plane goes away** with the one-line next plane. Accepted.


- **Plane build chat (`src/hangar.js`):** the plane box as the only picture; the preview strip; the payoff moved into the box; the one-line next plane; row HTML using the shared component.
- **Game chat (us):**
  - the shared row component CSS;
  - NATURE (`src/wild.js`): the land box preview, the strip, short project names;
  - the four gates above with plants;
  - the rails steps that point at moved targets (tests onrails, payoffdraw);
  - the WebKit reproduction of the "?".
- **Order:** the row component + rule 4 + rule 1 first (they fix most of what the user sees), then the box/strip, then NATURE.
- **Art:** none needed. Every row icon already exists (part icons, project icons). No PixelLab.

## 7. Open questions for the user

1. Should the payoff stay in the box (proposed), or keep a pop-up with an OK?
2. Future planes: one "Next plane" line (proposed), or keep a small strip of the next 2?
3. Is the shorter project name in the row OK, with the full name in the strip?
