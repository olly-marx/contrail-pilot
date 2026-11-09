// The SUBJECT of every rails / tour step (research/SPOTLIGHT-SUBJECT.md; the user, 2026-11-09: "we highlight a button and some text but not that actual thing that they should be looking at").
// A step's TARGET is the one tappable thing (unchanged: the one-target rule). Its SUBJECT is what the sentence is ABOUT: the spotlight lights both, only the target can be tapped, and the bubble covers neither.
// Declared here, step by step, key '<tour id>#<position>' (position counts from 1 INCLUDING steps that may be skipped); null = "the target is the subject". Selectors: the first VISIBLE match of each; '^<selector>' = the
// target's closest ancestor matching it. A selector that is not on the current screen is simply skipped (r-takeoff1 exists on HOME and in the hangar: its subjects list both).
// tests/railsubjects.cjs (Node) checks that every step of every tour has an entry here; tests/spotlight.cjs (browser) checks the spotlight of each step on the real screen.
export const COUNTS = {   // tour id -> how many steps it has (the number of entries it must declare)
  'r-school': 1, 'r-hangar': 1, 'r-free': 2, 'r-takeoff1': 1, 'r-res1': 3, 'r-takeoff2': 1, 'r-res2': 1, 'r-nature': 5, 'r-bonus': 1, 'r-systems': 3, 'r-parcels': 1, 'r-map': 1, 'r-boards': 1, 'r-payoff': 1,
  name: 10, new: 3,
};
export const SUBJECTS = {
  'r-school#1': '#rNextRows .rc-row',              // the UP NEXT lead row that says "a free part"
  'r-hangar#1': null,
  'r-free#1': '#hPlane',                           // the Engines row (target) and the plane where the new engines will show
  'r-free#2': ['#hPreview', '#hPlane'],            // the engine upgrade's card (name, CO2 bar) and the plane
  'r-takeoff1#1': ['#hubNext .rc-row', '#hPlane'], // HOME: the goal "Land at X" (UP NEXT); the hangar: the plane with its new engines
  'r-res1#1': null, 'r-res1#2': null,
  'r-res1#3': '#rNextRows .rc-row',                // the next goal
  'r-takeoff2#1': '#hubNext .rc-row',              // the lesson row "Icy air in daytime"
  'r-res2#1': null,
  'r-nature#1': null, 'r-nature#2': null,
  'r-nature#3': ['#wStrip', '#wScene'],            // the project's strip (what it does) and the land where its ghost shows
  'r-nature#4': null, 'r-nature#5': null,
  'r-bonus#1': null,
  'r-systems#1': null, 'r-systems#2': null,
  'r-systems#3': '^.rowc',                         // the whole Forecasting row (name, price), not only its small description
  'r-parcels#1': '^.rowc',                         // the tree parcels' row (picture, name)
  'r-map#1': null, 'r-boards#1': null,
  'r-payoff#1': '.pay-frame',                      // the plane and the new part on it
  'name#1': null, 'name#2': null, 'name#3': null, 'name#4': null, 'name#5': null, 'name#6': null, 'name#7': null, 'name#8': null, 'name#9': null, 'name#10': null,
  'new#1': null,
  'new#2': '^.rowc',                               // the NEW line's row (its picture and name), not only its (i)
  'new#3': ['#iName', '#iWhat'],                   // the information card's title and its first paragraph
};
