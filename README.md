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
| `src/links.js` | "Learn more" links in the info pop-ups (some still to be filled in) |
| `src/save.js` | Progress saved on the device (localStorage) |
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
node tests/progression.cjs        # trees banked only on landing, multiplier, hangar levels, info pop-ups, planting
node tests/school.cjs             # a new player can finish flight school by following the captain
node tests/hazards.cjs            # turbulence, no-fly zones, birds: distances, delayed taps, crashes
```

`tests/flight.cjs` lands an autopilot at the second airport and forces day and night over a line
of contrails to check that sunbeams are blocked by day and heat is trapped only at night.
