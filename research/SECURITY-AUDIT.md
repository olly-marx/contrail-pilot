# Security audit (2026-11-19)

Scope: logins, saves, currency (coins, seeds, crystals), leaderboards. Read from origin/main c2d3649 and,
read-only, from the live Supabase project mkucbsjzbipjaiqzrlkj (functions, grants, policies, advisors, row counts).
Live counts at the time: 18 players, 377 flights, 8 online saves, 55 anonymous auth users.

## How it works now

- Every device signs in anonymously (Supabase `signInAnonymously`). No email or password.
- The whole game state, currency included, is a JSON save in localStorage (src/save.js). The server stores a copy
  as an opaque blob (`put_save`) and never reads it.
- A pilot is `first_name the word tag`. The pilot code (4 name words + a 2-digit tag, made with `Math.random`, about
  25 bits) moves a pilot to another device through `pilot_login`, which allows 10 wrong codes per pilot per hour.
- Leaderboards are computed by `leaderboard()` from the `flights` rows that the client reports through
  `send_flights` (100 a call, 300 a day per pilot). Direct inserts into `flights` are blocked live (no insert policy).

## What is sound

- Only the publishable key is in the repo; no service or secret key in the history.
- RLS is on for every table. Saves, codes, devices and attempts are readable only through functions that scope to the caller.
- Names are restricted to letters and the fixed word list, so a name cannot inject HTML into the boards.
- Flight times use the server clock. `archive_season1` is not reachable from the API.

## Findings, most important first

1. **Leaderboards can be forged.** `send_flights` accepts any numbers inside wide ranges: 500 km landings, any species
   list (50 per flight), `missions_done` up to 200 per flight, shade up to 10,000. A few lines in the browser console
   reach the top of every board. This is the only cheat that affects other players.
2. **Currency can be edited, but only on one's own device.** Coins, seeds and crystals live in the local save. Editing
   localStorage (or the uploaded save) changes one's own game and nobody else's. There is no real-money purchase, so this
   costs nothing today. It matters only if currency ever buys something real, can be traded, or feeds a board.
3. **Unlimited anonymous accounts, no captcha.** Each sign-in makes an auth user; local config allows 300 an hour per IP
   (hosted setting not checked). A script can create many pilots, fill the boards with names, and store up to 300 KB of
   save per pilot.
4. **Pilot names are not unique.** Nothing stops a second "Sam the Owl 42". On the boards the copy looks identical.
5. **Login lock-out.** Names and tags are public on the boards, so anyone can send 10 wrong codes an hour and keep a real
   pilot from logging in on a new device. The code itself is safe against guessing at that rate (about 30 million
   combinations), but it uses `Math.random` rather than `crypto.getRandomValues`.
6. **The repo no longer matches the live database.** Live has `client_ok`, `season`, `missions_done`, a newer
   `leaderboard`, and `client` arguments on `put_save`/`send_flights`; none of these are in supabase/migrations. A rebuild
   from the repo would bring back the older functions.
7. **Small hygiene items from the Supabase advisor:** `normalise_name` has no fixed search_path; the trigger function
   `flights_rate_limit` is callable as an RPC (harmless, it errors); leaked-password protection is off (unused: no passwords).
8. **Board cost grows with flights.** `leaderboard()` aggregates every flight of the season on each call. Fine at 377
   rows; slow at hundreds of thousands, and anyone can call it repeatedly.

## Plan

A. Hardening without changing the architecture (recommended now):
   1. Plausibility limits in `send_flights`: distance capped by the longest route the game can produce, `missions_done`
      capped at a realistic per-flight number, species only from the game's list, shade bounded per km flown. Flights
      outside the limits are dropped, not rejected, so an honest client never errors.
   2. Captcha (Cloudflare Turnstile, supported by Supabase Auth) on anonymous sign-in, and a lower per-IP limit.
   3. Unique index on (lower(first_name), word, tag); `savePilot` already re-rolls the tag on a clash path to add.
   4. Pilot codes from `crypto.getRandomValues`, one more word; count wrong attempts per calling device as well as
      per target, so one attacker cannot lock someone out.
   5. One migration that records the live schema, so repo and database match again; fix the two advisor items.
   6. A moderation path: the existing `hidden` flag plus a short admin query to list outliers per board.

B. Server-authoritative economy (only if currency ever has real value): the server would hold coins/seeds/crystals and
   check each flight before paying. That means moving game rules into the database or an edge function, and is a large
   change. Not recommended while the game has no purchases or trading.

All of A touches the live database; each step needs a migration, a local test in supabase/tests, and Oliver's go
before it is applied.
