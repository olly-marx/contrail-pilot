# Proposal 15: a climate-research and nature-charity knowledge base, donate links behind the grown-up gate

Status: PROPOSAL ONLY (2026-10-24, PixelLab session). Nothing is built. The user approves or changes it first.

## What is there today (read from the code)

- **Every one of the 101 region projects** (`src/habitat/<region>.js`) already has a real organisation:
  `org: { name, learn, donate }`, plus a `fact` and `src` (sources). The 11 UK projects have no `org`.
- **A grown-up gate already exists**, used twice: press and HOLD a button for 2 seconds, then a real link appears
  for 10 seconds (`src/wild.js gate()`, `src/ui.js` around line 528). The game takes no payments.
- **Research links**: `src/links.js` (Imperial's AEIS contrail group, the Brahmal Vasudevan Institute, the North
  Atlantic contrail trial; a contrail-forecast link marked "coming soon"). Citizen Zoo is switched off
  (`FEATURES.citizenZoo`).

So most of the content exists already; what is missing is **one place to browse it**.

## What a kid sees (and what a grown-up sees)

A new **"REAL WORLD"** page (a button on About, or a tab on NATURE; the user chooses):

1. **The science** (for kids, no links needed): 5-6 short cards. What a contrail is; why night contrails warm and
   day ones can cool; how planes can dodge icy air (the North Atlantic trial); why trees and habitats matter;
   each card ends with "You did this in the game when you ...".
2. **The people doing it** (for kids): a card per organisation, grouped by land, using the existing `org.name`,
   the project's `fact` and the PixelLab project icon. The card says what they do in one line.
3. **For grown-ups**: on each card, the existing hold-for-2-seconds gate reveals **Learn more** and **Donate**
   links (the `org.learn` / `org.donate` already stored). Nothing tappable by accident; nothing paid in the game.

## Content work

- **UK projects need `org` entries** (11): candidates such as the Wildlife Trusts, Beaver Trust, Freshwater
  Habitats Trust, Vincent Wildlife Trust (pine martens), the White Stork Project. Each to be checked in a browser
  on the day, like `links.js` says ("All URLs checked in a browser on 2026-10-19").
- **Link checking**: a small tool (no browser needed) that visits every `learn`/`donate`/`links.js` URL and fails
  on 404/timeouts, run before each release that touches the list. Today nothing checks the 200+ links.
- **Wording review**: every card read aloud for a 7-10 year old (the game's tone rule: kid-friendly).

## Risks

- **Children and donations:** the gate is the protection. Keep the existing 2-second hold, and never show a
  donate link outside it. Optional extra: a simple sum ("What is 7 + 5?") as some apps do; the user decides.
- **Endorsement:** listing a charity can read as the game recommending it. One line on the page: "We are not
  connected to these groups; we list them because their work is real."
- **Links go stale:** the checker above, plus a "last checked" date shown on the page.
- **Privacy:** outgoing links carry no tracking from the game (Citizen Zoo's `?ref=` is the only one today; keep it
  only if the user wants it).

## Tests (when built)

- No donate link is in the page until the gate is held (plant: render the link outside the gate → fails).
- Every region project shows a card with its org name (plant: drop one → fails).
- The link checker fails on a planted dead URL.
