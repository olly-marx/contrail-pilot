// A phone that has lost its pilot (2026-11-09: Lola's device held 134 flights and a save with pilotNamed true, but no stored pilot, so the PILOT tab opened an EMPTY name form with a
// random number and she made a second pilot, 'Lola Comet 20', beside her first). Pure: no DOM, no clock. The save says it HAD a pilot (save.pilotNamed, set when a name is saved or a
// pilot is brought back); the device says it has none (no stored pilot: src/online.js getPilot). Then the PILOT tab asks for the old pilot first, and a new pilot is a second, explicit choice.
// (Not save.tours 'name': that tour also ends when the name could not be saved, offline; such a player never had a pilot.)
export const pilotLost = (save, pilot) => !pilot && !!save && save.pilotNamed === true;
export const LOST_LINES = ['This phone has lost its pilot.', 'Type your name and pilot code to get it back.'];
