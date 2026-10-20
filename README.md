# Contrail Pilot

A Flappy Bird-style browser game about contrails, for the Great Exhibition Road Festival.
Fly a plane, dodge thunderstorms, and choose *when* to make contrails: by day they can
block sunlight and cool the planet, by night they trap heat and warm it.

The full design plan lives in the group's Claude doc "Contrail Pilot — Game Plan".

## Run it locally

No build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

On a phone on the same Wi-Fi, open `http://<your-laptop-ip>:8000`.

## Layout

| Path | What |
|---|---|
| `index.html` | Page shell |
| `src/config.js` | All tuning numbers (speeds, gaps, ISSR sizes, colours) — edit here when playtesting |
| `src/GameScene.js` | The game loop: flight, airports, ISSRs, contrails, day/night, radiation |
| `src/Hud.js` | CO2 gauge, net-heating bar and planet face |
| `src/ui.js` | Title/briefing, results, hangar (shop) and in-flight tips (HTML overlays) |
| `src/upgrades.js` | Upgrade lines and levels, fuels, tree species, badges, and how they change a flight |
| `src/school.js` | Flight school: the guided first flight |
| `src/nature.js` | Tree species, rewilding projects and the Wild Land (biodiversity) meter |
| `src/links.js` | "Learn more" links in the info pop-ups (some still to be filled in) |
| `src/save.js` | Progress saved on the device (localStorage) |
| `src/online.js` | Supabase: anonymous sign-in, pilot name, flight outbox, leaderboard() (optional: the game plays on offline) |
| `src/pilot.js` | MY PILOT (name + profile) and LEADERBOARD screens |
| `supabase/migrations/` | Database: players, flights, row-level security, word filter, the board scores |
| `src/sound.js` | Chiptune sound effects synthesised in code |
| `style.css` | Pixel-style screens |
| `vendor/phaser.min.js` | Phaser 3.90 (MIT), vendored so the game works offline |

## Status

Week 2: takeoff from London, airports every 1500 m (glide onto a runway to land, or fly on),
CO2 gauge (left), day/night cycle with sunbeams and heat arrows that contrails block or trap,
net-heating bar with planet face (right), overheat ending, end-of-flight card with CO2 per km.
Art is placeholder blocks at 288×512, scaled up with no smoothing for the pixel look.

## Deploying

Every push to `main` runs all the checks in headless Chrome on GitHub Actions
(`.github/workflows/deploy.yml`) and only publishes to GitHub Pages if they all pass.

## Checks

`tests/issr-reveal.cjs` flies the game with an autopilot in headless Chrome and fails if any ISSR
is visible from further than `revealPx`, or if ISSRs aren't clearly visible from inside.

```sh
python3 -m http.server 8000 &
npm i --no-save playwright-core
node tests/issr-reveal.cjs        # set CHROME=/path/to/chrome if needed
node tests/flight.cjs             # takeoff, landing, day/night radiation, overheat, crash
node tests/progression.cjs        # seeds banked only on landing, multiplier, hangar levels, info pop-ups, planting
node tests/school.cjs             # a new player can finish flight school by following the captain
node tests/hazards.cjs            # turbulence, no-fly zones, birds: distances, delayed taps, crashes
node tests/nature.cjs             # Wild Land meter: variety beats quantity, species rotation, rewilding
node tests/textures.cjs           # every assets/*.png and code-drawn texture exists (assets/ui/ is HTML-only)
node tests/wildlife.cjs           # wildlife grows with Wild Land, exhaust plume, Greener Cabin
node tests/controls.cjs           # hold to take off, aim X accuracy, OK-button tips, lumpy icy air
node tests/collisions.cjs         # pixel-accurate hits: storms forgive a nick, no-fly and birds don't
node tests/missions.cjs           # mission card, completion on landing, not on a crash, airport-pass sign, upgrade gate
node tests/features.cjs           # Citizen Zoo switch: off = no trace of it anywhere; ?citizenzoo = all back
node tests/gate.cjs               # grown-up gate: hold 2 s (mouse + touch) reveals a real Citizen Zoo link
node tests/links.cjs              # every Learn more link has a real https URL; About page links and credit
node tests/runway-back.cjs        # MENU button while parked on the runway: back to title, no flight counted
node tests/hangar.cjs             # buying the LAST level of an upgrade, "need N more" hint, big BACK buttons
node tests/online.cjs             # pilot names + leaderboards against a FAKE Supabase: name form, rude/offline messages, flights sent, outbox
supabase/tests/run.sh             # the database itself in a throwaway Postgres (Docker): word filter, row-level security, scores
node tests/crystals.cjs           # seeds/ice crystals: old-save migration, earning rules, costs, hangar tabs
```

`tests/flight.cjs` lands an autopilot at the second airport and forces day and night over a line
of contrails to check that sunbeams are blocked by day and heat is trapped only at night.
