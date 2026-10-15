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
| `src/GameScene.js` | The game loop |
| `vendor/phaser.min.js` | Phaser 3.90 (MIT), vendored so the game works offline |

## Status

Week 1 prototype: flap controls, scrolling storms, faint ISSRs, contrail squares, crash and restart.
Art is placeholder blocks at 288×512, scaled up with no smoothing for the pixel look.

## Checks

`tests/issr-reveal.cjs` flies the game with an autopilot in headless Chrome and fails if any ISSR
is visible from further than `revealPx`, or if ISSRs aren't clearly visible from inside.

```sh
python3 -m http.server 8000 &
npm i --no-save playwright-core
node tests/issr-reveal.cjs        # set CHROME=/path/to/chrome if needed
```
