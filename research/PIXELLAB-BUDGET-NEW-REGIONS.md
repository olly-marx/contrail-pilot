# PixelLab budget for the new regions (69 animals + 15 trees)

For the user, 2026-10-25 (PixelLab session). A note to decide from, nothing is built.

## What things really cost (measured)

| Call | Cost | How we know |
|---|---|---|
| One picture (sprite or card, pixflux/pixen) | 1 generation | trial batch: 15 pictures + 12 colour-reductions = 14.2 |
| Colour reduction | about free | same trial |
| Animation (animate-with-text-v3, 4 frames) | **1 generation** | measured 2026-10-25: balance 264.2 -> 263.2 for one kiwi animation |
| Inpaint (repaint part of a picture) | 10 generations | the art session's measurement |

From the 189-animal batch logs, about **22 %** of sprites and cards had to be redone (lookalike species, scenery).

So **one animal = sprite + animation + card = 3 generations, about 3.7 with redos**. One tree = about 2.2.

## The sum

69 animals x 3.7 + 15 trees x 2.2 = **about 290 generations**. The shared account has **263 left** (2026-10-25),
and other chats use it too. **As planned, it does not fit.**

## Option 2: write each species' distinguishing features into the prompt up front

Most redos were lookalikes (a red fox for an arctic fox, a bald eagle for a white-tailed eagle, a person for a
muriqui). When the prompt spells out what makes the species unique ("white-tailed eagle: pale head, WHITE wedge
tail, yellow beak"), it usually works first time: on 2026-10-24 the 45 hand-written project prompts came out right at
the first try, against a third of the first batch.

- Cost: some writing time per species (a line each, from the research notes), no extra generations.
- Expected: redos from about 22 % down to about 5-10 %, so about 3.2 per animal: **~255 in total**. Still tight.

## Option 3: one picture per animal, and the second frame made in code

Today every animal has 2 flight frames from the animation. Instead the game could use ONE sprite and make it move
in code: a 1-pixel bob up and down while walking, or swimming, or a gentle wing tilt for birds (Phaser can do this
with a tween, at no art cost).

- Saves the animation: about 1 generation per animal, so 69 animals x ~2.2 = 152 + trees 33 = **~185 in total**.
- Fits with room to spare (about 75 left for redos or other chats).
- Cost: the new animals would move a little more simply than the 189 existing ones. Walking legs (like the kiwi's
  4 frames, saved in `tools/art/pixellab/trial/`) would not be there.

## Mixed (suggested)

Animate only the animals where movement matters most (birds flapping, and a few stars such as the kiwi or kakapo),
and give the rest the code bob. For example 20 animated + 49 bobbing, with option 2's prompts:
20 x 3.2 + 49 x 2.2 + 33 = **~205**. That fits and keeps the best ones lively.

## What I need from you

Which option (2, 3, mixed, or a different budget such as buying more generations), when the new regions are approved.
