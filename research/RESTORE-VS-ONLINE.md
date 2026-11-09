# BACK UP / RESTORE vs the online copy: what 0.34.0 does to a restored backup (release manager, 2026-11-08, DESK ONLY)

Read from src/online.js + src/save.js as shipped (main a38306b); confirmed by a Node-only scratch check with a fake Supabase (`~/.ux0/restore-cases.cjs`, not a gate, nothing in the repo changed). B = the restored older backup written to localStorage by the restore button; the restore also stashed the game it replaced (safety copy), and does NOT touch the pilot id, the pilot code or the sync record (`contrailPilot.synced`).

## The rule that decides (syncDown, on the first load after the restore)
take the ONLINE copy iff its progress is HIGHER than B's (or equal, newer, and nothing unsent). Local "unchanged since last sync" is NOT needed: a richer online copy wins even over unsent changes. The loser is stashed. If B is richer, B is uploaded (forced) over the online copy. syncUp (every 30 s) refuses a save more than 5% poorer than the last known online progress.

## The cases (observed)
1. **Richer (and newer) online copy** (B 100 flights, online 250): the online copy REPLACES the restored backup on the next load, silently; B goes to safety copy #1 (RECOVER AN EARLIER SAVE), the game it replaced to #2. The player sees the restore "do nothing". Your reading is right.
2. **No online copy** (wiped, or a pilot name never uploaded):
   - 2b. a new device / cleared storage (no sync record): B is uploaded; B stays. Fine.
   - 2a. an existing device whose sync record remembers a HIGHER old online progress (200) while the server has nothing: B is NOT uploaded (the 5% guard uses the stale number); B stays local only and unsynced, silently, until the game passes 0.95 x 200. A small bug, found by this check: syncDown never clears `serverProgress` when `get_save` returns no row. One line to fix (clear it when there is no row).
3. **A NEW pilot created after the loss (the realistic case)**: the new pilot's online copy is poor (5 flights): B is richer, so it is uploaded (forced) and becomes that pilot's online save. B stays. Works. (If the new pilot has since played MORE than B, case 1 applies: B is reverted and kept as a safety copy.)
4. **B richer than the online copy**: B is uploaded and stays. (Without the server history table, the poorer online copy it replaced is simply overwritten; harmless, it was poorer.)
5. (Equal progress, online copy newer): B has "unsent changes", so B stays and is uploaded over it.

## Can an explicit restore win once without reopening the hole? Yes.
The hole is "a poorer save silently overwrites a richer one" from any ordinary path (a second device, a stale tab, a bug). An explicit, confirmed restore is a different thing: the player chose it, with the numbers in front of them.
- A one-shot flag in its OWN localStorage key (`contrailPilot.restored = { at, progress }`), written ONLY by the restore button after the confirm card; NOT in the save (so it never travels in syncJson or in a backup file), NOT read from the backup file, expires after 7 days, cleared by RESET and by the first successful upload.
- With the flag: syncDown does not take the online copy; it first stashes the online copy locally (a safety copy: "online copy replaced by your restore"), then force-uploads B (`syncUp(save, { force: true })`); on success it clears the flag and writes the sync record. syncUp (the 30 s timer) uses force while the flag is set. After that, ordinary rules apply again: a second poorer upload is refused, a richer online copy wins.
- The confirm card for a NAMED pilot says what will happen: with an online copy richer than B, "Your online copy is newer (250 flights). Going back replaces it with this backup (100 flights)." (a best-effort `get_save` before the card; offline: "We could not check your online copy".) Other phones with this pilot may bring the newer game back on their next open: stated in one line.
- **Without the server history table (draft E, not applied) an explicit restore over a richer online copy DESTROYS the only online copy of the richer game**; the local safety copy does not survive the very wipe this feature is for. So: apply E first (put_save then keeps the replaced richer copy as 'replaced by lower progress'), or hold the named-pilot override until E is live. Pilots with no online copy (the common case of the backup feature) are unaffected.

## Recommendation
1. Build the restore with the one-shot flag, so the player's explicit choice wins once; and do NOT weaken the ordinary rule.
2. Always tell the player when the online copy replaced something at load (today it is silent): one toast, "Your online game was newer, so we kept it. Your other game is in RECOVER AN EARLIER SAVE." This is correct for any take, tiny, and it makes the revert of case 1 understandable even without the flag.
3. Fix case 2a in the same release: clear `serverProgress` in syncDown when there is no online row.
4. Apply draft E before the named-pilot override ships (or ship the override after it).
5. Tests to write with it (each with a plant): restore without the flag is reverted when the online copy is richer (case 1); with the flag the restore sticks and the online copy is stashed; the flag is consumed (a second poorer upload is refused again); a flag or 'restoredAt' inside a backup file is ignored; no online row clears the stale progress (2a).
Nothing is built; the game chat builds nothing until the user approves.
